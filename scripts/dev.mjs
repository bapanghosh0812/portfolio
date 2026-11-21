#!/usr/bin/env node
/**
 * Local preview: serves dist/ with the same security headers and redirects as Netlify,
 * and runs the API functions (/api/chat, /api/contact, /api/github) in-process.
 * Optional: put keys in a local .env file (git-ignored) to test the live assistant/email.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants as zlibConstants } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const PORT = Number(process.env.PORT) || 8888;

if (existsSync(join(ROOT, ".env"))) {
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    // the project's .env wins over any old key saved in the Windows environment
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".pdf": "application/pdf", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json" };

function rules(file) {
  if (!existsSync(join(DIST, file))) return [];
  const out = []; let cur = null;
  for (const line of readFileSync(join(DIST, file), "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: {} }; out.push(cur); }
    else if (cur) { const i = line.indexOf(":"); cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  }
  return out;
}
const match = (pattern, path) => (pattern.endsWith("*") ? path.startsWith(pattern.slice(0, -1)) : path === pattern);
const FUNCTIONS = { "/api/chat": "chat.mjs", "/api/contact": "contact.mjs", "/api/github": "github.mjs" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = decodeURIComponent(url.pathname);
  try {
    if (FUNCTIONS[path]) {
      const mod = await import(new URL(`../netlify/functions/${FUNCTIONS[path]}`, import.meta.url));
      const chunks = []; for await (const c of req) chunks.push(c);
      const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) });
      const response = await mod.default(request, { ip: req.socket.remoteAddress, geo: { city: "Localhost", country: { name: "Dev" } } });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) for await (const chunk of response.body) res.write(chunk);
      return res.end();
    }
    for (const line of readFileSync(join(DIST, "_redirects"), "utf8").split(/\r?\n/)) {
      const [from, to, status] = line.trim().split(/\s+/);
      if (from && from === path) { res.writeHead(Number(status) || 301, { location: to }); return res.end(); }
    }
    let file = normalize(join(DIST, path));
    if (!file.startsWith(DIST)) { res.writeHead(400); return res.end(); }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    let status = 200;
    if (!existsSync(file)) { file = join(DIST, "404.html"); status = 404; }
    const headers = { "content-type": MIME[extname(file)] || "application/octet-stream" };
    for (const r of rules("_headers")) if (match(r.pattern, path)) Object.assign(headers, r.headers);
    delete headers["Strict-Transport-Security"];
    if (!headers["Cache-Control"]) headers["Cache-Control"] = "no-cache";
    let body = readFileSync(file);
    if (/text|javascript|json|svg|xml|manifest/.test(headers["content-type"]) && /\bbr\b/.test(req.headers["accept-encoding"] || "")) {
      body = brotliCompressSync(body, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 } }); headers["Content-Encoding"] = "br"; headers["Vary"] = "Accept-Encoding";
    }
    res.writeHead(status, headers);
    res.end(body);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Dev server error: " + err.message);
  }
});
server.listen(PORT, () => console.log(`\n  ✦ Portfolio preview → http://localhost:${PORT}\n  AI keys: ${process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY ? "configured" : "none (Mini Bapan uses its local engine)"} · Email: ${process.env.SMTP_USER ? "configured" : "not configured"}\n`));

#!/usr/bin/env node
/**
 * Zero-dependency static build.
 *   data/portfolio.json + src/ + assets/  ->  dist/
 * Edit data/portfolio.json to update the site AND Mini Bapan; Netlify runs this on every push.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, existsSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { setAssets } from "../src/templates/lib.mjs";
import { THEME_INIT, SPECULATION } from "../src/templates/layout.mjs";
import { renderHome } from "../src/templates/home.mjs";
import { renderWork } from "../src/templates/work.mjs";
import { renderNotFound } from "../src/templates/notfound.mjs";
import { toKb, visibleData } from "../src/scripts/bot-engine.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const t0 = Date.now();
const rel = (...p) => join(ROOT, ...p);
const out = (p, content) => { const f = join(DIST, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, content); return f; };
const sha = (s, n = 10) => createHash("sha256").update(s).digest("hex").slice(0, n);
const cspHash = (s) => `'sha256-${createHash("sha256").update(s).digest("base64")}'`;

/* ------------------------------------------------------------------ data */
let data;
try {
  data = JSON.parse(readFileSync(rel("data/portfolio.json"), "utf8"));
} catch (e) {
  console.error(`\n✖ data/portfolio.json is not valid JSON:\n  ${e.message}\n  Tip: check for a missing comma or quote near that position.\n`);
  process.exit(1);
}

const errors = [];
const need = (cond, msg) => { if (!cond) errors.push(msg); };
const isUrl = (u) => typeof u === "string" && /^https:\/\/[^\s]+$/.test(u);
need(data.site && data.person && Array.isArray(data.projects) && Array.isArray(data.certificates), "site, person, projects and certificates are required");
const slugs = new Set();
for (const [i, p] of (data.projects || []).entries()) {
  const at = `projects[${i}] (${p.name || "?"})`;
  need(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug || ""), `${at}: slug must be lowercase-with-dashes`);
  need(!slugs.has(p.slug), `${at}: duplicate slug "${p.slug}"`); slugs.add(p.slug);
  for (const k of ["name", "tagline", "kind", "summary"]) need(typeof p[k] === "string" && p[k].trim(), `${at}: "${k}" is required`);
  need(["featured", "more", "archive"].includes(p.tier), `${at}: tier must be featured | more | archive`);
  need(Array.isArray(p.category) && p.category.length && p.category.every((c) => ["web", "mobile", "ai", "systems", "game"].includes(c)), `${at}: category must use web, mobile, ai, systems, game`);
  need(Array.isArray(p.highlights) && p.highlights.length, `${at}: add at least one highlight`);
  need(Array.isArray(p.stack) && p.stack.length, `${at}: add the tech stack`);
  const links = Object.values(p.links || {});
  need(links.length && links.every(isUrl), `${at}: links must be https:// URLs`);
  if (p.cover) need(existsSync(rel(`assets/img/projects/${p.cover}-960.webp`)), `${at}: cover image assets/img/projects/${p.cover}-960.webp not found`);
  if (p.tier !== "archive") need(!!p.cover, `${at}: featured/more projects need a cover image`);
}
const certIds = new Set();
for (const [i, c] of (data.certificates || []).entries()) {
  const at = `certificates[${i}] (${c.title || "?"})`;
  need(c.id && !certIds.has(c.id), `${at}: id missing or duplicated`); certIds.add(c.id);
  need(existsSync(rel(`assets/img/certificates/${c.image}.webp`)) && existsSync(rel(`assets/img/certificates/${c.image}-thumb.webp`)), `${at}: image assets/img/certificates/${c.image}.webp (+ -thumb.webp) not found`);
}
need(existsSync(rel("." + data.bot.avatar)), `bot.avatar ${data.bot.avatar} not found`);
if (errors.length) {
  console.error(`\n✖ Build stopped — fix these in data/portfolio.json:\n${errors.map((e) => "  • " + e).join("\n")}\n`);
  process.exit(1);
}
const hiddenCount = data.projects.filter((p) => p.hidden).length;
data = visibleData(data); // drop "hidden" projects, compute stats, fill {projects}/{live}/{certificates}

/* ------------------------------------------------------------ clean + copy */
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(rel("assets"), join(DIST, "assets"), { recursive: true, filter: (src) => !/[\\/]assets[\\/]icons[\\/](ui|brand)([\\/]|$)/.test(src) });
cpSync(rel("assets/brand/favicon.ico"), join(DIST, "favicon.ico"));
if (existsSync(rel("Bapan_Ghosh_Resume.pdf"))) cpSync(rel("Bapan_Ghosh_Resume.pdf"), join(DIST, "Bapan_Ghosh_Resume.pdf"));

/* ------------------------------------------------------------ image sizes */
function imageSize(file) {
  const fd = openSync(file, "r"); const b = Buffer.alloc(64); readSync(fd, b, 0, 64, 0); closeSync(fd);
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const c = b.toString("ascii", 12, 16);
    if (c === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (c === "VP8L") return [1 + (((b[22] & 0x3f) << 8) | b[21]), 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6))];
    if (c === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  }
  return null;
}
const images = {};
function scanImages(dir, urlBase) {
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) { scanImages(full, `${urlBase}/${f}`); continue; }
    if (extname(f) !== ".webp") continue;
    const m = f.match(/^(.*)-(\d+)\.webp$/);
    const size = imageSize(full);
    if (m) {
      const key = `${urlBase}/${m[1]}`;
      const e = (images[key] ||= { widths: [], size: {} });
      e.widths.push(+m[2]); e.size[+m[2]] = size;
      e.widths.sort((a, b) => a - b);
    } else {
      images[`${urlBase}/${f.replace(/\.webp$/, "")}`] = { widths: [], size: size };
    }
  }
}
scanImages(rel("assets/img"), "/assets/img");

/* ------------------------------------------------------------------ sprite */
function buildSprite(used) {
  const syms = [];
  const read = (d) => readdirSync(rel(d)).filter((f) => f.endsWith(".svg")).sort();
  for (const f of read("assets/icons/ui")) {
    const svg = readFileSync(rel("assets/icons/ui", f), "utf8").replace(/<!--[\s\S]*?-->/g, "");
    const inner = (svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/) || [])[1];
    if (inner && used.has(`i-${basename(f, ".svg")}`)) syms.push(`<symbol id="i-${basename(f, ".svg")}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner.replace(/\s+/g, " ").trim()}</symbol>`);
  }
  for (const f of read("assets/icons/brand")) {
    const svg = readFileSync(rel("assets/icons/brand", f), "utf8").replace(/<title>[\s\S]*?<\/title>/g, "");
    const inner = (svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/) || [])[1];
    if (inner && used.has(`b-${basename(f, ".svg")}`)) syms.push(`<symbol id="b-${basename(f, ".svg")}" viewBox="0 0 24 24" fill="currentColor">${inner.trim()}</symbol>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg">${syms.join("")}</svg>`;
}

/* --------------------------------------------------------------------- css */
const CSS_ORDER = ["tokens.css", "base.css", "layout.css", "components.css", "sections.css", "work.css", "bot.css", "palette.css"];
let css = CSS_ORDER.map((f) => readFileSync(rel("src/styles", f), "utf8")).join("\n");
css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{};])\s*/g, "$1").replace(/;}/g, "}").trim();
const cssPath = `/assets/css/app.${sha(css)}.css`;
out(cssPath, css);

/* ---------------------------------------------------------------------- js */
const JS_DIR = rel("src/scripts");
const SPEC = /((?:from|import)\s*\(?\s*["'])\.\/([\w.-]+\.js)(["'])/g;
const jsOut = {};
let spritePath = "";
function emitJs(file, stack = []) {
  if (jsOut[file]) return jsOut[file];
  if (stack.includes(file)) throw new Error("Circular import: " + [...stack, file].join(" → "));
  let code = readFileSync(join(JS_DIR, file), "utf8");
  for (const [, , dep] of code.matchAll(SPEC)) emitJs(dep, [...stack, file]);
  code = code.replace(SPEC, (_, a, dep, z) => `${a}./${basename(jsOut[dep])}${z}`);
  code = code.replace(/__SPRITE__/g, spritePath);
  const name = `/assets/js/${basename(file, ".js")}.${sha(code)}.js`;
  out(name, code);
  return (jsOut[file] = name);
}

/* ------------------------------------------------------------------- fonts */
const fontFile = (prefix) => "/assets/fonts/" + readdirSync(rel("assets/fonts")).find((f) => f.startsWith(prefix));
setAssets({
  sprite: "__SPRITE__",
  css: cssPath,
  js: { app: "__APPJS__" },
  fonts: { sans: fontFile("inter-normal-latin-6"), display: fontFile("cormorant-garamond-normal") },
  images,
});

/* ------------------------------------------------------------------- pages */
const pages = { "index.html": renderHome(data), "404.html": renderNotFound(data) };
data.projects.forEach((p, i) => { pages[`work/${p.slug}/index.html`] = renderWork(data, p, i); });

// ship only the icons that are actually used (pages, scripts and the assistant's action buttons)
const used = new Set();
for (const html of Object.values(pages)) for (const m of html.matchAll(/__SPRITE__#([ib]-[\w-]+)/g)) used.add(m[1]);
const sources = [rel("src/scripts"), rel("netlify/lib")].flatMap((d) => readdirSync(d).map((f) => readFileSync(join(d, f), "utf8"))).join(" ");
for (const m of sources.matchAll(/["'`]([a-z0-9-]+)["'`]/g)) { used.add(`i-${m[1]}`); used.add(`b-${m[1]}`); }
const sprite = buildSprite(used);
spritePath = `/assets/icons/sprite.${sha(sprite)}.svg`;
out(spritePath, sprite);

for (const f of readdirSync(JS_DIR).filter((f) => f.endsWith(".js"))) emitJs(f);
for (const [file, html] of Object.entries(pages)) out(file, html.replaceAll("__SPRITE__", spritePath).replaceAll("__APPJS__", jsOut["app.js"]));

/* --------------------------------------------------- client knowledge (bot) */
out("data/bot.json", JSON.stringify({ v: sha(JSON.stringify(data), 8), ...toKb(data) }));

/* ------------------------------------------------------------- seo + pwa */
const SITE = data.site.url;
const today = new Date().toISOString().slice(0, 10);
out("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
${data.projects.map((p) => `  <url><loc>${SITE}/work/${p.slug}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${p.tier === "featured" ? "0.8" : "0.6"}</priority></url>`).join("\n")}
</urlset>
`);
// Search engines and AI *search* assistants may index the site; AI *training* crawlers may not copy it.
const TRAINING_BOTS = ["GPTBot", "CCBot", "Google-Extended", "ClaudeBot", "anthropic-ai", "Bytespider", "Applebot-Extended", "meta-externalagent", "FacebookBot", "Diffbot", "Omgilibot", "cohere-ai", "ImagesiftBot"];
out("robots.txt", `${TRAINING_BOTS.map((b) => `User-agent: ${b}\nDisallow: /`).join("\n\n")}

User-agent: *
Allow: /
Disallow: /api/
Disallow: /data/

Sitemap: ${SITE}/sitemap.xml
`);
out("site.webmanifest", JSON.stringify({
  name: `${data.person.name} — Portfolio`, short_name: data.person.name, description: data.site.description,
  start_url: "/", scope: "/", display: "standalone", background_color: "#0A0A0B", theme_color: data.site.themeColor,
  icons: [
    { src: "/assets/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/assets/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/assets/brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2));
const expires = new Date(Date.now() + 360 * 864e5).toISOString().replace(/\.\d+Z$/, "Z");
out(".well-known/security.txt", `Contact: mailto:${data.person.contact.email}\nExpires: ${expires}\nPreferred-Languages: en, hi, bn\nCanonical: ${SITE}/.well-known/security.txt\n`);

/* ------------------------------------------------------- headers / redirects */
const csp = [
  "default-src 'self'",
  `script-src 'self' ${cspHash(THEME_INIT)} ${cspHash(SPECULATION)}`,
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");
const immutable = "public, max-age=31536000, immutable";
out("_headers", `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: accelerometer=(), autoplay=(), browsing-topics=(), camera=(), display-capture=(), encrypted-media=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(self), midi=(), payment=(), publickey-credentials-get=(), serial=(), usb=(), xr-spatial-tracking=()
  X-Permitted-Cross-Domain-Policies: none

/assets/css/*
  Cache-Control: ${immutable}
  Cross-Origin-Resource-Policy: same-origin
/assets/js/*
  Cache-Control: ${immutable}
  Cross-Origin-Resource-Policy: same-origin
/assets/fonts/*
  Cache-Control: ${immutable}
  Cross-Origin-Resource-Policy: same-origin
/assets/icons/*
  Cache-Control: ${immutable}
  Cross-Origin-Resource-Policy: same-origin
/assets/img/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400
  Cross-Origin-Resource-Policy: same-origin
/assets/bot/*
  Cache-Control: public, max-age=86400
  Cross-Origin-Resource-Policy: same-origin
/assets/og/*
  Cache-Control: public, max-age=86400
  Cross-Origin-Resource-Policy: cross-origin
/assets/email/*
  Cache-Control: public, max-age=86400
  Cross-Origin-Resource-Policy: cross-origin
/assets/brand/*
  Cache-Control: public, max-age=604800
  Cross-Origin-Resource-Policy: cross-origin
/data/*
  Cache-Control: public, max-age=300
  X-Robots-Tag: noindex
  Cross-Origin-Resource-Policy: same-origin
`);
const social = Object.fromEntries(data.person.socials.map((s) => [s.id, s.url]));
out("_redirects", `/resume  /Bapan_Ghosh_Resume.pdf  302
/cv  /Bapan_Ghosh_Resume.pdf  302
/github  ${social.github}  302
/linkedin  ${social.linkedin}  302
/leetcode  ${social.leetcode}  302
/rescuen  ${social.googleplay}  302
/whatsapp  https://wa.me/${data.person.contact.whatsapp}  302
/work  /#projects  301
/images/bapan1.jpeg  /assets/og/home.jpg  301
/images/*  /  301
`);

const files = []; const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); });
walk(DIST);
console.log(`✔ Built ${data.projects.length + 2} pages, ${data.projects.length} case studies${hiddenCount ? ` (${hiddenCount} hidden)` : ""}, ${data.certificates.length} credentials → dist/ (${files.length} files) in ${Date.now() - t0} ms`);

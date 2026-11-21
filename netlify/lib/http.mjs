// Shared HTTP helpers for the API functions: security headers, origin checks, IPs, rate limits.

export const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cross-origin-resource-policy": "same-origin",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...SECURITY_HEADERS, ...headers },
  });
}

/** Browsers always send Origin on POST; it must be this site (any host it is served on) or localhost. */
export function originAllowed(req) {
  const self = new URL(req.url).host;
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (site && !["same-origin", "same-site", "none"].includes(site)) return false;
  if (!origin) return req.method === "GET";
  let host;
  try { host = new URL(origin).host; } catch { return false; }
  const extra = String(process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim().replace(/^https?:\/\//, "")).filter(Boolean);
  return host === self || extra.includes(host) || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) || host.endsWith("--bapanghosh.netlify.app") || host === "bapanghosh.netlify.app";
}

export const clientIp = (req, context) =>
  (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";

/** In-memory sliding-window limiter (per warm function instance — a second line behind Netlify's own limits). */
const buckets = new Map();
export function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { buckets.set(key, arr); return true; }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > 864e5) buckets.delete(k);
  return false;
}

/** Read a JSON body with a hard size cap. */
export async function readJson(req, maxBytes = 24_000) {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > maxBytes) throw Object.assign(new Error("Request too large"), { status: 413 });
  const text = await req.text();
  if (text.length > maxBytes) throw Object.assign(new Error("Request too large"), { status: 413 });
  try { return JSON.parse(text); } catch { throw Object.assign(new Error("Invalid JSON"), { status: 400 }); }
}

/** Strip control characters (keeps newlines and tabs). */
export const cleanText = (s, max) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "").trim().slice(0, max);

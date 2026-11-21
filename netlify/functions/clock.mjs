// GET /api/clock(.svg) — live clock card for the GitHub profile: the same peacock timer as the emails,
// drawn as an SVG that opens on Bapan's current time (IST) and keeps ticking in the viewer's browser.
// The digits are CSS-animated from the moment of the request, so no script is needed (GitHub strips scripts).
import { BASE, GLYPHS, META } from "../lib/clock-art.mjs";

export const config = { path: ["/api/clock", "/api/clock.svg"] };

const TZ = "Asia/Kolkata";
const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
function parts(date) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { wd: p.weekday.toUpperCase().slice(0, 3), day: p.day, mon: p.month.toUpperCase().slice(0, 3), year: p.year, h: +p.hour % 24, m: +p.minute, s: +p.second };
}
const CROP = [20, 56, 1000, 428]; // the glowing pill inside the 1040×520 artwork
const r2 = (n) => Math.round(n * 1000) / 1000;
const id = (k) => "g" + k.replace(/[^a-zA-Z0-9]/g, (c) => "_" + c.charCodeAt(0));
const DEFS = Object.fromEntries(Object.entries(GLYPHS).map(([k, g]) => [k, `<image id="${id(k)}" width="${g.w}" height="${g.h}" href="data:image/webp;base64,${g.d}"/>`]));

const CSS = `use,g{animation-timing-function:steps(1,end);animation-iteration-count:infinite}
.w10{animation-name:w10}.w6{animation-name:w6}.w12{animation-name:w12}.w2{animation-name:w2}
@keyframes w10{0%{opacity:1}10%,100%{opacity:0}}
@keyframes w6{0%{opacity:1}16.6667%,100%{opacity:0}}
@keyframes w12{0%{opacity:1}8.3333%,100%{opacity:0}}
@keyframes w2{0%{opacity:1}50%,100%{opacity:0}}
.blink{animation:blink 1s steps(1,end) infinite}
@keyframes blink{0%{opacity:1}50%,100%{opacity:.18}}
.d-off{animation:d-off 1ms steps(1,end) 1 forwards}.d-on{animation:d-on 1ms steps(1,end) 1 forwards}
@keyframes d-off{0%,100%{opacity:0}}@keyframes d-on{0%,100%{opacity:1}}`;

export function clockSvg(now = new Date()) {
  const used = new Set();
  const place = (key, x, y, extra = "") => {
    const g = GLYPHS[key];
    if (!g) return "";
    used.add(key);
    return `<use href="#${id(key)}" x="${Math.round(x + g.ox)}" y="${Math.round(y + g.oy)}"${extra}/>`;
  };
  const t = parts(now);
  const frac = now.getMilliseconds() / 1000;
  const daySec = t.h * 3600 + t.m * 60 + t.s + frac;

  // date line ("SAT, 21 NOV 2026"); at midnight it swaps to tomorrow's date by itself
  const dateLine = (p) => {
    let x = 506, out = "";
    for (const ch of `${p.wd}, ${p.day} ${p.mon} ${p.year}`) {
      if (ch === " ") { x += META.space; continue; }
      const g = GLYPHS["t" + ch];
      if (!g) continue;
      out += place("t" + ch, x, 140);
      x += g.adv + 2;
    }
    return out;
  };
  const toMidnight = 86400 - daySec;
  const next = parts(new Date(now.getTime() + (toMidnight + 1) * 1000));

  // a digit cell: one glyph per state, each visible only during its own window of the cycle
  const cell = (x, y, states, span, phase) => {
    const n = states.length, period = n * span, cur = Math.floor(phase / span) % n;
    return states.map((key, k) => {
      if (!key) return "";
      const delay = (((phase - k * span) % period) + period) % period;
      return place(key, x, y, ` class="w${n}" style="animation-duration:${period}s;animation-delay:-${r2(delay)}s"${k === cur ? "" : ' opacity="0"'}`);
    }).join("");
  };
  const step = META.segW + 18;
  const H = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => String(n).padStart(2, " "));
  const hourPhase = (t.h % 12) * 3600 + t.m * 60 + t.s + frac;
  const minPhase = t.m * 60 + t.s + frac;
  let x = 420;
  const hourTens = cell(x, 236, H.map((v) => (v[0] === " " ? "" : v[0])), 3600, hourPhase); x += step;
  const hourOnes = cell(x, 236, H.map((v) => v[1]), 3600, hourPhase); x += step;
  const colon = place(":", x - 4, 236, ` class="blink" style="animation-delay:-${r2(frac)}s"`); x += 36;
  const minTens = cell(x, 236, ["0", "1", "2", "3", "4", "5"], 600, minPhase); x += step;
  const minOnes = cell(x, 236, ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], 60, minPhase); x += step;
  const ampm = cell(x + 6, 292, ["mAM", "mPM"], 43200, daySec);

  const label = `Bapan Ghosh's local time: ${t.h % 12 || 12}:${String(t.m).padStart(2, "0")} ${t.h < 12 ? "AM" : "PM"} IST, ${t.wd} ${t.day} ${t.mon} ${t.year}`;
  const body = `<g class="d-off" style="animation-delay:${r2(toMidnight)}s">${dateLine(t)}</g><g class="d-on" opacity="0" style="animation-delay:${r2(toMidnight)}s">${dateLine(next)}</g>${hourTens}${hourOnes}${colon}${minTens}${minOnes}${ampm}`;
  // cropped to the pill and clipped to its shape, so no dark box shows on light or dark pages
  const [cx, cy, cw, ch] = CROP;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cx} ${cy} ${cw} ${ch}" width="${cw}" height="${ch}" role="img" aria-label="${label}"><title>${label}</title><style>${CSS}</style><defs><clipPath id="pill"><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${cw * 0.22}" ry="${ch / 2}"/></clipPath>${[...used].map((k) => DEFS[k]).join("")}</defs><g clip-path="url(#pill)"><image width="${BASE.w}" height="${BASE.h}" href="data:image/webp;base64,${BASE.d}"/>${body}</g></svg>`;
}

export default async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  return new Response(req.method === "HEAD" ? null : clockSvg(new Date()), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // never cached, so every profile visit opens on the current time
      "cache-control": "no-cache, no-store, must-revalidate, max-age=0",
      "netlify-cdn-cache-control": "no-store",
      expires: "0",
      pragma: "no-cache",
      "x-content-type-options": "nosniff",
      "access-control-allow-origin": "*",
      "content-security-policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
    },
  });
};

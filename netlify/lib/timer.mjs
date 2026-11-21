// Renders the peacock "timer" card (date + glowing digital time) as a PNG for emails — pure Node, no packages.
import { inflateSync, deflateSync } from "node:zlib";
import { BASE, GLYPHS, META } from "./timer-assets.mjs";

const unSub = (buf, w, h, ch) => {
  const out = Buffer.from(buf);
  const row = w * ch;
  for (let y = 0; y < h; y++) {
    const o = y * row;
    for (let i = ch; i < row; i++) out[o + i] = (out[o + i] + out[o + i - ch]) & 255;
  }
  return out;
};
const cache = new Map();
const glyph = (key) => {
  if (cache.has(key)) return cache.get(key);
  const g = GLYPHS[key];
  if (!g) return null;
  const px = unSub(inflateSync(Buffer.from(g.d, "base64")), g.w, g.h, 4);
  const v = { ...g, px };
  cache.set(key, v);
  return v;
};
let basePx = null;
const base = () => (basePx ||= unSub(inflateSync(Buffer.from(BASE.d, "base64")), BASE.w, BASE.h, 3));

function blit(img, g, x, y) {
  const W = BASE.w, H = BASE.h;
  x = Math.round(x + g.ox); y = Math.round(y + g.oy);
  for (let j = 0; j < g.h; j++) {
    const yy = y + j; if (yy < 0 || yy >= H) continue;
    for (let i = 0; i < g.w; i++) {
      const xx = x + i; if (xx < 0 || xx >= W) continue;
      const s = (j * g.w + i) * 4, a = g.px[s + 3];
      if (!a) continue;
      const d = (yy * W + xx) * 3, k = a / 255;
      img[d] = img[d] + (g.px[s] - img[d]) * k;
      img[d + 1] = img[d + 1] + (g.px[s + 1] - img[d + 1]) * k;
      img[d + 2] = img[d + 2] + (g.px[s + 2] - img[d + 2]) * k;
    }
  }
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function encodePng(rgb, w, h) {
  const row = w * 3, raw = Buffer.alloc((row + 1) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (row + 1), s = y * row;
    raw[o] = 1; // "Sub" filter
    for (let i = 0; i < row; i++) raw[o + 1 + i] = (rgb[s + i] - (i >= 3 ? rgb[s + i - 3] : 0)) & 255;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 7 })), chunk("IEND", Buffer.alloc(0))]);
}

/** Date/time parts in a time zone (default IST, Bapan's local time). */
export function timeParts(date = new Date(), timeZone = "Asia/Kolkata") {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-IN", { timeZone, weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(date).map((x) => [x.type, x.value]));
  return { weekday: p.weekday.toUpperCase().slice(0, 3), day: p.day, month: p.month.toUpperCase().slice(0, 3), year: p.year, hour: p.hour, minute: p.minute, ampm: (p.dayPeriod || "").toUpperCase().replace(/\./g, "").slice(0, 2) || "AM" };
}

/** PNG buffer of the timer card showing `date` (e.g. the moment a message was sent). */
export function renderTimer(date = new Date(), timeZone = "Asia/Kolkata") {
  const t = timeParts(date, timeZone);
  const img = Float32Array.from(base());
  // date line, e.g. "SAT, 27 SEP 2025"
  let x = 506;
  for (const ch of `${t.weekday}, ${t.day} ${t.month} ${t.year}`) {
    if (ch === " ") { x += META.space; continue; }
    const g = glyph("t" + ch); if (!g) continue;
    blit(img, g, x, 140); x += g.adv + 2;
  }
  // big seven-segment time, e.g. "10:45" (leading hour cell left dark, like a real display)
  const hh = t.hour.padStart(2, " "), mm = t.minute.padStart(2, "0");
  const step = META.segW + 18;
  x = 420;
  for (const ch of hh) { if (ch !== " ") blit(img, glyph(ch), x, 236); x += step; }
  blit(img, glyph(":"), x - 4, 236); x += 22 + 14;
  for (const ch of mm) { blit(img, glyph(ch), x, 236); x += step; }
  const ap = glyph("m" + (t.ampm === "PM" ? "PM" : "AM"));
  if (ap) blit(img, ap, x + 6, 292);
  const out = Buffer.alloc(img.length);
  for (let i = 0; i < img.length; i++) out[i] = img[i] < 0 ? 0 : img[i] > 255 ? 255 : img[i];
  return encodePng(out, BASE.w, BASE.h);
}

// Footer timepiece: peacock-feather analog watch with a digital LCD window, plus the date & day bar.
// Static SVG generated at build time; src/scripts/timepiece.js moves the hands and digits in real time.

const r2 = (n) => Math.round(n * 100) / 100;

// seven-segment geometry for the LCD window (scaled per digit)
function segs(x, y, w, h, t) {
  const L = x + t / 2, R = x + w - t / 2, T = y + t / 2, M = y + h / 2, B = y + h - t / 2, g = t * 0.22;
  const hs = (x1, x2, yy) => `${r2(x1)},${r2(yy)} ${r2(x1 + t / 2)},${r2(yy - t / 2)} ${r2(x2 - t / 2)},${r2(yy - t / 2)} ${r2(x2)},${r2(yy)} ${r2(x2 - t / 2)},${r2(yy + t / 2)} ${r2(x1 + t / 2)},${r2(yy + t / 2)}`;
  const vs = (xx, y1, y2) => `${r2(xx)},${r2(y1)} ${r2(xx + t / 2)},${r2(y1 + t / 2)} ${r2(xx + t / 2)},${r2(y2 - t / 2)} ${r2(xx)},${r2(y2)} ${r2(xx - t / 2)},${r2(y2 - t / 2)} ${r2(xx - t / 2)},${r2(y1 + t / 2)}`;
  const s = { a: hs(L + g, R - g, T), b: vs(R, T + g, M - g), c: vs(R, M + g, B - g), d: hs(L + g, R - g, B), e: vs(L, M + g, B - g), f: vs(L, T + g, M - g), g: hs(L + g, R - g, M) };
  return Object.entries(s).map(([k, p]) => `<polygon class="seg" data-s="${k}" points="${p}"/>`).join("");
}
const digit = (i, x, y, w, h, t, on) => `<g data-d="${i}" data-on="${on}">${segs(x, y, w, h, t)}</g>`;

export function watchSvg() {
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180, major = i % 5 === 0;
    const r1 = major ? 150 : 158, rr = 166;
    ticks.push(`<line x1="${r2(200 + Math.sin(a) * r1)}" y1="${r2(200 - Math.cos(a) * r1)}" x2="${r2(200 + Math.sin(a) * rr)}" y2="${r2(200 - Math.cos(a) * rr)}" class="${major ? "tp-major" : "tp-minor"}"/>`);
  }
  const knurl = [];
  for (let i = 0; i < 120; i++) {
    const a = (i * 3 * Math.PI) / 180;
    knurl.push(`<line x1="${r2(200 + Math.sin(a) * 189)}" y1="${r2(200 - Math.cos(a) * 189)}" x2="${r2(200 + Math.sin(a) * 196)}" y2="${r2(200 - Math.cos(a) * 196)}"/>`);
  }
  const batons = [];
  for (let i = 0; i < 12; i++) {
    if (i === 3 || i === 9) continue; // sapphires sit at 3 and 9
    const w = i === 0 ? 4 : 5;
    batons.push(i === 0
      ? `<rect x="191" y="34" width="${w}" height="26" rx="1.5" class="tp-baton"/><rect x="205" y="34" width="${w}" height="26" rx="1.5" class="tp-baton"/>`
      : `<rect x="${200 - w / 2}" y="36" width="${w}" height="24" rx="1.5" class="tp-baton" transform="rotate(${i * 30} 200 200)"/>`);
  }
  return `<svg class="watch__svg" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="tpGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1C1"/><stop offset=".25" stop-color="#E7C25B"/><stop offset=".5" stop-color="#B8891E"/><stop offset=".72" stop-color="#F3D98A"/><stop offset="1" stop-color="#8C6416"/></linearGradient>
    <radialGradient id="tpDial" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="#132447"/><stop offset=".55" stop-color="#0A1328"/><stop offset="1" stop-color="#03060E"/></radialGradient>
    <radialGradient id="tpVignette" cx=".5" cy=".5" r=".5"><stop offset=".35" stop-color="#03060E" stop-opacity=".1"/><stop offset=".8" stop-color="#03060E" stop-opacity=".55"/><stop offset="1" stop-color="#03060E" stop-opacity=".92"/></radialGradient>
    <radialGradient id="tpEye" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#2E63E6"/><stop offset=".6" stop-color="#0D2A86"/><stop offset="1" stop-color="#050F3D"/></radialGradient>
    <radialGradient id="tpGem" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#CFE4FF"/><stop offset=".3" stop-color="#4C8BFF"/><stop offset=".75" stop-color="#132C9C"/><stop offset="1" stop-color="#071048"/></radialGradient>
    <linearGradient id="tpGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="tpShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="4" stdDeviation="2.5" flood-color="#000" flood-opacity=".55"/></filter>
    <filter id="tpLcd" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="b"/><feFlood flood-color="#4C8DFF" flood-opacity=".95"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="tpDialClip"><circle cx="200" cy="200" r="172"/></clipPath>
  </defs>
  <circle cx="200" cy="200" r="199" fill="url(#tpGold)"/>
  <g stroke="#6B4E12" stroke-width="1.2" opacity=".45">${knurl.join("")}</g>
  <circle cx="200" cy="200" r="186" fill="#0B0D12"/>
  <circle cx="200" cy="200" r="182.5" fill="none" stroke="url(#tpGold)" stroke-width="2.5"/>
  <circle cx="200" cy="200" r="174" fill="url(#tpDial)"/>
  <g clip-path="url(#tpDialClip)"><image class="tp-dial" data-href="/assets/img/timepiece/dial.webp" x="26" y="26" width="348" height="348" preserveAspectRatio="xMidYMid slice"/><circle cx="200" cy="200" r="174" fill="url(#tpVignette)"/></g>
  <g>${ticks.join("")}</g>
  <g fill="url(#tpGold)">${batons.join("")}</g>
  <circle cx="356" cy="200" r="8" fill="url(#tpGem)" stroke="url(#tpGold)" stroke-width="2"/>
  <circle cx="44" cy="200" r="8" fill="url(#tpGem)" stroke="url(#tpGold)" stroke-width="2"/>
  <text x="200" y="104" text-anchor="middle" class="tp-brand">BAPAN GHOSH</text>
  <text x="200" y="118" text-anchor="middle" class="tp-sub">Mayur Edition</text>
  <g class="tp-lcd">
    <rect x="128" y="244" width="144" height="50" rx="11" class="tp-lcd__frame"/>
    <g filter="url(#tpLcd)">
      ${digit(0, 140, 254, 20, 30, 4.2, "")}
      ${digit(1, 164, 254, 20, 30, 4.2, "")}
      <circle cx="191" cy="263" r="2.3" class="seg on"/><circle cx="190" cy="276" r="2.3" class="seg on"/>
      ${digit(2, 197, 254, 20, 30, 4.2, "")}
      ${digit(3, 221, 254, 20, 30, 4.2, "")}
      <text x="255" y="264" text-anchor="middle" class="tp-ap" data-ap>AM</text>
      ${digit(4, 246, 270, 8.5, 14, 2.2, "")}
      ${digit(5, 256.5, 270, 8.5, 14, 2.2, "")}
    </g>
  </g>
  <g filter="url(#tpShadow)">
    <path data-hand="h" d="M195 214 L196.5 128 L200 100 L203.5 128 L205 214 Z" fill="url(#tpGold)" stroke="#6B4E12" stroke-width=".6" transform="rotate(305 200 200)"/>
    <path data-hand="m" d="M197 218 L198 76 L200 50 L202 76 L203 218 Z" fill="url(#tpGold)" stroke="#6B4E12" stroke-width=".6" transform="rotate(60 200 200)"/>
    <g data-hand="s" transform="rotate(0 200 200)">
      <line x1="200" y1="236" x2="200" y2="44" stroke="#3F7BFF" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="200" cy="226" r="6.5" fill="url(#tpEye)" stroke="url(#tpGold)" stroke-width="1.6"/>
      <circle cx="200" cy="58" r="3.4" fill="url(#tpGem)"/>
    </g>
  </g>
  <circle cx="200" cy="200" r="9" fill="url(#tpGold)"/>
  <circle cx="200" cy="200" r="4.2" fill="url(#tpGem)"/>
  <path d="M60 140 A150 150 0 0 1 300 58 A170 140 0 0 0 60 140 Z" fill="url(#tpGlass)"/>
</svg>`;
}

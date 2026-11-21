// Shared template helpers. Everything that comes from data is escaped here.
let ASSETS = { sprite: "/assets/icons/sprite.svg", images: {} };
export const setAssets = (a) => { ASSETS = a; };
export const assets = () => ASSETS;

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

/** Join class names, skipping falsy values. */
export const cx = (...c) => c.filter(Boolean).join(" ");

/** Inline SVG icon from the generated sprite (Lucide line icons). */
export const icon = (name, cls = "") =>
  `<svg class="${cx("ic", cls)}" aria-hidden="true" focusable="false"><use href="${ASSETS.sprite}#i-${esc(name)}"></use></svg>`;

/** Brand logo from the sprite (Simple Icons). */
export const brand = (name, cls = "") =>
  `<svg class="${cx("ic ic-brand", cls)}" aria-hidden="true" focusable="false"><use href="${ASSETS.sprite}#b-${esc(name)}"></use></svg>`;

/** Encode contact details so naive scrapers can't harvest them (decoded by app.js). */
export const enc = (s) => Buffer.from([...String(s)].reverse().join(""), "utf8").toString("base64");

/** Wrap each word for the luxury "rise" reveal. Keeps real text for SEO/screen readers. */
export const splitWords = (text) =>
  esc(text).split(/\s+/).filter(Boolean).map((w) => `<span class="w"><span>${w}</span></span>`).join(" ");

export const fmtMonth = (iso) => {
  const d = new Date(iso + (iso.length <= 10 ? "T00:00:00Z" : ""));
  return isNaN(d) ? esc(iso) : d.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
};

export const host = (url) => { try { return new URL(url).host.replace(/^www\./, ""); } catch { return ""; } };

/** JSON-LD block. `<` is escaped so data can never close the script element. */
export const jsonLd = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

/**
 * Responsive image from a base path that has -<width>.webp variants
 * (e.g. /assets/img/projects/rescuen -> rescuen-560.webp, -960.webp, -1600.webp).
 */
export function picture(base, { alt = "", sizes = "100vw", widths, cls = "", eager = false, ratio } = {}) {
  const meta = ASSETS.images[base];
  if (!meta) return "";
  const ws = (widths || meta.widths).filter((w) => meta.widths.includes(w));
  const largest = ws[ws.length - 1];
  const fallback = ws.find((w) => w >= 900) || largest;
  const [w, h] = meta.size[largest] || [1600, 1000];
  const srcset = ws.map((x) => `${base}-${x}.webp ${x}w`).join(", ");
  return `<img class="${esc(cls)}" src="${base}-${fallback}.webp" srcset="${srcset}" sizes="${esc(sizes)}" width="${w}" height="${h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async"${ratio ? ` data-ratio="${ratio}"` : ""}>`;
}

export const projectUrl = (p) => `/work/${p.slug}/`;

export const primaryLink = (p) => p.links.live || p.links.store || p.links.code || p.links.docs;

/** Action buttons for a project, in a consistent order. */
export function projectActions(p, { compact = false, caseStudy = true } = {}) {
  const L = p.links || {};
  const out = [];
  if (L.store) out.push(`<a class="btn btn--gold btn--sm" href="${esc(L.store)}" target="_blank" rel="noopener noreferrer">${brand("googleplay")}<span>${compact ? "Play Store" : "Get it on Google Play"}</span></a>`);
  if (L.live) out.push(`<a class="btn ${L.store ? "btn--ghost" : "btn--gold"} btn--sm" href="${esc(L.live)}" target="_blank" rel="noopener noreferrer">${icon("arrow-up-right")}<span>${L.store ? "Website" : "Live demo"}</span></a>`);
  if (L.code) out.push(`<a class="btn btn--ghost btn--sm" href="${esc(L.code)}" target="_blank" rel="noopener noreferrer">${brand("github")}<span>Code</span></a>`);
  if (L.docs && !compact) out.push(`<a class="btn btn--ghost btn--sm" href="${esc(L.docs)}" target="_blank" rel="noopener noreferrer">${icon("book-open")}<span>Docs</span></a>`);
  if (caseStudy) out.push(`<a class="btn btn--quiet btn--sm" href="${projectUrl(p)}">${compact ? "Details" : "Case study"} ${icon("arrow-right")}</a>`);
  return out.join("");
}

export const CATEGORY_LABEL = { web: "Web", mobile: "Mobile", ai: "AI / ML", systems: "Systems", game: "Games" };

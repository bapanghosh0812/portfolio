import { esc, icon, brand, enc, jsonLd, assets } from "./lib.mjs";
import { watchSvg } from "./timepiece.mjs";

const NAV = [
  ["about", "About"],
  ["journey", "Journey"],
  ["projects", "Work"],
  ["skills", "Skills"],
  ["certificates", "Credentials"],
  ["contact", "Contact"],
];

// Theme: "system" (default) follows the device's light/dark setting; a saved Light/Dark choice wins.
export const THEME_INIT = `(function(){var d=document.documentElement,t=null;d.classList.add("js");try{t=localStorage.getItem("bg-theme")}catch(e){}var m=t==="ivory"||t==="noir"?t:"system";if(m==="system")t=matchMedia("(prefers-color-scheme: light)").matches?"ivory":"noir";d.setAttribute("data-theme",t);d.setAttribute("data-theme-mode",m)})();`;

const THEMES = [
  ["system", "monitor-smartphone", "System", "Match your device"],
  ["ivory", "sun", "Light", "Ivory &amp; gold"],
  ["noir", "moon", "Dark", "Noir &amp; gold"],
];
const themePicker = () => `<div class="theme-pick" data-theme-pick>
        <button class="icon-btn theme-btn" type="button" data-theme-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="theme-menu" aria-label="Theme">${icon("monitor-smartphone", "theme-ic theme-ic--system")}${icon("sun", "theme-ic theme-ic--ivory")}${icon("moon", "theme-ic theme-ic--noir")}</button>
        <div class="theme-menu" id="theme-menu" role="menu" aria-label="Theme" hidden>
          <p class="theme-menu__title" aria-hidden="true">Appearance</p>
          ${THEMES.map(([id, ic, name, note]) => `<button type="button" role="menuitemradio" aria-checked="${id === "system"}" data-theme-set="${id}" tabindex="-1">${icon(ic)}<span><b>${name}</b><small${id === "system" ? " data-theme-now" : ""}>${note}</small></span>${icon("check", "theme-menu__tick")}</button>`).join("\n          ")}
        </div>
      </div>`;

export const SPECULATION = JSON.stringify({ prefetch: [{ where: { href_matches: "/work/*" }, eagerness: "moderate" }] });

function head({ site, title, description, canonical, ogImage, ogAlt, ogType = "website", extraLd = [], noindex = false }) {
  const A = assets();
  const og = site.url + ogImage;
  return `<!doctype html>
<html lang="en-IN" data-theme="noir" data-theme-mode="system">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(site.name)}">
<meta name="keywords" content="${esc(site.keywords.join(", "))}">
<meta name="robots" content="${noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="theme-color" content="${esc(site.themeColor)}">
<meta name="color-scheme" content="dark light">
<meta name="format-detection" content="telephone=no">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="${esc(site.locale)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(og)}">
<meta property="og:image:secure_url" content="${esc(og)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(og)}">
<meta name="twitter:image:alt" content="${esc(ogAlt)}">
<link rel="image_src" href="${esc(og)}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/assets/brand/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="${A.fonts.sans}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${A.fonts.display}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${A.css}">
<link rel="modulepreload" href="${A.js.app}">
<script>${THEME_INIT}</script>
<script type="module" src="${A.js.app}"></script>
<script type="speculationrules">${SPECULATION}</script>
${extraLd.map(jsonLd).join("\n")}
</head>`;
}

function header({ home }) {
  const pre = home ? "" : "/";
  return `<a class="skip-link" href="#main">Skip to content</a>
<canvas class="bg-canvas" aria-hidden="true"></canvas>
<div class="bg-ambient" aria-hidden="true"></div>
<div class="scroll-progress" aria-hidden="true"><span></span></div>
<header class="site-header" data-header>
  <div class="container nav">
    <a class="brand" href="/" aria-label="Bapan Ghosh — home">
      <span class="logo brand__mark" aria-hidden="true"><video class="logo__video" muted loop playsinline preload="none" disablepictureinpicture poster="/assets/brand/logo-poster.webp" data-src="/assets/brand/logo.mp4" width="44" height="44"></video></span>
      <span class="brand__text"><b>Bapan Ghosh</b><small>Full-Stack · Cross-Platform</small></span>
    </a>
    <nav class="nav__links" aria-label="Primary">
      ${NAV.map(([id, label]) => `<a href="${pre}#${id}" data-spy="${id}">${label}</a>`).join("\n      ")}
    </nav>
    <div class="nav__actions">
      <button class="icon-btn nav__palette" type="button" data-palette-open aria-label="Search and quick actions (Ctrl K)">${icon("command")}<kbd>K</kbd></button>
      ${themePicker()}
      <a class="btn btn--gold btn--sm nav__cta" href="${pre}#contact" data-magnetic>Hire me</a>
      <button class="burger" type="button" data-menu-open aria-expanded="false" aria-controls="menu" aria-label="Open menu"><span></span><span></span></button>
    </div>
  </div>
</header>
<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <div class="menu__inner container">
    <nav class="menu__links" aria-label="Mobile">
      ${NAV.map(([id, label], i) => `<a href="${pre}#${id}" data-menu-link><small>0${i + 1}</small>${label}</a>`).join("\n      ")}
    </nav>
    <div class="menu__foot">
      <a class="btn btn--gold" href="/Bapan_Ghosh_Resume.pdf" target="_blank" rel="noopener">${icon("download")}<span>Download résumé</span></a>
      <button class="btn btn--ghost" type="button" data-bot-open>${icon("message-circle")}<span>Ask Mini Bapan</span></button>
    </div>
  </div>
</div>`;
}

function footer({ data, home }) {
  const p = data.person;
  const pre = home ? "" : "/";
  const social = (s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer me">${brand(s.id)}<span>${esc(s.label)}</span></a>`;
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer__cta" data-reveal>
      <p class="eyebrow">Hiring or have a project in mind?</p>
      <h2 class="footer__title">Let's work <em class="gold-text">together.</em></h2>
      <div class="footer__btns">
        <a class="btn btn--gold" href="${pre}#contact" data-magnetic>${icon("send")}<span>Start a conversation</span></a>
        <button class="btn btn--ghost" type="button" data-bot-open>${icon("message-circle")}<span>Ask Mini Bapan</span></button>
      </div>
    </div>
    <div class="timepiece" data-timepiece>
      <div class="watch">${watchSvg()}</div>
      <div class="datebar" role="group" aria-label="Today's date">
        <img class="datebar__art" src="/assets/img/timepiece/datebar.webp" width="992" height="408" alt="" loading="lazy" decoding="async">
        <time class="datebar__date" data-tp-date></time>
        <span class="datebar__day" data-tp-day></span>
      </div>
    </div>
    <div class="footer__grid">
      <div class="footer__brand">
        <span class="logo footer__logo" aria-hidden="true"><video class="logo__video" muted playsinline preload="none" disablepictureinpicture poster="/assets/brand/logo-full-poster.webp" data-src="/assets/brand/logo-full.mp4" width="160" height="160"></video></span>
        <p><b>${esc(p.name)}</b><br>${esc(p.headline)} · ${esc(p.subheadline)}</p>
        <p class="footer__status"><span class="pulse-dot"></span>${esc(p.availability.split(";")[0])}</p>
      </div>
      <nav aria-label="Footer">
        <h3>Explore</h3>
        ${NAV.map(([id, label]) => `<a href="${pre}#${id}">${label}</a>`).join("")}
      </nav>
      <div>
        <h3>Connect</h3>
        ${p.socials.filter((s) => s.id !== "googleplay").map(social).join("")}
        <a href="#" data-mail="${enc(p.contact.email)}">${icon("mail")}<span>Email</span></a>
        <a href="https://wa.me/${esc(p.contact.whatsapp)}" target="_blank" rel="noopener noreferrer">${brand("whatsapp")}<span>WhatsApp</span></a>
      </div>
      <div>
        <h3>Resources</h3>
        <a href="/Bapan_Ghosh_Resume.pdf" target="_blank" rel="noopener">${icon("file-text")}<span>Résumé (PDF)</span></a>
        <a href="${esc(p.socials.find((s) => s.id === "googleplay").url)}" target="_blank" rel="noopener noreferrer">${brand("googleplay")}<span>Rescuen on Google Play</span></a>
        <button type="button" data-bot-open>${icon("bot")}<span>Ask Mini Bapan</span></button>
        <button type="button" data-report>${icon("bug")}<span>Report an issue</span></button>
      </div>
    </div>
    <div class="footer__base">
      <p>© <span data-year>2026</span> ${esc(p.name)}. All rights reserved.</p>
      <p>Designed &amp; engineered by ${esc(p.name)} · ${esc(p.location)}</p>
      <p class="footer__legal">Content, design, code and certificates on this site are protected — please don't copy or reuse without permission.</p>
    </div>
  </div>
</footer>`;
}

function floating(data) {
  const b = data.bot;
  return `<div class="toasts" id="toasts" role="status" aria-live="polite"></div>
<div class="bot-dock" data-bot-dock>
  <div class="bot-teaser" data-bot-teaser hidden>
    <button type="button" class="bot-teaser__close" data-teaser-close aria-label="Dismiss">${icon("x")}</button>
    <p>${esc(b.teaser)}</p>
  </div>
  <button class="bot-launcher" type="button" data-bot-open aria-label="Chat with ${esc(b.name)}, ${esc(b.role)}">
    <img src="${esc(b.avatar)}" width="64" height="64" alt="">
    <span class="bot-launcher__ring" aria-hidden="true"></span>
    <span class="bot-launcher__status" aria-hidden="true"></span>
  </button>
</div>
<div id="bot-root"></div>`;
}

export function page(opts) {
  const { data, body, home = false, bodyClass = "" } = opts;
  return `${head({ site: data.site, ...opts })}
<body class="${esc(bodyClass)}">
${header({ home })}
<main id="main" tabindex="-1">
${body}
</main>
${footer({ data, home })}
${floating(data)}
</body>
</html>
`;
}

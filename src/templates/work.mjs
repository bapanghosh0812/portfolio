import { esc, icon, brand, picture, projectUrl, projectActions, CATEGORY_LABEL, host } from "./lib.mjs";
import { page } from "./layout.mjs";

function flow(arch) {
  if (!arch || !arch.flow) return "";
  const node = (n, sm = false) => `<div class="flow__node${sm ? " flow__node--sm" : ""}">${icon(n.i || "layers")}<b>${esc(n.t)}</b>${n.s ? `<small>${esc(n.s)}</small>` : ""}</div>`;
  const parts = arch.flow.map((step) => (Array.isArray(step) ? `<div class="flow__branch">${step.map((n) => node(n, true)).join("")}</div>` : node(step)));
  return `<section class="cs-block" data-reveal>
    <h2 class="cs-h">${icon("git-branch")} System architecture</h2>
    <div class="flow" role="img" aria-label="Architecture: ${esc(arch.flow.map((s) => (Array.isArray(s) ? s.map((n) => n.t).join(", ") : s.t)).join(" → "))}">
      ${parts.join(`<span class="flow__arrow" aria-hidden="true">${icon("arrow-right")}</span>`)}
    </div>
    ${arch.note ? `<p class="flow__note">${esc(arch.note)}</p>` : ""}
  </section>`;
}

export function renderWork(data, p, idx) {
  const s = data.site;
  const list = data.projects;
  const prev = list[(idx - 1 + list.length) % list.length];
  const next = list[(idx + 1) % list.length];
  const url = `${s.url}${projectUrl(p)}`;
  const title = `${p.name} — ${p.tagline} | ${data.person.name}`;
  const description = `${p.summary} Built by ${data.person.name}. Stack: ${p.stack.slice(0, 6).join(", ")}.`.slice(0, 300);
  const cover = p.cover ? `/assets/img/projects/${p.cover}` : null;
  const L = p.links || {};
  const appType = L.store ? "MobileApplication" : L.live ? "WebApplication" : "SoftwareSourceCode";
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": appType,
      name: p.name,
      description: p.summary,
      url: L.live || L.store || L.code,
      image: p.cover ? `${s.url}/assets/og/${p.slug}.jpg` : `${s.url}${s.ogImage}`,
      author: { "@type": "Person", name: data.person.name, url: s.url + "/" },
      ...(appType !== "SoftwareSourceCode" ? { applicationCategory: p.category.includes("game") ? "GameApplication" : "DeveloperApplication", operatingSystem: L.store ? "Android" : "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "INR" } } : { codeRepository: L.code, programmingLanguage: p.stack.slice(0, 4) }),
      keywords: p.stack.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: s.url + "/" },
        { "@type": "ListItem", position: 2, name: "Work", item: s.url + "/#projects" },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ],
    },
  ];
  const facts = [
    ["Category", p.category.map((c) => CATEGORY_LABEL[c] || c).join(" · ")],
    ["Status", p.status || "—"],
    ["Built with", `${p.stack.length} technologies`],
    L.live ? ["Live at", host(L.live)] : L.code ? ["Source", host(L.code) + "/" + L.code.split("/").pop()] : null,
  ].filter(Boolean);

  const body = `
<article class="cs" data-project="${esc(p.slug)}">
  <header class="cs-hero container">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a>${icon("chevron-right")}<a href="/#projects">Work</a>${icon("chevron-right")}<span aria-current="page">${esc(p.name)}</span></nav>
    <p class="eyebrow" data-hero="1">${esc(p.kind)}</p>
    <h1 class="cs-title" data-hero="2"><span class="gold-text">${esc(p.name)}</span></h1>
    <p class="cs-tagline" data-hero="3"><em>${esc(p.tagline)}</em></p>
    <div class="actions" data-hero="4">${projectActions(p, { caseStudy: false })}<button class="btn btn--quiet btn--sm" type="button" data-bot-ask="Tell me about ${esc(p.name)} — what did Bapan build and how?">${icon("message-circle")} Ask Mini Bapan</button></div>
  </header>
  ${cover ? `<figure class="cs-cover container" data-hero="5">${picture(cover, { alt: `${p.name} — ${p.tagline}`, sizes: "(max-width: 1240px) 94vw, 1180px", eager: true })}</figure>` : ""}
  <div class="container cs-body">
    <section class="cs-overview" data-reveal>
      <div>
        <h2 class="cs-h">${icon("book-open")} Overview</h2>
        <p class="lead">${esc(p.summary)}</p>
        ${p.role ? `<p class="cs-role">${icon("user")} <span>${esc(p.role)}</span></p>` : ""}
      </div>
      <dl class="cs-facts card">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    </section>
    ${p.metrics && p.metrics.length ? `<ul class="metrics metrics--lg" data-reveal>${p.metrics.map((m) => `<li><b>${esc(m.value)}</b><span>${esc(m.label)}</span></li>`).join("")}</ul>` : ""}
    <section class="cs-block" data-reveal>
      <h2 class="cs-h">${icon("sparkles")} How I built it</h2>
      <ol class="highlights">${p.highlights.map((h, i) => `<li><span>${String(i + 1).padStart(2, "0")}</span><p>${esc(h)}</p></li>`).join("")}</ol>
    </section>
    ${flow(p.architecture)}
    <section class="cs-block" data-reveal>
      <h2 class="cs-h">${icon("layers")} Tech stack</h2>
      <ul class="chips chips--lg">${p.stack.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </section>
    <nav class="cs-pager" aria-label="More projects" data-reveal>
      <a href="${projectUrl(prev)}" class="card" data-spot><small>${icon("arrow-left")} Previous</small><b>${esc(prev.name)}</b><span>${esc(prev.tagline)}</span></a>
      <a href="${projectUrl(next)}" class="card cs-pager__next" data-spot><small>Next ${icon("arrow-right")}</small><b>${esc(next.name)}</b><span>${esc(next.tagline)}</span></a>
    </nav>
  </div>
</article>`;
  return page({
    data,
    bodyClass: "is-work",
    title,
    description,
    canonical: url,
    ogImage: p.cover ? `/assets/og/${p.slug}.jpg` : s.ogImage,
    ogAlt: `${p.name} — ${p.tagline} · by ${data.person.name}`,
    ogType: "article",
    extraLd: ld,
    body,
  });
}

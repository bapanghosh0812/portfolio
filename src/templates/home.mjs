import { esc, icon, brand, enc, splitWords, fmtMonth, picture, projectUrl, projectActions, CATEGORY_LABEL, assets } from "./lib.mjs";
import { page } from "./layout.mjs";

const sectionHead = (n, eyebrow, title, sub = "") => `
  <header class="section-head" data-reveal>
    <p class="section-index"><span>${n}</span><i></i>${esc(eyebrow)}</p>
    <h2 class="section-title split">${title}</h2>
    ${sub ? `<p class="section-sub">${sub}</p>` : ""}
  </header>`;

function hero(d) {
  const p = d.person;
  return `
<section class="hero" id="home" aria-labelledby="hero-title">
  <div class="container hero__grid">
    <div class="hero__copy">
      <p class="hero__badge" data-hero="1"><span class="pulse-dot"></span>Open to full-time roles &amp; internships</p>
      <p class="eyebrow hero__eyebrow" data-hero="2">${esc(p.eyebrow)}</p>
      <h1 class="hero__name" id="hero-title">
        <span class="line"><span data-hero="3">Bapan</span></span>
        <span class="line"><span class="gold-text shimmer" data-hero="4">Ghosh</span></span>
      </h1>
      <p class="hero__role" data-hero="5"><em>${esc(p.headline)}</em></p>
      <p class="hero__typed" data-hero="6"><span class="hero__typed-label">I build as a</span> <span class="typed" data-roles="${esc(JSON.stringify(p.roles))}">${esc(p.roles[0])}</span></p>
      <p class="hero__lead" data-hero="7">${esc(p.intro)}</p>
      <div class="hero__cta" data-hero="8">
        <a class="btn btn--gold btn--lg" href="#projects" data-magnetic>${icon("sparkles")}<span>Explore my work</span></a>
        <a class="btn btn--ghost btn--lg" href="${esc(p.resume)}" target="_blank" rel="noopener" data-magnetic>${icon("download")}<span>Download résumé</span></a>
      </div>
      <ul class="hero__meta" data-hero="9">
        <li>${icon("map-pin")}<span>${esc(p.location)}</span></li>
        <li>${icon("graduation-cap")}<span>B.Tech IT · BCET · 2027</span></li>
        <li>${brand("googleplay")}<span>Rescuen — live on Google Play</span></li>
      </ul>
    </div>
    <figure class="hero__visual" data-hero="5" data-tilt>
      <div class="arch">
        ${picture(p.portrait, { alt: p.portraitAlt, sizes: "(max-width: 900px) 78vw, 460px", eager: true, cls: "arch__img" })}
        <span class="arch__shine" aria-hidden="true"></span>
      </div>
      <span class="orbit orbit--1" aria-hidden="true"></span>
      <span class="orbit orbit--2" aria-hidden="true"></span>
      <div class="float-card float-card--a">${brand("googleplay")}<span><b>Live</b> on Google Play</span></div>
      <div class="float-card float-card--b"><b class="gold-text">${d.projects.length}</b><span>projects<br>built</span></div>
      <div class="float-card float-card--c">${icon("award")}<span><b>${d.certificates.length}</b> credentials</span></div>
    </figure>
  </div>
  <a class="scroll-cue" href="#about" aria-label="Scroll to About"><span></span></a>
</section>`;
}

function marquee(d) {
  const items = d.coreStack.map((id) => `<li title="${esc(id)}">${brand(id)}</li>`).join("");
  return `
<section class="marquee" aria-label="Core technologies">
  <div class="marquee__track"><ul>${items}</ul><ul aria-hidden="true">${items}</ul></div>
</section>`;
}

function stats(d) {
  return `
<section class="stats container" aria-label="At a glance">
  ${d.stats.map((s) => `<div class="stat" data-reveal><b class="stat__num" data-count="${s.value}" data-suffix="${esc(s.suffix)}">${s.value}${esc(s.suffix)}</b><span>${esc(s.label)}</span></div>`).join("")}
</section>`;
}

function about(d) {
  const p = d.person;
  return `
<section class="section about" id="about" aria-labelledby="about-title">
  <div class="container">
    ${sectionHead("01", "About", `<span id="about-title">${splitWords("About")} <em class="gold-text">${splitWords("me")}</em></span>`)}
    <div class="about__grid">
      <div class="about__visual" data-reveal>
        <figure class="frame-photo">
          ${picture(p.lifestyle, { alt: p.lifestyleAlt, sizes: "(max-width: 900px) 92vw, 560px" })}
        </figure>
        <dl class="facts">
          <div><dt>${icon("graduation-cap")} Education</dt><dd>${esc(p.education.degree)}<small>${esc(p.education.school)} · ${esc(p.education.period)}</small></dd></div>
          <div><dt>${icon("briefcase")} Internships</dt><dd>Cognifyz IT Solutions · EDU TANTR<small>Web development · AI / ML</small></dd></div>
          <div><dt>${icon("map-pin")} Based in</dt><dd>${esc(p.location)}<small>Open to relocate or remote</small></dd></div>
          <div><dt>${icon("languages")} Languages</dt><dd>${esc(p.languages.join(" · "))}</dd></div>
        </dl>
      </div>
      <div class="about__copy">
        ${p.about.map((t, i) => `<p class="${i === 0 ? "lead" : ""}" data-reveal>${esc(t)}</p>`).join("")}
        <div class="pillars">
          ${d.pillars.map((x) => `<article class="pillar card" data-reveal data-spot>
            <span class="pillar__icon">${icon(x.icon)}</span>
            <h3>${esc(x.title)}</h3>
            <p>${esc(x.text)}</p>
          </article>`).join("")}
        </div>
        <blockquote class="quote" data-reveal>
          ${icon("quote", "quote__mark")}
          <p>“Commended for dedication, coordination, communication and attention to detail.”</p>
          <footer>— Internship completion certificate, <cite>Cognifyz IT Solutions</cite></footer>
        </blockquote>
      </div>
    </div>
  </div>
</section>`;
}

const TYPE_ICON = { training: "award", internship: "briefcase", build: "rocket", launch: "smartphone", certification: "badge-check", education: "graduation-cap" };

function journey(d) {
  return `
<section class="section journey" id="journey" aria-labelledby="journey-title">
  <div class="container">
    ${sectionHead("02", "Experience", `<span id="journey-title">${splitWords("My")} <em class="gold-text">${splitWords("journey")}</em></span>`, "Internships, launches, certifications and the degree that ties it together — newest first.")}
    <ol class="timeline">
      ${d.experience.map((e) => `<li class="tl" data-reveal>
        <span class="tl__node">${icon(TYPE_ICON[e.type] || "star")}</span>
        <div class="tl__card card" data-spot>
          <p class="tl__period">${esc(e.period)}</p>
          <h3>${esc(e.title)}</h3>
          <p class="tl__org">${esc(e.org)}</p>
          <p>${esc(e.text)}</p>
          ${e.ref ? `<p class="tl__ref">${icon("badge-check")} Ref · ${esc(e.ref)}</p>` : ""}
        </div>
      </li>`).join("")}
    </ol>
  </div>
</section>`;
}

function metrics(p) {
  if (!p.metrics || !p.metrics.length) return "";
  return `<ul class="metrics">${p.metrics.map((m) => `<li><b>${esc(m.value)}</b><span>${esc(m.label)}</span></li>`).join("")}</ul>`;
}

const chips = (list, n) => `<ul class="chips">${list.slice(0, n).map((s) => `<li>${esc(s)}</li>`).join("")}${list.length > n ? `<li class="chips__more">+${list.length - n}</li>` : ""}</ul>`;

function featured(p, i) {
  return `<article class="feature${i % 2 ? " feature--flip" : ""}" data-reveal>
    <a class="feature__media" href="${projectUrl(p)}" aria-label="${esc(p.name)} — case study">
      ${picture(`/assets/img/projects/${p.cover}`, { alt: `${p.name} — ${p.tagline}`, sizes: "(max-width: 900px) 94vw, 660px" })}
      <span class="feature__status">${p.status && /live|play/i.test(p.status) ? '<span class="pulse-dot"></span>' : ""}${esc(p.status)}</span>
    </a>
    <div class="feature__body">
      <p class="feature__index"><span>${String(i + 1).padStart(2, "0")}</span>${esc(p.kind)}</p>
      <h3 class="feature__name"><a href="${projectUrl(p)}">${esc(p.name)}</a></h3>
      <p class="feature__tagline">${esc(p.tagline)}</p>
      <p class="feature__summary">${esc(p.summary)}</p>
      ${p.role ? `<p class="feature__role">${icon("user")} ${esc(p.role)}</p>` : ""}
      ${metrics(p)}
      ${chips(p.stack, 7)}
      <div class="actions">${projectActions(p)}</div>
    </div>
  </article>`;
}

function card(p) {
  return `<article class="pcard card" data-cat="${esc(p.category.join(" "))}" data-reveal data-spot>
    <a class="pcard__media" href="${projectUrl(p)}" tabindex="-1" aria-hidden="true">
      ${picture(`/assets/img/projects/${p.cover}`, { alt: "", sizes: "(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 380px", widths: [560, 960] })}
    </a>
    <div class="pcard__body">
      <p class="pcard__kind">${esc(p.kind)}</p>
      <h3><a href="${projectUrl(p)}">${esc(p.name)}</a></h3>
      <p class="pcard__tagline">${esc(p.tagline)}</p>
      <p class="pcard__summary">${esc(p.summary)}</p>
      ${chips(p.stack, 4)}
      <div class="actions">${projectActions(p, { compact: true })}</div>
    </div>
  </article>`;
}

function work(d) {
  const feat = d.projects.filter((p) => p.tier === "featured");
  const more = d.projects.filter((p) => p.tier === "more");
  const archive = d.projects.filter((p) => p.tier === "archive");
  const cats = ["all", ...Object.keys(CATEGORY_LABEL).filter((c) => more.some((p) => p.category.includes(c)))];
  return `
<section class="section work" id="projects" aria-labelledby="work-title">
  <div class="container">
    ${sectionHead("03", "Projects", `<span id="work-title">${splitWords("Selected")} <em class="gold-text">${splitWords("work")}</em></span>`, `${d.projects.length} projects across web, Android, Fire TV, fintech and AI — ${d.projects.filter((p) => p.links.live || p.links.store).length} of them live. Open any case study for the architecture and the engineering decisions behind it.`)}
    <div class="features">
      ${feat.map(featured).join("")}
    </div>
    <div class="more" id="more-work">
      <div class="more__head" data-reveal>
        <h3 class="more__title">More work</h3>
        <div class="filters" role="toolbar" aria-label="Filter projects">
          ${cats.map((c, i) => `<button type="button" class="filter${i === 0 ? " is-active" : ""}" data-filter="${c}" aria-pressed="${i === 0}">${c === "all" ? "All" : CATEGORY_LABEL[c]}</button>`).join("")}
        </div>
      </div>
      <div class="grid-cards" data-grid>
        ${more.map(card).join("")}
      </div>
      ${archive.length ? `<div class="archive" data-reveal>
        <h3 class="archive__title">${icon("layers")} From the archive</h3>
        <ul>${archive.map((p) => `<li><a href="${projectUrl(p)}"><b>${esc(p.name)}</b><span>${esc(p.kind)}</span><em>${esc(p.stack.slice(0, 4).join(" · "))}</em>${icon("arrow-up-right")}</a></li>`).join("")}</ul>
      </div>` : ""}
    </div>
  </div>
</section>`;
}

function live(d) {
  return `
<section class="section live" id="live" aria-labelledby="live-title">
  <div class="container">
    ${sectionHead("04", "Now", `<span id="live-title">${splitWords("Latest")} <em class="gold-text">${splitWords("updates")}</em></span>`, "Recent milestones, plus my public GitHub activity — updated automatically.")}
    <div class="live__grid">
      <div class="updates card" data-reveal>
        <h3>${icon("activity")} Latest updates</h3>
        <ol>
          ${d.updates.slice(0, 7).map((u) => {
            const proj = u.project && d.projects.find((p) => p.slug === u.project);
            return `<li><time datetime="${esc(u.date)}">${fmtMonth(u.date)}</time><p>${esc(u.text)}${proj ? ` <a href="${projectUrl(proj)}">View →</a>` : ""}</p></li>`;
          }).join("")}
        </ol>
      </div>
      <div class="gh card" data-reveal data-gh>
        <div class="gh__head">
          <h3>${brand("github")} Live from GitHub</h3>
          <span class="gh__status" data-gh-status><span class="pulse-dot"></span>Connecting…</span>
        </div>
        <ul class="gh__list" data-gh-list>
          ${Array.from({ length: 5 }, () => `<li class="gh__item is-skeleton"><span></span><span></span></li>`).join("")}
        </ul>
        <a class="btn btn--quiet btn--sm" href="https://github.com/${esc(d.github.username)}?tab=repositories" target="_blank" rel="noopener noreferrer">All repositories ${icon("arrow-up-right")}</a>
      </div>
    </div>
  </div>
</section>`;
}

function skills(d) {
  return `
<section class="section skills" id="skills" aria-labelledby="skills-title">
  <div class="container">
    ${sectionHead("05", "Skills", `<span id="skills-title">${splitWords("Skills &")} <em class="gold-text">${splitWords("tech stack")}</em></span>`, "The tools I use every day — each one backed by a project you can open.")}
    <div class="skills__grid">
      ${d.skills.map((s) => `<article class="skill card${s.wide ? " skill--wide" : ""}" data-reveal data-spot>
        <header><span class="skill__icon">${icon(s.icon)}</span><h3>${esc(s.title)}</h3></header>
        <ul class="chips chips--lg">${s.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        ${s.usedIn ? `<p class="skill__used">${icon("layers")} <span>Used in ${esc(s.usedIn.join(", "))}</span></p>` : ""}
        ${s.note ? `<p class="skill__used">${icon("badge-check")} <span>${esc(s.note)}</span></p>` : ""}
      </article>`).join("")}
    </div>
  </div>
</section>`;
}

const CERT_FILTERS = [["all", "All"], ["certification", "Certifications"], ["internship", "Internships"], ["badge", "Badges"], ["course", "Courses & tests"], ["workshop", "Workshops"]];

function certificates(d) {
  const A = assets();
  const sorted = [...d.certificates].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  return `
<section class="section certs" id="certificates" aria-labelledby="certs-title">
  <div class="container">
    ${sectionHead("06", "Credentials", `<span id="certs-title">${splitWords("Certificates &")} <em class="gold-text">${splitWords("credentials")}</em></span>`, `${d.certificates.length} verified credentials from Wipro, Oracle, Microsoft, IBM, Google & Kaggle — plus internship letters. Tap any card to view the original.`)}
    <div class="filters filters--center" role="toolbar" aria-label="Filter credentials" data-reveal>
      ${CERT_FILTERS.filter(([k]) => k === "all" || d.certificates.some((c) => c.type === k)).map(([k, l], i) => `<button type="button" class="filter${i === 0 ? " is-active" : ""}" data-cert-filter="${k}" aria-pressed="${i === 0}">${l}</button>`).join("")}
    </div>
    <div class="certs__grid">
      ${sorted.map((c) => {
        const t = A.images[`/assets/img/certificates/${c.image}-thumb`];
        const [w, h] = t ? t.size : [640, 450];
        return `<article class="cert card${c.featured ? " cert--featured" : ""}" data-type="${esc(c.type)}" data-reveal data-spot>
        <button type="button" class="cert__open" data-cert="${esc(c.id)}" data-src="/assets/img/certificates/${esc(c.image)}.webp" data-title="${esc(c.issuer)} — ${esc(c.title)}" aria-label="View certificate: ${esc(c.title)}">
          <span class="cert__thumb"><img src="/assets/img/certificates/${esc(c.image)}-thumb.webp" width="${w}" height="${h}" alt="" loading="lazy" decoding="async" draggable="false"></span>
          <span class="cert__body">
            <span class="cert__issuer">${esc(c.issuer)}<time>${esc(c.date)}</time></span>
            <span class="cert__title">${esc(c.title)}</span>
            <span class="cert__text">${esc(c.text)}</span>
            ${c.credentialId ? `<span class="cert__id">${icon("badge-check")} ${esc(c.credentialId)}</span>` : ""}
            <span class="cert__view">${icon("eye")} View certificate</span>
          </span>
        </button>
      </article>`;
      }).join("")}
    </div>
  </div>
</section>
<div class="lightbox" data-lightbox role="dialog" aria-modal="true" aria-label="Certificate viewer" hidden>
  <div class="lightbox__bar">
    <p class="lightbox__title" data-lb-title></p>
    <span class="lightbox__count" data-lb-count></span>
    <button type="button" class="icon-btn" data-lb-close aria-label="Close viewer">${icon("x")}</button>
  </div>
  <button type="button" class="lightbox__nav lightbox__nav--prev" data-lb-prev aria-label="Previous certificate">${icon("chevron-left")}</button>
  <figure class="lightbox__stage" data-lb-stage>
    <img data-lb-img alt="" draggable="false">
    <span class="lightbox__mark" aria-hidden="true">bapanghosh.netlify.app · verified copy</span>
  </figure>
  <button type="button" class="lightbox__nav lightbox__nav--next" data-lb-next aria-label="Next certificate">${icon("chevron-right")}</button>
</div>`;
}

function contact(d) {
  const c = d.person.contact;
  return `
<section class="section contact" id="contact" aria-labelledby="contact-title">
  <div class="container">
    ${sectionHead("07", "Contact", `<span id="contact-title">${splitWords("Get in")} <em class="gold-text">${splitWords("touch")}</em></span>`, `Hiring for a full-time role or an internship, or have a project in mind? I reply ${esc(c.responseTime)} — and you'll get an instant confirmation in your inbox.`)}
    <div class="contact__grid">
      <div class="contact__info" data-reveal>
        <ul class="channels">
          <li><a href="#" class="channel channel--copy card" data-mail="${enc(c.email)}" data-spot>
            <span class="channel__icon">${icon("mail")}</span><span><small>Email</small><b data-decode="${enc(c.email)}">bapanghosh081204 [at] gmail [dot] com</b></span>
          </a><button type="button" class="icon-btn channel__copy" data-copy="${enc(c.email)}" aria-label="Copy email address">${icon("copy")}</button></li>
          <li><a href="https://wa.me/${esc(c.whatsapp)}?text=${encodeURIComponent("Hello Bapan! I found your portfolio.")}" class="channel card" target="_blank" rel="noopener noreferrer" data-spot>
            <span class="channel__icon">${brand("whatsapp")}</span><span><small>WhatsApp</small><b>Chat instantly</b></span>
          </a></li>
          <li><div class="channel card" data-spot>
            <span class="channel__icon">${icon("phone")}</span><span><small>Phone</small><b>${c.phones.map((ph) => `<a href="#" data-tel="${enc(ph)}" data-decode="${enc(ph)}">${esc(ph.slice(0, 4))} ••••• •••${esc(ph.slice(-2))}</a>`).join(" · ")}</b></span>
          </div></li>
          <li><a href="${esc(c.mapsUrl)}" class="channel card" target="_blank" rel="noopener noreferrer" data-spot>
            <span class="channel__icon">${icon("map-pin")}</span><span><small>Location</small><b>${esc(c.address)}</b></span>
          </a></li>
        </ul>
        <div class="socials">
          ${d.person.socials.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer me" aria-label="${esc(s.label)}" data-magnetic>${brand(s.id)}</a>`).join("")}
        </div>
      </div>
      <form class="contact-form card" data-contact-form novalidate data-reveal>
        <div class="form-row">
          <label class="field"><span>Your name</span><input name="name" autocomplete="name" required maxlength="80" placeholder="e.g. Priya Sharma"></label>
          <label class="field"><span>Your email</span><input name="email" type="email" autocomplete="email" required maxlength="120" placeholder="you@company.com"></label>
        </div>
        <div class="form-row">
          <label class="field"><span>Phone <em>(optional)</em></span><input name="phone" type="tel" autocomplete="tel" maxlength="20" placeholder="+91 …"></label>
          <label class="field"><span>Topic</span><select name="topic">
            <option>Full-time role</option><option>Internship</option><option>Freelance / project</option><option>Collaboration</option><option>Just saying hello</option>
          </select></label>
        </div>
        <label class="field"><span>Message</span><textarea name="message" required minlength="10" maxlength="3000" rows="5" placeholder="Tell me about the role, the team or the idea…"></textarea></label>
        <label class="hp" aria-hidden="true">Leave this empty<input name="company_website" tabindex="-1" autocomplete="off"></label>
        <div class="form-foot">
          <p class="form-note">${icon("shield-check")} Private &amp; secure — your details are only used to reply.</p>
          <button class="btn btn--gold btn--lg" type="submit" data-magnetic>${icon("send")}<span>Send message</span></button>
        </div>
        <p class="form-status" data-form-status role="status" aria-live="polite"></p>
      </form>
    </div>
  </div>
</section>`;
}

export function renderHome(data) {
  const s = data.site, p = data.person;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: s.url + "/",
      name: s.title,
      dateModified: new Date().toISOString(),
      mainEntity: {
        "@type": "Person",
        "@id": s.url + "/#person",
        name: p.name,
        url: s.url + "/",
        image: s.url + "/assets/img/portrait-1000.webp",
        jobTitle: p.headline,
        description: p.intro,
        address: { "@type": "PostalAddress", addressLocality: "Bankura", addressRegion: "West Bengal", addressCountry: "IN" },
        alumniOf: { "@type": "CollegeOrUniversity", name: p.education.school },
        knowsLanguage: ["en", "hi", "bn"],
        knowsAbout: data.skills.flatMap((x) => x.items).slice(0, 40),
        sameAs: p.socials.filter((x) => x.id !== "googleplay").map((x) => x.url),
        hasCredential: data.certificates.map((c) => ({ "@type": "EducationalOccupationalCredential", name: c.title, credentialCategory: c.type, recognizedBy: { "@type": "Organization", name: c.issuer } })),
      },
    },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": s.url + "/#website", url: s.url + "/", name: s.name, inLanguage: "en-IN", publisher: { "@id": s.url + "/#person" } },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Projects by Bapan Ghosh",
      itemListElement: data.projects.map((pr, i) => ({ "@type": "ListItem", position: i + 1, url: `${s.url}/work/${pr.slug}/`, name: pr.name })),
    },
  ];
  const body = [hero(data), marquee(data), stats(data), about(data), journey(data), work(data), live(data), skills(data), certificates(data), contact(data)].join("\n");
  return page({
    data,
    home: true,
    bodyClass: "is-home",
    title: s.title,
    description: s.description,
    canonical: s.url + "/",
    ogImage: s.ogImage,
    ogAlt: s.ogImageAlt,
    ogType: "profile",
    extraLd: ld,
    body,
  });
}

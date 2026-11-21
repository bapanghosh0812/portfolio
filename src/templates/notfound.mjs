import { icon } from "./lib.mjs";
import { page } from "./layout.mjs";

export function renderNotFound(data) {
  const body = `
<section class="nf container">
  <p class="eyebrow" data-hero="1">Error 404</p>
  <h1 class="nf__title" data-hero="2"><span class="gold-text">Page not found.</span></h1>
  <p class="nf__text" data-hero="3">The page you're looking for doesn't exist or has moved.</p>
  <div class="actions" data-hero="4">
    <a class="btn btn--gold" href="/">${icon("arrow-left")}<span>Back to the portfolio</span></a>
    <a class="btn btn--ghost" href="/#projects">${icon("layers")}<span>See my work</span></a>
    <button class="btn btn--quiet" type="button" data-report>${icon("bug")}<span>Report a broken link</span></button>
  </div>
</section>`;
  return page({
    data,
    bodyClass: "is-404",
    title: `Page not found | ${data.person.name}`,
    description: data.site.description,
    canonical: data.site.url + "/404",
    ogImage: data.site.ogImage,
    ogAlt: data.site.ogImageAlt,
    noindex: true,
    body,
  });
}

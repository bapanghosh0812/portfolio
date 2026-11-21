/* =========================================================================
   Bapan Ghosh — portfolio core (ES module, zero dependencies)
   Theme · header · reveal · filters · lightbox · contact ·
   live GitHub feed · lazy chatbot / command palette / particle background
   ========================================================================= */
import { $, $$, root, h, icon, toast, store, session, dec, lockScroll, trapFocus, reduceMotion, formToken } from "./ui.js";

const REDUCE = reduceMotion();
const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
const loadedAt = Date.now();

/* ---------------------------------------------------------------- theme */
function initTheme() {
  const meta = $('meta[name="theme-color"]');
  const sync = () => {
    const ivory = root.dataset.theme === "ivory";
    $$("[data-theme-toggle]").forEach((b) => b.setAttribute("aria-label", ivory ? "Switch to dark theme" : "Switch to light theme"));
    if (meta) meta.setAttribute("content", ivory ? "#F6F1E6" : "#0A0A0B");
  };
  sync();
  const swap = (next, e, save) => {
    if (root.dataset.theme === next) return;
    const apply = () => { root.dataset.theme = next; if (save) store.set("bg-theme", next); sync(); };
    if (document.startViewTransition && !REDUCE && e) {
      root.style.setProperty("--vt-x", `${e.clientX || innerWidth - 60}px`);
      root.style.setProperty("--vt-y", `${e.clientY || 30}px`);
      document.startViewTransition(apply);
    } else apply();
  };
  // manual switch (remembered)
  $$("[data-theme-toggle]").forEach((btn) => btn.addEventListener("click", (e) => swap(root.dataset.theme === "ivory" ? "noir" : "ivory", e, true)));
  // system default: follow the device live until the visitor picks a theme manually
  const sys = matchMedia("(prefers-color-scheme: light)");
  sys.addEventListener("change", (m) => { if (!store.get("bg-theme")) swap(m.matches ? "ivory" : "noir", null, false); });
  // palette action "follow system theme" clears the manual choice
  document.addEventListener("theme:system", () => { try { localStorage.removeItem("bg-theme"); } catch {} swap(sys.matches ? "ivory" : "noir", null, false); toast("Theme now follows your device"); });
}

/* ------------------------------------------------- header + scroll fx */
function initHeader() {
  const header = $("[data-header]");
  const bar = $(".scroll-progress span");
  let ticking = false;
  // the header stays put (no hide/show on scroll) — it only gains a glass background once you scroll
  const update = () => {
    ticking = false;
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.setProperty("transform", `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`);
    if (header) header.classList.toggle("is-scrolled", y > 24);
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();

  // scroll-spy for the primary nav
  const links = $$(".nav__links a[data-spy]");
  const map = new Map(links.map((a) => [a.dataset.spy, a]));
  const sections = [...map.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.remove("is-active"));
        const a = map.get(en.target.id);
        if (a) a.classList.add("is-active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => io.observe(s));
  }
}

/* ------------------------------------------------------------ mob menu */
function initMenu() {
  const menu = $("#menu");
  const btn = $("[data-menu-open]");
  if (!menu || !btn) return;
  let release = null;
  const close = () => {
    if (menu.hidden) return;
    menu.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Open menu");
    lockScroll(false);
    if (release) { release(); release = null; }
    setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 500);
  };
  const open = () => {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("is-open"));
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-label", "Close menu");
    lockScroll(true);
    release = trapFocus(document.body);
    setTimeout(() => { const first = $("a", menu); if (first) first.focus({ preventScroll: true }); }, 60);
  };
  btn.addEventListener("click", () => (menu.hidden ? open() : close()));
  $$("[data-menu-link], [data-bot-open]", menu).forEach((a) => a.addEventListener("click", close));
  addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  matchMedia("(min-width: 1081px)").addEventListener("change", (m) => { if (m.matches) close(); });
}

/* ---------------------------------------------------------------- reveal */
function initReveal() {
  $$(".split").forEach((el) => $$(".w > span", el).forEach((s, i) => s.style.setProperty("--i", i)));
  const els = $$("[data-reveal]");
  // stagger siblings in grids
  const groups = new Map();
  els.forEach((el) => {
    const p = el.parentElement;
    const i = groups.get(p) || 0;
    groups.set(p, i + 1);
    if (i) el.style.setProperty("--rd", `${Math.min(i % 4, 3) * 0.08}s`);
  });
  if (REDUCE || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
  // anything already on screen is shown without a jump
  els.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight * 0.9) el.classList.add("in"); });
  root.classList.add("reveal-on");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -7% 0px", threshold: 0.06 });
  els.forEach((el) => { if (!el.classList.contains("in")) io.observe(el); });
}

/* -------------------------------------------------------------- counters */
function initCounters() {
  const nums = $$("[data-count]");
  if (!nums.length) return;
  const run = (el) => {
    const target = +el.dataset.count, suffix = el.dataset.suffix || "";
    if (REDUCE) { el.textContent = target + suffix; return; }
    const t0 = performance.now(), dur = 1700;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = "0" + suffix;
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } }), { threshold: 0.6 });
  nums.forEach((n) => io.observe(n));
}

/* ----------------------------------------------------------- typed roles */
function initTyped() {
  const el = $(".typed[data-roles]");
  if (!el || REDUCE) return;
  let roles = [];
  try { roles = JSON.parse(el.dataset.roles); } catch { return; }
  let r = 0, c = roles[0].length, del = true;
  const tick = () => {
    const word = roles[r];
    el.textContent = word.slice(0, c);
    let wait = del ? 34 : 70;
    if (!del && c === word.length) { del = true; wait = 1900; }
    else if (del && c === 0) { del = false; r = (r + 1) % roles.length; wait = 380; }
    else c += del ? -1 : 1;
    setTimeout(tick, wait);
  };
  setTimeout(tick, 2600);
}

/* ------------------------------------------- pointer: magnetic / spot / tilt */
function initPointerFx() {
  // spotlight on cards (cheap: one delegated listener)
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest && e.target.closest("[data-spot]");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });
  if (!FINE || REDUCE) return;
  $$("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.3;
      el.style.setProperty("transform", `translate(${x}px, ${y}px)`);
    });
    el.addEventListener("pointerleave", () => el.style.removeProperty("transform"));
  });
  const tilt = $("[data-tilt]");
  const hero = $(".hero");
  if (tilt && hero) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty("transform", `perspective(1100px) rotateY(${x * 7}deg) rotateX(${-y * 6}deg)`);
    });
    hero.addEventListener("pointerleave", () => tilt.style.removeProperty("transform"));
  }
}

/* --------------------------------------------------------------- filters */
function initFilters() {
  const bind = (btnSel, attr, itemsSel, match) => {
    const btns = $$(btnSel);
    btns.forEach((b) => b.addEventListener("click", () => {
      btns.forEach((x) => { x.classList.toggle("is-active", x === b); x.setAttribute("aria-pressed", String(x === b)); });
      const f = b.dataset[attr];
      $$(itemsSel).forEach((el) => {
        const show = f === "all" || match(el, f);
        el.classList.toggle("is-hidden", !show);
        if (show) { el.classList.add("in"); el.animate && !REDUCE && el.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 520, easing: "cubic-bezier(.22,1,.36,1)" }); }
      });
    }));
  };
  bind("[data-filter]", "filter", "[data-grid] .pcard", (el, f) => (el.dataset.cat || "").split(" ").includes(f));
  bind("[data-cert-filter]", "certFilter", ".certs__grid .cert", (el, f) => el.dataset.type === f);
}

/* -------------------------------------------------------------- lightbox */
function initLightbox() {
  const lb = $("[data-lightbox]");
  if (!lb) return;
  const img = $("[data-lb-img]", lb), title = $("[data-lb-title]", lb), count = $("[data-lb-count]", lb);
  let list = [], i = 0, release = null;
  const show = (n) => {
    i = (n + list.length) % list.length;
    const b = list[i];
    img.src = b.dataset.src;
    img.alt = b.dataset.title;
    title.textContent = b.dataset.title;
    count.textContent = `${i + 1} / ${list.length}`;
    const next = list[(i + 1) % list.length];
    if (next) { const pre = new Image(); pre.src = next.dataset.src; }
  };
  const open = (btn) => {
    list = $$(".cert:not(.is-hidden) .cert__open");
    lb.hidden = false;
    lockScroll(true);
    release = trapFocus(lb);
    show(Math.max(0, list.indexOf(btn)));
    $("[data-lb-close]", lb).focus();
  };
  const close = () => { if (lb.hidden) return; lb.hidden = true; lockScroll(false); if (release) release(); release = null; };
  $$(".cert__open").forEach((b) => b.addEventListener("click", () => open(b)));
  $("[data-lb-close]", lb).addEventListener("click", close);
  $("[data-lb-prev]", lb).addEventListener("click", () => show(i - 1));
  $("[data-lb-next]", lb).addEventListener("click", () => show(i + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.matches("[data-lb-stage]")) close(); });
  addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") show(i + 1);
    if (e.key === "ArrowLeft") show(i - 1);
  });
  let sx = 0;
  lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); });
}

/* ------------------------------------------- contact details + protection */
function initContactDetails() {
  $$("[data-decode]").forEach((el) => { const v = dec(el.dataset.decode); if (v) el.textContent = v; });
  $$("[data-mail]").forEach((a) => { const v = dec(a.dataset.mail); if (v) a.href = `mailto:${v}?subject=${encodeURIComponent("Hello Bapan — from your portfolio")}`; });
  $$("[data-tel]").forEach((a) => { const v = dec(a.dataset.tel); if (v) a.href = `tel:${v.replace(/\s+/g, "")}`; });
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    const v = dec(b.dataset.copy);
    try { await navigator.clipboard.writeText(v); toast("Email address copied"); } catch { toast(v); }
  }));
  $$("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  // light-touch content protection: no drag / long-press save on personal photos & certificates
  const guarded = ".cert__thumb, .lightbox__stage, .arch, .frame-photo";
  document.addEventListener("contextmenu", (e) => { if (e.target.closest && e.target.closest(guarded)) { e.preventDefault(); toast("Certificates & photos are protected 🔒"); } });
  document.addEventListener("dragstart", (e) => { if (e.target.closest && e.target.closest(guarded)) e.preventDefault(); });
  // attribution when large chunks are copied
  document.addEventListener("copy", (e) => {
    const sel = String(getSelection() || "");
    if (sel.length < 220 || !e.clipboardData || (e.target.closest && e.target.closest("input, textarea, .bot"))) return;
    e.clipboardData.setData("text/plain", `${sel}\n\n— © Bapan Ghosh · ${location.origin}${location.pathname}`);
    e.preventDefault();
  });
}

/* ---------------------------------------------------------- contact form */
function initContactForm() {
  const form = $("[data-contact-form]");
  if (!form) return;
  const status = $("[data-form-status]", form);
  form.addEventListener("focusin", () => { formToken(); }, { once: true });
  const setErr = (field, on) => field && field.closest(".field").classList.toggle("is-invalid", on);
  const say = (msg, ok) => { status.textContent = msg; status.className = `form-status ${ok ? "is-ok" : "is-err"}`; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = form.elements;
    const name = f.name.value.trim(), email = f.email.value.trim(), message = f.message.value.trim();
    const bad = { name: name.length < 2, email: !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email), message: message.length < 10 };
    Object.entries(bad).forEach(([k, v]) => setErr(f[k], v));
    if (bad.name || bad.email || bad.message) {
      say(bad.email ? "Please enter a valid email so I can reply." : bad.name ? "Please add your name." : "Please write a slightly longer message (10+ characters).", false);
      (bad.name ? f.name : bad.email ? f.email : f.message).focus();
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    const label = btn.lastElementChild.textContent;
    btn.disabled = true; btn.lastElementChild.textContent = "Sending…";
    say("", true);
    try {
      const { token: tk, at } = await formToken();
      const wait = 2600 - (Date.now() - at);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          kind: "contact", name, email, phone: f.phone.value.trim(), topic: f.topic.value, message,
          company_website: f.company_website.value, token: tk, elapsed: Date.now() - loadedAt, page: location.pathname,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "send-failed");
      const sent = h("div", { class: "sent", role: "status" },
        h("span", { class: "sent__icon" }, icon("check")),
        h("h3", { text: `Thank you, ${name.split(" ")[0]}!` }),
        h("p", { text: `Your message reached Bapan. A confirmation is on its way to ${email} — he'll get back to you by email or phone very soon.` }),
        data.ticket ? h("code", { text: `Ref · ${data.ticket}` }) : null,
        h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => { sent.replaceWith(...kept); form.reset(); btn.disabled = false; btn.lastElementChild.textContent = label; } }, icon("refresh-cw"), h("span", { text: "Send another message" })),
      );
      const kept = [...form.children];
      form.replaceChildren(sent);
      toast("Message sent — check your inbox ✨");
    } catch (err) {
      const msg = String(err.message || "");
      const mail = dec($("[data-mail]") ? $("[data-mail]").dataset.mail : "");
      say(msg && msg !== "send-failed" && !/fetch|network|json/i.test(msg) ? msg : `Couldn't send right now. Please email ${mail || "me"} or WhatsApp me — I reply fast.`, false);
      btn.disabled = false; btn.lastElementChild.textContent = label;
    }
  });
}

/* ------------------------------------------------------- live GitHub feed */
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const units = [[31536000, "year"], [2592000, "month"], [604800, "week"], [86400, "day"], [3600, "hour"], [60, "minute"]];
  for (const [sec, u] of units) if (s >= sec) { const n = Math.floor(s / sec); return `${n} ${u}${n > 1 ? "s" : ""} ago`; }
  return "just now";
}
function initGithub() {
  const box = $("[data-gh]");
  if (!box) return;
  const list = $("[data-gh-list]", box), status = $("[data-gh-status]", box);
  const fail = () => {
    status.classList.add("is-off");
    status.lastChild.textContent = "Offline";
    list.replaceChildren(h("li", { class: "gh__item" }, h("p", { text: "Live activity is resting right now — open GitHub to see every repository." })));
  };
  const load = async () => {
    try {
      const res = await fetch("/api/github", { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.repos || !data.repos.length) throw new Error();
      list.replaceChildren(...data.repos.slice(0, 5).map((r) => h("li", { class: "gh__item" },
        h("a", { class: "gh__repo", href: r.url, target: "_blank", rel: "noopener noreferrer" }, h("span", { text: r.name }), icon("arrow-up-right")),
        r.description ? h("p", { text: r.description }) : null,
        h("div", { class: "gh__meta" },
          r.language ? h("span", {}, h("i"), r.language) : null,
          h("span", {}, icon("git-commit-horizontal"), `Updated ${timeAgo(r.pushedAt)}`),
          r.homepage ? h("a", { href: r.homepage, target: "_blank", rel: "noopener noreferrer", text: "Live ↗" }) : null,
        ),
      )));
      status.lastChild.textContent = data.cached ? `Synced ${timeAgo(data.fetchedAt)}` : "Live";
    } catch { fail(); }
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "400px" });
    io.observe(box);
  } else load();
}

/* ------------------------------------------------ lazy: bot / palette / bg */
let botMod = null;
const loadBot = () => (botMod ||= import("./bot.js"));
function initBotTriggers() {
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-bot-open], [data-bot-ask], [data-report], [data-bot-teaser]");
    if (!t || e.target.closest("[data-teaser-close]")) return;
    e.preventDefault();
    hideTeaser();
    const opts = t.hasAttribute("data-report") ? { view: "report" } : t.dataset.botAsk ? { ask: t.dataset.botAsk } : {};
    loadBot().then((m) => m.open(opts)).catch(() => toast("Assistant is unavailable right now — please use the contact form.", "err"));
  });
  const teaser = $("[data-bot-teaser]");
  function hideTeaser() { if (teaser) teaser.hidden = true; session.set("bg-teaser", "1"); }
  const close = $("[data-teaser-close]");
  if (close) close.addEventListener("click", (e) => { e.stopPropagation(); hideTeaser(); });
  if (teaser && !session.get("bg-teaser")) {
    setTimeout(() => { if (!document.body.classList.contains("bot-open") && !session.get("bg-teaser")) teaser.hidden = false; }, 9000);
    setTimeout(() => { if (teaser) teaser.hidden = true; }, 26000);
  }
  // warm the module so the first open feels instant
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  setTimeout(() => idle(() => loadBot().catch(() => {})), 5000);
  if (session.get("bg-bot-open") === "1") loadBot().then((m) => m.open({ restore: true })).catch(() => {});
}

function initPalette() {
  let mod = null;
  const open = () => (mod ||= import("./palette.js")).then((m) => m.open({ openBot: (o) => loadBot().then((b) => b.open(o)) }));
  $$("[data-palette-open]").forEach((b) => b.addEventListener("click", open));
  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
  });
}

function initLogoVideo() {
  const vids = $$(".logo__video[data-src]");
  if (!vids.length) return;
  const conn = navigator.connection;
  if (REDUCE || (conn && (conn.saveData || /2g/.test(conn.effectiveType || "")))) return; // poster frame only
  const start = () => vids.forEach((v) => {
    const play = () => { if (!v.src) { v.src = v.dataset.src; v.load(); } v.play().catch(() => {}); };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => en.forEach((e) => (e.isIntersecting ? play() : v.pause()))).observe(v);
    } else play();
  });
  // the logo loop loads only after the page has finished loading — it never slows the first paint
  if (document.readyState === "complete") setTimeout(start, 600); else addEventListener("load", () => setTimeout(start, 600), { once: true });
}

function initBackground() {
  const canvas = $(".bg-canvas");
  if (!canvas || REDUCE) return;
  const conn = navigator.connection;
  if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ""))) return;
  if (navigator.deviceMemory && navigator.deviceMemory < 3) return;
  const start = () => import("./particles.js").then((m) => m.start(canvas)).catch(() => {});
  if (document.readyState === "complete") setTimeout(start, 400); else addEventListener("load", () => setTimeout(start, 400), { once: true });
}

/* -------------------------------- Mini Bapan launcher: drag it anywhere */
// Drag the launcher to any spot; on release it glides to the nearest side and remembers the place.
function initBotDrag() {
  const dock = $("[data-bot-dock]"), btn = dock && $(".bot-launcher", dock);
  if (!btn) return;
  const GAP = 18, KEY = "bg-bot-pos";
  const vh = () => window.visualViewport ? visualViewport.height : innerHeight;
  const clampB = (b) => Math.round(Math.min(Math.max(b, GAP), Math.max(GAP, vh() - btn.offsetHeight - 84)));
  const place = (side, bottom) => {
    dock.classList.toggle("is-left", side === "l");
    root.classList.toggle("bot-left", side === "l");
    dock.style.bottom = bottom == null ? "" : `${clampB(bottom)}px`;
  };
  let saved = null;
  try { saved = JSON.parse(store.get(KEY) || "null"); } catch {}
  if (saved && (saved.s === "l" || saved.s === "r") && Number.isFinite(saved.b)) place(saved.s, saved.b);
  addEventListener("resize", () => { if (saved) place(saved.s, saved.b); }, { passive: true });

  let start = null, moved = false, dropped = 0;
  btn.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const r = btn.getBoundingClientRect();
    start = { x: e.clientX, y: e.clientY, r, id: e.pointerId };
    moved = false;
  });
  btn.addEventListener("pointermove", (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!moved) {
      if (Math.hypot(dx, dy) < 7) return;
      moved = true;
      try { btn.setPointerCapture(e.pointerId); } catch {}
      dock.classList.add("is-dragging");
      const t = $("[data-bot-teaser]"); if (t) t.hidden = true; session.set("bg-teaser", "1");
    }
    // keep the whole button on screen while it follows the finger / cursor
    const x = Math.min(Math.max(dx, -start.r.left + 6), innerWidth - start.r.right - 6);
    const y = Math.min(Math.max(dy, -start.r.top + 6), vh() - start.r.bottom - 6);
    dock.style.transform = `translate(${x}px, ${y}px)`;
  });
  const drop = (e) => {
    if (!start || e.pointerId !== start.id) return;
    start = null;
    if (!moved) return;
    moved = false;
    dropped = performance.now();
    // FLIP: snap to the nearest side, then animate from where it was dropped
    const before = btn.getBoundingClientRect();
    const side = before.left + before.width / 2 < innerWidth / 2 ? "l" : "r";
    const bottom = vh() - before.bottom;
    dock.classList.remove("is-dragging");
    dock.style.transform = "";
    place(side, bottom);
    saved = { s: side, b: clampB(bottom) };
    store.set(KEY, JSON.stringify(saved));
    const after = btn.getBoundingClientRect();
    if (!REDUCE) btn.animate([{ transform: `translate(${before.left - after.left}px, ${before.top - after.top}px) scale(1.08)` }, { transform: "none" }], { duration: 620, easing: "cubic-bezier(.2,1.25,.35,1)" });
  };
  btn.addEventListener("pointerup", drop);
  btn.addEventListener("pointercancel", drop);
  // a drag is not a tap: swallow the click that follows it so the chat doesn't open
  btn.addEventListener("click", (e) => { if (performance.now() - dropped < 450) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  btn.addEventListener("dragstart", (e) => e.preventDefault());
}

/* --------------------------------------------- footer timepiece (lazy) */
function initTimepiece() {
  const el = $("[data-timepiece]");
  if (!el) return;
  const load = () => import("./timepiece.js").then((m) => m.start(el)).catch(() => {});
  if (!("IntersectionObserver" in window)) return load();
  const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "800px 0px" });
  io.observe(el);
}

/* ------------------------------------------------------------------- boot */
function boot() {
  const steps = [initTheme, initHeader, initMenu, initReveal, initCounters, initTyped, initPointerFx, initFilters, initLightbox, initContactDetails, initContactForm, initGithub, initBotTriggers, initBotDrag, initPalette, initLogoVideo, initTimepiece, initBackground];
  for (const s of steps) { try { s(); } catch (err) { console.error(`[portfolio] ${s.name} failed`, err); } }
  console.log("%cBapan Ghosh%c — Full-Stack & Cross-Platform Developer\nLike what you see? Let's talk → %s/#contact", "font:600 22px Georgia,serif;color:#D4AF37", "font:13px system-ui;color:#A69F8D", location.origin);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

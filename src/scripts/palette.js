// Command palette (Ctrl/⌘ + K): jump anywhere, open projects, copy email, switch theme, ask Mini Bapan.
import { $, $$, h, icon, toast, lockScroll, trapFocus, dec } from "./ui.js";

let el = null, release = null, items = [], active = 0, opts = {};

function collect() {
  const go = (id) => () => { const t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: "smooth" }); else location.href = `/#${id}`; };
  const list = [
    { g: "Navigate", label: "About", icon: "user", run: go("about") },
    { g: "Navigate", label: "Journey & experience", icon: "activity", run: go("journey") },
    { g: "Navigate", label: "Work & projects", icon: "layers", run: go("projects") },
    { g: "Navigate", label: "Live updates", icon: "radio", run: go("live") },
    { g: "Navigate", label: "Skills & tech stack", icon: "cpu", run: go("skills") },
    { g: "Navigate", label: "Certificates", icon: "award", run: go("certificates") },
    { g: "Navigate", label: "Contact", icon: "send", run: go("contact") },
  ];
  const seen = new Set();
  $$('a[href^="/work/"]').forEach((a) => {
    const href = a.getAttribute("href");
    if (seen.has(href)) return;
    const name = (a.closest("article") && a.closest("article").querySelector("h3 a, .feature__name a")) ? a.closest("article").querySelector("h3 a, .feature__name a").textContent.trim() : a.textContent.trim();
    if (!name || name.length > 40) return;
    seen.add(href);
    list.push({ g: "Projects", label: name, hint: "Case study", icon: "arrow-up-right", run: () => { location.href = href; } });
  });
  const mail = $("[data-mail]");
  list.push(
    { g: "Actions", label: "Ask Mini Bapan", hint: "Assistant", icon: "message-circle", run: () => opts.openBot && opts.openBot({}) },
    { g: "Actions", label: "Download résumé (PDF)", icon: "download", run: () => window.open("/Bapan_Ghosh_Resume.pdf", "_blank", "noopener") },
    { g: "Actions", label: "Copy email address", icon: "copy", run: async () => { const v = dec(mail ? mail.dataset.mail : ""); try { await navigator.clipboard.writeText(v); toast("Email address copied"); } catch { toast(v); } } },
    { g: "Actions", label: "Chat on WhatsApp", icon: "message-circle", run: () => window.open("/whatsapp", "_blank", "noopener") },
    { g: "Actions", label: "Switch light / dark theme", icon: "sun", run: () => { const b = $("[data-theme-toggle]"); if (b) b.click(); } },
    { g: "Actions", label: "Theme: follow my device (system)", icon: "monitor-smartphone", run: () => document.dispatchEvent(new Event("theme:system")) },
    { g: "Actions", label: "Report an issue", icon: "bug", run: () => opts.openBot && opts.openBot({ view: "report" }) },
    { g: "Profiles", label: "GitHub", icon: "code", run: () => window.open("/github", "_blank", "noopener") },
    { g: "Profiles", label: "LinkedIn", icon: "user", run: () => window.open("/linkedin", "_blank", "noopener") },
    { g: "Profiles", label: "LeetCode", icon: "terminal", run: () => window.open("/leetcode", "_blank", "noopener") },
    { g: "Profiles", label: "Rescuen on Google Play", icon: "smartphone", run: () => window.open("/rescuen", "_blank", "noopener") },
  );
  return list;
}

const score = (q, s) => {
  if (!q) return 1;
  s = s.toLowerCase(); q = q.toLowerCase();
  if (s.includes(q)) return 3 - s.indexOf(q) / 100;
  let i = 0; for (const c of s) if (c === q[i]) i++;
  return i === q.length ? 1 : 0;
};

function draw(input, listEl) {
  const q = input.value.trim();
  const all = collect().map((x) => ({ ...x, s: Math.max(score(q, x.label), score(q, `${x.g} ${x.hint || ""}`) * 0.5) })).filter((x) => x.s > 0);
  if (q) all.sort((a, b) => b.s - a.s);
  items = all;
  active = Math.min(active, Math.max(0, items.length - 1));
  const nodes = [];
  let group = null;
  items.forEach((it, i) => {
    if (!q && it.g !== group) { group = it.g; nodes.push(h("li", { class: "palette__group", role: "presentation", text: group })); }
    nodes.push(h("li", { class: `palette__item${i === active ? " is-active" : ""}`, role: "option", id: `pal-${i}`, "aria-selected": String(i === active), onclick: () => run(i), onmousemove: () => { if (active !== i) { active = i; highlight(listEl, input); } } },
      icon(it.icon), h("span", { text: it.label }), it.hint ? h("small", { text: it.hint }) : null));
  });
  listEl.replaceChildren(...(nodes.length ? nodes : [h("li", { class: "palette__empty", text: "No matches — try “projects”, “resume” or “contact”." })]));
  input.setAttribute("aria-activedescendant", items.length ? `pal-${active}` : "");
}
function highlight(listEl, input) {
  $$(".palette__item", listEl).forEach((n) => { const on = n.id === `pal-${active}`; n.classList.toggle("is-active", on); n.setAttribute("aria-selected", String(on)); if (on) n.scrollIntoView({ block: "nearest" }); });
  input.setAttribute("aria-activedescendant", `pal-${active}`);
}
function run(i) { const it = items[i]; close(); if (it) setTimeout(() => it.run(), 60); }

const onEsc = (e) => { if (e.key === "Escape" && el) { e.preventDefault(); e.stopPropagation(); close(); } };

export function close() {
  if (!el) return;
  el.remove(); el = null;
  document.removeEventListener("keydown", onEsc, true);
  lockScroll(false);
  if (release) { release(); release = null; }
}

export function open(o = {}) {
  opts = o;
  if (el) { close(); return; }
  active = 0;
  const input = h("input", { type: "text", placeholder: "Search sections, projects and actions…", "aria-label": "Search", role: "combobox", "aria-expanded": "true", "aria-controls": "pal-list", autocomplete: "off", spellcheck: "false" });
  const listEl = h("ul", { class: "palette__list", id: "pal-list", role: "listbox" });
  el = h("div", { class: "palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette", onclick: (e) => { if (e.target === el) close(); } },
    h("div", { class: "palette__box" },
      h("div", { class: "palette__search" }, icon("search"), input,
        h("button", { class: "palette__close", type: "button", "aria-label": "Close search", title: "Close (Esc)", onclick: () => close() }, h("kbd", { text: "Esc" }), icon("x"))),
      listEl,
      h("div", { class: "palette__foot" }, h("span", {}, h("kbd", { text: "↑↓" }), "navigate"), h("span", {}, h("kbd", { text: "Enter" }), "open"), h("span", {}, h("kbd", { text: "Ctrl K" }), "toggle")),
    ));
  input.addEventListener("input", () => { active = 0; draw(input, listEl); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); active = (active + 1) % Math.max(1, items.length); highlight(listEl, input); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = (active - 1 + items.length) % Math.max(1, items.length); highlight(listEl, input); }
    else if (e.key === "Enter") { e.preventDefault(); run(active); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  });
  document.body.append(el);
  document.addEventListener("keydown", onEsc, true); // Esc closes from anywhere, not only the input
  lockScroll(true);
  release = trapFocus(el);
  draw(input, listEl);
  input.focus();
}

// Shared UI helpers (no dependencies). Never uses innerHTML — everything is built with DOM APIs.
export const SPRITE = "__SPRITE__";
export const $ = (s, c = document) => c.querySelector(s);
export const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
export const root = document.documentElement;
export const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const SVG = "http://www.w3.org/2000/svg";
export function icon(name, brand = false) {
  const s = document.createElementNS(SVG, "svg");
  s.setAttribute("class", brand ? "ic ic-brand" : "ic");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("focusable", "false");
  const u = document.createElementNS(SVG, "use");
  u.setAttribute("href", `${SPRITE}#${brand ? "b" : "i"}-${name}`);
  s.append(u);
  return s;
}

/** Tiny hyperscript: h("button", { class: "x", onclick }, "label", icon("send")) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}

const safe = (fn, fb = null) => { try { return fn(); } catch { return fb; } };
export const store = { get: (k) => safe(() => localStorage.getItem(k)), set: (k, v) => safe(() => localStorage.setItem(k, v)) };
export const session = { get: (k) => safe(() => sessionStorage.getItem(k)), set: (k, v) => safe(() => sessionStorage.setItem(k, v)), del: (k) => safe(() => sessionStorage.removeItem(k)) };

/** Decode contact details encoded at build time (base64 of the reversed string). */
export function dec(s) {
  return safe(() => [...new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)))].reverse().join(""), "");
}

export function toast(message, type = "ok", ms = 3800) {
  const region = $("#toasts");
  if (!region) return;
  const t = h("div", { class: `toast${type === "err" ? " is-err" : ""}` }, icon(type === "err" ? "circle-alert" : "circle-check"), h("span", { text: message }));
  region.append(t);
  setTimeout(() => { t.classList.add("is-out"); setTimeout(() => t.remove(), 420); }, ms);
}

let locks = 0;
export function lockScroll(on) {
  locks = Math.max(0, locks + (on ? 1 : -1));
  document.body.classList.toggle("no-scroll", locks > 0);
}

/** Keep keyboard focus inside a dialog. Returns a release function. */
export function trapFocus(container) {
  const prev = document.activeElement;
  const sel = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea, select, [tabindex]:not([tabindex="-1"])';
  const onKey = (e) => {
    if (e.key !== "Tab") return;
    const items = $$(sel, container).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  container.addEventListener("keydown", onKey);
  return () => { container.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus({ preventScroll: true }); };
}

/** Short-lived anti-spam token from the contact API (must be a few seconds old when a form is sent). */
let tok = null, tokAt = 0;
export async function formToken() {
  if (tok && Date.now() - tokAt < 50 * 60e3) return { token: tok, at: tokAt };
  try {
    const r = await fetch("/api/contact", { headers: { accept: "application/json" }, cache: "no-store" });
    const j = await r.json();
    tok = j.token || null; tokAt = Date.now();
  } catch { tok = null; tokAt = Date.now(); }
  return { token: tok, at: tokAt };
}

export const ticketId = (prefix = "BG") => `${prefix}-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

// Mini Bapan — chat UI. Streams answers from /api/chat; falls back to the local engine if offline.
import { $, h, icon, toast, session, lockScroll, trapFocus, formToken, ticketId } from "./ui.js";
import { createEngine } from "./bot-engine.js";

const KEY = "bg-chat-v1";
const MAX_LEN = 600;
let kb = null, engine = null, kbPromise = null;
let ui = null, history = [], busy = false, release = null, recog = null;
const mobile = () => matchMedia("(max-width: 560px)").matches;

function loadKb() {
  return (kbPromise ||= fetch("/data/bot.json", { headers: { accept: "application/json" } })
    .then((r) => { if (!r.ok) throw new Error("kb"); return r.json(); })
    .then((j) => { kb = j; engine = createEngine(j); return j; }));
}

/* --------------------------------------------------------- markdown-lite */
const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;
function inline(text) {
  const out = [];
  const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|(?<![\w/])_[^_\n]+_(?![\w])|https?:\/\/[^\s)]+[^\s).,!?])/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(h("strong", { text: tok.slice(2, -2) }));
    else if (tok.startsWith("`")) out.push(h("code", { text: tok.slice(1, -1) }));
    else if (tok.startsWith("_")) out.push(h("em", { text: tok.slice(1, -1) }));
    else {
      const md = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const label = md ? md[1] : tok, url = md ? md[2] : tok;
      if (SAFE_URL.test(url)) {
        const ext = /^https?:/i.test(url) && !url.startsWith(location.origin);
        out.push(h("a", { href: url, text: label, target: ext ? "_blank" : null, rel: ext ? "noopener noreferrer nofollow" : null }));
      } else out.push(label);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
function render(text) {
  const frag = document.createDocumentFragment();
  const clean = String(text).replace(/\[\[[^\]]*\]\]/g, "").replace(/\[\[[^\]]*$/, "").trim();
  const UL = /^\s*[-*•]\s+/, OL = /^\s*\d+[.)]\s+/;
  for (const block of clean.split(/\n{2,}/)) {
    let list = null, kind = "", para = null;
    for (const raw of block.split("\n")) {
      const l = raw.trimEnd();
      if (!l.trim()) continue;
      const k = UL.test(l) ? "ul" : OL.test(l) ? "ol" : "";
      if (k) {
        if (!list || kind !== k) { list = h(k); kind = k; frag.append(list); }
        para = null;
        list.append(h("li", {}, inline(l.replace(k === "ul" ? UL : OL, ""))));
      } else {
        list = null;
        if (!para) { para = h("p"); frag.append(para); } else para.append(h("br"));
        para.append(...inline(l.replace(/^#+\s*/, "")));
      }
    }
  }
  return frag;
}

/* ------------------------------------------------------------- actions */
function actionEl(a) {
  const ico = icon(a.icon || "arrow-right");
  if (a.type === "link" && a.url && SAFE_URL.test(a.url)) {
    return h("a", { href: a.url, target: a.external ? "_blank" : null, rel: a.external ? "noopener noreferrer" : null }, ico, a.label);
  }
  if (a.type === "scroll") return h("button", { type: "button", onclick: () => { if (mobile()) hide(); const el = document.getElementById(a.target); if (el) el.scrollIntoView({ behavior: "smooth" }); else location.href = `/#${a.target}`; } }, ico, a.label);
  if (a.type === "report") return h("button", { type: "button", onclick: () => showReport() }, ico, a.label);
  if (a.type === "ask") return h("button", { type: "button", onclick: () => send(a.label) }, ico, a.label);
  return null;
}

/* ------------------------------------------------------------ messages */
function avatarSrc() { const img = $(".bot-launcher img"); return img ? img.getAttribute("src") : "/assets/bot/avatar.webp"; }
function addMsg(role, text, actions = [], { save = true } = {}) {
  const bubble = h("div", { class: "msg__bubble" });
  bubble.append(render(text));
  const row = h("div", { class: `msg msg--${role === "user" ? "user" : "bot"}` }, role === "user" ? null : h("img", { class: "msg__av", src: avatarSrc(), alt: "", width: 34, height: 34 }), bubble);
  const acts = actions.map(actionEl).filter(Boolean);
  if (acts.length) bubble.append(h("div", { class: "msg__actions" }, acts));
  ui.body.append(row);
  scrollDown();
  if (save) { history.push({ role, text, actions }); persist(); }
  return { row, bubble };
}
function scrollDown() { requestAnimationFrame(() => { ui.body.scrollTop = ui.body.scrollHeight; }); }
function persist() { session.set(KEY, JSON.stringify(history.slice(-30))); }
function setChips(list) {
  ui.chips.replaceChildren(...(list || []).slice(0, 6).map((q) => h("button", { type: "button", onclick: () => (q === "Report an issue" ? showReport() : send(q)) }, q)));
  ui.chips.hidden = !list || !list.length;
}

/* --------------------------------------------------------------- send */
async function send(text) {
  const q = String(text || "").trim().slice(0, MAX_LEN);
  if (!q || busy) return;
  showChat();
  busy = true; ui.send.disabled = true;
  ui.input.value = ""; autosize();
  addMsg("user", q);
  setChips([]);
  const { row, bubble } = addMsg("bot", "", [], { save: false });
  bubble.replaceChildren(h("span", { class: "typing", "aria-label": "Mini Bapan is typing" }, h("i"), h("i"), h("i")));
  let full = "", actions = [], ok = false;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/x-ndjson" },
      body: JSON.stringify({ messages: history.slice(-11).map((m) => ({ role: m.role, content: m.text.slice(0, 1500) })), page: location.pathname, lang: navigator.language }),
    });
    if (!res.ok || !res.body) throw new Error(String(res.status));
    const reader = res.body.getReader(), td = new TextDecoder();
    let buf = "", frame = 0;
    const paint = () => { frame = 0; bubble.replaceChildren(render(full)); bubble.classList.add("caret"); scrollDown(); };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += td.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line) continue;
        let ev; try { ev = JSON.parse(line); } catch { continue; }
        if (ev.t === "d") { full += ev.v; ok = true; if (!frame) frame = requestAnimationFrame(paint); }
        else if (ev.t === "a" && Array.isArray(ev.v)) actions = ev.v;
        else if (ev.t === "err" && !full) throw new Error(ev.v || "stream");
      }
    }
    if (!ok) throw new Error("empty");
  } catch {
    // offline / no AI service → answer from the local knowledge engine
    try {
      if (!engine) await loadKb();
      const r = engine.answer(q);
      full = ""; actions = r.actions;
      await typeOut(r.text, (t) => { full = t; bubble.replaceChildren(render(t)); bubble.classList.add("caret"); scrollDown(); });
      if (r.chips && r.chips.length) setTimeout(() => setChips(r.chips), 300);
    } catch {
      full = "I'm having trouble connecting right now. You can reach Bapan directly on WhatsApp or by email — he replies fast.";
      actions = [{ type: "scroll", label: "Contact options", target: "contact", icon: "send" }];
    }
  }
  bubble.classList.remove("caret");
  bubble.replaceChildren(render(full));
  const acts = actions.map(actionEl).filter(Boolean);
  if (acts.length) bubble.append(h("div", { class: "msg__actions" }, acts));
  history.push({ role: "bot", text: full, actions });
  persist();
  scrollDown();
  busy = false; ui.send.disabled = !ui.input.value.trim();
  if (!mobile()) ui.input.focus({ preventScroll: true });
  row.dataset.done = "1";
}
function typeOut(text, onUpdate) {
  return new Promise((resolve) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { onUpdate(text); return resolve(); }
    let i = 0;
    const step = () => { i = Math.min(text.length, i + Math.max(2, Math.round(text.length / 90))); onUpdate(text.slice(0, i)); i < text.length ? setTimeout(step, 14) : resolve(); };
    setTimeout(step, 380);
  });
}

/* -------------------------------------------------------------- report */
const TYPES = ["Something is broken", "Broken link", "Wrong or outdated info", "Display / design problem", "Suggestion", "Other"];
function showReport() {
  showChat(false);
  ui.chips.hidden = true;
  const status = h("p", { class: "form-status", role: "status" });
  const typeSel = h("select", { name: "issueType" }, TYPES.map((t) => h("option", {}, t)));
  const msg = h("textarea", { name: "message", rows: 5, maxlength: 2000, required: true, placeholder: "What happened, and on which page or section?" });
  const mail = h("input", { name: "email", type: "email", maxlength: 120, autocomplete: "email", placeholder: "you@example.com (optional, for a reply)" });
  const hp = h("input", { name: "company_website", tabindex: "-1", autocomplete: "off" });
  const submit = h("button", { class: "btn btn--gold btn--sm", type: "submit" }, icon("send"), h("span", { text: "Send report" }));
  const form = h("form", { class: "bot__report", novalidate: true },
    h("h3", { text: "Report an issue" }),
    h("p", { text: "Spotted a bug, a broken link or something outdated? It goes straight to Bapan's inbox." }),
    h("label", { class: "field" }, h("span", { text: "Type" }), typeSel),
    h("label", { class: "field" }, h("span", { text: "Details" }), msg),
    h("label", { class: "field" }, h("span", {}, "Your email ", h("em", { text: "(optional)" })), mail),
    h("label", { class: "hp", "aria-hidden": "true" }, "Leave empty", hp),
    status,
    h("div", { class: "actions" }, h("button", { class: "btn btn--quiet btn--sm", type: "button", onclick: () => showChat() }, "Cancel"), submit),
  );
  formToken();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = msg.value.trim(), email = mail.value.trim();
    if (message.length < 8) { status.textContent = "Please add a few more details."; status.className = "form-status is-err"; msg.focus(); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { status.textContent = "That email doesn't look right."; status.className = "form-status is-err"; mail.focus(); return; }
    submit.disabled = true; submit.lastElementChild.textContent = "Sending…";
    const ref = ticketId("BG-IS");
    try {
      const { token, at } = await formToken();
      const wait = 2600 - (Date.now() - at); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const res = await fetch("/api/contact", {
        method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ kind: "issue", issueType: typeSel.value, message, email, company_website: hp.value, token, page: location.href, viewport: `${innerWidth}×${innerHeight}`, ua: navigator.userAgent.slice(0, 200), elapsed: performance.now() | 0 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "failed");
      showChat();
      addMsg("bot", `Thank you! 🙏 Your report is with Bapan now — reference **${data.ticket || ref}**.${email ? " You'll get a confirmation email too." : ""}`, []);
      toast("Issue reported — thank you!");
    } catch (err) {
      const subject = encodeURIComponent(`[Portfolio issue] ${typeSel.value}`);
      const body = encodeURIComponent(`${message}\n\nPage: ${location.href}\nRef: ${ref}`);
      const mailTo = kb ? `mailto:${[...new TextDecoder().decode(Uint8Array.from(atob(kb.person.contact.e), (c) => c.charCodeAt(0)))].reverse().join("")}?subject=${subject}&body=${body}` : null;
      status.replaceChildren(String(err.message || "").length > 8 && !/fetch|network/i.test(err.message) ? err.message : "Couldn't send right now. ", mailTo ? h("a", { href: mailTo, text: "Email it instead →" }) : "");
      status.className = "form-status is-err";
      submit.disabled = false; submit.lastElementChild.textContent = "Send report";
    }
  });
  ui.body.replaceChildren(form);
  ui.foot.hidden = true;
  setTimeout(() => typeSel.focus(), 50);
}

function showChat(rebuild = true) {
  if (!ui) return;
  ui.foot.hidden = false;
  if (rebuild && !ui.body.querySelector(".msg")) {
    ui.body.replaceChildren();
    history.forEach((m) => addMsg(m.role, m.text, m.actions, { save: false }));
    if (!history.length) greet();
  }
}

/* ---------------------------------------------------------------- voice */
function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { ui.mic.hidden = true; return; }
  ui.mic.addEventListener("click", () => {
    if (recog) { recog.stop(); return; }
    recog = new SR();
    recog.lang = /^(hi|bn)/.test(navigator.language) ? navigator.language : "en-IN";
    recog.interimResults = true;
    recog.onresult = (e) => {
      const r = Array.from(e.results).map((x) => x[0].transcript).join(" ");
      ui.input.value = r.slice(0, MAX_LEN); autosize();
      if (e.results[e.results.length - 1].isFinal) { recog.stop(); setTimeout(() => send(ui.input.value), 200); }
    };
    recog.onend = () => { recog = null; ui.mic.classList.remove("is-on"); ui.mic.setAttribute("aria-label", "Speak your question"); };
    recog.onerror = () => { toast("Couldn't hear that — please type instead.", "err"); };
    ui.mic.classList.add("is-on"); ui.mic.setAttribute("aria-label", "Stop listening");
    recog.start();
  });
}

/* ---------------------------------------------------------------- shell */
function autosize() {
  ui.input.style.setProperty("height", "auto");
  ui.input.style.setProperty("height", Math.min(120, ui.input.scrollHeight) + "px");
  ui.send.disabled = busy || !ui.input.value.trim();
}
function greet() {
  const name = (kb && kb.bot.name) || "Mini Bapan";
  addMsg("bot", (kb && kb.bot.greeting) || `Namaste! 🙏 I'm ${name}, Bapan Ghosh's personal assistant. Ask me anything about his work.`, [], { save: false });
  setChips([...((kb && kb.bot.suggestions) || []), "Report an issue"]);
}
function build() {
  const name = (kb && kb.bot.name) || "Mini Bapan";
  const role = (kb && kb.bot.role) || "Bapan's personal assistant";
  const input = h("textarea", { rows: 1, maxlength: MAX_LEN, placeholder: `Ask ${name} anything…`, "aria-label": `Message ${name}`, enterkeyhint: "send" });
  const send_ = h("button", { class: "bot__send", type: "submit", "aria-label": "Send message", disabled: true }, icon("send"));
  const mic = h("button", { class: "bot__mic", type: "button", "aria-label": "Speak your question" }, icon("mic"));
  const form = h("form", { class: "bot__form" }, input, mic, send_);
  const body = h("div", { class: "bot__body", role: "log", "aria-live": "polite", "aria-relevant": "additions" });
  const chips = h("div", { class: "bot__chips", role: "group", "aria-label": "Suggested questions" });
  const foot = h("div", { class: "bot__foot" }, form, h("p", { class: "bot__note", text: "Answers come from Bapan's portfolio. For anything important, reach him directly." }));
  const el = h("section", { class: "bot", role: "dialog", "aria-label": `Chat with ${name}` },
    h("header", { class: "bot__head" },
      h("span", { class: "bot__avatar" }, h("img", { src: avatarSrc(), alt: "", width: 46, height: 46 })),
      h("span", { class: "bot__who" }, h("b", { text: name }), h("span", { text: `${role} · online` })),
      h("button", { class: "icon-btn", type: "button", "aria-label": "Report an issue", title: "Report an issue", onclick: () => showReport() }, icon("bug")),
      h("button", { class: "icon-btn", type: "button", "aria-label": "Start a new chat", title: "New chat", onclick: () => { history = []; persist(); ui.body.replaceChildren(); showChat(); } }, icon("refresh-cw")),
      h("button", { class: "icon-btn", type: "button", "aria-label": "Close chat", title: "Close", onclick: () => hide() }, icon("x")),
    ),
    body, chips, foot,
  );
  ui = { el, body, chips, foot, input, send: send_, mic };
  form.addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(input.value); } });
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  initVoice();
  try { history = JSON.parse(session.get(KEY) || "[]"); } catch { history = []; }
  showChat();
}

function show() {
  const host = document.getElementById("bot-root") || document.body;
  if (!ui.el.isConnected) host.append(ui.el);
  ui.el.classList.remove("is-closing");
  document.body.classList.add("bot-open");
  session.set("bg-bot-open", "1");
  if (mobile()) { lockScroll(true); release = trapFocus(ui.el); }
}
export function hide() {
  if (!ui || !ui.el.isConnected) return;
  if (recog) recog.stop();
  ui.el.classList.add("is-closing");
  document.body.classList.remove("bot-open");
  session.del("bg-bot-open");
  if (release) { release(); release = null; lockScroll(false); }
  setTimeout(() => { if (ui.el.classList.contains("is-closing")) ui.el.remove(); }, 340);
  const l = $(".bot-launcher"); if (l) l.focus({ preventScroll: true });
}

export async function open(opts = {}) {
  try { await loadKb(); } catch { /* engine falls back to generic replies */ }
  if (!ui) build();
  show();
  if (opts.view === "report") showReport();
  else if (opts.ask) send(opts.ask);
  else if (!opts.restore && !mobile()) setTimeout(() => ui.input.focus({ preventScroll: true }), 80);
}

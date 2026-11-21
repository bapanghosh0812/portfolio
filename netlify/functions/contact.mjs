// /api/contact
//   GET  → short-lived anti-spam token
//   POST → contact message or issue report: emails Bapan (Gmail SMTP) and sends the visitor a luxury auto-reply.
// Secrets: SMTP_USER, SMTP_PASS (Gmail app password), optional CONTACT_INBOX, FORM_SECRET — set in Netlify only.
import nodemailer from "nodemailer";
import { createHmac, createHash, timingSafeEqual, randomBytes } from "node:crypto";
import { resolveMx } from "node:dns/promises";
import data from "../../data/portfolio.json" with { type: "json" };
import { json, originAllowed, clientIp, limited, readJson, cleanText } from "../lib/http.mjs";
import { autoReplyEmail, notifyEmail } from "../lib/email.mjs";
import { renderTimer, timeParts } from "../lib/timer.mjs";

export const config = {
  path: "/api/contact",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

const TOPICS = ["Full-time role", "Internship", "Freelance / project", "Collaboration", "Just saying hello"];
const ISSUES = ["Something is broken", "Broken link", "Wrong or outdated info", "Display / design problem", "Suggestion", "Other"];
const SITE = data.site.url;

const smtpUser = () => String(process.env.SMTP_USER || "").trim();
const smtpPass = () => String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
const fallbackKey = randomBytes(32);
const secret = () => (process.env.FORM_SECRET ? String(process.env.FORM_SECRET) : smtpPass() ? createHash("sha256").update(`bg-form:${smtpPass()}`).digest() : fallbackKey);
const sign = (ts) => createHmac("sha256", secret()).update(`v1.${ts}`).digest("base64url").slice(0, 32);

function issueToken() { const ts = Date.now().toString(36); return `${ts}.${sign(ts)}`; }
function tokenOk(tok) {
  const [ts, mac] = String(tok || "").split(".");
  if (!ts || !mac) return false;
  const expect = Buffer.from(sign(ts)), got = Buffer.from(mac);
  if (expect.length !== got.length || !timingSafeEqual(expect, got)) return false;
  const age = Date.now() - parseInt(ts, 36);
  return age >= 2200 && age <= 2 * 3600e3;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,79}$/u;
const urlCount = (s) => (String(s).match(/https?:\/\/|www\./gi) || []).length;
const ticket = (p) => `${p}-${Date.now().toString(36).slice(-5).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}`;

async function mailboxExists(email) {
  const domain = email.split("@")[1];
  try {
    const mx = await Promise.race([resolveMx(domain), new Promise((r) => setTimeout(() => r("timeout"), 2500))]);
    return mx === "timeout" || (Array.isArray(mx) && mx.length > 0);
  } catch (e) {
    return !["ENOTFOUND", "ENODATA", "ESERVFAIL"].includes(e && e.code);
  }
}

let transporter = null;
const transport = () => (transporter ||= nodemailer.createTransport({
  host: "smtp.gmail.com", port: 465, secure: true,
  auth: { user: smtpUser(), pass: smtpPass() },
  connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000,
}));

export default async (req, context) => {
  if (req.method === "GET") return json({ token: issueToken() }, 200, { "cache-control": "no-store" });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, { allow: "GET, POST" });
  if (!originAllowed(req)) return json({ error: "Forbidden" }, 403);

  const ip = clientIp(req, context);
  if (limited(`ct:m:${ip}`, 5, 10 * 60e3) || limited(`ct:d:${ip}`, 20, 864e5) || limited("ct:global", 80, 36e5)) {
    return json({ error: "Too many messages from this connection — please try again a little later, or use WhatsApp." }, 429, { "retry-after": "600" });
  }

  let b;
  try { b = await readJson(req, 16_000); } catch (e) { return json({ error: e.message }, e.status || 400); }
  const kind = b.kind === "issue" ? "issue" : "contact";

  // Honeypot: bots fill hidden fields — pretend success, send nothing.
  if (cleanText(b.company_website, 200)) return json({ ok: true, ticket: ticket(kind === "issue" ? "BG-IS" : "BG") });
  if (!tokenOk(b.token)) return json({ error: "Your session expired — please refresh the page and send again." }, 400);
  if (!smtpUser() || !smtpPass()) return json({ error: `Messaging is being set up — please email ${data.person.contact.email} directly.` }, 503);

  const email = cleanText(b.email, 120).toLowerCase();
  const message = cleanText(b.message, kind === "issue" ? 2000 : 3000);
  if (email && (/[\r\n]/.test(email) || !EMAIL_RE.test(email))) return json({ error: "Please enter a valid email address." }, 400);
  if (urlCount(message) > 3) return json({ error: "Please include fewer links in your message." }, 400);

  const id = ticket(kind === "issue" ? "BG-IS" : "BG");
  const country = context && context.geo ? [context.geo.city, context.geo.country && context.geo.country.name].filter(Boolean).join(", ") : "";
  const meta = { Ticket: id, Page: cleanText(b.page, 200), Location: country, Device: cleanText(b.ua, 200), Viewport: cleanText(b.viewport, 20), "Received (IST)": new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) };

  let fields, subject, firstName = "", topic, wantsReply;
  if (kind === "contact") {
    const name = cleanText(b.name, 80).replace(/\s+/g, " ");
    const phone = cleanText(b.phone, 20);
    topic = TOPICS.includes(b.topic) ? b.topic : "General";
    if (!NAME_RE.test(name) || urlCount(name)) return json({ error: "Please enter your name (letters only)." }, 400);
    if (!email) return json({ error: "Please enter your email so Bapan can reply." }, 400);
    if (message.length < 10) return json({ error: "Please write a slightly longer message." }, 400);
    if (phone && !/^[+\d(][\d\s()-]{6,19}$/.test(phone)) return json({ error: "Please check the phone number." }, 400);
    if (!(await mailboxExists(email))) return json({ error: "That email address doesn't seem to receive mail — please double-check it." }, 400);
    firstName = name.split(" ")[0].slice(0, 24);
    fields = { Name: name, Email: email, Phone: phone, Topic: topic, Message: message };
    subject = `✦ ${name} — ${topic} (${id})`;
    wantsReply = true;
  } else {
    topic = ISSUES.includes(b.issueType) ? b.issueType : "Other";
    if (message.length < 8) return json({ error: "Please add a few more details." }, 400);
    fields = { Type: topic, Details: message, Email: email };
    subject = `🐞 Portfolio issue — ${topic} (${id})`;
    wantsReply = !!email && (await mailboxExists(email));
  }
  if (email && wantsReply && limited(`ct:to:${email}`, 3, 864e5)) wantsReply = false;

  const from = { name: "Bapan Ghosh", address: smtpUser() };
  // the peacock "timer photo" frozen at the moment this message arrived (IST)
  const now = new Date();
  let timer = null, when = "";
  try {
    const t = timeParts(now);
    when = `${t.weekday}, ${t.day} ${t.month} ${t.year} · ${t.hour}:${t.minute} ${t.ampm} IST`;
    timer = { filename: "received-at.png", content: renderTimer(now), cid: "timer@bapanghosh", contentType: "image/png", contentDisposition: "inline" };
  } catch (err) {
    console.warn("[contact] timer image skipped:", err && err.message);
  }
  const attachments = timer ? [timer] : [];
  try {
    const note = notifyEmail({ site: SITE, kind, fields, ticket: id, meta, when: timer ? when : "" });
    await transport().sendMail({
      from: { name: "Portfolio · Mini Bapan", address: smtpUser() },
      to: process.env.CONTACT_INBOX || smtpUser(),
      replyTo: email || undefined,
      subject,
      text: note.text,
      html: note.html,
      attachments,
      headers: { "X-Entity-Ref-ID": id },
    });
  } catch (err) {
    console.error("[contact] notify failed:", err && (err.code || err.responseCode || err.message));
    return json({ error: `Couldn't deliver right now — please email ${data.person.contact.email} or WhatsApp instead.` }, 502);
  }

  if (wantsReply) {
    const social = Object.fromEntries(data.person.socials.map((s) => [s.id, s.url]));
    const mail = autoReplyEmail({ site: SITE, firstName, topic, ticket: id, email: data.person.contact.email, whatsapp: data.person.contact.whatsapp, linkedin: social.linkedin, kind, when: timer ? when : "" });
    try {
      await transport().sendMail({
        from,
        to: email,
        replyTo: data.person.contact.email,
        subject: kind === "issue" ? `Thanks for the report 🙏 — ref ${id}` : `Namaste${firstName ? " " + firstName : ""} 🙏 — thank you for reaching out to Bapan Ghosh`,
        text: mail.text,
        html: mail.html,
        attachments,
        headers: { "Auto-Submitted": "auto-replied", "X-Auto-Response-Suppress": "All", "X-Entity-Ref-ID": id },
      });
    } catch (err) {
      console.warn("[contact] auto-reply failed:", err && (err.code || err.responseCode || err.message));
    }
  }
  return json({ ok: true, ticket: id });
};

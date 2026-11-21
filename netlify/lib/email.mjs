// Luxury HTML emails (table layout + inline styles so they render in Gmail, Outlook and Apple Mail).
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

const GOLD = "#D4AF37", INK = "#0A0A0B", CARD = "#121214", IVORY = "#F3EDDF", MUTED = "#A69F8D";
const SERIF = "'Cormorant Garamond', Garamond, Georgia, 'Times New Roman', serif";
const SANS = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function shell({ site, preheader, inner }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>Bapan Ghosh</title></head>
<body style="margin:0;padding:0;background:${INK};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${INK};">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${INK}" style="background:${INK};">
<tr><td align="center" style="padding:32px 14px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td align="center" style="padding:0 0 22px;">
  <a href="${site}/?utm_source=email&amp;utm_medium=autoreply" style="text-decoration:none;"><img src="${site}/assets/email/logo.png" width="64" height="64" alt="BG" style="display:block;border:0;border-radius:16px;"></a>
</td></tr>
<tr><td bgcolor="${CARD}" style="background:${CARD};border:1px solid #3a3220;border-radius:22px;overflow:hidden;">
${inner}
</td></tr>
<tr><td align="center" style="padding:26px 10px 6px;font:400 12px/1.7 ${SANS};color:#6E695D;">
  © ${new Date().getFullYear()} Bapan Ghosh · Bankura, West Bengal, India<br>
  <a href="${site}" style="color:${MUTED};text-decoration:underline;">${site.replace(/^https?:\/\//, "")}</a> · You received this because you contacted Bapan through his portfolio.
</td></tr>
</table></td></tr></table></body></html>`;
}

/** "Received at" timer photo (attached inline as cid:timer@bapanghosh by the contact function). */
const timerBlock = (when) => when ? `
<tr><td align="center" style="padding:26px 26px 0;">
  <img src="cid:timer@bapanghosh" width="540" alt="Received ${esc(when)}" style="display:block;width:100%;max-width:540px;height:auto;border:0;border-radius:14px;">
  <p style="margin:10px 0 0;font:400 12.5px/1.5 ${SANS};color:${MUTED};">Received ${esc(when)}</p>
</td></tr>` : "";

const button = (href, label, primary = true) =>
  `<a href="${href}" style="display:inline-block;margin:6px 4px;padding:14px 22px;border-radius:999px;font:600 14px/1 ${SANS};text-decoration:none;${primary ? `background:${GOLD};color:#16120A;border:1px solid ${GOLD};` : `background:transparent;color:${IVORY};border:1px solid #5c4d22;`}">${label}</a>`;

/** Auto-reply to the visitor. Their message is intentionally NOT echoed back (prevents spam reflection). */
export function autoReplyEmail({ site, firstName, topic, ticket, email, whatsapp, linkedin, kind = "contact", when = "" }) {
  const isIssue = kind === "issue";
  const hello = firstName ? `Namaste, ${esc(firstName)}` : "Namaste";
  const lead = isIssue
    ? "Thank you for taking a moment to report this. Your note has reached Bapan directly, and he reviews every report personally."
    : "Thank you for reaching out. Your message has reached Bapan Ghosh directly — he'll get back to you very soon by email or phone.";
  const inner = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="height:4px;background:${GOLD};background-image:linear-gradient(90deg,#F6E7B6,${GOLD},#9A7520);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:0;line-height:0;font-size:0;">
  <img src="${site}/assets/email/namaste.jpg" width="598" alt="Bapan Ghosh greeting you with a Namaste" style="display:block;width:100%;max-width:598px;height:auto;border:0;">
</td></tr>
<tr><td align="center" style="padding:26px 34px 0;">
  <p style="margin:0;font:600 12px/1 ${SANS};letter-spacing:4px;text-transform:uppercase;color:${GOLD};">${isIssue ? "Issue received" : "Message received"}</p>
  <h1 style="margin:14px 0 0;font:600 40px/1.1 ${SERIF};color:${IVORY};">${hello} <span style="font-weight:400;">🙏</span></h1>
  <p style="margin:18px 0 0;font:400 16px/1.75 ${SANS};color:#E2DCCD;">${lead}</p>
</td></tr>
<tr><td style="padding:26px 34px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #3a3220;border-radius:16px;">
    <tr><td style="padding:18px 20px;font:400 14px/1.7 ${SANS};color:${MUTED};">
      <span style="color:${GOLD};font-weight:600;letter-spacing:1px;">REFERENCE</span>&nbsp;&nbsp;<span style="color:${IVORY};font-family:Consolas,Menlo,monospace;">${esc(ticket)}</span><br>
      ${isIssue ? "Type" : "Topic"}: <span style="color:${IVORY};">${esc(topic)}</span><br>
      Typical reply time: <span style="color:${IVORY};">within 24 hours</span>
    </td></tr>
  </table>
</td></tr>${timerBlock(when)}
<tr><td align="center" style="padding:30px 26px 8px;">
  ${button(`${site}/?utm_source=email&amp;utm_medium=autoreply`, "Return to the portfolio")}
  ${button(`${site}/#projects`, "Explore projects", false)}
  ${button(`${site}/Bapan_Ghosh_Resume.pdf`, "Résumé", false)}
</td></tr>
<tr><td style="padding:26px 34px 34px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #2c271a;">
    <tr><td style="padding-top:22px;font:400 14px/1.8 ${SANS};color:${MUTED};">
      <img src="${site}/assets/email/wordmark.png" width="190" alt="Bapan Ghosh" style="display:block;width:190px;height:auto;border:0;margin:0 0 6px;">
      Full-Stack &amp; Cross-Platform Developer · B.Tech IT, Class of 2027<br>
      <a href="mailto:${esc(email)}" style="color:${GOLD};text-decoration:none;">${esc(email)}</a> &nbsp;·&nbsp;
      <a href="https://wa.me/${esc(whatsapp)}" style="color:${GOLD};text-decoration:none;">WhatsApp</a> &nbsp;·&nbsp;
      <a href="${esc(linkedin)}" style="color:${GOLD};text-decoration:none;">LinkedIn</a><br>
      <span style="color:#6E695D;font-size:12.5px;">You can simply reply to this email — it goes straight to Bapan.</span>
    </td></tr>
  </table>
</td></tr>
</table>`;
  const text = `${hello} 🙏

${lead}

Reference: ${ticket}
${isIssue ? "Type" : "Topic"}: ${topic}${when ? `
Received: ${when}` : ""}

Portfolio: ${site}
Projects: ${site}/#projects
Résumé: ${site}/Bapan_Ghosh_Resume.pdf

— Bapan Ghosh · Full-Stack & Cross-Platform Developer
${email} · https://wa.me/${whatsapp}
(You can reply to this email directly.)`;
  return { html: shell({ site, preheader: isIssue ? `Thanks for the report — ref ${ticket}` : `Bapan will reply soon — ref ${ticket}`, inner }), text };
}

/** Notification to Bapan with everything needed to reply in one tap. */
export function notifyEmail({ site, kind, fields, ticket, meta, when = "" }) {
  const rows = Object.entries(fields).filter(([, v]) => v).map(([k, v]) => `
    <tr><td style="padding:10px 14px;border-bottom:1px solid #2c271a;font:600 11px/1.5 ${SANS};letter-spacing:1.5px;text-transform:uppercase;color:${GOLD};vertical-align:top;width:120px;">${esc(k)}</td>
    <td style="padding:10px 14px;border-bottom:1px solid #2c271a;font:400 15px/1.65 ${SANS};color:${IVORY};white-space:pre-wrap;word-break:break-word;">${esc(v)}</td></tr>`).join("");
  const metaRows = Object.entries(meta).filter(([, v]) => v).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join("<br>");
  const reply = fields.Email ? `<a href="mailto:${esc(fields.Email)}?subject=${encodeURIComponent("Re: your message on bapanghosh.netlify.app")}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:${GOLD};color:#16120A;font:600 14px/1 ${SANS};text-decoration:none;">Reply to ${esc(fields.Name || fields.Email)}</a>` : "";
  const inner = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="height:4px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:30px 30px 10px;">
  <p style="margin:0;font:600 12px/1 ${SANS};letter-spacing:4px;text-transform:uppercase;color:${GOLD};">${kind === "issue" ? "Issue report" : "New portfolio message"} · ${esc(ticket)}</p>
  <h1 style="margin:12px 0 0;font:600 32px/1.15 ${SERIF};color:${IVORY};">${kind === "issue" ? "Someone reported an issue" : `${esc(fields.Name || "Someone")} wants to connect`}</h1>
</td></tr>
<tr><td style="padding:14px 30px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #2c271a;border-radius:14px;">${rows}</table></td></tr>${timerBlock(when)}
<tr><td style="padding:20px 30px 8px;">${reply}</td></tr>
<tr><td style="padding:10px 30px 30px;font:400 12px/1.7 ${SANS};color:#6E695D;">${metaRows}</td></tr>
</table>`;
  const text = `${kind === "issue" ? "ISSUE REPORT" : "NEW PORTFOLIO MESSAGE"} — ${ticket}\n\n${Object.entries(fields).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${Object.entries(meta).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}`;
  return { html: shell({ site, preheader: `${fields.Name || "Visitor"} — ${fields.Topic || fields.Type || ""}`, inner }), text };
}

// POST /api/chat — Mini Bapan. Streams NDJSON: {"t":"d","v":"text"} … {"t":"a","v":[actions]} {"t":"done"}
import raw from "../../data/portfolio.json" with { type: "json" };
import { createEngine, toKb, visibleData } from "../../src/scripts/bot-engine.js";
import { buildSystemPrompt, extractActions, scrub, CANARY } from "../lib/knowledge.mjs";
import { getGithubFeed, feedForPrompt } from "../lib/github.mjs";
import { plan } from "../lib/providers.mjs";
import { json, originAllowed, clientIp, limited, readJson, cleanText, SECURITY_HEADERS } from "../lib/http.mjs";

export const config = {
  path: "/api/chat",
  rateLimit: { windowLimit: 24, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

const data = visibleData(raw); // hidden projects never reach the assistant
const engine = createEngine(toKb(data, { encodeContact: false }));
const FIRST_TOKEN_MS = 9000;
const TOTAL_MS = 25000;

function validate(body) {
  const msgs = Array.isArray(body && body.messages) ? body.messages.slice(-12) : null;
  if (!msgs || !msgs.length) return null;
  const out = msgs.map((m) => ({ role: m && m.role === "user" ? "user" : "assistant", content: cleanText(m && m.content, 1500) })).filter((m) => m.content);
  const last = out[out.length - 1];
  if (!last || last.role !== "user" || last.content.length > 600) return null;
  return out;
}

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, { allow: "POST" });
  if (!originAllowed(req)) return json({ error: "Forbidden" }, 403);
  const ip = clientIp(req, context);
  if (limited(`chat:m:${ip}`, 14, 60e3) || limited(`chat:d:${ip}`, 250, 864e5) || limited("chat:global", 1500, 36e5)) {
    return json({ error: "You're sending messages very quickly — please wait a moment." }, 429, { "retry-after": "30" });
  }
  let body;
  try { body = await readJson(req, 32_000); } catch (e) { return json({ error: e.message }, e.status || 400); }
  const messages = validate(body);
  if (!messages) return json({ error: "Please send a shorter message." }, 400);
  const page = cleanText(body.page, 120).replace(/[^\w\-/#.]/g, "");
  const question = messages[messages.length - 1].content;

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      const local = async () => {
        const r = engine.answer(question);
        const parts = r.text.match(/[\s\S]{1,48}/g) || [r.text];
        for (const p of parts) send({ t: "d", v: p });
        send({ t: "a", v: r.actions });
      };
      try {
        const attempts = plan();
        if (!attempts.length) { await local(); send({ t: "done", mode: "local" }); return controller.close(); }

        const feed = await Promise.race([getGithubFeed({ username: data.github.username, exclude: data.github.exclude }), new Promise((r) => setTimeout(() => r(null), 1800))]);
        const convo = messages.slice(-4).map((m) => m.content).join(" \n ");
        const system = buildSystemPrompt(data, { feedText: feedForPrompt(feed), convo, page });

        let full = "", emitted = 0, done = false;
        for (const a of attempts) {
          const ctrl = new AbortController();
          const kill = setTimeout(() => ctrl.abort(), TOTAL_MS);
          const firstGuard = setTimeout(() => { if (!full) ctrl.abort(); }, FIRST_TOKEN_MS);
          try {
            let pending = "";
            for await (const chunk of a.run({ key: a.key, model: a.model, system, messages, signal: ctrl.signal })) {
              full += chunk;
              if (full.includes(CANARY)) throw Object.assign(new Error("leak"), { leak: true });
              pending += chunk;
              // flush on sentence / line boundaries so the safety filter sees whole phrases
              const cut = Math.max(pending.lastIndexOf("\n"), pending.lastIndexOf(". "), pending.lastIndexOf("! "), pending.lastIndexOf("? "));
              if (cut > 24 || pending.length > 220) {
                const head = cut > 24 ? pending.slice(0, cut + 1) : pending;
                pending = cut > 24 ? pending.slice(cut + 1) : "";
                const safe = scrub(head);
                if (safe) { send({ t: "d", v: safe }); emitted += safe.length; }
              }
            }
            const tail = scrub(pending);
            if (tail) { send({ t: "d", v: tail }); emitted += tail.length; }
            done = emitted > 0;
          } catch (err) {
            if (err && err.leak) {
              send({ t: "d", v: "\n\nI keep my instructions private — but I'm happy to tell you anything about Bapan's work!" });
              done = true;
            } else if (emitted > 0) {
              send({ t: "d", v: "…" });
              done = true;
            } else {
              const why = err && err.detail ? String(err.detail).replace(/\s+/g, " ").match(/"message":\s*"([^"]{0,140})/) : null;
              console.warn(`[chat] ${a.name}/${a.model} failed: ${err && (err.status || err.name || err.message)}${why ? ` — ${why[1]}` : ""}`);
            }
          } finally {
            clearTimeout(kill); clearTimeout(firstGuard);
          }
          if (done) break;
          full = "";
        }
        if (!done) { await local(); send({ t: "done", mode: "local" }); return controller.close(); }
        send({ t: "a", v: extractActions(full, data) });
        send({ t: "done", mode: "live" });
      } catch (err) {
        console.error("[chat] fatal", err);
        try { await local(); } catch { send({ t: "err", v: "Something went wrong — please try again." }); }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no", ...SECURITY_HEADERS },
  });
};

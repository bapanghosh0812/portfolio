// Streaming adapters for the AI providers. Keys come only from environment variables.
// Each adapter is an async generator yielding plain text chunks.

export class ProviderError extends Error {
  constructor(provider, status, detail) { super(`${provider} ${status}`); this.status = status; this.detail = detail; }
}

async function* sse(body) {
  const reader = body.getReader(); const td = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += td.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i); buf = buf.slice(i + 2);
      const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
      if (data) yield data;
    }
  }
  if (buf.trim().startsWith("data:")) yield buf.trim().slice(5).trim();
}

/** Merge consecutive same-role turns and make sure the conversation starts with the user. */
function normalise(messages) {
  const out = [];
  for (const m of messages) {
    const role = m.role === "user" ? "user" : "assistant";
    if (!out.length && role !== "user") continue;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += `\n\n${m.content}`;
    else out.push({ role, content: m.content });
  }
  return out;
}

export async function* gemini({ key, model, system, messages, signal }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: normalise(messages).map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })),
    generationConfig: { temperature: 0.55, topP: 0.9, maxOutputTokens: 1200 },
    safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"].map((category) => ({ category, threshold: "BLOCK_MEDIUM_AND_ABOVE" })),
  };
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body), signal });
  if (!res.ok || !res.body) throw new ProviderError("gemini", res.status, (await res.text().catch(() => "")).slice(0, 300));
  for await (const data of sse(res.body)) {
    let j; try { j = JSON.parse(data); } catch { continue; }
    const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
    for (const p of parts) if (p.text && !p.thought) yield p.text;
  }
}

export async function* groq({ key, model, system, messages, signal }) {
  const body = {
    model,
    messages: [{ role: "system", content: system }, ...normalise(messages)],
    temperature: 0.55,
    max_tokens: 900,
    stream: true,
    ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
  };
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify(body), signal,
  });
  if (!res.ok || !res.body) throw new ProviderError("groq", res.status, (await res.text().catch(() => "")).slice(0, 300));
  for await (const data of sse(res.body)) {
    if (data === "[DONE]") break;
    let j; try { j = JSON.parse(data); } catch { continue; }
    const d = (((j.choices || [])[0] || {}).delta || {}).content;
    if (d) yield d;
  }
}

const uniq = (a) => [...new Set(a.filter(Boolean))];

/** Ordered list of {name, run, model} attempts based on which keys are configured. */
export function plan() {
  const order = String(process.env.BOT_PROVIDER_ORDER || "gemini,groq").split(",").map((s) => s.trim().toLowerCase());
  const out = [];
  for (const p of order) {
    if (p === "gemini" && process.env.GEMINI_API_KEY) {
      for (const model of uniq([process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.5-flash"])) out.push({ name: "gemini", model, run: gemini, key: process.env.GEMINI_API_KEY });
    }
    if (p === "groq" && process.env.GROQ_API_KEY) {
      for (const model of uniq([process.env.GROQ_MODEL, "openai/gpt-oss-120b", "llama-3.3-70b-versatile", "openai/gpt-oss-20b"])) out.push({ name: "groq", model, run: groq, key: process.env.GROQ_API_KEY });
    }
  }
  return out;
}

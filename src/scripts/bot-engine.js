// Mini Bapan — local answer engine (no network, no AI provider).
// Used in the browser when the live assistant is unreachable, and on the server when no AI key is set.
// Every answer is built from the portfolio data, so it is always accurate and up to date.

const STOP = new Set("a an the is are was were be been of to in on for with and or by at as it its this that these those he his him she her they them their you your me my we our i do does did can could would should will what which who whom whose how when where why tell about show give please kya hai hain ka ki ke ko se me mein bhi aur ya ek".split(" "));

export const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9ऀ-ॿঀ-৿+#.\- ]+/g, " ").replace(/\s+/g, " ").trim();
const words = (s) => norm(s).split(" ").filter((w) => w && !STOP.has(w));
// Whole-word / whole-phrase match; a trailing "*" means "starts with" (e.g. "collaborat*").
const has = (q, list) => list.some((k) => {
  const prefix = k.endsWith("*");
  const body = (prefix ? k.slice(0, -1) : k).replace(/[.+#?()[\]\\^$|{}]/g, "\\$&");
  return new RegExp(`(^|\\s)${body}${prefix ? "" : "(\\s|$)"}`).test(q);
});
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function detectLang(text) {
  const t = String(text || "");
  if (/[ঀ-৿]/.test(t)) return "bn";
  if (/[ऀ-ॿ]/.test(t)) return "hi";
  const hits = (norm(t).match(/\b(kya|kaise|kaisa|kaun|kon|kitna|kitne|hai|hain|batao|bata|bhai|unka|uska|unke|uske|mujhe|karo|kab|kahan|kaha|kyu|kyun|accha|acha|nahi|nhi|haan|aap|tum|woh|wo|kuch|sab|chahiye|milega|sakta|sakte|banaya|aata|aati|dikhao|bolo|samjhao|yaar|hoga|karta|karte)\b/g) || []).length;
  return hits >= 1 ? "hinglish" : "en";
}

const decodeB64Rev = (s) => {
  try { return [...new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)))].reverse().join(""); } catch { return ""; }
};

/**
 * The public view of portfolio.json: drops projects marked "hidden": true (and keeps their repos out of
 * the live GitHub feed), computes the stats and fills {projects} / {live} / {certificates} in any text.
 */
export function visibleData(raw) {
  const projects = raw.projects.filter((p) => !p.hidden);
  const counts = {
    projects: projects.length,
    live: projects.filter((p) => p.links && (p.links.live || p.links.store)).length,
    certificates: raw.certificates.length,
  };
  const hiddenRepos = raw.projects.filter((p) => p.hidden && p.links && p.links.code).map((p) => p.links.code.split("/").pop());
  const fill = (v) => (typeof v === "string" ? v.replace(/\{(projects|live|certificates)\}/g, (_, k) => String(counts[k]))
    : Array.isArray(v) ? v.map(fill) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v);
  const data = fill({ ...raw, projects });
  data.stats = data.stats.map((s) => (s.key && counts[s.key] != null ? { ...s, value: counts[s.key] } : s));
  data.github = { ...data.github, exclude: [...new Set([...(data.github.exclude || []), ...hiddenRepos])] };
  data.counts = counts;
  return data;
}

/** Convert portfolio.json into the compact knowledge object used by the engine (also used by the build). */
export function toKb(raw, { encodeContact = true } = {}) {
  const data = raw.counts ? raw : visibleData(raw);
  const enc = (s) => (typeof Buffer !== "undefined" ? Buffer.from([...s].reverse().join(""), "utf8").toString("base64") : btoa(unescape(encodeURIComponent([...s].reverse().join("")))));
  const c = data.person.contact;
  return {
    person: { ...data.person, contact: encodeContact ? { ...c, email: undefined, phones: undefined, e: enc(c.email), p: c.phones.map(enc) } : c },
    stats: data.stats, skills: data.skills, experience: data.experience, faq: data.faq, updates: data.updates, bot: data.bot, site: { url: data.site.url },
    projects: data.projects.map(({ slug, name, tagline, kind, category, tier, status, role, summary, metrics, highlights, stack, links, aliases }) => ({ slug, name, tagline, kind, category, tier, status, role, summary, metrics, highlights, stack, links, aliases })),
    certificates: data.certificates.map(({ id, title, issuer, date, type, credentialId, tags, text }) => ({ id, title, issuer, date, type, credentialId, tags, text })),
  };
}

export function createEngine(kb) {
  const P = kb.person;
  const email = P.contact.email || decodeB64Rev(P.contact.e);
  const phones = P.contact.phones || (P.contact.p || []).map(decodeB64Rev);
  const wa = `https://wa.me/${P.contact.whatsapp}`;
  const site = (kb.site && kb.site.url) || "";
  const projects = kb.projects;
  const featured = projects.filter((p) => p.tier === "featured");
  const live = projects.filter((p) => p.links.live || p.links.store);
  const lc = (s) => String(s).toLowerCase();

  const A = {
    project: (p) => ({ type: "link", label: `Open ${p.name} case study`, url: `/work/${p.slug}/`, icon: "arrow-right" }),
    live: (p) => (p.links.store ? { type: "link", label: "Google Play", url: p.links.store, icon: "play", external: true } : p.links.live ? { type: "link", label: "Live demo", url: p.links.live, icon: "arrow-up-right", external: true } : null),
    code: (p) => (p.links.code ? { type: "link", label: "Source code", url: p.links.code, icon: "code", external: true } : null),
    work: { type: "scroll", label: "See all projects", target: "projects", icon: "layers" },
    contact: { type: "scroll", label: "Contact form", target: "contact", icon: "send" },
    whatsapp: { type: "link", label: "WhatsApp", url: wa, icon: "message-circle", external: true },
    email: { type: "link", label: "Email Bapan", url: `mailto:${email}`, icon: "mail" },
    resume: { type: "link", label: "Download résumé", url: P.resume, icon: "download", external: true },
    certs: { type: "scroll", label: "View certificates", target: "certificates", icon: "award" },
    skills: { type: "scroll", label: "Skills section", target: "skills", icon: "cpu" },
    report: { type: "report", label: "Report an issue", icon: "bug" },
    ask: (q) => ({ type: "ask", label: q, icon: "sparkles" }),
  };
  const clean = (arr) => arr.filter(Boolean);
  const reply = (text, actions = [], chips = []) => ({ text, actions: clean(actions), chips });
  const T = (lang, en, hi) => (lang === "hinglish" || lang === "hi" ? hi : en);

  function findProject(q) {
    let best = null, bestLen = 0;
    for (const p of projects) {
      for (const a of [p.name, p.slug.replace(/-/g, " "), ...(p.aliases || [])]) {
        const k = norm(a);
        if (k.length >= 3 && (` ${q} `).includes(` ${k} `) && k.length > bestLen) { best = p; bestLen = k.length; }
      }
    }
    return best;
  }
  function techMentioned(q) {
    const all = new Map();
    const add = (name) => {
      const clean = name.replace(/\s*\(.*?\)\s*/g, " ").trim();
      const base = clean.replace(/\s+v?\d[\d./–-]*$/i, "").trim();
      for (const v of new Set([clean, base])) { const k = norm(v); if (k.length >= 2 && !all.has(k)) all.set(k, v); }
    };
    kb.skills.forEach((s) => s.items.forEach(add));
    projects.forEach((p) => p.stack.forEach(add));
    const alias = { "next js": "Next.js", nextjs: "Next.js", node: "Node.js", nodejs: "Node.js", js: "JavaScript", ts: "TypeScript", "react native": "React Native", k8s: "Kubernetes", golang: "Go", postgres: "PostgreSQL", mongo: "MongoDB", gemini: "Google Gemini API", aws: "AWS", ml: "Machine Learning", ai: "AI", "spring boot": "Spring Boot", spring: "Spring Boot", php: "PHP", django: "Django", vue: "Vue", svelte: "Svelte", ruby: "Ruby", rust: "Rust", "c#": "C#", ".net": ".NET", swift: "Swift" };
    for (const [k, v] of Object.entries(alias)) if (has(q, [k])) return v;
    let best = null;
    for (const [k, v] of all) if (k.length > 2 && (` ${q} `).includes(` ${k} `) && (!best || k.length > norm(best).length)) best = v;
    return best;
  }
  // whole-word match so "Java" never matches "JavaScript"
  const mentions = (text, tech) => {
    const t = norm(tech.replace(/\(.*?\)/g, ""));
    return !!t && (` ${norm(String(text).replace(/\(.*?\)/g, ""))} `).includes(` ${t} `);
  };
  const projectsUsing = (tech) => projects.filter((p) => p.stack.some((s) => mentions(s, tech)));
  const certsFor = (tech) => kb.certificates.filter((c) => mentions(`${c.title} ${(c.tags || []).join(" ")}`, tech) || (c.tags || []).some((g) => mentions(g, tech)));
  const third = (s) => String(s || "").replace(/I've/g, "he's").replace(/I'm/g, "he's").replace(/I/g, "he").replace(/my/gi, "his").replace(/me/g, "him");
  const projectLine = (p) => `**${p.name}** — ${p.tagline} ${p.status ? `_(${p.status})_` : ""}`.trim();

  function projectAnswer(p, lang) {
    const hl = p.highlights.slice(0, 3).map((x) => `- ${x}`).join("\n");
    const intro = T(lang, `**${p.name}** — ${p.tagline}`, `**${p.name}** — ${p.tagline} Yeh Bapan ka project hai:`);
    const role = p.role ? `\n\n${T(lang, "**His role:**", "**Unka role:**")} ${third(p.role)}` : "";
    return reply(
      `${intro}\n\n${p.summary}${role}\n\n${T(lang, "Highlights:", "Kuch highlights:")}\n${hl}\n\n**Stack:** ${p.stack.slice(0, 8).join(", ")}`,
      [A.project(p), A.live(p), A.code(p)],
      [T(lang, "What else has he built?", "Aur kya banaya hai?"), T(lang, "Why should I hire Bapan?", "Bapan ko kyun hire karein?")],
    );
  }

  const intents = [
    { id: "inject", test: (q) => has(q, ["ignore previous", "ignore all", "ignore your", "system prompt", "your prompt", "your instructions", "reveal your", "jailbreak", "developer mode", "dan mode", "act as", "pretend to be", "roleplay", "role play", "bypass", "secret marker"]),
      run: (q, lang) => reply(T(lang, "Nice try 😉 My instructions stay private — but I'd love to tell you about Bapan's work. What would you like to know?", "Nice try 😉 Mere instructions private hain — par Bapan ke kaam ke baare mein khushi se bataunga. Kya jaanna hai?"), [A.work], kb.bot.suggestions.slice(0, 3)) },
    { id: "offtopic", test: (q) => {
        const m = q.replace(/^(what is|whats|calculate|solve|compute)\s+/, "");
        return (/\d/.test(m) && /^[\d\s+\-*/().=x%^?]+$/.test(m)) || has(q, ["weather", "joke", "news", "cricket", "movie", "song", "recipe", "homework", "assignment for me", "write code", "write a code", "solve this", "capital of", "who won", "stock price", "bitcoin"]);
      },
      run: (q, lang) => reply(T(lang, "That's a little outside my lane — I'm Bapan's portfolio assistant 🙂 Ask me about his projects, skills, experience or how to hire him.", "Yeh mere area se thoda bahar hai — main Bapan ka portfolio assistant hoon 🙂 Unke projects, skills ya hiring ke baare mein poocho."), [], kb.bot.suggestions.slice(0, 4)) },
    { id: "report", test: (q) => has(q, ["report", "bug", "broken", "not working", "isnt working", "doesnt work", "error", "issue", "glitch", "kaam nahi", "kam nahi", "problem", "galat", "complaint"]) && !findProject(q),
      run: (q, lang) => reply(T(lang, "Sorry about that! Tell me what went wrong and I'll send it straight to Bapan — he usually fixes things the same day.", "Sorry yaar! Batao kya problem hai — main seedha Bapan ko bhej dunga, woh jaldi fix kar dete hain."), [A.report]) },
    { id: "model", test: (q) => has(q, ["which ai", "what ai", "which model", "what model", "llm", "gpt", "chatgpt", "openai", "gemini", "claude", "llama", "groq", "powered by", "built with what", "kaunsa ai", "konsa ai", "language model"]) && has(q, ["you", "your", "u", "tum", "aap", "bot", "assistant", "mini bapan", "this chat", "yeh bot", "ye bot"]),
      run: (q, lang) => reply(T(lang, "I'm **Mini Bapan** — Bapan built me himself as his personal portfolio assistant. The engine under the hood is part of his own toolkit 😉 Ask me anything about his work!", "Main **Mini Bapan** hoon — Bapan ne mujhe khud apne portfolio assistant ke roop mein banaya hai. Engine ki details unka secret recipe hai 😉 Unke kaam ke baare mein kuch bhi poocho!"), [A.work]) },
    { id: "human", test: (q) => has(q, ["are you human", "are you real", "real person", "are you bapan", "is this bapan", "am i talking to", "are you a bot", "are you ai", "robot", "insaan", "real ho", "tum bapan", "aap bapan", "bot ho", "who are you", "what are you", "your name", "tum kaun", "aap kaun", "kaun ho", "ki koro", "tumi ke", "apni ke", "ke tumi"]),
      run: (q, lang) => reply(T(lang, `I'm **Mini Bapan**, Bapan Ghosh's virtual assistant — not Bapan himself. I know his projects, skills and availability inside out. Want the real Bapan? He's one tap away on WhatsApp or email.`, `Main **Mini Bapan** hoon — Bapan Ghosh ka virtual assistant, khud Bapan nahi. Unke projects, skills aur availability sab mujhe pata hai. Real Bapan se baat karni hai? WhatsApp ya email pe ek tap door hain.`), [A.whatsapp, A.email]) },
    { id: "greet", test: (q) => /^(hi+|hello+|hey+|hii+|namaste|namaskar|hola|yo|sup|good (morning|afternoon|evening)|kaise ho|kemon acho|helo|hlo|hy)\b/.test(q) && q.split(" ").length <= 6,
      run: (q, lang) => reply(T(lang, `${pick(["Namaste! 🙏", "Hello! 👋", "Hi there! ✨"])} I'm **Mini Bapan**, Bapan's personal assistant. I can walk you through his projects, skills, experience or availability — what would you like to know?`, `Namaste! 🙏 Main **Mini Bapan** hoon, Bapan ka personal assistant. Unke projects, skills, experience ya availability — kya jaanna chahoge?`), [], kb.bot.suggestions.slice(0, 4)) },
    { id: "thanks", test: (q) => has(q, ["thanks", "thank you", "thx", "dhanyavad", "shukriya", "great", "awesome", "amazing", "nice portfolio", "cool", "superb", "bahut badhiya", "mast", "zabardast", "wow"]) && q.split(" ").length <= 8,
      run: (q, lang) => reply(T(lang, "That means a lot — I'll pass it on to Bapan! 🙏 Anything else you'd like to see?", "Bahut shukriya — main Bapan tak pahuncha dunga! 🙏 Aur kuch dekhna chahoge?"), [A.work, A.contact]) },
    { id: "bye", test: (q) => /^(bye|goodbye|see you|cya|tata|alvida|ok bye)\b/.test(q),
      run: (q, lang) => reply(T(lang, "Thanks for visiting! If there's a role or project in mind, Bapan would love to hear from you. 🙏", "Aane ke liye shukriya! Koi role ya project ho toh Bapan ko zaroor message karna. 🙏"), [A.contact]) },
    { id: "private", test: (q) => has(q, ["girlfriend", "boyfriend", "married", "wife", "religion", "caste", "father", "mother", "family", "age", "how old", "date of birth", "dob", "aadhaar", "pan card", "bank", "password", "salary of father", "relationship"]),
      run: (q, lang) => reply(T(lang, "I keep things professional and only share what Bapan has made public — his work, skills and how to reach him. Anything about those I can help with?", "Main sirf professional cheezein share karta hoon jo Bapan ne public ki hain — unka kaam, skills aur contact. Usme kuch help karun?"), [A.work, A.contact]) },
    { id: "doubt", test: (q) => !techMentioned(q) && has(q, ["fresher", "no experience", "not experienced", "inexperienced", "beginner", "average", "weak", "not good", "bad developer", "fake", "copied", "copy paste", "chatgpt made", "ai made", "can he even", "is he good", "why trust", "overrated", "accha nahi", "kamzor"]),
      run: (q, lang) => {
        const f = kb.faq.find((x) => x.keys.includes("fresher"));
        return reply(`${T(lang, "Fair question — here's the evidence:", "Sahi sawaal — yeh rahe facts:")}\n\n${f ? f.a : ""}\n\n- **${live.length} live products** you can open right now\n- **${projects.length} projects** with case studies and source code\n- **2 internships** and **${kb.certificates.length} credentials** (Wipro, Oracle, Microsoft, IBM, Google)`, [A.project(featured[0]), A.work, A.certs]);
      } },
  ];

  const topic = [
    { id: "hire", keys: ["why hire", "why should", "hire him", "hire bapan", "worth hiring", "best candidate", "kyun hire", "kyu hire", "strength", "stand out", "unique", "special about"] },
    { id: "contact", keys: ["contact", "email", "mail", "phone", "number", "call", "whatsapp", "reach", "connect", "message him", "baat", "sampark", "linkedin", "github", "leetcode", "social"] },
    { id: "resume", keys: ["resume", "cv", "biodata", "résumé"] },
    { id: "updates", keys: ["new", "latest", "recent", "update", "updates", "currently", "right now", "working on", "these days", "aajkal", "abhi kya", "now"] },
    { id: "projects", keys: ["project", "projects", "work", "portfolio", "built", "build", "apps", "app", "websites", "banaya", "best project", "top project", "flagship", "showcase", "case study"] },
    { id: "skills", keys: ["skill", "skills", "stack", "tech", "technologies", "technology", "tools", "languages", "framework", "frameworks", "know", "aata", "expert", "proficient", "experience in", "familiar"] },
    { id: "experience", keys: ["experience", "internship", "internships", "intern", "job", "worked", "company", "companies", "cognifyz", "edu tantr", "edutantr"] },
    { id: "education", keys: ["education", "college", "degree", "btech", "b.tech", "university", "study", "studying", "graduate", "graduation", "bcet", "makaut", "batch", "year"] },
    { id: "certs", keys: ["certificate", "certificates", "certification", "certifications", "certified", "course", "courses", "credential", "credentials", "badge", "oracle", "microsoft", "azure", "ibm", "wipro", "kaggle", "talentnext"] },
  ];

  function topicAnswer(id, q, lang) {
    switch (id) {
      case "hire": {
        const f = kb.faq.find((x) => x.keys.includes("why hire"));
        return reply(`${f.a}\n\n${T(lang, "Start with these:", "Yeh dekho:")}\n${featured.slice(0, 3).map((p) => `- ${projectLine(p)}`).join("\n")}`, [A.work, A.resume, A.contact]);
      }
      case "contact":
        return reply(T(lang,
          `Here's how to reach Bapan directly:\n\n- **Email:** [${email}](mailto:${email})\n- **Phone / WhatsApp:** ${phones.join(" · ")}\n- **LinkedIn / GitHub:** linked below\n\nHe replies ${P.contact.responseTime}.`,
          `Bapan se seedha baat karne ke liye:\n\n- **Email:** [${email}](mailto:${email})\n- **Phone / WhatsApp:** ${phones.join(" · ")}\n\nWoh ${P.contact.responseTime.replace("usually within", "aam taur par")} reply karte hain.`),
          [A.whatsapp, A.email, A.contact, ...P.socials.filter((s) => s.id === "linkedin" || s.id === "github").map((s) => ({ type: "link", label: s.label, url: s.url, icon: s.id === "github" ? "code" : "user", external: true }))]);
      case "resume":
        return reply(T(lang, "Here's Bapan's latest résumé (PDF) — one page with his skills, internships and top projects.", "Yeh raha Bapan ka latest résumé (PDF) — skills, internships aur top projects ek page mein."), [A.resume, A.contact]);
      case "updates": {
        const u = kb.updates.slice(0, 4).map((x) => `- **${new Date(x.date + "T00:00:00Z").toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })}:** ${x.text}`).join("\n");
        return reply(`${T(lang, "Here's what's new with Bapan:", "Bapan ke latest updates:")}\n\n${u}\n\n${T(lang, "His GitHub activity is also streamed live on the page.", "Unki GitHub activity bhi page pe live dikh rahi hai.")}`, [{ type: "scroll", label: "Live activity", target: "live", icon: "activity" }, A.work]);
      }
      case "projects": {
        const lines = featured.map((p) => `- ${projectLine(p)}`).join("\n");
        return reply(`${T(lang, `Bapan has built **${projects.length} projects** (${live.length} live). The flagship work:`, `Bapan ne **${projects.length} projects** banaye hain (${live.length} live). Sabse khaas:`)}\n\n${lines}\n\n${T(lang, "Ask me about any of them for the architecture and details.", "Kisi bhi project ke baare mein poocho — architecture aur details bata dunga.")}`,
          [A.work, A.project(featured[0])], featured.slice(0, 3).map((p) => T(lang, `Tell me about ${p.name}`, `${p.name} ke baare mein batao`)));
      }
      case "skills": {
        const tech = techMentioned(q);
        if (tech) {
          const used = projectsUsing(tech);
          const certs = certsFor(tech);
          const inSkills = kb.skills.some((s) => s.items.some((i) => mentions(i, tech)));
          if (used.length || inSkills || certs.length) {
            const certLine = certs.length ? T(lang, ` He's certified in it too: ${certs.slice(0, 2).map((c) => `**${c.title}** (${c.issuer}, ${c.date})`).join(", ")}.`, ` Iska certificate bhi hai: ${certs.slice(0, 2).map((c) => `**${c.title}** (${c.issuer}, ${c.date})`).join(", ")}.`) : "";
            return reply(T(lang,
              `Yes — **${tech}** is part of Bapan's toolkit.${used.length ? ` He's used it in ${used.slice(0, 5).map((p) => `**${p.name}**`).join(", ")}.` : ""}${certLine}`,
              `Haan — **${tech}** Bapan ke toolkit mein hai.${used.length ? ` Unhone ise ${used.slice(0, 5).map((p) => `**${p.name}**`).join(", ")} mein use kiya hai.` : ""}${certLine}`),
              used.slice(0, 2).map(A.project).concat(certs.length ? [A.certs] : [], [A.skills]));
          }
          return reply(T(lang,
            `**${tech}** isn't one of the tools Bapan lists right now — but he picks up new stacks fast (he shipped Angular, Go and Amazon Bedrock projects within weeks of learning them). His core stack is ${kb.skills[1].items.slice(0, 3).join(", ")}, ${kb.skills[2].items.slice(0, 3).join(", ")} and ${kb.skills[3].items.slice(0, 3).join(", ")}.`,
            `**${tech}** abhi Bapan ki list mein nahi hai — par woh naye stacks bahut jaldi seekhte hain (Angular, Go aur Amazon Bedrock pe kuch hi hafton mein projects ship kiye). Unka core stack: ${kb.skills[1].items.slice(0, 3).join(", ")}, ${kb.skills[2].items.slice(0, 3).join(", ")}.`),
            [A.skills, A.contact]);
        }
        const lines = kb.skills.slice(0, 8).map((s) => `- **${s.title}:** ${s.items.slice(0, 6).join(", ")}`).join("\n");
        return reply(`${T(lang, "Bapan's toolkit, grouped the way teams think:", "Bapan ka toolkit:")}\n\n${lines}`, [A.skills, A.work]);
      }
      case "experience": {
        const items = kb.experience.filter((e) => ["internship", "launch", "training"].includes(e.type)).map((e) => `- **${e.title}** — ${e.org} _(${e.period})_`).join("\n");
        return reply(`${T(lang, "Bapan's hands-on experience:", "Bapan ka hands-on experience:")}\n\n${items}`, [{ type: "scroll", label: "Full journey", target: "journey", icon: "activity" }, A.resume]);
      }
      case "education": {
        const e = P.education;
        return reply(T(lang, `Bapan is pursuing a **${e.degree}** at ${e.school} (${e.university}), ${e.period}. He's in his final year and graduates in June 2027.`, `Bapan **${e.degree}** kar rahe hain — ${e.school} (${e.university}), ${e.period}. Final year mein hain, June 2027 mein graduate honge.`), [{ type: "scroll", label: "Journey", target: "journey", icon: "graduation-cap" }]);
      }
      case "certs": {
        const issuer = ["wipro", "oracle", "microsoft", "azure", "ibm", "kaggle", "google", "cognifyz", "edu tantr"].find((i) => q.includes(i));
        const list = (issuer ? kb.certificates.filter((c) => lc(c.issuer + " " + c.title).includes(issuer === "azure" ? "azure" : issuer)) : kb.certificates.filter((c) => c.type === "certification"));
        return reply(`${T(lang, `Bapan holds **${kb.certificates.length} credentials**. ${issuer ? "Matching ones:" : "Industry certifications:"}`, `Bapan ke paas **${kb.certificates.length} credentials** hain. ${issuer ? "Yeh rahe:" : "Industry certifications:"}`)}\n\n${list.map((c) => `- **${c.title}** — ${c.issuer} (${c.date})${c.credentialId ? ` · ID ${c.credentialId}` : ""}`).join("\n")}`, [A.certs]);
      }
    }
    return null;
  }

  function search(q) {
    const qs = new Set(words(q));
    if (!qs.size) return null;
    let best = null, bestScore = 0;
    const score = (text) => { const ws = words(text); let s = 0; for (const w of ws) if (qs.has(w)) s += w.length > 4 ? 2 : 1; return s; };
    for (const p of projects) { const s = score(`${p.name} ${p.tagline} ${p.summary} ${p.highlights.join(" ")} ${p.stack.join(" ")}`); if (s > bestScore) { best = { p }; bestScore = s; } }
    for (const f of kb.faq) { const s = score(`${f.q} ${f.keys.join(" ")}`) * 1.4; if (s > bestScore) { best = { f }; bestScore = s; } }
    return bestScore >= 3 ? best : null;
  }

  function answer(question) {
    const raw = String(question || "").slice(0, 600);
    const q = norm(raw);
    const lang = detectLang(raw);
    if (!q) return reply(kb.bot.greeting, [], kb.bot.suggestions);
    for (const it of intents) if (it.test(q)) return it.run(q, lang);
    const p = findProject(q);
    const f = kb.faq.find((x) => has(q, x.keys.map((k) => (k.endsWith("*") ? norm(k) + "*" : norm(k)))));
    if (p && !(f && has(q, ["hire", "hiring", "salary", "ctc", "stipend", "relocate", "relocation", "freelance"]))) return projectAnswer(p, lang);
    if (f) {
      const extra = f.keys.includes("why hire") ? [A.work, A.resume] : f.keys.includes("salary") || f.keys.includes("freelance") ? [A.whatsapp, A.email] : [A.contact];
      return reply(f.a, extra);
    }
    const tech = techMentioned(q);
    if (tech && has(q, ["know", "knows", "experience", "use", "uses", "used", "work with", "worked with", "familiar", "skill", "skills", "expert", "proficient", "good at", "aata", "aati", "jaanta", "janta", "jante", "can he"])) return topicAnswer("skills", q, lang);
    const cat = [["ai", ["ai projects", "ml projects", "ai/ml", "machine learning projects", "genai", "generative ai"]], ["mobile", ["mobile apps", "android apps", "app projects", "mobile projects", "flutter apps"]], ["web", ["web projects", "websites", "web apps"]], ["game", ["games", "game"]], ["systems", ["backend projects", "system design", "systems projects"]]].find(([, k]) => has(q, k));
    if (cat) {
      const list = projects.filter((p) => p.category.includes(cat[0]));
      const label = `${cat[0] === "ai" ? "AI / ML" : cat[0]} project${list.length > 1 ? "s" : ""}`;
      if (list.length) return reply(`${T(lang, `Here ${list.length > 1 ? "are" : "is"} Bapan's ${list.length > 1 ? list.length + " " : ""}${label}:`, `Bapan ke ${list.length} ${label}:`)}\n\n${list.slice(0, 8).map((p) => `- ${projectLine(p)}`).join("\n")}`, list.slice(0, 2).map(A.project).concat([A.work]));
    }
    const t = topic.find((x) => has(q, x.keys));
    if (t) { const r = topicAnswer(t.id, q, lang); if (r) return r; }
    if (tech) return topicAnswer("skills", q, lang);
    const s = search(q);
    if (s && s.p) return projectAnswer(s.p, lang);
    if (s && s.f) return reply(s.f.a, [A.contact]);
    return reply(T(lang,
      "I don't have that detail in Bapan's portfolio — but he'll happily answer it himself. Meanwhile, I can tell you about his projects, skills, experience or availability.",
      "Yeh detail portfolio mein nahi hai — par Bapan khud khushi se bata denge. Tab tak main unke projects, skills, experience ya availability ke baare mein bata sakta hoon."),
      [A.whatsapp, A.email], kb.bot.suggestions.slice(0, 4));
  }

  return { answer, detectLang };
}

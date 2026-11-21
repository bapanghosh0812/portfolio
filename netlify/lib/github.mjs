// Live GitHub activity (public repos, newest pushes first) with an in-memory cache.
let cache = { at: 0, data: null };

export async function getGithubFeed({ username, exclude = [], ttl = 10 * 60e3, timeout = 2500 } = {}) {
  if (cache.data && Date.now() - cache.at < ttl) return { ...cache.data, cached: true };
  try {
    const headers = { accept: "application/vnd.github+json", "user-agent": "bapanghosh-portfolio", "x-github-api-version": "2022-11-28" };
    if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`, { headers, signal: AbortSignal.timeout(timeout) });
    if (!res.ok) throw new Error(`github ${res.status}`);
    const list = await res.json();
    const repos = (Array.isArray(list) ? list : [])
      .filter((r) => !r.fork && !r.archived && !r.private && !exclude.includes(r.name))
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 12)
      .map((r) => ({
        name: r.name,
        description: String(r.description || "").slice(0, 220),
        url: r.html_url,
        homepage: /^https:\/\/[^\s]+$/.test(r.homepage || "") ? r.homepage : null,
        language: r.language || null,
        stars: r.stargazers_count || 0,
        pushedAt: r.pushed_at,
        createdAt: r.created_at,
      }));
    cache = { at: Date.now(), data: { repos, fetchedAt: new Date().toISOString() } };
    return { ...cache.data, cached: false };
  } catch {
    return cache.data ? { ...cache.data, cached: true, stale: true } : null;
  }
}

export function feedForPrompt(feed) {
  if (!feed || !feed.repos || !feed.repos.length) return "Not available right now.";
  const ago = (iso) => {
    const d = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 864e5));
    return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
  };
  return feed.repos.slice(0, 8).map((r) => `- ${r.name}${r.description ? ` — ${r.description}` : ""} (last push ${ago(r.pushedAt)}${r.homepage ? `, live: ${r.homepage}` : ""}, repo: ${r.url})`).join("\n");
}

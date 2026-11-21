// GET /api/github — recent public repositories, cached at the edge so GitHub's rate limits are never hit.
import raw from "../../data/portfolio.json" with { type: "json" };
import { visibleData } from "../../src/scripts/bot-engine.js";
import { getGithubFeed } from "../lib/github.mjs";
import { json } from "../lib/http.mjs";

export const config = { path: "/api/github" };
const data = visibleData(raw); // repos of hidden projects are excluded from the feed

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405, { allow: "GET" });
  const feed = await getGithubFeed({ username: data.github.username, exclude: data.github.exclude });
  if (!feed) return json({ error: "GitHub is unavailable right now" }, 503, { "cache-control": "no-store" });
  return json(feed, 200, {
    "cache-control": "public, max-age=120",
    "netlify-cdn-cache-control": "public, durable, s-maxage=600, stale-while-revalidate=3600",
  });
};

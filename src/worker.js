/**
 * X09 Hub — Cloudflare Worker (x09hub.com)
 *
 *  Shared X09 routes (src/core/router.js): accounts, profile, plans, billing, Stripe webhook
 *  Guide      POST /api/guide    "Ask X09" (streams SSE from Claude)
 *  Everything else → the site in /public
 */
import { json, HttpError } from "./core/util.js";
import { coreRoute } from "./core/router.js";
import { guide } from "./guide.js";

async function route(request, env) {
  const p = new URL(request.url).pathname;
  const core = await coreRoute(request, env);
  if (core) return core;
  if (p === "/api/guide" && request.method === "POST") return guide(request, env);
  if (p.startsWith("/api/")) return json({ error: "Not found" }, 404);
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message, ...err.extra }, err.status);
      console.error(err);
      return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
  },
};

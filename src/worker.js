/**
 * X09 Hub — Cloudflare Worker (x09hub.com)
 *
 *  Shared X09 routes (src/core/router.js): accounts, profile, plans, billing, Stripe webhook
 *  Guide      POST /api/guide    "Ask X09" (streams SSE from Claude)
 *  Defense    /defense/*         the toolkit for people with an X09 Defense plan, the plans page for everyone else
 *  Everything else → the site in /public
 */
import { json, HttpError } from "./core/util.js";
import { coreRoute } from "./core/router.js";
import { guide } from "./guide.js";
import { getUser, activePlan } from "./core/auth.js";

// X09 Defense is paid: only people with an active Defense plan get the toolkit; everyone else gets the plans page.
async function defense(request, env) {
  const user = await getUser(request, env);
  const res = activePlan(user, "defense")
    ? await env.ASSETS.fetch(request)
    : await env.ASSETS.fetch(new Request(new URL("/defense-plans", request.url), { headers: request.headers }));
  const out = new Response(res.body, res);
  out.headers.set("Cache-Control", "private, no-store"); // what's shown depends on who's signed in
  out.headers.set("Vary", "Cookie");
  return out;
}

async function route(request, env) {
  const p = new URL(request.url).pathname;
  const core = await coreRoute(request, env);
  if (core) return core;
  if (p === "/api/guide" && request.method === "POST") return guide(request, env);
  if (p.startsWith("/api/")) return json({ error: "Not found" }, 404);
  if (p === "/defense" || p.startsWith("/defense/")) return defense(request, env);
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

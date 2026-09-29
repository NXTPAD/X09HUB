// End-to-end API test for X09 Hub against the local harness.
//   node --experimental-sqlite test/api.test.mjs
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { server, env, stripeCalls } from "./dev-server.mjs";
import worker from "../src/worker.js";

const PORT = 8797;
await new Promise((r) => server.listen(PORT, r));
const BASE = `http://localhost:${PORT}`;
let cookie = "";

async function api(path, { method = "GET", body, headers = {}, raw = false } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", cookie, origin: BASE, ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const sc = res.headers.getSetCookie();
  if (sc.length) cookie = sc[0].split(";")[0];
  if (raw) return res;
  return { status: res.status, data: await res.json().catch(() => null), res };
}
function signed(payload) {
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", env.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  return { "stripe-signature": `t=${t},v1=${sig}` };
}

let pass = 0;
const ok = (name) => { pass++; console.log("  ✓", name); };

try {
  let res = await api("/", { raw: true });
  assert.equal(res.status, 200); assert.match(await res.text(), /X09 Hub/); ok("hub page served");
  res = await api("/nowhere", { raw: true });
  assert.equal(res.status, 404); ok("unknown pages get the 404 page");

  let r = await api("/api/plans");
  assert.equal(r.data.plans.length, 0); assert.equal(r.data.catalog.length, 3);
  assert.equal(r.data.catalog[0].plans.length, 3); assert.equal(r.data.catalog[1].plans.length, 3);
  assert.deepEqual(r.data.catalog[2].plans.map((p) => [p.key, p.price, p.tools.length]), [["guard", "$19", 8], ["sentinel", "$49", 13], ["fortress", "$99", 18]]);
  ok("catalog lists X09 AI, X09 Docs and X09 Defense plans");

  res = await api("/defense/", { raw: true });
  let html = await res.text();
  assert.match(html, /X09 Defense — Browser Cyber Security Toolkit/); assert.doesNotMatch(html, /<script id="core">/); assert.match(res.headers.get("cache-control"), /no-store/);
  ok("signed-out visitors get the Defense plans page, not the toolkit");

  r = await api("/api/guide", { method: "POST", body: { messages: [{ role: "user", content: "hi" }] } });
  assert.equal(r.status, 401); ok("Ask X09 requires sign-in");

  r = await api("/api/auth/signup", { method: "POST", body: { email: "hub@example.com", password: "launch-2026" } });
  assert.equal(r.status, 201); const userId = r.data.user.id;
  assert.ok(cookie.startsWith("x09_sid=")); ok("sign up on the Hub (shared X09 session cookie)");
  assert.equal(r.data.user.plan, undefined); assert.equal(r.data.user.products.ai.plan, null); ok("Hub /me shows every product");

  // Cookie is scoped to x09hub.com in production so it works on ai. and docs.
  for (const host of ["x09hub.com", "ai.x09hub.com", "docs.x09hub.com"]) {
    res = await worker.fetch(new Request(`https://${host}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: `https://${host}` }, body: JSON.stringify({ email: "hub@example.com", password: "launch-2026" }) }), env);
    const c = res.headers.getSetCookie()[0];
    assert.match(c, /^x09_sid=/); assert.match(c, /Domain=x09hub\.com/); assert.match(c, /Secure/); assert.match(c, /HttpOnly/);
  }
  ok("on x09hub.com and its subdomains the session cookie covers every X09 site");

  r = await api("/api/guide", { method: "POST", body: { messages: [{ role: "user", content: "hi" }] } });
  assert.equal(r.status, 402); assert.equal(r.data.code, "plan_required"); ok("Ask X09 needs any X09 plan");

  r = await api("/api/billing/checkout", { method: "POST", body: { plan: "solo" } });
  assert.equal(r.status, 400); ok("Hub checkout needs a product");
  r = await api("/api/billing/checkout", { method: "POST", body: { product: "docs", plan: "solo" } });
  assert.equal(r.status, 200);
  const cs = stripeCalls.filter((c) => c.path === "/checkout/sessions").pop();
  assert.equal(cs.params["line_items[0][price]"], "price_solo"); assert.equal(cs.params["subscription_data[metadata][product]"], "docs");
  ok("buy X09 Docs from the Hub");

  const sub = { id: "sub_h", customer: cs.params.customer, status: "active", metadata: { user_id: userId },
    items: { data: [{ price: { id: "price_solo" }, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] } };
  const evt = JSON.stringify({ type: "customer.subscription.created", data: { object: sub } });
  r = await api("/api/stripe/webhook", { method: "POST", body: evt, headers: signed(evt) });
  assert.equal(r.status, 200);
  r = await api("/api/me");
  assert.equal(r.data.user.products.docs.plan, "solo"); assert.equal(r.data.user.guide.limit, 100); ok("Hub webhook activates the Docs plan");

  res = await api("/api/guide", { method: "POST", body: { messages: [{ role: "user", content: "Which plan for invoices?" }] }, raw: true });
  assert.equal(res.status, 200); assert.match(res.headers.get("content-type"), /event-stream/);
  const text = await res.text(); assert.match(text, /invoices/); assert.match(text, /\[DONE\]/); ok("Ask X09 streams an answer");
  r = await api("/api/me"); assert.equal(r.data.user.guide.used, 1); ok("Ask X09 usage counted");

  await env.DB.prepare("UPDATE usage SET guide = 100 WHERE user_id = ?").bind(userId).run();
  r = await api("/api/guide", { method: "POST", body: { messages: [{ role: "user", content: "again" }] } });
  assert.equal(r.status, 402); assert.equal(r.data.code, "limit_reached"); ok("Ask X09 monthly limit enforced");

  r = await api("/api/guide", { method: "POST", body: { messages: [{ role: "assistant", content: "hello" }] } });
  assert.equal(r.status, 400); ok("guide needs a question");

  res = await api("/defense/", { raw: true }); assert.match(await res.text(), /X09 Defense — Browser Cyber Security Toolkit/); ok("a Docs plan doesn't unlock X09 Defense");
  r = await api("/api/billing/checkout", { method: "POST", body: { product: "defense", plan: "guard" } });
  assert.equal(r.status, 200);
  const dcs = stripeCalls.filter((c) => c.path === "/checkout/sessions").pop();
  assert.equal(dcs.params["line_items[0][price]"], "price_guard"); assert.equal(dcs.params["subscription_data[metadata][product]"], "defense");
  ok("buy X09 Defense Guard from the Hub");
  const dsub = { id: "sub_d", customer: dcs.params.customer, status: "active", metadata: { user_id: userId },
    items: { data: [{ price: { id: "price_guard" }, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] } };
  const devt = JSON.stringify({ type: "customer.subscription.created", data: { object: dsub } });
  r = await api("/api/stripe/webhook", { method: "POST", body: devt, headers: signed(devt) });
  assert.equal(r.status, 200);
  r = await api("/api/me");
  assert.equal(r.data.user.products.defense.planName, "Guard"); assert.ok(r.data.user.products.defense.tools.includes("phish")); assert.ok(!r.data.user.products.defense.tools.includes("ir"));
  ok("webhook activates Defense Guard with its tool list");
  res = await api("/defense/", { raw: true }); html = await res.text();
  assert.match(html, /<script id="core">/); assert.match(res.headers.get("cache-control"), /no-store/); ok("Defense plan unlocks the toolkit");

  r = await api("/api/profile", { method: "POST", body: { name: "Hub Pilot", company: "X09 Labs" } });
  assert.equal(r.data.user.name, "Hub Pilot"); ok("profile edits from the Hub");

  r = await api("/api/billing/portal", { method: "POST" });
  assert.match(r.data.url, /portal=1/); ok("billing portal from the Hub");

  r = await api("/api/auth/logout", { method: "POST", headers: { origin: "https://evil.example" } });
  assert.equal(r.status, 403); ok("cross-origin POST blocked");

  console.log(`\nAll ${pass} checks passed.`);
} catch (e) {
  console.error("\nFAILED after", pass, "checks:", e);
  process.exitCode = 1;
} finally {
  server.close();
}

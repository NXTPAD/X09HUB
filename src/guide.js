// "Ask X09" — the Hub's AI guide (Claude Haiku 4.5 via the Anthropic API).
// Helps people pick the right X09 product and plan. Included with any active X09 plan,
// up to GUIDE_MONTHLY_LIMIT questions a month. Conversations aren't stored.
import { json, readJson, HttpError } from "./core/util.js";
import { requireUser, hasAnyPlan, consume, activePlan } from "./core/auth.js";
import { PRODUCTS, PRODUCT_ORDER, GUIDE_MONTHLY_LIMIT } from "./core/catalog.js";
import { claudeStream } from "./core/anthropic.js";

const MAX_TURNS = 10;
const MAX_CHARS = 2000;

function catalogText() {
  return PRODUCT_ORDER.map((k) => {
    const p = PRODUCTS[k];
    const plans = p.order.map((key) => {
      const d = p.plans[key];
      const lim = k === "ai" ? `${d.limits.fast} Fast + ${d.limits.deep} Deep messages/mo` : `${d.limits.docs} AI drafts/mo, unlimited documents${d.whiteLabel ? ", no X09 branding on client pages" : ""}`;
      return `  - ${d.name}: ${d.price}/mo — ${lim}`;
    }).join("\n");
    return `${p.name} (${p.url}) — ${p.tagline}\n${plans}`;
  }).join("\n\n");
}

function system(user) {
  const mine = PRODUCT_ORDER.map((k) => {
    const plan = activePlan(user, k);
    return `${PRODUCTS[k].name}: ${plan ? PRODUCTS[k].plans[plan].name + " plan" : "no plan"}`;
  }).join("; ");
  return [
    "You are X09, the guide on X09 Hub (x09hub.com) — the front door to every X09 product. Be brief, warm and concrete: 2–6 short sentences or a few bullets. Use Markdown sparingly.",
    "Help the person choose the right X09 product and plan, explain what each product does, and answer quick general questions. For long work (writing, coding, documents), point them to the right X09 app.",
    "One X09 account works on every X09 site: same sign-in, same profile and photo, and one billing account (Stripe). Plans are paid monthly, can be changed or cancelled anytime in 'Your X09 account & plans'. There is no free plan.",
    "X09 AI answers with Claude (Anthropic): Fast mode uses Claude Haiku, Deep mode uses Claude Sonnet. X09 Docs drafts invoices, estimates, proposals/quotes and contracts with Claude, with e-signature, PDF and client links.",
    "X09 Defense (x09hub.com/defense) is a cyber defense toolkit: phishing link scanner, email header analyzer, IOC extractor, log threat hunter, password auditor and generator, 2FA code lab, JWT inspector, hash lab, file integrity check, encrypted notes, encoder/decoder, security headers audit, CSP builder, subnet calculator, port risk reference and an incident playbook. It runs entirely in the browser, so nothing pasted into it is uploaded. It has no paid plan yet; do not quote a price for it.",
    `Products and plans:\n${catalogText()}`,
    `This person: ${user.display_name ? user.display_name + ", " : ""}${mine}.`,
    "Never invent features, prices or discounts that aren't listed here.",
  ].join("\n\n");
}

// POST /api/guide  { messages: [{ role, content }] }  → SSE stream
export async function guide(request, env) {
  const user = await requireUser(request, env);
  if (!hasAnyPlan(user)) throw new HttpError(402, "Ask X09 is included with any X09 plan. Pick a plan to start asking.", { code: "plan_required" });
  const body = await readJson(request);
  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m?.role === "assistant" ? "assistant" : "user", content: String(m?.content || "").slice(0, MAX_CHARS) }))
    .filter((m) => m.content.trim());
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "Ask a question first." }, 400);

  const refund = await consume(env, user.id, "guide", GUIDE_MONTHLY_LIMIT,
    `You've asked all ${GUIDE_MONTHLY_LIMIT} Ask X09 questions this month. They reset on the 1st — or keep going inside X09 AI.`);
  let stream;
  try {
    stream = await claudeStream(env, { kind: "fast", system: system(user), messages, max_tokens: 600 });
  } catch (err) {
    await refund();
    throw err;
  }
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store" } });
}

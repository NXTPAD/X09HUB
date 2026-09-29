// ============================================================
//  X09 catalog — every product and paid plan across the X09 sites.
//  Identical in every X09 repo (X09 Hub, X09 AI, X09 Docs): edit it once, copy it to all three.
//
//  `price` is only the label shown on the sites. What customers are actually charged is the
//  monthly Price on the Stripe product named `stripeProduct` (or the price ID in `priceEnv`).
//  All X09 products share ONE Stripe account and ONE customer per person.
//
//  AI cost per plan (Anthropic API, worst case if a customer uses every message):
//    Fast = Claude Haiku 4.5 ($1 / $5 per M tokens) ≈ $0.004–0.0075 per message
//    Deep = Claude Sonnet 5  ($2 / $10 per M tokens) ≈ $0.015–0.025 per message
//    Docs drafts use Sonnet 5 (≈ $0.02 each), rewrites use Haiku 4.5 (≈ $0.004 each)
//    X09 Defense runs entirely in the browser: no AI or server cost per customer, only Stripe's fee
//    (2.9% + 30¢ ≈ $0.85 of $19, $1.72 of $49, $3.17 of $99) — about 95–97% margin on every plan.
// ============================================================
export const PRODUCTS = {
  ai: {
    key: "ai",
    name: "X09 AI",
    tagline: "Your AI co-pilot",
    url: "https://ai.x09hub.com",
    order: ["pilot", "commander", "fleet"],
    plans: {
      //                      heavy-use cost ≈ $5.40 of $12 · typical ≈ $3
      pilot:     { name: "Pilot",     stripeProduct: "Pilot",     price: "$12", limits: { fast: 700,  deep: 60 },  priceEnv: "STRIPE_PRICE_PILOT",     blurb: "For everyday missions." },
      //                      heavy-use cost ≈ $16 of $29 · typical ≈ $8
      commander: { name: "Commander", stripeProduct: "Commander", price: "$29", limits: { fast: 1600, deep: 160 }, priceEnv: "STRIPE_PRICE_COMMANDER", blurb: "For power users and pros.", featured: true },
      //                      heavy-use cost ≈ $46 of $79 · typical ≈ $23
      fleet:     { name: "Fleet",     stripeProduct: "Fleet",     price: "$79", limits: { fast: 4500, deep: 500 }, priceEnv: "STRIPE_PRICE_FLEET",     blurb: "For heavy, all-day use." },
    },
  },
  docs: {
    key: "docs",
    name: "X09 Docs",
    tagline: "AI invoices, estimates, proposals & contracts",
    url: "https://docs.x09hub.com",
    order: ["solo", "pro", "business"],
    plans: {
      solo:     { name: "Solo",     stripeProduct: "X09 Docs Solo",     price: "$9",  limits: { docs: 40 },  priceEnv: "STRIPE_PRICE_SOLO",     blurb: "For freelancers and one-person crews." },
      pro:      { name: "Pro",      stripeProduct: "X09 Docs Pro",      price: "$19", limits: { docs: 200 }, priceEnv: "STRIPE_PRICE_PRO",      blurb: "For busy contractors and small shops.", featured: true },
      business: { name: "Business", stripeProduct: "X09 Docs Business", price: "$39", limits: { docs: 600 }, priceEnv: "STRIPE_PRICE_BUSINESS", blurb: "High volume, no X09 branding on client pages.", whiteLabel: true },
    },
  },
};

// X09 Defense tools each plan unlocks (ids match the TOOLS list in public/defense/index.html)
const DEFENSE_GUARD = ["console", "phish", "email", "password", "generate", "totp", "vault", "file"];
const DEFENSE_SENTINEL = [...DEFENSE_GUARD, "ioc", "logs", "jwt", "hash", "codec"];
const DEFENSE_FORTRESS = [...DEFENSE_SENTINEL, "headers", "csp", "subnet", "ports", "ir"];
PRODUCTS.defense = {
  key: "defense",
  name: "X09 Defense",
  tagline: "Cyber defense toolkit",
  url: "https://x09hub.com/defense/",
  order: ["guard", "sentinel", "fortress"],
  plans: {
    guard:    { name: "Guard",    stripeProduct: "X09 Defense Guard",    price: "$19", limits: {}, tools: DEFENSE_GUARD,    priceEnv: "STRIPE_PRICE_GUARD",
                blurb: "Protect yourself, your family and your accounts.",
                feats: ["<b>7</b> defense tools", "Phishing link + email scanner", "Password audit, generator + 2FA", "Encrypted notes + file checks"] },
    sentinel: { name: "Sentinel", stripeProduct: "X09 Defense Sentinel", price: "$49", limits: {}, tools: DEFENSE_SENTINEL, priceEnv: "STRIPE_PRICE_SENTINEL", featured: true,
                blurb: "For IT pros, analysts and small businesses.",
                feats: ["<b>12</b> tools · everything in Guard", "IOC extractor + log threat hunter", "JWT, hash + encoder labs"] },
    fortress: { name: "Fortress", stripeProduct: "X09 Defense Fortress", price: "$99", limits: {}, tools: DEFENSE_FORTRESS, priceEnv: "STRIPE_PRICE_FORTRESS",
                blurb: "For teams defending sites and networks.",
                feats: ["<b>All 17</b> tools · everything in Sentinel", "Security headers audit + CSP builder", "Subnet + port risk tools", "Incident response playbook"] },
  },
};

export const PRODUCT_ORDER = ["ai", "docs", "defense"];

// X09 Hub's "Ask X09" guide: included with ANY active X09 plan (Claude Haiku 4.5, ≈ $0.003/question)
export const GUIDE_MONTHLY_LIMIT = 100;

// Subscription states that keep access on (past_due = Stripe is retrying the card)
export const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export const planDef = (product, plan) => PRODUCTS[product]?.plans?.[plan] || null;

export function publicPlans(product) {
  const p = PRODUCTS[product];
  if (!p) return [];
  return p.order.map((key) => {
    const d = p.plans[key];
    return { key, product, name: d.name, price: d.price, interval: "month", ...d.limits, ai: d.limits.docs, blurb: d.blurb, featured: !!d.featured, whiteLabel: !!d.whiteLabel, feats: d.feats || null, tools: d.tools || null };
  });
}

export function publicCatalog() {
  return PRODUCT_ORDER.map((k) => ({ key: k, name: PRODUCTS[k].name, tagline: PRODUCTS[k].tagline, url: PRODUCTS[k].url, plans: publicPlans(k) }));
}

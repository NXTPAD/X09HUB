# X09 Hub

The starting point for every X09 app, at **x09hub.com**: the orbit map, the X09 app list, **Ask X09** (Claude),
and your **X09 account** (one sign-in, profile and bill for X09 AI and X09 Docs). It runs as a Cloudflare Worker with the shared `x09-db` database.

**Read `X09-SHARED.md` first.** It covers the shared account, database, billing, AI, plans and physics that all three sites use.

```
public/index.html, hub.js   the Hub (orbit physics, app cards, Ask X09, X09 ID)
public/404.html             "this orbit is empty"
public/x09/                 shared X09 design system, logo, fonts, physics, account kit
src/worker.js               router
src/guide.js                Ask X09 (Claude Haiku, streams)
src/core/                   shared X09 accounts, Stripe, Claude, catalog
migrations/                 shared x09-db schema
test/                       npm test (18 API checks + Claude client checks)
```

## Deploy (Cloudflare → Workers Builds, connected to this repo)
The Hub now has server code and a database, so change the build settings once:

| Setting | Value |
|---|---|
| Build command | `npm run build` (finds the `x09-db` database and fills in its ID) |
| Deploy command | `npm run deploy` (applies shared migrations, then deploys) |

Then in **Worker → Settings → Variables and Secrets**, add the secrets `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
x09hub.com and www.x09hub.com stay attached through the `routes` in `wrangler.jsonc`.

## Editing the apps
`const DESTINATIONS` at the top of `public/hub.js` lists each world on the orbit map. `product` links a world to its plans in `src/core/catalog.js`.

## Local testing
`npm test` runs the checks. `npm run test:server` runs the Hub at http://localhost:8787 with mock AI and mock Stripe.


### X09 Defense

X09 Defense, the cyber defense toolkit, is served by the Hub at **x09hub.com/defense** (`public/defense/index.html`). It runs entirely in the browser and uses the shared `/x09/` fonts, physics and logo (`/x09/logo-defense.svg`). It appears in the Hub orbit map, the app cards, the footer, Ask X09 and the X09 app switcher.

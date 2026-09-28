# X09 Hub

The starting point for every X09 destination. A static site served by Cloudflare Workers at **x09hub.com**.

```
x09-hub/
├── public/            ← the website (everything in here is served)
│   ├── index.html     ← the hub page
│   ├── 404.html       ← "orbit is empty" page
│   └── favicon.svg
├── screenshots/       ← desktop + mobile previews (not deployed)
├── wrangler.jsonc     ← Cloudflare Workers config
└── package.json
```

## 1. Push to GitHub

Create an empty repo on GitHub named `x09-hub` (no README), then:

```bash
cd x09-hub
git init
git add .
git commit -m "X09 Hub site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/x09-hub.git
git push -u origin main
```

## 2. Deploy to Cloudflare Workers

Requires Node.js 18+.

```bash
npm install
npx wrangler login
npm run deploy
```

After deploying, the site is live at `https://x09-hub.<your-subdomain>.workers.dev`, and also at
`https://x09hub.com` and `https://www.x09hub.com` if those domains are on your Cloudflare account.

- If x09hub.com is **not** on Cloudflare yet, remove the `"routes"` block in `wrangler.jsonc` and deploy to workers.dev first.
- If x09hub.com is already attached to a different Worker or has DNS records pointing elsewhere, remove those first or the deploy will report a conflict.
- X09 AI (ai.x09hub.com) and X09 Docs (docs.x09hub.com) stay on their own subdomains and are not affected.

### Auto-deploy on every push (optional)

In the Cloudflare dashboard: **Workers & Pages → x09-hub → Settings → Build → Connect** your GitHub repo.
Build command: leave empty. Deploy command: `npx wrangler deploy`. After that, every `git push` redeploys.

## Preview locally

```bash
npm run dev
```

Opens at http://localhost:8787.

## Editing destinations

Open `public/index.html` and find `const DESTINATIONS` near the top of the script. Each entry is one world on the orbit map:

```js
{
  id: "x09-ai", name: "X09 AI", host: "ai.x09hub.com", url: "https://ai.x09hub.com",
  status: "live",          // "live" = launchable, "reserved" = placeholder
  orbit: 1,                // 1, 2 or 3 (inner → outer ring)
  sub: "AI workspace",
  blurb: "Your AI workspace. Sign in to your account, or choose a plan to get started.",
  tags: ["Accounts", "Paid plans", "Web app"]
}
```

To publish a new product, change one of the `reserved` entries to `status: "live"` and fill in its `name`, `host` and `url`.

`SAME_TAB = true` makes Launch play the warp and open the destination in the same tab. Set it to `false` to open in a new tab.

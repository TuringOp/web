# Turing Website

A small static two-page marketing site for Turing, configured for Cloudflare Workers.

## Project files

- `public/index.html` — page structure and styling
- `public/turing.html` — product detail page for Turing
- `public/robots.txt` — crawler directives and sitemap location
- `public/sitemap.xml` — sitemap entry for `https://turingops.ai/`
- `worker.js` — Cloudflare Worker for static assets plus `/api/music/generate` and `/api/music/healthz` proxy routes
- `cloudflared/config.template.yml` — template for exposing local/backend API at `music-api.turingops.ai`
- `wrangler.toml` — Cloudflare Workers configuration
- `package.json` — local scripts for dev, config checking, and deployment

## Run locally

Run commands from the project root (`web/`).

### Simple static preview

```sh
python3 -m http.server 8000 --directory public
```

Then open <http://localhost:8000>.

### Cloudflare Workers preview

```sh
npm install
npm run dev
```

Wrangler will print a local preview URL, typically <http://127.0.0.1:8787>.

## Deploy to Cloudflare Workers

Before deploying, make sure `public/` is committed to git. Cloudflare's remote build only sees files present in the repository snapshot it checks out.

1. Authenticate Wrangler if needed:

```sh
npx wrangler login
```

2. Optionally validate the config and bundle before deployment:

```sh
npm run check
```

3. Deploy:

```sh
npm run deploy
```

If you are deploying from a Git-connected Cloudflare project, also make sure the project root is the repository root that contains `wrangler.toml`, `worker.js`, and `public/`.

## Notes

- The Worker serves everything from the `public/` directory via the `ASSETS` binding.
- Styling is embedded in `public/index.html` to keep the site portable and simple.
- The project is pinned to `wrangler` 3.x so it can be validated locally on Node 18 in this workspace.
- Canonical production URL is `https://turingops.ai/` and is referenced in SEO metadata and sitemap files.
- `npm run verify:cloudflare` checks that the required deploy files exist before a dry run or real deploy.


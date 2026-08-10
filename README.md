# Edyma Admin Console

The Edyma team + school-manager console: one React app, two role-driven experiences (HQ for `super_admin` / `super_sales_manager` / `super_content_manager`, School OS for `school_manager`). React 19 + Vite 7 + TypeScript + Tailwind v4, talking to the `edyma-be` FastAPI backend.

## Develop

```bash
npm install
npm run dev        # vite dev server against http://localhost:8000
npm run build      # tsc -b && vite build
npm run lint       # eslint
```

The backend base URL comes from `VITE_API_BASE_URL` (defaults to `http://localhost:8000` in dev). Point it at a running `edyma-be` — there is no mock mode.

## Deploy

Deployment publishes to GitHub Pages on the `build` branch, served at **admin.edyma.in** (see `public/CNAME`).

```bash
VITE_API_BASE_URL=https://api.edyma.in npm run deploy
```

- `npm run deploy` = `npm run build && npx gh-pages -d dist -b build`. `VITE_API_BASE_URL` is baked in at build time — set it in the environment (or an `.env.production` file) before deploying, otherwise the bundle targets `localhost:8000`.
- **SPA fallback:** the app uses React Router's **BrowserRouter**, and GitHub Pages has no server-side rewrite, so deep links (e.g. `/ops/support`) 404 on a cold hit. The repo carries the [spa-github-pages](https://github.com/rafgraph/spa-github-pages) workaround: `public/404.html` redirects any unknown path to `/?/<path>`, and a decode script in `index.html` restores the real URL before the router boots. Keep both halves — deleting either breaks refresh/deep links in production.
- Verify after deploy: hard-refresh a deep route (`https://admin.edyma.in/ops/rbac`) and confirm it lands on the page, not the overview.

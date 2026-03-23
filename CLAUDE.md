# BOSS HQ — Development Guide

## Architecture
- **Frontend**: Static HTML/CSS/JS in `frontend/` — hosted on Cloudflare Pages (`boss.mehtahouse.cc`)
- **Backend API**: Cloudflare Worker in `worker/src/` — hosted at `boss-api.mehtahouse.cc`
- **Database**: Cloudflare D1 (database name: `boss-db`)

## How to Start a Session
Open Claude Code on your Mac → pick **BOSS** from Recent projects → you'll be on `main` → that's it, just start working.

## Deployment Pipeline
Push to `main` → GitHub Actions auto-deploys both frontend and worker to Cloudflare production. Takes ~30-60 seconds.

### How to push changes
```bash
git add <files> && git commit -m "message" && git push origin main
```

### Important deployment details
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Workflow triggers on push to `main`
- Frontend deploy uses `--branch main` flag to force production deployment
- Worker deploy requires `npm install` before `wrangler deploy` (for TypeScript types)
- `CLOUDFLARE_API_TOKEN` secret is stored in GitHub repo Settings → Secrets
- Account ID: `fe2ae67928de1f5b18f1a7d1edf65005`

## Frontend
- Entry point: `frontend/index.html`
- API client: `frontend/js/api.js` (BASE_URL: `https://boss-api.mehtahouse.cc`)
- Router: `frontend/js/router.js`
- Modules: `frontend/js/modules/` (one JS file per section)
- Styles: `frontend/css/` (variables, layout, components, per-module CSS)

## Backend Worker
- Entry point: `worker/src/index.ts`
- Routes: `worker/src/routes/` (one file per feature)
- DB helpers: `worker/src/db.ts`
- CORS: `worker/src/cors.ts`
- Config: `wrangler.toml` (root)

## Local Development (on Mac)
- Frontend: open `frontend/index.html` in browser
- Worker: `cd worker && npx wrangler dev --local`
- Note: Frontend hits production API by default unless BASE_URL is changed in `api.js`

## Known Issues & Solutions

### Cloudflare CDN Caching
- **Problem**: After deploying frontend changes, the browser/CDN serves stale cached JS/CSS files.
- **Solution**: ALL CSS and JS references in `index.html` MUST have cache-busting query strings (e.g. `?v=5`). Bump the version when making significant changes.

### Wrangler Cannot Run in Cloud Environment
- **Problem**: Cloud dev environments block outbound requests to `api.cloudflare.com`.
- **Solution**: Database migrations must be run manually on your Mac:
  1. `git pull origin main` (get latest migration files first)
  2. `npx wrangler d1 execute boss-db --remote --file=worker/migrations/<migration>.sql`
- Deployment is handled by GitHub Actions on push — no need to run wrangler deploy manually.

## Current State (March 2026)

### Completed Features
- **Campaign Request Flow**: Clients submit campaign requests (draft status) → review in Requests tab → deploy landing page → campaign goes active
- **Landing Pages**: Server-rendered by Worker at `/lp/:slug`. Full engagement design with brand colors, social proof, 2-step form, custom questions as dropdowns.
- **Deploy Modal**: Styled popup showing success/fail with one-click link to live page
- **Notification Badges**: iOS-style red badge on Campaigns sidebar when pending drafts exist
- **Dashboard Alert**: Yellow banner on HQ Overview when campaign requests are pending
- **Compact Campaign Detail**: Boxed 4-metric header (Target / CPL / Budget / Period), 2-col scope grid, TAL modal button, Company Revenue field
- **Campaigns Nav Fix**: Clicking Campaigns in sidebar always returns to Active tab

### Database Migrations (run in order on Mac)
- 001: Initial tables
- 002: Mock data
- 003: Campaign requests schema
- 004: Seed initial campaign request
- 005: Fresh campaigns v1
- 006: Fresh campaigns v2 (NovaTech, GreenLeaf HR, TestCorp)
- 007: Fresh campaigns v3 — deletes all, seeds 3 new campaigns:
  - **Apex Revenue** (id=30): Blue, B2B sales intelligence, 600 leads, $12 CPL
  - **ClearOps** (id=31): Teal, supply chain, 400 leads, $8.50 CPL
  - **Vantage Health** (id=32): Purple, clinical AI, 350 leads, $15 CPL
- 008: Adds `company_revenue` column; updates campaigns 30/31/32 with USA-only geo, 10000+ size format, revenue tiers

### Pending User Action
Run migrations 007 and 008 on Mac:
```bash
git pull origin main
npx wrangler d1 execute boss-db --remote --file=worker/migrations/007_fresh_campaigns_v3.sql
npx wrangler d1 execute boss-db --remote --file=worker/migrations/008_update_campaigns_v4.sql
```

# BOSS HQ — Development Guide

## Architecture
- **Frontend**: Static HTML/CSS/JS in `frontend/` — hosted on Cloudflare Pages (`boss.mehtahouse.cc`)
- **Backend API**: Cloudflare Worker in `worker/src/` — hosted at `boss-api.mehtahouse.cc`
- **Database**: Cloudflare D1 (database name: `boss-db`)

## Deployment Pipeline
Push to `claude/work-on-boss-BrJkv` → GitHub Actions auto-deploys both frontend and worker to Cloudflare production. Takes ~30-60 seconds.

### How to push changes
```bash
git add <files> && git commit -m "message" && git push origin master:claude/work-on-boss-BrJkv
```

### Important deployment details
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Workflow triggers on push to BOTH `main` and `claude/work-on-boss-BrJkv`
- Frontend deploy uses `--branch main` flag to force production deployment (without this, non-main branches create preview deploys instead of updating `boss.mehtahouse.cc`)
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
- **Problem**: After deploying frontend changes, the browser/CDN serves stale cached JS/CSS files. Symptoms: new tabs/features don't appear, layout breaks, old code runs.
- **Solution**: ALL CSS and JS references in `index.html` MUST have cache-busting query strings (e.g. `?v=3`). When making significant changes, bump the version number on affected files. Currently all assets use `?v=3`.

### Wrangler Cannot Run in Cloud Environment
- **Problem**: This cloud dev environment has a proxy that blocks outbound requests to `api.cloudflare.com`. Any `wrangler` commands (deploy, d1 execute, etc.) fail with connection errors.
- **Solution**: Database migrations must be run manually by the user on their Mac:
  1. `git pull origin claude/work-on-boss-BrJkv` (get latest migration files first!)
  2. `npx wrangler d1 execute boss-db --remote --file=worker/migrations/<migration>.sql`
- Worker and frontend deployment is handled by GitHub Actions on push — no need to run wrangler deploy manually.

### GitHub Push Auth
- **Problem**: `git push` may fail with 403 if the branch name doesn't match the expected pattern.
- **Solution**: Always push with `git push origin master:claude/work-on-boss-BrJkv`. The branch name must start with `claude/` and match the session pattern.

## Current State (March 2026)

### Completed Features
- **Campaign Request Flow**: Clients submit campaign requests (draft status) → review in Requests tab → deploy landing page → campaign goes active
- **Landing Pages**: Server-rendered by Worker at `/lp/:slug`. Full engagement design with:
  - Hero gradient using campaign brand colors
  - Social proof avatars, benefit bullets, trust badges
  - 2-step form with progress indicator
  - ALL custom questions render as dropdowns with pre-populated options
  - Full-width testimonial strip below the grid
  - Mobile sticky CTA
- **Deploy Modal**: Styled popup (not browser alert) showing success/fail with one-click link to live page
- **Notification Badges**: iOS-style red circle badge on Campaigns sidebar item and Requests tab when pending drafts exist
- **Dashboard Alert**: Yellow banner on HQ Overview when campaign requests are pending
- **Compact Campaign Rows**: Active campaigns show inline logo, bold name, horizontal stats (leads, CPL, acceptance, period)
- **Compact Detail View**: Label:value rows for scope, horizontal stats strip, minimal whitespace

### Database Migrations
- 001: Initial tables
- 002: Mock data
- 003: Campaign requests schema (added tal, suppression_list, custom_questions, brand colors, logo_url columns)
- 004: Seed initial campaign request
- 005: Fresh campaigns (3 campaigns, but some questions were text type)
- 006: Fresh campaigns v2 — deletes all campaigns/landing pages, seeds 3 new campaigns with ALL dropdown questions:
  - **NovaTech** (id=20): Red/dark branding, cybersecurity, 750 leads, $9 CPL
  - **GreenLeaf HR** (id=21): Green branding, employee engagement, 500 leads, $7.50 CPL
  - **TestCorp** (id=22): Purple branding, AI/ML, 1000 leads, $11 CPL

### Key Files Modified
- `frontend/js/modules/campaigns.js` — v4 rewrite (deploy modal, compact rows, compact detail)
- `frontend/css/modules/campaigns.css` — v4 matching CSS
- `frontend/css/components.css` — iOS-style `.notif-badge`
- `frontend/js/modules/hq.js` — async, fetches campaigns, shows alert banner
- `frontend/js/router.js` — `refreshBadges()` for sidebar badge counts
- `frontend/js/state.js` — added `viewingCampaign` to State
- `frontend/index.html` — campaign badge span, `?v=3` cache busting on all assets
- `worker/src/routes/landing-page.ts` — full engagement landing page design

### Pending User Action
- Run migration 006 on Mac: `npx wrangler d1 execute boss-db --remote --file=worker/migrations/006_fresh_campaigns_v2.sql`
- Then test the 3 new campaigns: review in Requests tab, deploy each, verify landing pages pick up correct branding

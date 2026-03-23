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

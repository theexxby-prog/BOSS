# BOSS HQ — Development Guide

## Architecture
- **Frontend**: Static HTML/CSS/JS in `frontend/` — hosted on Cloudflare Pages (`boss.mehtahouse.cc`)
- **Backend API**: Cloudflare Worker in `worker/src/` — hosted at `boss-api.mehtahouse.cc`
- **Database**: Cloudflare D1 (database name: `boss-db`)

## Deployment Pipeline
Push to `main` → GitHub Actions auto-deploys both frontend and worker to Cloudflare production. Takes ~30-60 seconds.

### How to push changes
```bash
git add <files> && git commit -m "message" && git push origin HEAD:main
```

### Important deployment details
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Workflow triggers on push to `main` and any `claude/**` branch
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

## Known Issues & Solutions

### Cloudflare CDN Caching
- ALL CSS and JS references in `index.html` MUST have cache-busting query strings (e.g. `?v=3`). Bump on significant changes.

### Wrangler Cannot Run in Cloud Environment
- Database migrations must be run manually by the user on their Mac:
  1. `git pull origin main`
  2. `npx wrangler d1 execute boss-db --remote --file=worker/migrations/<migration>.sql`

### Preview Environment
- The preview server (`.claude/launch.json`) serves local frontend files but **cannot reach the production API** (`ERR_FAILED`).
- Preview is useful for checking layout, CSS, and UI structure only.
- Real data (campaigns, leads, etc.) is only visible on production (`boss.mehtahouse.cc`).

---

## Design System — "Productive.io" Benchmark

### Principles
1. Every screen is a tool, not a homepage. Density and clarity over spacious marketing layouts.
2. Blue is a privilege — at most 4-5 places per screen: active nav, CTAs, overlines, key phrase highlights.
3. The data is the design. Tables, progress bars, stat cards are the most prominent elements.
4. Restraint is the style. No gradients, no decorative shadows, no coloured backgrounds.
5. Sidebar is navigation only.
6. One primary action per page (one blue filled button per section).
7. Dark mode is not optional — every colour uses CSS variables.

### Colour System
```css
:root {
  --blue-600: #3B5BDB;  --blue-100: #EDF2FF;  --blue-800: #1E3A8A;
  --bg-page: #F8F9FA;  --bg-card: #FFFFFF;  --bg-muted: #F1F3F5;
  --text-primary: #1C1C1E;  --text-secondary: #6B7280;  --text-tertiary: #9CA3AF;
  --border: rgba(0,0,0,0.10);  --border-strong: rgba(0,0,0,0.18);
  --green-600: #2F9E44;  --green-100: #EBFBEE;
  --amber-600: #E67700;  --amber-100: #FFF9DB;
  --red-600: #E03131;  --red-100: #FFF5F5;
  --gray-600: #6B7280;  --gray-100: #F3F4F6;
  --radius-sm: 6px;  --radius-md: 8px;  --radius-lg: 12px;  --radius-xl: 16px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
}
[data-theme="dark"] {
  --bg-page: #111113;  --bg-card: #1C1C1E;  --bg-muted: #28282C;
  --text-primary: #F4F4F5;  --text-secondary: #A1A1AA;  --text-tertiary: #71717A;
  --border: rgba(255,255,255,0.08);  --border-strong: rgba(255,255,255,0.14);
  --blue-100: rgba(59,91,219,0.15);  --green-100: rgba(47,158,68,0.15);
  --amber-100: rgba(230,119,0,0.15);  --red-100: rgba(224,49,49,0.15);
  --gray-100: rgba(255,255,255,0.06);
}
```

### Typography
- Font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
- Two weights only: 400 (regular) and 500 (medium). Never 600 or 700.
- Overline: 11px/500, uppercase, letter-spacing 0.08em, color blue-600
- Page heading: 26-32px/500
- Section heading: 20px/500
- Card title: 15px/500
- Body: 14px/400, line-height 1.7
- Secondary: 13px/400, text-secondary
- Table header: 11px/500, uppercase, letter-spacing 0.06em
- Micro/badge: 12px/500

### Layout
- Sidebar: 200px, bg-muted, border-right 0.5px
- Content: margin-left 200px, padding 28px 32px, bg-page
- Topbar: 48px, bg-card, border-bottom 0.5px, sticky
- Nav items: 13px, 7px 16px padding, active has 2px blue-600 left border

### Status Badge Mapping
- badge-blue → Active, In progress, Open
- badge-green → Delivered, Completed, Won
- badge-amber → In review, Pending, At risk
- badge-red → Paused, Overdue, Lost
- badge-gray → Draft, Archived, On hold

### Icons
- Lucide icons (16px stroke, stroke-width 1.5) via CDN
- Never use emoji as UI icons
- Default color: text-secondary. Hover/active: text-primary. On blue surfaces: blue-600

### What NOT to Do
- No gradients on backgrounds, cards, buttons, or sidebars
- No box shadows except --shadow-sm on elevated overlays
- No coloured backgrounds on content sections
- No decorative illustrations or stock photography
- No rounded corners above 16px
- No animations on page load
- No font-weight 600 or 700
- No coloured headings except .highlight spans (blue only)
- No dark sidebar — always muted grey variant
- Never hard-code #ffffff or #000000

### Spacing Rhythm (multiples of 4px)
- Badge: 3px 10px
- Label-input gap: 6px
- Form groups: 16px
- Card padding: 20px 24px
- Card grid gap: 12px
- Content padding: 28px 32px
- Page header to content: 24px
- Section gap: 32px
- Nav item: 7px 16px

### Module Notes
- **HQ Overview**: 4-col stat grid, campaign status table, BD pipeline by stage
- **Campaigns**: Primary table with progress bars, filterable by status
- **Lead Operations**: Table with slide-over detail panel (not modal)
- **Client Management**: Card grid with initials avatar
- **Finance & P&L**: Stat cards + tabbed invoices/expenses/P&L
- **BD Pipeline**: Kanban (Prospect → Qualified → Proposal → Negotiation → Closed)
- **Social Command**: Post grid with compose panel
- **Documents**: File list table in .panel
- **Operations Centre**: Checklists and SOPs
- **Settings**: Two-column layout with secondary nav

### Ask Claude Button
- Fixed bottom-right, blue-600 pill, z-index 999
- Opens 400x500px chat panel from bottom-right
- Context-aware: system prompt includes current BOSS module

---

## Current State (March 2026)

### Completed Features
- Campaign Request Flow (draft → review → deploy → active)
- Landing Pages (server-rendered at `/lp/:slug`)
- Deploy Modal, Notification Badges, Dashboard Alert
- Compact Campaign Rows and Detail View

### Database Migrations
- 001-007: Tables, mock data, campaign requests schema, seed data

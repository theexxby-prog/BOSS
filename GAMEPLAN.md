# BOSS HQ — Game Plan

## What Is This?
BOSS HQ is Vishal's internal business operating system for running a B2B content syndication lead generation business. It is NOT a SaaS product — it is a private ops tool for managing clients, campaigns, leads, QA, delivery, invoicing, and business development.

## Live URLs
- **Frontend:** https://boss.mehtahouse.cc
- **API:** https://boss-api.mehtahouse.cc
- **GitHub:** https://github.com/theexxby-prog/BOSS
- **Future domain:** pipelane.io (taken — will acquire when ready)

## Tech Stack
| Layer | Tech | Notes |
|---|---|---|
| Frontend | Vanilla JS SPA | Static HTML/CSS/JS, no framework |
| Backend | Cloudflare Worker (TypeScript) | REST API, 13 routes |
| Database | Cloudflare D1 (SQLite) | `boss-db`, ID: fff1beb1-9938-4297-af66-797e4126dd5a |
| Hosting | Cloudflare Pages | Auto-deploys on git push |
| Deployment | GitHub Actions | Pushes worker + frontend simultaneously |
| Local dev | `npx wrangler dev --local` (port 8787) + open frontend/index.html |

## Repository Structure
```
boss-hq/
├── frontend/          # Static SPA (deployed to Cloudflare Pages)
│   ├── index.html     # Nav, shell, loads all modules
│   ├── css/           # Variables, layout, components, per-module CSS
│   └── js/
│       ├── api.js         # All API calls (BASE_URL = boss-api.mehtahouse.cc)
│       ├── state.js       # App state (current module, tabs, etc.)
│       ├── router.js      # Module renderer (async-capable)
│       ├── main.js        # Theme, sidebar, init
│       └── modules/       # One file per module (hq, leads, clients, etc.)
├── worker/
│   ├── src/
│   │   ├── index.ts       # Main router, ICP scoring endpoint
│   │   ├── cors.ts        # CORS + JSON response helpers
│   │   ├── db.ts          # D1 query helpers
│   │   ├── types.ts       # TypeScript interfaces
│   │   └── routes/        # One file per resource
│   ├── migrations/
│   │   ├── 001_add_tables.sql   # 5 new tables + 10 settings rows
│   │   └── 002_mock_data.sql    # Test Corp + 20 leads dry run data
│   └── schema.sql         # Full DB schema (11 tables)
├── wrangler.toml          # Cloudflare config (worker + D1 binding + routes)
└── .github/workflows/deploy.yml  # Auto-deploy on git push
```

## Database Tables (11 total)
| Table | Purpose |
|---|---|
| clients | Client companies |
| campaigns | Active campaigns per client |
| leads | All captured leads |
| deliveries | Lead delivery log to clients |
| finance_revenue | Revenue records |
| finance_expenses | Expense records |
| invoices | Client invoices |
| subscriptions | Tool/SaaS subscriptions |
| social_posts | Social media content |
| bd_pipeline | Business development prospects |
| system_logs | Ops audit trail |
| assets | Whitepapers, ebooks, content assets |
| landing_pages | Campaign landing pages + form submissions |
| documents | MSAs, IOs, NDAs, job cards |
| job_cards | Campaign job specifications |
| settings | Platform configuration (API keys, integrations) |

## Frontend Modules (11)
| Module | Tab Group | Status |
|---|---|---|
| HQ Overview | Command | ✅ Built (static briefing) |
| Campaigns | Pipeline | ✅ Built (live data) |
| Lead Operations | Pipeline | ✅ Built (4 tabs: Pipeline/QA/All/Delivery) |
| Client Management | Pipeline | ✅ Built (live data, detail view) |
| Assets & Pages | Pipeline | ✅ Built (assets + landing pages tabs) |
| Finance & P&L | Business | ✅ Built (subscriptions/invoices/expenses) |
| Documents | Business | ✅ Built (tabs by doc type) |
| BD Pipeline | Business | ✅ Built |
| Social Command | Growth | ✅ Built |
| Operations Centre | System | ✅ Built (system logs) |
| Settings | System | ✅ Built (live save, masked API keys) |

## ICP Scoring Logic (in worker/src/index.ts)
- 90%+ → auto-approve
- 70–89% → QA queue (manual review)
- <70% → auto-reject
- Score breakdown: titles (+20), industries (+15), company_sizes (+10), geographies (+5), email_verified (+5)

## Mock Dry Run Data (already seeded in D1)
- **Client:** Test Corp (Dry Run) — id: 1
- **Asset:** B2B Content Syndication Guide 2026 — id: 1
- **Campaign:** DryRun — Content Synd Q1 2026 — target: 20 leads, CPL: $6
- **Landing Page:** slug: `dryrun-q1-2026`
- **Job Card:** id: 1
- **Leads:** 20 test leads with mixed ICP scores (60–96), mixed statuses

---

## Overall Vision & Business Model
Vishal runs a B2B content syndication lead generation business:
1. **Client signs** → MSA + IO + Job Card define terms
2. **Campaign created** → asset (whitepaper/ebook) + landing page
3. **Outreach** → Apollo.io finds prospects, Instantly.ai sends emails
4. **Lead captured** → form submission on landing page → D1
5. **Lead scored** → ICP scoring engine auto-approves/queues/rejects
6. **QA review** → Vishal manually reviews QA queue
7. **Delivery** → approved leads sent to client (CSV / Convertr / HubSpot)
8. **Invoice generated** → based on delivered lead count × CPL
9. **Legal docs** → MSA, IO, NDA stored in Documents module

---

## What's Done ✅
- [x] Full Cloudflare stack deployed (Worker + D1 + Pages)
- [x] Custom domains live: boss.mehtahouse.cc + boss-api.mehtahouse.cc
- [x] GitHub repo connected with auto-deploy on push
- [x] All 11 frontend modules built
- [x] All 13 API routes built
- [x] ICP scoring engine
- [x] Mock dry run data seeded (Test Corp, 20 leads)
- [x] QA queue with approve/reject/re-score actions
- [x] Settings page with live save
- [x] Dark/light mode toggle

## What's Next 🔜 (Priority Order)

### Phase 1 — Complete the Dry Run Pipeline
- [ ] **Landing page** — make dryrun-q1-2026 publicly accessible at boss.mehtahouse.cc/lp/dryrun-q1-2026 (form that submits leads to D1)
- [ ] **Email delivery** — connect Instantly.ai API key in Settings, test outreach sequence
- [ ] **Lead delivery** — CSV export from approved leads in QA queue
- [ ] **Invoice generation** — PDF invoice from delivered leads × CPL
- [ ] **Document generation** — PDF for MSA, IO, Job Card

### Phase 2 — Integrations
- [ ] **Apollo.io** — prospecting API (add key in Settings)
- [ ] **Instantly.ai** — email outreach API (add key in Settings)
- [ ] **NeverBounce** — email verification API (add key in Settings)
- [ ] **n8n** — workflow automation (needs VPS or n8n cloud account)
- [ ] **Convertr / HubSpot** — lead delivery integrations

### Phase 3 — Platform Maturity
- [ ] **HQ Overview** — wire up to real D1 data (currently static)
- [ ] **Add Client UI** — form to add new clients from the UI
- [ ] **Add Campaign UI** — form to create campaigns from the UI
- [ ] **Landing page builder** — UI to create/edit landing pages
- [ ] **Multi-user access** — login system (currently no auth)
- [ ] **Mobile optimization** — improve mobile experience
- [ ] **Migrate frontend to React/Next.js** — when complexity demands it

### Phase 4 — Growth
- [ ] **Buy pipelane.io** (or alternative) and migrate from mehtahouse.cc
- [ ] **First real client onboarded**
- [ ] **Recurring billing** — invoice automation
- [ ] **Client portal** — read-only view for clients to check delivery status

---

## Key Decisions & Context
- **No auth yet** — BOSS HQ is private/internal, security by obscurity for now
- **Vanilla JS chosen** for speed of build — will migrate to React when needed
- **Cloudflare chosen** over Supabase/Vercel for cost efficiency and D1's tight Worker integration
- **pipelane.io** is the intended brand domain — all .com/.io/.ai/.co extensions taken, will acquire when ready
- **Dry run first** — validate full pipeline with mock data before getting a real client
- **Vishal does BD** — platform supports him, not replaces him

---

## How to Deploy
```bash
cd /Users/vishal/boss-hq
git add .
git commit -m "your message"
git push
# GitHub Action auto-deploys worker + frontend in ~30 seconds
```

## How to Develop Locally
```bash
# Terminal 1 — Worker API
cd /Users/vishal/boss-hq
npx wrangler dev --local   # runs on http://localhost:8787

# Terminal 2 — Frontend
# Change BASE_URL in frontend/js/api.js to http://localhost:8787
# Open frontend/index.html in browser
# Remember to revert BASE_URL before pushing
```

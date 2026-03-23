# Campaign Request → Landing Page Deploy Flow

## Summary
Client submits campaign request → Vishal reviews in BOSS HQ → one-click deploy landing page.

## Campaign Request Fields
- **Client info**: name, contact
- **Asset**: file/URL (whitepaper, ebook, etc.)
- **Suppression list**: emails/domains to exclude (CSV or JSON)
- **TAL (Target Account List)**: companies to target (CSV or JSON)
- **Campaign scope**: target lead count, CPL, geography, industries, titles, company sizes
- **Page branding**: primary color, secondary color, logo URL, accent color
- **Status**: pending → approved → live

## Landing Page
- Publicly accessible at: `boss.mehtahouse.cc/lp/:slug` (served as static HTML by worker)
- Branded with client's colors/logo
- Standard fields: first_name, last_name, email, company, title, phone
- 2 custom qualifying questions (auto-generated based on asset topic, editable by Vishal)
- Asset download after form submit
- Form POST → `/api/pages/:slug/submit` → creates lead in D1

## What to Build

### 1. Schema Changes
- Add to `campaigns` table: `tal`, `suppression_list`, `custom_questions` (JSON)
- Add to `landing_pages` table: `brand_color`, `brand_color_secondary`, `brand_accent`, `logo_url`, `custom_questions` (JSON)

### 2. Campaign Request UI (frontend)
- New "Requests" tab in Campaigns module
- Shows pending campaign requests with full details
- Review panel: see asset, TAL summary, suppression list count, scope, branding
- "Create Landing Page" button → pre-fills landing page builder

### 3. Landing Page Builder (frontend)
- Form to customize: headline, subheadline, CTA text, colors, logo
- Preview of how page will look
- 2 custom question fields (question text + answer type)
- "Deploy" button → creates landing page + sets status to live

### 4. Public Landing Page Renderer (worker)
- New route: `GET /lp/:slug` → returns full HTML page
- Styled with client branding (colors, logo)
- Form with standard fields + custom questions
- Submit → POST to `/api/pages/:slug/submit`
- Thank you page with asset download link

### 5. For Current Version (Dummy Client)
- Pre-fill with Test Corp data
- Assume client approved
- Single click deploy

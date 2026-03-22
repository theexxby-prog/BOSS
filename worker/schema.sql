-- BOSS HQ — D1 Database Schema
-- Version: 1.0 | March 2026

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL CHECK(type IN ('agency', 'aggregator', 'direct')),
  status            TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'pilot', 'churned')),
  cpl               REAL NOT NULL,
  delivery_method   TEXT NOT NULL CHECK(delivery_method IN ('convertr', 'integrate', 'hubspot', 'csv', 'api')),
  icp_spec          TEXT,           -- JSON: {industries, titles, company_sizes, geographies, tech_stack}
  suppression_list  TEXT,           -- JSON array of emails
  contract_details  TEXT,           -- JSON: {start_date, end_date, monthly_minimum, payment_terms}
  contact_name      TEXT,
  contact_email     TEXT,
  contact_phone     TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- CAMPAIGNS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'draft')),
  target          INTEGER NOT NULL DEFAULT 0,   -- total leads ordered
  delivered       INTEGER NOT NULL DEFAULT 0,
  accepted        INTEGER NOT NULL DEFAULT 0,
  rejected        INTEGER NOT NULL DEFAULT 0,
  cpl             REAL NOT NULL,
  acceptance_rate REAL GENERATED ALWAYS AS (
    CASE WHEN delivered > 0 THEN ROUND(CAST(accepted AS REAL) / delivered * 100, 1) ELSE 0 END
  ) STORED,
  pacing          TEXT GENERATED ALWAYS AS (
    CASE
      WHEN delivered >= target THEN 'completed'
      WHEN CAST(delivered AS REAL) / NULLIF(target, 0) >= 0.8 THEN 'on_track'
      WHEN CAST(delivered AS REAL) / NULLIF(target, 0) >= 0.5 THEN 'at_risk'
      ELSE 'behind'
    END
  ) STORED,
  asset_name      TEXT,
  asset_url       TEXT,
  start_date      TEXT,
  end_date        TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- LEADS (Smart Minimum fields)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id         INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id           INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  company             TEXT NOT NULL,
  title               TEXT NOT NULL,
  industry            TEXT,
  company_size        TEXT,         -- e.g. '51-200', '201-500'
  revenue_range       TEXT,         -- e.g. '$10M-$50M'
  tech_stack          TEXT,         -- JSON array
  country             TEXT,
  state               TEXT,
  asset_downloaded    TEXT,
  consent_flag        INTEGER NOT NULL DEFAULT 1 CHECK(consent_flag IN (0, 1)),
  icp_score           REAL,         -- 0-100
  status              TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'delivered', 'accepted', 'bounced')),
  rejection_reason    TEXT,
  email_verified      INTEGER DEFAULT 0 CHECK(email_verified IN (0, 1)),
  enriched            INTEGER DEFAULT 0 CHECK(enriched IN (0, 1)),
  source              TEXT,         -- 'instantly', 'landing_page', 'manual', 'webhook'
  captured_at         TEXT NOT NULL DEFAULT (datetime('now')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- ─────────────────────────────────────────
-- DELIVERIES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliveries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id         INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id     INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  method          TEXT NOT NULL CHECK(method IN ('convertr', 'integrate', 'hubspot', 'csv', 'api')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'accepted', 'rejected', 'failed')),
  response_code   INTEGER,
  response_body   TEXT,
  delivered_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_deliveries_lead ON deliveries(lead_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_campaign ON deliveries(campaign_id);

-- ─────────────────────────────────────────
-- FINANCE — REVENUE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_revenue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  amount      REAL NOT NULL,
  leads_count INTEGER NOT NULL DEFAULT 0,
  cpl         REAL NOT NULL,
  period      TEXT NOT NULL,   -- 'YYYY-MM'
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- FINANCE — EXPENSES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    TEXT NOT NULL,   -- 'tool', 'data', 'hosting', 'other'
  description TEXT NOT NULL,
  amount      REAL NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  date        TEXT NOT NULL,
  recurring   INTEGER DEFAULT 0 CHECK(recurring IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id      INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  leads_count    INTEGER NOT NULL DEFAULT 0,
  cpl            REAL NOT NULL,
  total          REAL NOT NULL,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date       TEXT,
  paid_date      TEXT,
  period         TEXT,   -- 'YYYY-MM'
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,   -- 'email', 'data', 'hosting', 'ai', 'social', 'other'
  cost          REAL NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly', 'annual', 'usage')),
  renewal_date  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'paused')),
  url           TEXT,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- SOCIAL POSTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  platform      TEXT NOT NULL CHECK(platform IN ('linkedin', 'twitter', 'both')),
  content       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at  TEXT,
  published_at  TEXT,
  impressions   INTEGER DEFAULT 0,
  likes         INTEGER DEFAULT 0,
  comments      INTEGER DEFAULT 0,
  reposts       INTEGER DEFAULT 0,
  utm_campaign  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- BD PIPELINE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bd_pipeline (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  company           TEXT NOT NULL,
  stage             TEXT NOT NULL DEFAULT 'qualified' CHECK(stage IN ('qualified', 'pitched', 'pilot', 'negotiation', 'closed_won', 'closed_lost')),
  value             REAL NOT NULL DEFAULT 0,    -- estimated monthly contract value
  probability       INTEGER DEFAULT 50,          -- 0-100
  contact_name      TEXT,
  contact_title     TEXT,
  contact_email     TEXT,
  next_action       TEXT,
  next_action_date  TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- SYSTEM LOGS (n8n workflow activity)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_name TEXT NOT NULL,
  runs          INTEGER NOT NULL DEFAULT 0,
  successes     INTEGER NOT NULL DEFAULT 0,
  failures      INTEGER NOT NULL DEFAULT 0,
  last_run_at   TEXT,
  last_status   TEXT CHECK(last_status IN ('success', 'failure', 'running')),
  last_error    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- SEED: Default subscriptions (known tools)
-- ─────────────────────────────────────────
INSERT OR IGNORE INTO subscriptions (name, category, cost, billing_cycle, renewal_date, status, url) VALUES
  ('Cloudflare', 'hosting', 0, 'monthly', '2026-04-01', 'active', 'https://cloudflare.com'),
  ('Claude Pro', 'ai', 20, 'monthly', '2026-04-01', 'active', 'https://claude.ai'),
  ('Google Workspace', 'other', 7, 'monthly', '2026-04-01', 'active', 'https://workspace.google.com'),
  ('Instantly.ai', 'email', 37, 'monthly', '2026-04-01', 'active', 'https://instantly.ai'),
  ('Apollo.io', 'data', 49, 'monthly', '2026-04-01', 'active', 'https://apollo.io'),
  ('NeverBounce', 'data', 0, 'usage', '2026-04-01', 'active', 'https://neverbounce.com'),
  ('Buffer', 'social', 15, 'monthly', '2026-04-01', 'active', 'https://buffer.com'),
  ('Carrd', 'hosting', 19, 'monthly', '2026-04-01', 'active', 'https://carrd.co');

-- SEED: Default n8n workflows in system logs
INSERT OR IGNORE INTO system_logs (workflow_name, runs, successes, failures) VALUES
  ('Lead Ingestion', 0, 0, 0),
  ('Lead Enrichment', 0, 0, 0),
  ('Email Verification', 0, 0, 0),
  ('ICP Scoring', 0, 0, 0),
  ('Lead Delivery', 0, 0, 0),
  ('Acceptance Polling', 0, 0, 0),
  ('Campaign Pacing', 0, 0, 0),
  ('Daily Briefing', 0, 0, 0),
  ('Invoice Generation', 0, 0, 0),
  ('Social Publishing', 0, 0, 0),
  ('Subscription Alerts', 0, 0, 0),
  ('Database Cleanup', 0, 0, 0);

-- Migration 001: Add assets, landing_pages, documents, job_cards, settings

CREATE TABLE IF NOT EXISTS assets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK(type IN ('whitepaper','ebook','webinar','report','case_study','other')),
  description   TEXT,
  file_url      TEXT,
  thumbnail_url TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS landing_pages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id   INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id     INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  asset_id      INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  headline      TEXT,
  subheadline   TEXT,
  cta_text      TEXT DEFAULT 'Download Now',
  fields        TEXT NOT NULL DEFAULT '["first_name","last_name","email","company","title","phone"]',
  status        TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','paused','archived')),
  views         INTEGER DEFAULT 0,
  submissions   INTEGER DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id   INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK(type IN ('invoice','msa','insertion_order','job_card','nda','other')),
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','signed','paid','cancelled')),
  content       TEXT,
  file_url      TEXT,
  due_date      TEXT,
  signed_at     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_cards (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id      INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id        INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  target_leads     INTEGER NOT NULL DEFAULT 0,
  cpl              REAL NOT NULL DEFAULT 0,
  total_value      REAL GENERATED ALWAYS AS (target_leads * cpl) STORED,
  asset_name       TEXT,
  icp_summary      TEXT,
  delivery_method  TEXT,
  start_date       TEXT,
  end_date         TEXT,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','completed','cancelled')),
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT,
  type        TEXT NOT NULL DEFAULT 'string' CHECK(type IN ('string','number','boolean','json')),
  description TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value, type, description) VALUES
  ('icp_score_auto_deliver', '90', 'number', 'ICP score threshold for auto-delivery'),
  ('icp_score_qa_min', '70', 'number', 'Minimum ICP score for QA queue'),
  ('default_cpl', '6', 'number', 'Default cost per lead'),
  ('company_name', 'BOSS HQ', 'string', 'Your company name for documents'),
  ('company_email', '', 'string', 'Your email for invoices and contracts'),
  ('company_address', '', 'string', 'Your address for legal documents'),
  ('apollo_api_key', '', 'string', 'Apollo.io API key'),
  ('neverbounce_api_key', '', 'string', 'NeverBounce API key'),
  ('instantly_api_key', '', 'string', 'Instantly.ai API key'),
  ('n8n_webhook_url', '', 'string', 'n8n incoming webhook base URL');

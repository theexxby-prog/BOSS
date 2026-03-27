-- Migration 010: Add global_leads and campaign_leads tables
-- Additive only — does NOT modify or drop any existing tables

-- ─────────────────────────────────────────────
-- TABLE 1: global_leads
-- Stores unique lead identity across all campaigns
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,
  name       TEXT,
  source     TEXT    CHECK(source IN ('apollo', 'manual', 'import')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_global_leads_email ON global_leads(email);

-- ─────────────────────────────────────────────
-- TABLE 2: campaign_leads
-- Stores per-campaign lifecycle for each lead
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_leads (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id             INTEGER NOT NULL REFERENCES global_leads(id) ON DELETE CASCADE,
  campaign_id         INTEGER NOT NULL REFERENCES campaigns(id)    ON DELETE CASCADE,

  -- Lifecycle status
  status              TEXT    NOT NULL DEFAULT 'pending'
                              CHECK(status IN ('pending', 'delivered', 'accepted', 'rejected')),

  -- Timestamps
  delivered_at        TIMESTAMP,
  accepted_at         TIMESTAMP,
  rejected_at         TIMESTAMP,

  -- Acceptance
  acceptance_source   TEXT,
  invoice_id          INTEGER REFERENCES invoices(id),
  price_at_acceptance NUMERIC,

  -- QA fields (logic added in Stage 3)
  qa_status           TEXT    NOT NULL DEFAULT 'pending'
                              CHECK(qa_status IN ('pending', 'approved', 'rejected')),
  qa_reason           TEXT,
  qa_checked_at       TIMESTAMP,

  -- Prevent duplicate lifecycle records for same lead + campaign
  UNIQUE(lead_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead_id     ON campaign_leads(lead_id);

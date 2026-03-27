-- Add CHECK constraint to billing_status on campaign_leads.
-- SQLite requires a full table rebuild to add CHECK constraints.
-- Existing invalid values are coerced to 'billable' on copy.
--
-- Actual column set verified via PRAGMA table_info(campaign_leads) before writing.

CREATE TABLE campaign_leads_v2 (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id                 INTEGER NOT NULL REFERENCES global_leads(id),
  campaign_id             INTEGER NOT NULL REFERENCES campaigns(id),
  status                  TEXT NOT NULL DEFAULT 'pending',
  delivered_at            TIMESTAMP,
  accepted_at             TIMESTAMP,
  rejected_at             TIMESTAMP,
  acceptance_source       TEXT,
  invoice_id              INTEGER,
  price_at_acceptance     REAL,
  qa_status               TEXT,
  qa_reason               TEXT,
  qa_checked_at           TEXT,
  billing_status          TEXT NOT NULL DEFAULT 'billable'
                            CHECK (billing_status IN ('billable', 'non-billable')),
  billing_override_reason TEXT,
  billing_overridden_by   TEXT,
  billing_overridden_at   TIMESTAMP,
  UNIQUE(lead_id, campaign_id)
);

INSERT INTO campaign_leads_v2 (
  id, lead_id, campaign_id, status,
  delivered_at, accepted_at, rejected_at, acceptance_source,
  invoice_id, price_at_acceptance,
  qa_status, qa_reason, qa_checked_at,
  billing_status, billing_override_reason, billing_overridden_by, billing_overridden_at
)
SELECT
  id, lead_id, campaign_id, status,
  delivered_at, accepted_at, rejected_at, acceptance_source,
  invoice_id, price_at_acceptance,
  qa_status, qa_reason, qa_checked_at,
  CASE WHEN billing_status IN ('billable', 'non-billable')
       THEN billing_status ELSE 'billable' END,
  billing_override_reason, billing_overridden_by, billing_overridden_at
FROM campaign_leads;

DROP TABLE campaign_leads;
ALTER TABLE campaign_leads_v2 RENAME TO campaign_leads;

-- Stage 5: Add billing columns to campaign_leads
ALTER TABLE campaign_leads ADD COLUMN billing_status TEXT NOT NULL DEFAULT 'billable';
ALTER TABLE campaign_leads ADD COLUMN billing_override_reason TEXT;
ALTER TABLE campaign_leads ADD COLUMN billing_overridden_by TEXT;
ALTER TABLE campaign_leads ADD COLUMN billing_overridden_at TIMESTAMP;

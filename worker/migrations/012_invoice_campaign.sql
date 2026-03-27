-- Stage 6: Add campaign_id to invoices table for campaign-level invoice generation
ALTER TABLE invoices ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id);

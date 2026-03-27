-- Prevent duplicate invoices per campaign at the DB level.
-- The application already checks idempotency, but this makes it
-- impossible for concurrent requests to create two invoices for
-- the same campaign regardless of application logic.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_campaign_id
  ON invoices(campaign_id)
  WHERE campaign_id IS NOT NULL;

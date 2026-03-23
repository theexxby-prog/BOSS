-- Migration 008: Add company_revenue column; update campaigns 30/31/32 with
--   correct US-only geo, 10000+ company size format, and revenue tiers.
--   Run AFTER migration 007.

ALTER TABLE campaigns ADD COLUMN company_revenue TEXT;

-- Campaign 30: Apex Revenue — mid-market to enterprise SaaS/Fintech
UPDATE campaigns SET
  geo             = '["Full USA"]',
  company_sizes   = '["200+","1000+","5000+"]',
  company_revenue = '["$50M+","$100M+","$500M+"]'
WHERE id = 30;

-- Campaign 31: ClearOps — enterprise supply chain
UPDATE campaigns SET
  geo             = '["Full USA"]',
  company_sizes   = '["1000+","5000+","10000+"]',
  company_revenue = '["$500M+","$1B+","$5B+"]'
WHERE id = 31;

-- Campaign 32: Vantage Health — health systems & insurers
UPDATE campaigns SET
  geo             = '["Full USA"]',
  company_sizes   = '["500+","1000+","5000+","10000+"]',
  company_revenue = '["$50M+","$100M+","$500M+","$1B+"]'
WHERE id = 32;

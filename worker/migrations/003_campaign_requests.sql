-- Campaign request fields
ALTER TABLE campaigns ADD COLUMN tal TEXT;                    -- JSON: target account list
ALTER TABLE campaigns ADD COLUMN suppression_list TEXT;       -- JSON: suppression emails/domains
ALTER TABLE campaigns ADD COLUMN custom_questions TEXT;       -- JSON: [{question, type}]
ALTER TABLE campaigns ADD COLUMN brand_color TEXT DEFAULT '#2563eb';
ALTER TABLE campaigns ADD COLUMN brand_color_secondary TEXT DEFAULT '#1e40af';
ALTER TABLE campaigns ADD COLUMN brand_accent TEXT DEFAULT '#3b82f6';
ALTER TABLE campaigns ADD COLUMN logo_url TEXT;
ALTER TABLE campaigns ADD COLUMN geo TEXT;                    -- JSON: target geographies
ALTER TABLE campaigns ADD COLUMN industries TEXT;             -- JSON: target industries
ALTER TABLE campaigns ADD COLUMN titles TEXT;                 -- JSON: target titles
ALTER TABLE campaigns ADD COLUMN company_sizes TEXT;          -- JSON: target company sizes

-- Landing page branding + custom questions
ALTER TABLE landing_pages ADD COLUMN custom_questions TEXT;   -- JSON: [{question, type}]
ALTER TABLE landing_pages ADD COLUMN brand_color TEXT DEFAULT '#2563eb';
ALTER TABLE landing_pages ADD COLUMN brand_color_secondary TEXT DEFAULT '#1e40af';
ALTER TABLE landing_pages ADD COLUMN brand_accent TEXT DEFAULT '#3b82f6';
ALTER TABLE landing_pages ADD COLUMN logo_url TEXT;
ALTER TABLE landing_pages ADD COLUMN asset_url TEXT;
ALTER TABLE landing_pages ADD COLUMN asset_name TEXT;

-- Add custom question answers to leads
ALTER TABLE leads ADD COLUMN custom_answers TEXT;             -- JSON: {q1: answer, q2: answer}

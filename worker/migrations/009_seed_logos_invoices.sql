-- Migration 009: Add logo URLs, set completed campaign, seed invoices

-- Add logo_url to some campaigns (using UI Avatars as placeholders)
UPDATE campaigns SET logo_url = 'https://ui-avatars.com/api/?name=DS&background=2563eb&color=fff&size=80&bold=true' WHERE name LIKE '%DemandScience%' OR name LIKE '%Demand%Science%';
UPDATE campaigns SET logo_url = 'https://ui-avatars.com/api/?name=TT&background=1e40af&color=fff&size=80&bold=true' WHERE name LIKE '%TechTarget%';
UPDATE campaigns SET logo_url = 'https://ui-avatars.com/api/?name=NL&background=059669&color=fff&size=80&bold=true' WHERE name LIKE '%NetLine%';
UPDATE campaigns SET logo_url = 'https://ui-avatars.com/api/?name=IG&background=7c3aed&color=fff&size=80&bold=true' WHERE name LIKE '%Integrate%';
UPDATE campaigns SET logo_url = 'https://ui-avatars.com/api/?name=ML&background=dc2626&color=fff&size=80&bold=true' WHERE name LIKE '%Madison%';
UPDATE campaigns SET logo_url = 'https://ui-avatars.com/api/?name=BD&background=ea580c&color=fff&size=80&bold=true' WHERE name LIKE '%Bombora%';
UPDATE campaigns SET logo_url = 'https://ui-avatars.com/api/?name=ZD&background=0891b2&color=fff&size=80&bold=true' WHERE name LIKE '%Ziff%';

-- Set one campaign to completed (pick the first active one and max out delivery)
UPDATE campaigns SET status = 'completed', delivered = target WHERE id = (SELECT id FROM campaigns WHERE status = 'active' ORDER BY id ASC LIMIT 1);

-- Seed invoices linked to campaigns
INSERT INTO invoices (client_id, invoice_number, leads_count, cpl, total, status, due_date, period, notes) VALUES
  ((SELECT client_id FROM campaigns WHERE status = 'completed' LIMIT 1), 'INV-2026-001',
   (SELECT target FROM campaigns WHERE status = 'completed' LIMIT 1),
   (SELECT cpl FROM campaigns WHERE status = 'completed' LIMIT 1),
   (SELECT target * cpl FROM campaigns WHERE status = 'completed' LIMIT 1),
   'paid', '2026-03-15', '2026-03', 'Completed campaign — full delivery'),
  (1, 'INV-2026-002', 500, 6, 3000, 'sent', '2026-04-01', '2026-03', 'March delivery batch 1'),
  (1, 'INV-2026-003', 250, 6, 1500, 'draft', '2026-04-15', '2026-04', 'April delivery — pending');

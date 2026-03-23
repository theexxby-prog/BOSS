-- Migration 007: Delete all campaigns & landing pages, seed 3 new campaigns (all dropdown questions)

DELETE FROM landing_pages;
DELETE FROM campaigns;

-- Ensure clients exist
INSERT OR IGNORE INTO clients (id, name, type, status, cpl, delivery_method, icp_spec, contact_name, contact_email, notes) VALUES
(4, 'Apex Revenue', 'direct', 'active', 12.00, 'csv',
 '{"industries":["SaaS","Fintech","Revenue Operations"],"titles":["CRO","VP Sales","VP Revenue"],"company_sizes":["201-500","501-1000","1001-5000"],"geographies":["US","Canada","UK"]}',
 'Jordan Blake', 'jordan@apexrevenue.com', 'Revenue intelligence platform');

INSERT OR IGNORE INTO clients (id, name, type, status, cpl, delivery_method, icp_spec, contact_name, contact_email, notes) VALUES
(5, 'ClearOps', 'agency', 'active', 8.50, 'api',
 '{"industries":["Supply Chain","Logistics","Operations","Manufacturing"],"titles":["COO","VP Operations","Supply Chain Director"],"company_sizes":["501-1000","1001-5000","5000+"],"geographies":["US","Germany","Netherlands"]}',
 'Priya Nair', 'priya@clearops.io', 'Supply chain visibility platform');

INSERT OR IGNORE INTO clients (id, name, type, status, cpl, delivery_method, icp_spec, contact_name, contact_email, notes) VALUES
(6, 'Vantage Health', 'direct', 'active', 15.00, 'csv',
 '{"industries":["Healthcare","Health Tech","Digital Health","Insurance"],"titles":["CMO","VP Clinical","Director Digital Health","CIO"],"company_sizes":["201-500","501-1000","1001-5000","5000+"],"geographies":["US"]}',
 'Dr. Mia Torres', 'mia@vantagehealth.com', 'Healthcare analytics platform');

-- Campaign 1: Apex Revenue — Sales Intelligence (Blue/Indigo branding)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes
) VALUES (
  30, 4,
  'Apex Revenue — B2B Sales Benchmark Report 2026',
  'draft', 600, 12.00,
  'The 2026 B2B Sales Benchmark Report',
  'https://example.com/assets/b2b-sales-benchmark-2026.pdf',
  '2026-05-01', '2026-08-31',
  '["Salesforce","HubSpot","Outreach","Salesloft","Gong","Chorus","Clari","Aviso","Boomerang","MixMax"]',
  '["apexrevenue.com","apex-staging.io"]',
  '[{"question":"What CRM does your team primarily use?","type":"select","options":["Salesforce","HubSpot","Microsoft Dynamics","Pipedrive","Zoho","Other"]},{"question":"What is your biggest sales challenge right now?","type":"select","options":["Pipeline visibility","Rep ramp time","Forecast accuracy","Lead quality","Quota attainment","Sales & marketing alignment"]},{"question":"When does your current sales tech contract renew?","type":"select","options":["Within 3 months","3-6 months","6-12 months","12+ months","No contract / evaluating now"]}]',
  '#1e3a5f', '#1e40af', '#3b82f6',
  'https://img.icons8.com/fluency/96/increase.png',
  '["United States","Canada","United Kingdom"]',
  '["SaaS","Fintech","Revenue Operations","Sales Technology","B2B Software"]',
  '["CRO","VP Sales","VP Revenue Operations","Director Sales Ops","Head of Revenue","Sales Director"]',
  '["201-500","501-1000","1001-5000"]',
  'Apex wants to reach revenue leaders evaluating intelligence platforms. Target mid-market SaaS and fintech. High intent MQLs with active buying cycles.'
);

-- Campaign 2: ClearOps — Supply Chain Visibility (Teal/Orange branding)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes
) VALUES (
  31, 5,
  'ClearOps — Supply Chain Resilience Playbook 2026',
  'draft', 400, 8.50,
  'Building Supply Chain Resilience: 2026 Ops Playbook',
  'https://example.com/assets/supply-chain-resilience-2026.pdf',
  '2026-04-20', '2026-07-20',
  '["DHL","FedEx","UPS","Amazon Logistics","Flexport","Project44","FourKites","Blue Yonder","Oracle SCM","SAP IBP"]',
  '["clearops.io","clearops-staging.com"]',
  '[{"question":"What is your biggest supply chain challenge?","type":"select","options":["Real-time visibility","Supplier reliability","Demand forecasting","Inventory optimization","Last-mile delivery","Regulatory compliance"]},{"question":"What tools do you use to manage supply chain?","type":"select","options":["SAP","Oracle SCM","Blue Yonder","Manhattan Associates","Homegrown systems","Spreadsheets/manual"]},{"question":"How many supplier relationships does your org manage?","type":"select","options":["Under 50","50-200","200-500","500-1000","1000+","Not applicable"]}]',
  '#134e4a', '#0f766e', '#14b8a6',
  'https://img.icons8.com/fluency/96/delivery.png',
  '["United States","Germany","Netherlands","United Kingdom","Canada"]',
  '["Supply Chain","Logistics","Operations","Manufacturing","Retail","CPG","Distribution"]',
  '["COO","VP Operations","Supply Chain Director","Head of Logistics","Director Procurement","VP Manufacturing"]',
  '["501-1000","1001-5000","5000+"]',
  'ClearOps targets ops leaders dealing with post-pandemic supply chain disruptions. Enterprise and upper mid-market focus. Germany and Netherlands key international markets.'
);

-- Campaign 3: Vantage Health — Clinical Analytics (Purple/Rose branding)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes
) VALUES (
  32, 6,
  'Vantage Health — Clinical Data & AI in Healthcare 2026',
  'draft', 350, 15.00,
  'AI-Powered Clinical Decisions: The 2026 Healthcare Leaders Guide',
  'https://example.com/assets/clinical-ai-healthcare-2026.pdf',
  '2026-06-01', '2026-10-31',
  '["Epic","Cerner","Allscripts","Meditech","athenahealth","Veeva","Optum","Change Healthcare","Availity","Cotiviti"]',
  '["vantagehealth.com","vantage-staging.health"]',
  '[{"question":"What EHR or clinical platform does your organization use?","type":"select","options":["Epic","Cerner (Oracle Health)","Meditech","Allscripts","athenahealth","Homegrown","Other"]},{"question":"What is your top priority for clinical data initiatives?","type":"select","options":["Reducing clinician burnout","Improving patient outcomes","Regulatory compliance (HIPAA/HL7)","Interoperability","Cost reduction","Population health management"]},{"question":"How mature is your clinical analytics program?","type":"select","options":["No formal program","Early exploration","Running pilots","Scaling solutions","Fully mature"]}]',
  '#4c1d95', '#6d28d9', '#a78bfa',
  'https://img.icons8.com/fluency/96/heart-with-pulse.png',
  '["United States"]',
  '["Healthcare","Health Technology","Digital Health","Health Insurance","Life Sciences","Hospitals & Health Systems"]',
  '["CMO","Chief Medical Officer","VP Clinical Informatics","Director Digital Health","CIO Healthcare","VP Clinical Operations","Chief Nursing Officer"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'Vantage Health targets clinical and IT leadership at health systems. US-only. Highest CPL — need verified clinical and C-suite contacts. Strict HIPAA-compliant messaging required.'
);

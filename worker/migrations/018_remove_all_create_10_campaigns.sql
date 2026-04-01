-- Migration 018: Remove all campaigns and create 10 broad campaigns matching real CSV data

-- Clear all existing campaigns
DELETE FROM campaigns;

-- Campaign 1: All Directors (broad targeting)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  1, 1,
  'Director Leadership Report 2026',
  'active',
  2000, 8.50,
  'The Complete Director Handbook 2026',
  'https://example.com/assets/director-handbook.pdf',
  '2026-04-01', '2026-12-31',
  '["LinkedIn","Apollo","Clearbit","Hunter.io"]',
  '[]',
  '[{"question":"What is your primary business challenge?","type":"text"}]',
  '#0f172a', '#1e293b', '#3b82f6',
  'https://img.icons8.com/fluency/96/user.png',
  '["United States","Canada","United Kingdom"]',
  '["Technology","Finance","Operations","Healthcare","Manufacturing","Education","Retail","Insurance"]',
  '["Director","Director of","VP Director"]',
  '["1-10","11-50","51-200","201-500","501-1000","1001-5000","5000+"]',
  'Broad targeting of all directors across industries and company sizes. Matches titles with "Director" keyword.'
);

-- Campaign 2: All VPs (Vice Presidents)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  2, 1,
  'VP Leadership Summit 2026',
  'active',
  1800, 9.00,
  'VP Executive Playbook: Strategy & Execution',
  'https://example.com/assets/vp-playbook.pdf',
  '2026-04-01', '2026-12-31',
  '["LinkedIn","Apollo","Clearbit"]',
  '[]',
  '[{"question":"What are your top 3 strategic priorities?","type":"text"}]',
  '#1e40af', '#1e3a8a', '#6366f1',
  'https://img.icons8.com/fluency/96/crown.png',
  '["United States","Canada","United Kingdom","Europe"]',
  '["Technology","Finance","Operations","Sales","Marketing","Healthcare","Manufacturing","Retail"]',
  '["VP ","Vice President","VP of","V.P."]',
  '["51-200","201-500","501-1000","1001-5000","5000+"]',
  'Targets all VPs across organizations. Matches "VP", "Vice President" titles.'
);

-- Campaign 3: All Managers
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  3, 1,
  'Manager Excellence Program 2026',
  'active',
  2500, 7.50,
  'Manager's Guide to Team Success',
  'https://example.com/assets/manager-guide.pdf',
  '2026-04-01', '2026-12-31',
  '["LinkedIn","Apollo"]',
  '[]',
  '[{"question":"What is your biggest team challenge?","type":"text"}]',
  '#7c3aed', '#6d28d9', '#a855f7',
  'https://img.icons8.com/fluency/96/supervisor.png',
  '["United States","Canada"]',
  '["Technology","Finance","Operations","Sales","Marketing","Healthcare","Manufacturing","Education"]',
  '["Manager","Manager of","Senior Manager"]',
  '["11-50","51-200","201-500","501-1000","1001-5000","5000+"]',
  'Targets managers at all levels. Matches "Manager" keyword.'
);

-- Campaign 4: C-Suite Executives
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  4, 1,
  'C-Suite Executive Network 2026',
  'active',
  800, 15.00,
  'C-Level Strategy & Transformation Guide',
  'https://example.com/assets/c-suite-guide.pdf',
  '2026-04-01', '2026-12-31',
  '["LinkedIn","Apollo","Clearbit"]',
  '[]',
  '[{"question":"What is your top transformation priority?","type":"text"}]',
  '#b91c1c', '#7f1d1d', '#dc2626',
  'https://img.icons8.com/fluency/96/businessman.png',
  '["United States","Canada","United Kingdom","Europe"]',
  '["Technology","Finance","Operations","Healthcare","Manufacturing","Retail","Insurance"]',
  '["CEO","CFO","CTO","CIO","COO","Chief ","C-Level"]',
  '["501-1000","1001-5000","5000+"]',
  'Premium targeting of C-level executives. Matches CEO, CFO, CTO, CIO, COO, and other Chief titles.'
);

-- Campaign 5: Operations & Business Leaders
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  5, 1,
  'Operations Excellence Summit 2026',
  'active',
  1500, 8.75,
  'Operational Efficiency & Process Optimization',
  'https://example.com/assets/ops-excellence.pdf',
  '2026-04-01', '2026-12-31',
  '["LinkedIn","Apollo"]',
  '[]',
  '[{"question":"What operational challenges are you facing?","type":"text"}]',
  '#047857', '#065f46', '#10b981',
  'https://img.icons8.com/fluency/96/settings.png',
  '["United States","Canada"]',
  '["Operations","Manufacturing","Logistics","Supply Chain","Healthcare","Education","Finance"]',
  '["Operations","Operations Manager","COO","Head of Operations","VP Operations"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'Targets operations-focused leaders. Matches "Operations", "COO" and related titles.'
);

-- Campaign 6: Technology & Engineering Leaders
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  6, 1,
  'Tech Leadership Summit 2026',
  'active',
  1600, 10.50,
  'Engineering & Technology Strategy Guide',
  'https://example.com/assets/tech-strategy.pdf',
  '2026-04-01', '2026-12-31',
  '["LinkedIn","Apollo","Clearbit"]',
  '[]',
  '[{"question":"What are your technology priorities for 2026?","type":"text"}]',
  '#1e40af', '#1e3a8a', '#3b82f6',
  'https://img.icons8.com/fluency/96/code.png',
  '["United States","Canada","United Kingdom","Europe"]',
  '["Technology","Software Development","Enterprise Software","Cloud","AI/ML","Data Science"]',
  '["CTO","VP Engineering","VP Technology","Chief Technology","Engineering Manager","Head of Engineering"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'Targets technology and engineering leaders. Matches CTO, VP Engineering, and related titles.'
);

-- Campaign 7: Finance & Accounting Leaders
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  7, 1,
  'Finance Leadership 2026',
  'active',
  1400, 9.25,
  'Financial Strategy & Planning Guide',
  'https://example.com/assets/finance-strategy.pdf',
  '2026-04-01', '2026-12-31',
  '["LinkedIn","Apollo"]',
  '[]',
  '[{"question":"What are your top finance priorities?","type":"text"}]',
  '#7c2d12', '#92400e', '#ea580c',
  'https://img.icons8.com/fluency/96/money.png',
  '["United States","Canada"]',
  '["Finance","Accounting","Financial Services","Banking","Insurance","Manufacturing"]',
  '["CFO","Finance Director","Finance Manager","Controller","VP Finance","Chief Financial","Accountant"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'Targets finance and accounting leaders. Matches CFO, Finance Director, Controller, and related titles.'
);

-- Campaign 8: Sales & Business Development Leaders
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  8, 1,
  'Sales Excellence Summit 2026',
  'active',
  1700, 8.00,
  'Sales Strategy & Revenue Growth Guide',
  'https://example.com/assets/sales-strategy.pdf',
  '2026-04-01', '2026-12-31',
  '["LinkedIn","Apollo"]',
  '[]',
  '[{"question":"What are your sales challenges?","type":"text"}]',
  '#be185d', '#831843', '#ec4899',
  'https://img.icons8.com/fluency/96/sales.png',
  '["United States","Canada"]',
  '["Sales","Business Development","Marketing","Technology","Software"]',
  '["VP Sales","Sales Director","VP Business Development","VP Commercial","Head of Sales","Sales Manager"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'Targets sales and business development leaders. Matches VP Sales, Sales Director, and related titles.'
);

-- Campaign 9: Human Resources & Talent Leaders
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  9, 1,
  'HR Leadership Forum 2026',
  'active',
  1200, 8.50,
  'Human Resources Strategy & Talent Guide',
  'https://example.com/assets/hr-strategy.pdf',
  '2026-04-01', '2026-12-31',
  '["LinkedIn","Apollo"]',
  '[]',
  '[{"question":"What are your talent priorities?","type":"text"}]',
  '#0369a1', '#075985', '#0ea5e9',
  'https://img.icons8.com/fluency/96/groups.png',
  '["United States","Canada"]',
  '["Human Resources","Recruiting","Staffing","Professional Services","Education"]',
  '["CHRO","VP Human Resources","HR Director","HR Manager","VP People","Head of HR","VP Talent"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'Targets HR and talent leaders. Matches CHRO, VP HR, HR Director, and related titles.'
);

-- Campaign 10: Healthcare & Medical Leaders
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  10, 1,
  'Healthcare Leadership Summit 2026',
  'active',
  1000, 12.00,
  'Healthcare Strategy & Operations Guide',
  'https://example.com/assets/healthcare-strategy.pdf',
  '2026-04-01', '2026-12-31',
  '["LinkedIn","Apollo"]',
  '[]',
  '[{"question":"What are your healthcare challenges?","type":"text"}]',
  '#831843', '#be185d', '#ec4899',
  'https://img.icons8.com/fluency/96/medical.png',
  '["United States","Canada"]',
  '["Healthcare","Hospitals","Pharmaceuticals","Medical Devices","Health Insurance","Biotechnology","Nursing"]',
  '["Chief Medical","Medical Director","Healthcare Director","Clinical Director","Chief Nursing","Healthcare Manager"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'Targets healthcare and medical leaders. Matches healthcare-focused titles.'
);

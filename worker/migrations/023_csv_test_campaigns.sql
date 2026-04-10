-- 6 new test campaigns matched to "Test Database.csv" ICP
-- CSV personas: CISO/Security, IT Director/CIO, Finance Director/VP/CFO,
--               Ops/Infrastructure Director, Compliance/Ethics, Strategy/Corp Dev
-- All US-based, mid-to-large enterprise (200–5000+ employees)

-- Remove any prior runs of this migration
DELETE FROM campaign_leads WHERE campaign_id IN (11,12,13,14,15,16);
DELETE FROM campaigns WHERE id IN (11,12,13,14,15,16);

-- ── 1. CISO & Security Leaders ─────────────────────────────────────────────
-- CSV examples: Scott Cenfetelli (CISO, Blue Cross KC), Nick Nedostup (CISO, Xylem),
--   Joe Baum (Dir Cyber Security, Motorola), Ken Schaerr (Dir Cyber Security, BMO),
--   James White (Sr Dir Security Ops, RJ OBrien), Sarah Jopp (Security Mgr, Mayo)
INSERT INTO campaigns (id, client_id, name, status, target, cpl, asset_name, asset_url,
  start_date, end_date, tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes)
VALUES (11, 1, 'CISO & Security Leaders Program', 'active', 120, 15.50,
  'Enterprise Security Posture Report 2026', 'https://example.com/assets/security-posture-2026.pdf',
  '2026-04-01', '2026-09-30',
  '["LinkedIn","Apollo"]', '[]',
  '[{"question":"What is your top cybersecurity priority for 2026?","type":"text"},{"question":"What security framework does your organisation follow?","type":"select","options":["NIST","ISO 27001","SOC 2","CIS Controls","Other"]}]',
  '#7c2d12', '#92400e', '#ea580c',
  'https://img.icons8.com/fluency/96/lock-2.png',
  '["United States"]',
  '["Financial Services","Healthcare","Technology","Manufacturing","Insurance"]',
  '["CISO","Chief Information Security Officer","Director of Cyber Security","Director of Information Security","VP Information Security","Security Manager","Head of Cyber Security"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'CSV-matched: CISOs and security directors from healthcare, financial services, and enterprise tech');

-- ── 2. IT Directors & CIO Network ─────────────────────────────────────────
-- CSV examples: David Kassis (Dir IT, Rag & Bone), Kipp Drake (IT Dir, Banner Health),
--   Matt Morton (CIO, Laguna Art), David Tomlinson (CIO, Scoular),
--   Arthur Theodorou (VP IT, Windstar), Anne Wightman (VP IT & Security, Chesterton),
--   Barbe Mrdutt (Dir Infrastructure, Securian), Moriah Spicer (IT Ops Mgr, TSYS)
INSERT INTO campaigns (id, client_id, name, status, target, cpl, asset_name, asset_url,
  start_date, end_date, tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes)
VALUES (12, 1, 'IT Leadership & Infrastructure Summit', 'active', 160, 11.00,
  'IT Modernisation Benchmarks 2026', 'https://example.com/assets/it-modernisation-2026.pdf',
  '2026-04-01', '2026-10-31',
  '["Apollo"]', '[]',
  '[{"question":"What is your most critical IT initiative in the next 12 months?","type":"text"},{"question":"Which cloud platforms are you currently running?","type":"select","options":["AWS","Azure","GCP","On-prem only","Hybrid"]}]',
  '#1e40af', '#1e3a8a', '#3b82f6',
  'https://img.icons8.com/fluency/96/server.png',
  '["United States"]',
  '["Healthcare","Financial Services","Technology","Retail","Manufacturing","Education"]',
  '["Director of IT","IT Director","Chief Information Officer","CIO","VP of IT","VP Information Technology","IT Manager","Director of Infrastructure","IT Operations Manager"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'CSV-matched: IT directors, CIOs, and infrastructure leaders across healthcare, finance, and manufacturing');

-- ── 3. Finance Directors & CFO Forum ──────────────────────────────────────
-- CSV examples: Miroslava Stodolicova (Finance Dir, AbbVie), Josh Dean (Sr Dir FP&A, PFG),
--   Denise Wilder (CFO, Sev1Tech), Travis Lyford (Dir Seed Finance, Seneca),
--   Sheila Hoffmann (VP Finance, ACI Worldwide), Caroline Sasaki (Sr Finance Dir, BD)
INSERT INTO campaigns (id, client_id, name, status, target, cpl, asset_name, asset_url,
  start_date, end_date, tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes)
VALUES (13, 1, 'Finance Leaders & CFO Network', 'active', 100, 14.00,
  'CFO Priorities & FP&A Outlook 2026', 'https://example.com/assets/cfo-priorities-2026.pdf',
  '2026-04-15', '2026-10-31',
  '["LinkedIn"]', '[]',
  '[{"question":"What is your biggest financial planning challenge for 2026?","type":"text"},{"question":"Are you evaluating any new ERP or FP&A platforms?","type":"select","options":["Yes, actively","Yes, in early stages","No, happy with current stack","No budget allocated"]}]',
  '#0f766e', '#134e4a', '#14b8a6',
  'https://img.icons8.com/fluency/96/financial-growth.png',
  '["United States"]',
  '["Financial Services","Healthcare","Technology","Manufacturing","Food & Beverage","Defense"]',
  '["CFO","Chief Financial Officer","Finance Director","VP of Finance","Vice President Finance","Director of Financial Planning","Senior Director Finance","Director FP&A"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'CSV-matched: CFOs, VP Finance, and Finance Directors from pharma, financial services, food manufacturing');

-- ── 4. Operations & Infrastructure Directors ──────────────────────────────
-- CSV examples: Neil Rogers (Dir Rail Ops, Casella Waste), Edward Fleming (Regional Ops Dir, Pride),
--   Martin Mercado (Ops & Quality Mgr, NKS), Richard Warren (Dir Admin & Ops, St Jude),
--   Diana Kumar (Dir Program Ops, Child Mind), Nellie Mazur (Dir Biz Ops, Illumina)
INSERT INTO campaigns (id, client_id, name, status, target, cpl, asset_name, asset_url,
  start_date, end_date, tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes)
VALUES (14, 1, 'Operations Directors Forum', 'active', 140, 10.00,
  'Operational Excellence Playbook 2026', 'https://example.com/assets/ops-excellence-2026.pdf',
  '2026-04-10', '2026-10-31',
  '["Apollo","LinkedIn"]', '[]',
  '[{"question":"What is your primary operational bottleneck right now?","type":"text"},{"question":"Which area are you investing in most this year?","type":"select","options":["Process automation","Workforce training","Supply chain resilience","Data & analytics","Cost reduction"]}]',
  '#059669', '#065f46', '#10b981',
  'https://img.icons8.com/fluency/96/workflow.png',
  '["United States"]',
  '["Healthcare","Manufacturing","Waste Management","Non-profit","Life Sciences","Retail"]',
  '["Director of Operations","Operations Director","Regional Operations Director","Director Program Operations","Director Business Operations","VP Operations","Operations Manager"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'CSV-matched: Operations directors from healthcare, manufacturing, waste management, and life sciences');

-- ── 5. Compliance, Ethics & Audit Leaders ─────────────────────────────────
-- CSV examples: Joshua Powell (Dir Ethics & Compliance, Vivint), Jeffrey Egel (Dir InfoSec & Compliance, Telaid),
--   Jon Lawhorne (Staff Auditor, Turner Leins Gold), Nimi Ocholi (VP R&D Product Security, BD)
INSERT INTO campaigns (id, client_id, name, status, target, cpl, asset_name, asset_url,
  start_date, end_date, tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes)
VALUES (15, 1, 'Compliance & Ethics Leaders Program', 'draft', 90, 16.00,
  'GRC & Compliance Benchmark Report 2026', 'https://example.com/assets/grc-benchmark-2026.pdf',
  '2026-05-01', '2026-11-30',
  '["LinkedIn"]', '[]',
  '[{"question":"Which compliance frameworks are you managing?","type":"text"},{"question":"Are you currently evaluating GRC software?","type":"select","options":["Yes, actively","Yes, budgeted for H2","Evaluating in 2027","No plans"]}]',
  '#2563eb', '#1e40af', '#60a5fa',
  'https://img.icons8.com/fluency/96/checkmark.png',
  '["United States"]',
  '["Financial Services","Healthcare","Technology","Life Sciences","Defense","Smart Home / IoT"]',
  '["Director of Compliance","Director of Ethics","Director Ethics and Compliance","Director of Information Security and Compliance","VP Compliance","Chief Compliance Officer","Staff Auditor","Senior Auditor","VP Product Security"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'CSV-matched: Compliance, ethics, and audit leaders from financial services, healthcare, and tech');

-- ── 6. Strategy & Corporate Development Directors ─────────────────────────
-- CSV examples: Pete Tomczak (Dir Strategy & Corp Dev, Conmed), Nellie Mazur (Dir Biz Ops & Analytics, Illumina)
INSERT INTO campaigns (id, client_id, name, status, target, cpl, asset_name, asset_url,
  start_date, end_date, tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes)
VALUES (16, 1, 'Strategy & Corporate Development Leaders', 'draft', 80, 17.00,
  'Corporate Growth & M&A Outlook 2026', 'https://example.com/assets/strategy-growth-2026.pdf',
  '2026-05-15', '2026-11-30',
  '["LinkedIn","Apollo"]', '[]',
  '[{"question":"What is your strategic growth priority for 2026?","type":"text"},{"question":"Are you considering M&A or strategic partnerships in the next 18 months?","type":"select","options":["Yes, actively pursuing","Evaluating opportunities","Not currently","Confidential"]}]',
  '#6d28d9', '#4c1d95', '#a78bfa',
  'https://img.icons8.com/fluency/96/goal.png',
  '["United States"]',
  '["Healthcare","Technology","Medical Devices","Life Sciences","Financial Services","Manufacturing"]',
  '["Director of Strategy","Director Corporate Development","VP Strategy","VP Corporate Development","Director Business Development","Senior Director Strategy","Director Business Operations Analytics"]',
  '["501-1000","1001-5000","5000+"]',
  'CSV-matched: Strategy and corp dev directors from medical devices, life sciences, and enterprise tech');

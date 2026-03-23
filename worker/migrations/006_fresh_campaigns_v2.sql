-- Migration 006: Delete all campaigns & landing pages, seed 3 new campaigns (all dropdown questions)

DELETE FROM landing_pages;
DELETE FROM campaigns;

-- Ensure clients exist
INSERT OR IGNORE INTO clients (id, name, type, status, cpl, delivery_method, icp_spec, contact_name, contact_email, notes) VALUES
(2, 'NovaTech Solutions', 'direct', 'active', 9.00, 'csv',
 '{"industries":["Cybersecurity","Cloud","DevOps"],"titles":["CISO","CTO","VP Engineering"],"company_sizes":["501-1000","1001-5000","5000+"],"geographies":["US","UK","Germany"]}',
 'Sarah Chen', 'sarah@novatech.io', 'Enterprise cybersecurity company');

INSERT OR IGNORE INTO clients (id, name, type, status, cpl, delivery_method, icp_spec, contact_name, contact_email, notes) VALUES
(3, 'GreenLeaf HR', 'agency', 'active', 7.50, 'api',
 '{"industries":["Human Resources","HR Tech","Recruiting"],"titles":["CHRO","VP HR","Director People Ops"],"company_sizes":["201-500","501-1000","1001-5000"],"geographies":["US","Canada"]}',
 'Marcus Johnson', 'marcus@greenleafhr.com', 'HR tech platform');

-- Campaign 1: NovaTech — Cybersecurity (Dark/Red branding)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes
) VALUES (
  20, 2,
  'NovaTech — Threat Intelligence Report Q2 2026',
  'draft', 750, 9.00,
  'The 2026 State of Threat Intelligence',
  'https://example.com/assets/threat-intel-report-2026.pdf',
  '2026-04-15', '2026-07-15',
  '["CrowdStrike","Palo Alto Networks","Fortinet","SentinelOne","Mandiant","Recorded Future","ThreatConnect","Anomali"]',
  '["novatech.io","novatech-internal.com","competitor-a.com"]',
  '[{"question":"What threat intelligence platform do you currently use?","type":"select","options":["CrowdStrike Falcon","Recorded Future","Mandiant","ThreatConnect","None","Other"]},{"question":"What is your biggest challenge with threat detection?","type":"select","options":["Too many false positives","Lack of automation","Slow response times","Limited threat visibility","Budget constraints","Staffing shortages"]},{"question":"When are you planning to evaluate new security tools?","type":"select","options":["Within 3 months","3-6 months","6-12 months","No plans currently","Already evaluating"]}]',
  '#0a0a0a', '#1a1a2e', '#e63946',
  'https://img.icons8.com/fluency/96/shield.png',
  '["United States","United Kingdom","Germany","France","Australia"]',
  '["Cybersecurity","Information Security","Cloud Security","Network Security","Threat Intelligence"]',
  '["CISO","VP Security","Director Threat Intelligence","Head of SOC","Security Architect","VP Engineering"]',
  '["501-1000","1001-5000","5000+"]',
  'NovaTech wants to position their threat intel platform against CrowdStrike and Recorded Future. Target enterprise security leaders. High-quality MQLs only.'
);

-- Campaign 2: GreenLeaf HR — Employee Engagement (Green branding)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes
) VALUES (
  21, 3,
  'GreenLeaf — Future of Employee Engagement 2026',
  'draft', 500, 7.50,
  'The Future of Employee Engagement: 2026 Playbook',
  'https://example.com/assets/employee-engagement-playbook.pdf',
  '2026-05-01', '2026-08-01',
  '["Workday","BambooHR","Lattice","Culture Amp","15Five","Qualtrics","Glint","Peakon"]',
  '["greenleafhr.com","greenleaf-staging.com"]',
  '[{"question":"How do you currently measure employee engagement?","type":"select","options":["Annual surveys","Pulse surveys","1-on-1 meetings","No formal process","Third-party platform","Other"]},{"question":"What is your top priority for improving retention?","type":"select","options":["Better compensation","Career development","Work-life balance","Company culture","Manager training","Employee recognition"]},{"question":"How many employees does your organization have?","type":"select","options":["Under 200","200-500","500-1000","1000-5000","5000+"]}]',
  '#064e3b', '#065f46', '#10b981',
  'https://img.icons8.com/fluency/96/leaf.png',
  '["United States","Canada"]',
  '["Human Resources","HR Technology","Recruiting","Staffing","Professional Services","Healthcare","Education"]',
  '["CHRO","VP Human Resources","Director People Operations","Head of Talent","VP People","Director Employee Experience"]',
  '["201-500","501-1000","1001-5000"]',
  'GreenLeaf wants to reach HR leaders evaluating engagement platforms. Focus on mid-market companies. Need verified business emails only.'
);

-- Campaign 3: TestCorp — AI/ML Platform (Purple branding)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, notes
) VALUES (
  22, 1,
  'TestCorp — Enterprise AI Adoption Guide 2026',
  'draft', 1000, 11.00,
  'Enterprise AI Adoption: From Pilot to Production',
  'https://example.com/assets/ai-adoption-guide-2026.pdf',
  '2026-04-01', '2026-09-30',
  '["Google","Microsoft","Amazon","Meta","OpenAI","Anthropic","Databricks","Snowflake","Nvidia","Palantir","DataRobot","H2O.ai","Scale AI"]',
  '["testcorp-internal.com","test-staging.com","competitor-x.com"]',
  '[{"question":"Where is your organization in its AI/ML journey?","type":"select","options":["Exploring/Researching","Running pilots","Scaling to production","Mature AI practice","Not started"]},{"question":"What is the biggest barrier to AI adoption?","type":"select","options":["Data quality/availability","Talent shortage","Executive buy-in","Regulatory concerns","Integration complexity","ROI uncertainty"]},{"question":"What is your annual AI/ML budget?","type":"select","options":["Under $100K","$100K-$500K","$500K-$1M","$1M-$5M","$5M+","Not yet allocated"]}]',
  '#1e1b4b', '#312e81', '#8b5cf6',
  'https://img.icons8.com/fluency/96/artificial-intelligence.png',
  '["United States","Canada","United Kingdom","Germany","Australia","Singapore","India"]',
  '["Artificial Intelligence","Machine Learning","Data Science","Cloud Computing","Enterprise Software","Financial Services","Healthcare"]',
  '["CTO","VP Engineering","Chief AI Officer","Director Data Science","Head of ML","VP Data","Director AI/ML","Chief Data Officer"]',
  '["1001-5000","5000+"]',
  'TestCorp enterprise AI platform launch. Target large enterprises with AI/ML leadership. 6-month campaign. Highest CPL — need senior decision-makers. Suppress big tech competitors.'
);

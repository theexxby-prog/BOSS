-- Migration 017: Add 6 mock campaigns for testing

-- Ensure clients exist
INSERT OR IGNORE INTO clients (id, name, type, status, cpl, delivery_method, icp_spec, contact_name, contact_email, notes) VALUES
(7, 'Nexlayer AI', 'direct', 'active', 10.00, 'csv',
 '{"industries":["AI/ML","Data Science","Enterprise Software"],"titles":["CTO","VP Engineering","Head of AI"],"company_sizes":["201-500","501-1000","1001-5000"],"geographies":["US","Canada"]}',
 'Sam Ortiz', 'sam@nexlayer.ai', 'AI infrastructure platform');

INSERT OR IGNORE INTO clients (id, name, type, status, cpl, delivery_method, icp_spec, contact_name, contact_email, notes) VALUES
(8, 'Growfin', 'agency', 'active', 9.00, 'api',
 '{"industries":["Fintech","CFO Office","Accounting"],"titles":["CFO","VP Finance","Controller"],"company_sizes":["201-500","501-1000"],"geographies":["US","UK"]}',
 'Laura Kim', 'laura@growfin.io', 'Finance automation platform');

INSERT OR IGNORE INTO clients (id, name, type, status, cpl, delivery_method, icp_spec, contact_name, contact_email, notes) VALUES
(9, 'ShieldSec', 'direct', 'active', 14.00, 'csv',
 '{"industries":["Cybersecurity","Enterprise IT","Financial Services"],"titles":["CISO","VP Security","Director InfoSec"],"company_sizes":["501-1000","1001-5000","5000+"],"geographies":["US"]}',
 'Marcus Webb', 'marcus@shieldsec.com', 'Zero-trust security platform');

-- Campaign 33: Nexlayer AI — AI Adoption (active, mid-run)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, company_revenue, notes
) VALUES (
  33, 7,
  'Nexlayer AI — Enterprise AI Readiness Report 2026',
  'active', 500, 10.00,
  'Enterprise AI Readiness: The 2026 CTO Benchmark',
  'https://example.com/assets/enterprise-ai-readiness-2026.pdf',
  '2026-02-01', '2026-05-31',
  '["OpenAI","Anthropic","Google DeepMind","Mistral","Cohere","Databricks","Snowflake","Palantir","Scale AI","Weights & Biases"]',
  '["nexlayer.ai","nexlayer-staging.ai"]',
  '[{"question":"How would you describe your organisation''s AI maturity?","type":"select","options":["No AI initiatives","Exploring / experimenting","Running pilots","Scaling in production","AI-first organisation"]},{"question":"What is your biggest barrier to AI adoption?","type":"select","options":["Data quality","Talent / skills gap","Governance & compliance","Infrastructure cost","Executive buy-in","Integration complexity"]},{"question":"Which AI use case is highest priority for you?","type":"select","options":["Generative AI / LLMs","Predictive analytics","Computer vision","NLP & text analysis","Process automation","Recommendation systems"]}]',
  '#0f172a', '#1e3a5f', '#6366f1',
  'https://ui-avatars.com/api/?name=NA&background=4f46e5&color=fff&size=80&bold=true',
  '["Full USA","Canada"]',
  '["Artificial Intelligence","Machine Learning","Enterprise Software","Data & Analytics","Cloud Infrastructure"]',
  '["CTO","VP Engineering","Head of AI/ML","Director Data Science","Chief AI Officer","VP Product"]',
  '["200+","1000+","5000+"]',
  '["$50M+","$100M+","$500M+"]',
  'Nexlayer targets engineering and AI leadership at companies actively investing in AI infrastructure. Mid-market to enterprise. Emphasis on buyers evaluating compute and MLOps tooling.'
);

-- Campaign 34: Growfin — CFO Finance Automation (active, high progress)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, company_revenue, notes
) VALUES (
  34, 8,
  'Growfin — CFO Tech Stack Benchmark 2026',
  'active', 300, 9.00,
  'The CFO Tech Stack: 2026 Finance Leader Benchmark',
  'https://example.com/assets/cfo-tech-stack-2026.pdf',
  '2026-01-15', '2026-04-15',
  '["NetSuite","Sage Intacct","Workday Financials","QuickBooks Enterprise","SAP S/4HANA","Oracle Financials","Anaplan","Adaptive Insights","Pigment","Mosaic"]',
  '["growfin.io","growfin-test.io"]',
  '[{"question":"What ERP or accounting platform does your finance team use?","type":"select","options":["NetSuite","Sage Intacct","Workday","SAP","Oracle","QuickBooks","Other / Multiple"]},{"question":"What is your top finance automation priority?","type":"select","options":["AR / collections automation","AP / invoice processing","FP&A and scenario planning","Month-end close acceleration","Cash flow forecasting","Revenue recognition"]},{"question":"How many FTEs are in your finance team?","type":"select","options":["1-5","6-15","16-30","31-60","60+","Not applicable"]}]',
  '#14532d', '#166534', '#22c55e',
  'https://ui-avatars.com/api/?name=GF&background=16a34a&color=fff&size=80&bold=true',
  '["Full USA","United Kingdom"]',
  '["Fintech","CFO Office","Accounting & Finance","SaaS","Professional Services"]',
  '["CFO","VP Finance","Controller","Head of FP&A","Director Accounting","Chief Accounting Officer"]',
  '["200+","1000+"]',
  '["$10M+","$50M+","$100M+"]',
  'Growfin targets finance decision-makers at fast-growing companies. UK expansion is a key goal for H1. High-intent buyers actively evaluating AR automation and close management tools.'
);

-- Campaign 35: ShieldSec — Zero Trust Security (draft, not started)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, company_revenue, notes
) VALUES (
  35, 9,
  'ShieldSec — Zero Trust Security Readiness Assessment 2026',
  'draft', 450, 14.00,
  'Zero Trust in 2026: The CISO Readiness & Maturity Report',
  'https://example.com/assets/zero-trust-ciso-report-2026.pdf',
  '2026-04-01', '2026-07-31',
  '["CrowdStrike","Palo Alto Networks","Okta","Zscaler","SentinelOne","Rapid7","Tenable","Qualys","Fortinet","Cloudflare"]',
  '["shieldsec.com","shieldsec-staging.io"]',
  '[{"question":"Where is your organisation on the Zero Trust journey?","type":"select","options":["Not started","Planning phase","Partial implementation","Mostly implemented","Fully implemented"]},{"question":"What is your highest cybersecurity priority right now?","type":"select","options":["Identity & access management","Endpoint protection","Cloud security posture","Threat detection & response","Supply chain security","Compliance & audit readiness"]},{"question":"When does your primary security vendor contract renew?","type":"select","options":["Within 3 months","3-6 months","6-12 months","12+ months","No contract / evaluating now"]}]',
  '#1c1917', '#292524', '#ef4444',
  'https://ui-avatars.com/api/?name=SS&background=dc2626&color=fff&size=80&bold=true',
  '["Full USA"]',
  '["Cybersecurity","Enterprise IT","Financial Services","Healthcare","Government Contracting","Critical Infrastructure"]',
  '["CISO","VP Security","Director Information Security","Head of Cyber","VP IT Risk","CIO"]',
  '["1000+","5000+","10000+"]',
  '["$100M+","$500M+","$1B+"]',
  'ShieldSec targets security leadership at regulated and high-risk industries. Enterprise only. US-only for ITAR and compliance reasons. Very high CPL justified by deal sizes.'
);

-- Campaign 36: Apex Revenue — Pipeline Acceleration (paused)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, company_revenue, notes
) VALUES (
  36, 4,
  'Apex Revenue — Pipeline Acceleration Playbook Q2 2026',
  'paused', 250, 12.00,
  'Closing Faster: The 2026 Pipeline Acceleration Playbook',
  'https://example.com/assets/pipeline-acceleration-2026.pdf',
  '2026-03-01', '2026-06-30',
  '["Salesforce","HubSpot","Outreach","Salesloft","Gong","Clari","Groove","Mixmax","LinkedIn Sales Navigator","ZoomInfo"]',
  '["apexrevenue.com","apex-staging.io"]',
  '[{"question":"What stage do most deals stall in your pipeline?","type":"select","options":["Prospecting","Discovery","Demo / evaluation","Proposal / pricing","Legal & security review","Closing"]},{"question":"What is your average sales cycle length?","type":"select","options":["Under 30 days","30-60 days","60-90 days","90-180 days","180+ days"]},{"question":"Which metric do you most need to improve?","type":"select","options":["Win rate","Average deal size","Sales cycle length","Pipeline coverage","Lead-to-opportunity conversion","Quota attainment"]}]',
  '#1e3a5f', '#1e40af', '#3b82f6',
  'https://ui-avatars.com/api/?name=AR&background=1e40af&color=fff&size=80&bold=true',
  '["Full USA","Canada"]',
  '["SaaS","Fintech","Revenue Operations","Sales Technology","Professional Services"]',
  '["VP Sales","CRO","Sales Director","Head of Revenue","Director Sales Ops","VP Business Development"]',
  '["200+","1000+"]',
  '["$10M+","$50M+","$100M+"]',
  'Second campaign for Apex targeting sales ops and revenue leaders. Paused pending refreshed asset. Resume when updated PDF is approved.'
);

-- Campaign 37: ClearOps — Inventory Optimisation (completed)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, company_revenue, notes
) VALUES (
  37, 5,
  'ClearOps — Inventory Optimisation Guide Q1 2026',
  'completed', 300, 8.50,
  'Smart Inventory in 2026: A Practitioner''s Guide',
  'https://example.com/assets/inventory-optimisation-2026.pdf',
  '2026-01-05', '2026-03-15',
  '["Oracle SCM","SAP IBP","Blue Yonder","Manhattan Associates","Kinaxis","E2open","Infor","Epicor","Fishbowl","NetSuite WMS"]',
  '["clearops.io","clearops-staging.com"]',
  '[{"question":"How do you currently manage inventory forecasting?","type":"select","options":["Manual / spreadsheets","ERP built-in tools","Dedicated forecasting software","AI / ML-based tools","3PL managed","No formal process"]},{"question":"What is your biggest inventory challenge?","type":"select","options":["Stockouts","Overstock / dead inventory","Demand variability","Supplier lead time uncertainty","Shrinkage & loss","Poor system visibility"]},{"question":"How often do you experience stockout events?","type":"select","options":["Daily","Weekly","Monthly","Quarterly","Rarely","Never"]}]',
  '#134e4a', '#0f766e', '#14b8a6',
  'https://ui-avatars.com/api/?name=CO&background=0f766e&color=fff&size=80&bold=true',
  '["Full USA","Germany","Netherlands"]',
  '["Supply Chain","Logistics","Manufacturing","Retail","CPG","Distribution","E-commerce"]',
  '["VP Operations","Supply Chain Director","Head of Inventory","Director Logistics","COO","VP Planning"]',
  '["500+","1000+","5000+"]',
  '["$100M+","$500M+","$1B+"]',
  'Completed Q1 campaign for ClearOps. Hit 300 leads. Strong performance in Retail and CPG. Post-campaign analysis shows 82% ICP match rate. Good candidate for follow-on campaign.'
);

-- Campaign 38: Vantage Health — Population Health (active, early stage)
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes, company_revenue, notes
) VALUES (
  38, 6,
  'Vantage Health — Population Health & Value-Based Care 2026',
  'active', 200, 15.00,
  'The 2026 Population Health Leader''s Playbook',
  'https://example.com/assets/population-health-vbc-2026.pdf',
  '2026-03-01', '2026-06-30',
  '["Epic","Cerner","Optum","Evolent Health","Arcadia","Innovaccer","Health Catalyst","Lightbeam Health","Wellframe","Cotiviti"]',
  '["vantagehealth.com","vantage-staging.health"]',
  '[{"question":"What value-based care models does your organisation participate in?","type":"select","options":["ACO / MSSP","CMMI bundled payments","Direct contracting","Medicare Advantage","Medicaid managed care","Commercial VBC arrangements","None yet"]},{"question":"What is your top population health priority?","type":"select","options":["Chronic disease management","Transitions of care","Social determinants of health","Preventive care gaps","High-risk patient identification","Cost & utilisation management"]},{"question":"How mature is your value-based care programme?","type":"select","options":["No VBC participation","Exploring options","Early contracts (1-2 years)","Established programme","Highly mature / scaling"]}]',
  '#4c1d95', '#6d28d9', '#a78bfa',
  'https://ui-avatars.com/api/?name=VH&background=6d28d9&color=fff&size=80&bold=true',
  '["Full USA"]',
  '["Healthcare","Health Technology","Health Insurance","Hospitals & Health Systems","Accountable Care","Population Health"]',
  '["CMO","VP Population Health","Chief Value Officer","Director Care Management","VP Clinical Programs","Medical Director"]',
  '["500+","1000+","5000+","10000+"]',
  '["$100M+","$500M+","$1B+","$5B+"]',
  'Second Vantage Health campaign focused on value-based care leadership at large health systems and payers. Early stage — ramp slowly and QA first 50 leads closely.'
);

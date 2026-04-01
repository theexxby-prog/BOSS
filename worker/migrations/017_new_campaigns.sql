-- Migration 017: Add 5 new campaigns matching user's test database

-- Campaign 1: IT Infrastructure & Operations Leaders
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  20, 1,
  'IT Operations Excellence 2026 Report',
  'active',
  800, 12.00,
  'Modern IT Operations: The Director & CIO Playbook',
  'https://example.com/assets/it-ops-playbook-2026.pdf',
  '2026-04-01', '2026-08-31',
  '["ServiceNow","BMC Software","Atlassian","Dynatrace","Splunk","New Relic","Sumo Logic","Datadog","PagerDuty","Incident.io"]',
  '["internal-it.com","staging-it.com"]',
  '[{"question":"What is your primary IT operations challenge?","type":"select","options":["Incident management","Change management","Automation","Compliance","Cost optimization","Other"]},{"question":"What IT tools do you currently use?","type":"text"}]',
  '#0f172a', '#1e293b', '#3b82f6',
  'https://img.icons8.com/fluency/96/settings.png',
  '["United States"]',
  '["Information Technology","Software Development","Enterprise Software","Financial Services","Healthcare","Manufacturing"]',
  '["Director of Information Technology","VP IT","Chief Information Officer","IT Director","Director IT Operations","Manager IT","IT Operations Manager","VP Technology","CTO"]',
  '["1000-5000","5000+"]',
  'Target IT leadership responsible for operations, infrastructure, and technology management across enterprises. Match: Director, Manager, VP, CIO titles. Focus on mid-to-large organizations.'
);

-- Campaign 2: Information Security & Compliance Leaders
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  21, 1,
  'Zero Trust Security Framework 2026',
  'active',
  750, 13.50,
  'Building a Zero Trust Security Architecture',
  'https://example.com/assets/zero-trust-security.pdf',
  '2026-04-15', '2026-09-30',
  '["Okta","CrowdStrike","Palo Alto Networks","Microsoft","Fortinet","Zscaler","IBM","Cisco","Splunk"]',
  '["security-internal.com","test-security.com"]',
  '[{"question":"What is your top security priority?","type":"select","options":["Access management","Threat detection","Compliance","Data protection","Incident response"]},{"question":"What is your current security architecture?","type":"text"}]',
  '#7f1d1d', '#991b1b', '#dc2626',
  'https://img.icons8.com/fluency/96/security.png',
  '["United States"]',
  '["Information Security","Cybersecurity","Financial Services","Healthcare","Enterprise Software","Government","Manufacturing"]',
  '["Chief Information Security Officer","CISO","Director of Information Security","Security Manager","Director Cyber Security","VP Security","Information Security Manager"]',
  '["1000-5000","5000+"]',
  'Target security and compliance leaders managing risk and security operations. Match: CISO, Director Security, Manager titles. Enterprise focus for data protection.'
);

-- Campaign 3: Finance & Operations Management
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  22, 1,
  'Finance Operations Automation 2026',
  'active',
  900, 10.50,
  'Automating Finance Operations: From Manual to Digital',
  'https://example.com/assets/finance-automation.pdf',
  '2026-04-20', '2026-10-31',
  '["SAP","Oracle","Workday","NetSuite","Anaplan","Kyriba","Anaplan","BlackLine"]',
  '["finance-internal.com"]',
  '[{"question":"What finance processes are you looking to automate?","type":"select","options":["AP/AR","Accounting","Planning","Consolidation","Revenue recognition","Other"]},{"question":"Current finance system?","type":"text"}]',
  '#1f2937', '#374151', '#10b981',
  'https://img.icons8.com/fluency/96/money.png',
  '["United States"]',
  '["Financial Services","Manufacturing","Healthcare","Accounting","Enterprise Software","Insurance","Banking"]',
  '["Chief Financial Officer","CFO","Finance Director","Director Finance","Finance Manager","Controller","VP Finance","Senior Finance Manager"]',
  '["1000-5000","5000+"]',
  'Target finance leaders and operations managers in enterprises. Match: Director, Manager, CFO, Controller titles. Focus on cost optimization and efficiency.'
);

-- Campaign 4: Healthcare IT & Operations Leadership
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  23, 1,
  'Healthcare IT Modernization Summit 2026',
  'active',
  600, 14.00,
  'Modernizing Healthcare IT: EHR Integration & Security',
  'https://example.com/assets/healthcare-it-modernization.pdf',
  '2026-05-01', '2026-11-30',
  '["Cerner","Epic","Athena","Medidata","Veradigm","Allscripts","eClinicalWorks"]',
  '["hospital-internal.com","health-test.com"]',
  '[{"question":"What EHR system do you use?","type":"select","options":["Epic","Cerner","Athena","Other"]},{"question":"Primary IT challenge in healthcare?","type":"text"}]',
  '#831843', '#be185d', '#ec4899',
  'https://img.icons8.com/fluency/96/medical.png',
  '["United States"]',
  '["Healthcare","Hospitals","Pharmaceuticals","Medical Devices","Health Insurance","Biotechnology"]',
  '["Chief Information Officer","CIO","VP Information Technology","Director of Information Technology","Director IT","Chief Technology Officer","Healthcare IT Director","Chief Medical Information Officer"]',
  '["1000-5000","5000+"]',
  'Healthcare organizations need specialized IT leadership for compliance (HIPAA), EHR systems, and patient data security. Match: CIO, Director IT, VP IT in healthcare sector.'
);

-- Campaign 5: Enterprise Technology & Business Operations Leadership
INSERT INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  24, 1,
  'Digital Transformation Leadership 2026',
  'active',
  1000, 11.50,
  'Enterprise Digital Transformation: Strategy to Execution',
  'https://example.com/assets/digital-transformation.pdf',
  '2026-04-10', '2026-12-15',
  '["Salesforce","Microsoft","Amazon","Google Cloud","IBM","Adobe","Oracle","Workday"]',
  '["internal-digital.com"]',
  '[{"question":"What is your digital transformation priority?","type":"select","options":["Customer experience","Operational efficiency","Data analytics","Cloud migration","Innovation","Other"]},{"question":"What business outcome are you targeting?","type":"text"}]',
  '#1e40af', '#1e3a8a', '#6366f1',
  'https://img.icons8.com/fluency/96/rocket.png',
  '["United States"]',
  '["Enterprise Software","Technology","Financial Services","Healthcare","Manufacturing","Retail","Telecommunications","Insurance","Energy"]',
  '["Chief Technology Officer","CTO","VP Engineering","Chief Information Officer","VP Technology","Director Strategic Initiatives","VP Operations","VP Business Development","Director of Operations"]',
  '["1000-5000","5000+"]',
  'Broad enterprise focus on leaders driving transformation. Match: VP, Director, CTO, CIO, COO titles across large organizations. Multi-industry appeal with technology focus.'
);

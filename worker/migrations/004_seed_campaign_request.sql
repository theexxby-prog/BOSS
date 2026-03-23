-- Seed: Dummy campaign request from Test Corp (client_id=1)
INSERT OR IGNORE INTO campaigns (
  id, client_id, name, status, target, cpl,
  asset_name, asset_url, start_date, end_date,
  tal, suppression_list, custom_questions,
  brand_color, brand_color_secondary, brand_accent, logo_url,
  geo, industries, titles, company_sizes,
  notes
) VALUES (
  2, 1,
  'TechTarget - Cloud Security Q1 2026',
  'draft',
  500, 8.50,
  'The CISO Guide to Zero Trust Architecture 2026',
  'https://example.com/assets/zero-trust-guide-2026.pdf',
  '2026-04-01', '2026-06-30',
  '["Microsoft","Google","Amazon","Salesforce","Oracle","IBM","Cisco","Dell","HP","VMware","Palo Alto Networks","CrowdStrike","Fortinet","Zscaler","Okta","Snowflake","Datadog","MongoDB","Cloudflare","Twilio"]',
  '["competitor1@example.com","competitor2@example.com","blocked-domain.com"]',
  '[{"question":"Are you currently evaluating Zero Trust solutions?","type":"select"},{"question":"What is your biggest cloud security challenge?","type":"text"}]',
  '#0f172a', '#1e293b', '#3b82f6',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.svg/120px-Camponotus_flavomarginatus_ant.svg.png',
  '["United States","Canada","United Kingdom","Germany","Australia"]',
  '["Cybersecurity","Cloud Computing","Information Technology","SaaS","Enterprise Software"]',
  '["CISO","VP Security","Director IT Security","Head of Infrastructure","CTO","VP Engineering"]',
  '["201-500","501-1000","1001-5000","5000+"]',
  'Client wants to target enterprise security leaders evaluating Zero Trust. Asset is a comprehensive guide. Need high-quality MQLs with verified business emails. Suppress competitor domains.'
);

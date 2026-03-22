-- Migration 002: Mock client, campaign, and 20 test leads for dry run

-- Mock Client
INSERT OR IGNORE INTO clients (id, name, type, status, cpl, delivery_method, icp_spec, contact_name, contact_email, notes) VALUES
(1, 'Test Corp (Dry Run)', 'direct', 'pilot', 6.00, 'csv',
 '{"industries":["SaaS","Technology","Software"],"titles":["VP","Director","Head","Manager","CTO","CMO"],"company_sizes":["51-200","201-500","501-1000"],"geographies":["US","United States","Canada"]}',
 'Vishal Mehta', 'vishal@bosshq.io', 'Mock client for pipeline dry run — not a real client');

-- Mock Asset
INSERT OR IGNORE INTO assets (id, client_id, name, type, description, status) VALUES
(1, 1, 'B2B Content Syndication Guide 2026', 'whitepaper', 'A guide to scaling content syndication programs — used as dry run asset', 'active');

-- Mock Campaign
INSERT OR IGNORE INTO campaigns (id, client_id, name, status, target, delivered, accepted, rejected, cpl, asset_name, start_date, end_date, notes) VALUES
(1, 1, 'DryRun — Content Synd Q1 2026', 'active', 20, 0, 0, 0, 6.00, 'B2B Content Syndication Guide 2026', '2026-03-22', '2026-04-22', 'Test campaign to validate full pipeline end-to-end');

-- Mock Landing Page
INSERT OR IGNORE INTO landing_pages (id, campaign_id, client_id, asset_id, name, slug, headline, subheadline, cta_text, status) VALUES
(1, 1, 1, 1, 'B2B Content Synd Guide — Download', 'dryrun-q1-2026',
 'Download: B2B Content Syndication Guide 2026', 'Learn how to scale your B2B content syndication program and generate qualified leads at scale.',
 'Download Free Guide', 'active');

-- Mock Job Card
INSERT OR IGNORE INTO job_cards (id, campaign_id, client_id, title, target_leads, cpl, asset_name, icp_summary, delivery_method, start_date, end_date, status, notes) VALUES
(1, 1, 1, 'DryRun Q1 2026 — Job Card', 20, 6.00, 'B2B Content Syndication Guide 2026',
 'SaaS/Tech companies, 51-1000 employees, VP/Director/Head level, US & Canada',
 'csv', '2026-03-22', '2026-04-22', 'active', 'Dry run to validate full pipeline');

-- 20 Test Leads (mixed ICP scores for testing QA queue)
INSERT OR IGNORE INTO leads (campaign_id, client_id, first_name, last_name, email, company, title, industry, company_size, country, icp_score, status, email_verified, enriched, source) VALUES
(1,1,'Sarah','Mitchell','sarah.mitchell@techwave.io','TechWave Solutions','VP of Marketing','SaaS','201-500','US',94,'approved',1,1,'instantly'),
(1,1,'James','Rodriguez','james.r@cloudpilot.com','CloudPilot Inc','Director of Demand Gen','Technology','51-200','US',91,'approved',1,1,'instantly'),
(1,1,'Priya','Sharma','priya.s@nexusdata.com','Nexus Data','Head of Content','Software','201-500','Canada',88,'pending',1,1,'instantly'),
(1,1,'Marcus','Chen','m.chen@growthops.io','GrowthOps','Marketing Manager','SaaS','51-200','US',85,'pending',1,0,'instantly'),
(1,1,'Emma','Thompson','emma.t@scaletech.com','ScaleTech','CTO','Technology','201-500','US',92,'approved',1,1,'instantly'),
(1,1,'David','Kim','d.kim@pivotcrm.com','PivotCRM','Director of Sales','Software','501-1000','US',79,'pending',0,1,'instantly'),
(1,1,'Lisa','Park','l.park@infrastack.io','InfraStack','VP Engineering','SaaS','201-500','US',93,'approved',1,1,'instantly'),
(1,1,'Tom','Williams','tom.w@databridge.com','DataBridge','CMO','Technology','51-200','Canada',72,'pending',1,0,'instantly'),
(1,1,'Rachel','Brown','r.brown@meshworks.io','MeshWorks','Head of Growth','Software','51-200','US',87,'pending',1,1,'instantly'),
(1,1,'Kevin','Lee','k.lee@propelx.com','PropelX','Marketing Director','SaaS','201-500','US',90,'approved',1,1,'instantly'),
(1,1,'Anna','Davis','anna.d@orbitsys.com','OrbitSys','VP Product','Technology','501-1000','US',83,'pending',1,1,'instantly'),
(1,1,'Brian','Johnson','b.johnson@stackify.io','Stackify','Operations Manager','Software','51-200','US',65,'rejected',0,0,'instantly'),
(1,1,'Michelle','Wang','m.wang@clearpath.com','ClearPath','Director of Marketing','SaaS','201-500','Canada',91,'approved',1,1,'instantly'),
(1,1,'Alex','Taylor','a.taylor@driftlabs.io','DriftLabs','Head of Demand Gen','Technology','51-200','US',78,'pending',1,0,'instantly'),
(1,1,'Sophia','Anderson','s.anderson@vertexco.com','VertexCo','CMO','Software','201-500','US',95,'approved',1,1,'instantly'),
(1,1,'Daniel','Martinez','d.martinez@loopback.io','Loopback','VP Sales','SaaS','51-200','US',60,'rejected',0,0,'instantly'),
(1,1,'Jessica','Wilson','j.wilson@polaris-tech.com','Polaris Tech','Marketing Manager','Technology','201-500','Canada',76,'pending',1,1,'instantly'),
(1,1,'Ryan','Thomas','r.thomas@zenithops.com','ZenithOps','Director IT','Software','501-1000','US',82,'pending',0,1,'instantly'),
(1,1,'Lauren','Moore','l.moore@boltwave.io','BoltWave','Head of Marketing','SaaS','51-200','US',89,'pending',1,1,'instantly'),
(1,1,'Chris','Jackson','c.jackson@apexflow.com','ApexFlow','VP Growth','Technology','201-500','US',96,'approved',1,1,'instantly');

-- Update campaign delivered/accepted counts based on inserted leads
UPDATE campaigns SET
  delivered = (SELECT COUNT(*) FROM leads WHERE campaign_id=1 AND status IN ('approved','pending','rejected','delivered','accepted')),
  accepted  = (SELECT COUNT(*) FROM leads WHERE campaign_id=1 AND status='approved'),
  rejected  = (SELECT COUNT(*) FROM leads WHERE campaign_id=1 AND status='rejected')
WHERE id = 1;

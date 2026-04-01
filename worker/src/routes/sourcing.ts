import type { Env } from '../types';
import { jsonResponse } from '../cors';
import { dbAll, dbFirst, dbRun } from '../db';
import { ApiError } from '../http';

// ── Phase 4: Caching and indexing globals ────────────────────────────────────
let _indexesEnsured = false;
const SEARCH_CACHE_TTL_MS = 30_000;
const searchCache = new Map<string, { expiresAt: number; payload: unknown }>();

// ── Phase 2: Field mapping helper ────────────────────────────────────────────
function pick(obj: any, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = obj?.[key];
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

// ── Phase 2: Contact normalization with fallback chains ──────────────────────
function normalizeIncomingContact(contact: any) {
  return {
    email: pick(contact, 'email', 'business_email', 'BUSINESS_EMAIL', 'business email'),
    first_name: pick(contact, 'first_name', 'FIRST_NAME', 'first name', 'firstname'),
    last_name: pick(contact, 'last_name', 'LAST_NAME', 'last name', 'lastname'),
    full_name: pick(contact, 'name', 'full_name', 'fullname') ||
      `${pick(contact, 'first_name', 'first name') || ''} ${pick(contact, 'last_name', 'last name') || ''}`.trim() || null,
    title: pick(contact, 'title', 'job_title', 'job title', 'JOB_TITLE'),
    company: pick(contact, 'company', 'company_name', 'company name', 'COMPANY_NAME'),
    domain: pick(contact, 'domain', 'website', 'website_url'),
    industry: pick(contact, 'industry', 'INDUSTRY', 'industry_tag'),
    company_size: pick(contact, 'company_size', 'company size', 'employee_count', 'headcount'),
    country: pick(contact, 'country', 'country_code', 'COUNTRY'),
    city: pick(contact, 'city', 'location', 'CITY'),
    phone: pick(contact, 'phone', 'phone_number', 'phone number', 'PHONE'),
    linkedin_url: pick(contact, 'linkedin_url', 'linkedin', 'linkedin_profile'),
  };
}

// ── Phase 2: Payload validation ──────────────────────────────────────────────
function validateContactsPayload(body: unknown): { contacts: Record<string, unknown>[] } {
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Request body must be an object');
  }
  const contacts = (body as { contacts?: unknown }).contacts;
  if (!Array.isArray(contacts) || contacts.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'contacts must be a non-empty array');
  }
  const invalidIndex = contacts.findIndex(c => !c || typeof c !== 'object' || Array.isArray(c));
  if (invalidIndex !== -1) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Each contact must be an object', { index: invalidIndex });
  }
  return { contacts: contacts as Record<string, unknown>[] };
}

// ── Phase 4: Ensure database indexes ─────────────────────────────────────────
async function ensureGlobalLeadIndexes(env: Env): Promise<void> {
  if (_indexesEnsured) return;
  await dbRun(env.DB, `CREATE INDEX IF NOT EXISTS idx_global_leads_title ON global_leads(title)`);
  await dbRun(env.DB, `CREATE INDEX IF NOT EXISTS idx_global_leads_industry ON global_leads(industry)`);
  await dbRun(env.DB, `CREATE INDEX IF NOT EXISTS idx_global_leads_country ON global_leads(country)`);
  await dbRun(env.DB, `CREATE INDEX IF NOT EXISTS idx_global_leads_company_size ON global_leads(company_size)`);
  _indexesEnsured = true;
}

// ── GET /api/global-leads ─────────────────────────────────────────────────────
// Search own contact database with ICP filters
async function searchOwnDB(url: URL, env: Env, origin: string | null): Promise<Response> {
  await ensureGlobalLeadIndexes(env);

  // ── Phase 4: Check cache first ──────────────────────────────────────────────
  const cacheKey = url.search;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return jsonResponse(cached.payload, 200, origin);
  }

  const titles     = url.searchParams.get('titles')?.split(',').map(t => t.trim()).filter(Boolean) || [];
  const industries = url.searchParams.get('industries')?.split(',').map(i => i.trim()).filter(Boolean) || [];
  const sizes      = url.searchParams.get('sizes')?.split(',').map(s => s.trim()).filter(Boolean) || [];
  const geos       = url.searchParams.get('geos')?.split(',').map(g => g.trim()).filter(Boolean) || [];
  const q          = url.searchParams.get('q') || '';
  const campaignId = url.searchParams.get('campaign_id');
  const limit      = Math.min(200, parseInt(url.searchParams.get('limit') || '50'));

  const conditions: string[] = [];
  const params: unknown[]    = [];

  if (q) {
    conditions.push(`(gl.email LIKE ? OR gl.first_name LIKE ? OR gl.last_name LIKE ? OR gl.company LIKE ? OR gl.title LIKE ?)`);
    const q2 = `%${q}%`;
    params.push(q2, q2, q2, q2, q2);
  }
  if (titles.length) {
    const tCond = titles.map(() => `gl.title LIKE ?`).join(' OR ');
    conditions.push(`(${tCond})`);
    titles.forEach(t => params.push(`%${t}%`));
  }
  if (industries.length) {
    const iCond = industries.map(() => `gl.industry LIKE ?`).join(' OR ');
    conditions.push(`(${iCond})`);
    industries.forEach(i => params.push(`%${i}%`));
  }
  if (sizes.length) {
    const sCond = sizes.map(() => `gl.company_size = ?`).join(' OR ');
    conditions.push(`(${sCond})`);
    sizes.forEach(s => params.push(s));
  }
  if (geos.length) {
    const gCond = geos.map(() => `gl.country LIKE ?`).join(' OR ');
    conditions.push(`(${gCond})`);
    geos.forEach(g => params.push(`%${g}%`));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Issue #7: Validate campaignId as integer and use safe parameterized approach
  let excludeJoin = '';
  let excludeWhere = '';
  if (campaignId) {
    const parsedCampaignId = parseInt(campaignId, 10);
    if (Number.isFinite(parsedCampaignId) && parsedCampaignId > 0) {
      // Use parameterized query: add campaignId to params for the JOIN
      excludeJoin = `LEFT JOIN campaign_leads cl ON cl.lead_id = gl.id AND cl.campaign_id = ?`;
      params.push(parsedCampaignId);
      excludeWhere = conditions.length ? ' AND cl.lead_id IS NULL' : 'WHERE cl.lead_id IS NULL';
    }
  }

  const sql = `
    SELECT gl.*, COUNT(*) OVER() as total_count
    FROM global_leads gl
    ${excludeJoin}
    ${where}${excludeWhere}
    ORDER BY gl.created_at DESC
    LIMIT ?`;

  params.push(limit);
  const rows = await dbAll<any>(env.DB, sql, params);
  const total = rows[0]?.total_count ?? 0;

  // ── Phase 4: Cache result before returning ──────────────────────────────────
  const payload = { success: true, data: rows, meta: { total, limit } };
  searchCache.set(cacheKey, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, payload });
  return jsonResponse(payload, 200, origin);
}

// ── POST /api/apollo/search ───────────────────────────────────────────────────
// Proxy Apollo People Search — keeps API key server-side
async function apolloSearch(request: Request, env: Env, origin: string | null): Promise<Response> {
  const apiKey = await dbFirst<any>(env.DB, `SELECT value FROM settings WHERE key='apollo_api_key'`);
  if (!apiKey?.value || apiKey.value === '••••••••') {
    return jsonResponse({ success: false, error: 'Apollo API key not configured. Add it in Settings.' }, 400, origin);
  }

  const body = await request.json() as any;
  const { titles = [], industries = [], company_sizes = [], geos = [], page = 1, per_page = 25 } = body;

  // Map company_size strings to Apollo employee range format
  const sizeMap: Record<string, string> = {
    '1-50':      '1,50',
    '50-200':    '51,200',
    '100-500':   '51,500',
    '200-500':   '201,500',
    '200-1000':  '201,1000',
    '500-1000':  '501,1000',
    '1000-5000': '1001,5000',
    '5000+':     '5001,100000',
  };
  const employeeRanges = company_sizes
    .map((s: string) => sizeMap[s] || s)
    .filter(Boolean);

  const apolloPayload: Record<string, any> = {
    api_key:    apiKey.value,
    page,
    per_page,
  };
  if (titles.length)         apolloPayload.person_titles               = titles;
  if (geos.length)           apolloPayload.organization_locations      = geos;
  if (employeeRanges.length) apolloPayload.organization_num_employees_ranges = employeeRanges;
  if (industries.length)     apolloPayload.q_organization_keyword_tags = industries;

  const apolloRes = await fetch('https://api.apollo.io/v1/mixed_people/search', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body:    JSON.stringify(apolloPayload),
  });

  if (!apolloRes.ok) {
    const err = await apolloRes.text();
    return jsonResponse({ success: false, error: `Apollo error: ${apolloRes.status} — ${err}` }, 502, origin);
  }

  const data = await apolloRes.json() as any;
  const people = (data.people || []).map((p: any) => ({
    first_name:   p.first_name || '',
    last_name:    p.last_name  || '',
    email:        p.email      || '',
    title:        p.title      || '',
    company:      p.organization?.name    || '',
    domain:       p.organization?.website_url?.replace(/^https?:\/\//, '').replace(/\/.*/, '') || '',
    industry:     p.organization?.industry || '',
    company_size: p.organization?.estimated_num_employees?.toString() || '',
    country:      p.country    || p.organization?.country || '',
    city:         p.city       || '',
    phone:        p.phone_numbers?.[0]?.sanitized_number || '',
    linkedin_url: p.linkedin_url || '',
    source:       'apollo',
  }));

  return jsonResponse({
    success: true,
    data:    people,
    meta:    { total: data.pagination?.total_entries || people.length, page, per_page },
  }, 200, origin);
}

// ── POST /api/campaigns/:id/source-leads ─────────────────────────────────────
// Upsert contacts into global_leads + assign to campaign_leads
async function assignLeads(request: Request, env: Env, origin: string | null, campaignId: number): Promise<Response> {
  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    throw new ApiError(400, 'INVALID_CAMPAIGN_ID', 'Campaign ID must be a positive integer', { campaignId });
  }

  const body = await request.json() as unknown;
  const { contacts } = validateContactsPayload(body);

  let added = 0, dupes = 0, errors = 0;

  for (const c of contacts) {
    const normalized = normalizeIncomingContact(c);
    const email = normalized.email;
    if (!email) { errors++; continue; }

    try {
      // Upsert into global_leads using parameterized queries
      await dbRun(env.DB, `
        INSERT INTO global_leads (email, first_name, last_name, name, title, company, domain, industry, company_size, country, city, phone, linkedin_url, source, enriched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(email) DO UPDATE SET
          first_name   = COALESCE(excluded.first_name, first_name),
          last_name    = COALESCE(excluded.last_name,  last_name),
          name         = COALESCE(excluded.name,       name),
          title        = COALESCE(excluded.title,      title),
          company      = COALESCE(excluded.company,    company),
          domain       = COALESCE(excluded.domain,     domain),
          industry     = COALESCE(excluded.industry,   industry),
          company_size = COALESCE(excluded.company_size, company_size),
          country      = COALESCE(excluded.country,    country),
          city         = COALESCE(excluded.city,       city),
          phone        = COALESCE(excluded.phone,      phone),
          linkedin_url = COALESCE(excluded.linkedin_url, linkedin_url),
          enriched_at  = datetime('now')`,
        [email, normalized.first_name, normalized.last_name, normalized.full_name,
         normalized.title,
         normalized.company,
         normalized.domain,
         normalized.industry,
         normalized.company_size,
         normalized.country,
         normalized.city,
         normalized.phone,
         normalized.linkedin_url,
         (c as any).source || 'import']
      );

      // Retrieve the lead ID using parameterized query
      const lead = await dbFirst<any>(env.DB, `SELECT id FROM global_leads WHERE email = ?`, [email]);
      if (!lead) { errors++; continue; }

      // Link to campaign using parameterized query
      const existing = await dbFirst<any>(env.DB,
        `SELECT id FROM campaign_leads WHERE lead_id = ? AND campaign_id = ?`, [lead.id, campaignId]);
      if (!existing) {
        await dbRun(env.DB,
          `INSERT INTO campaign_leads (lead_id, campaign_id, status, billing_status) VALUES (?, ?, 'pending', 'billable')`,
          [lead.id, campaignId]);
        added++;
      } else {
        dupes++;
      }
    } catch (err) {
      console.error(`Error processing contact ${email}:`, err);
      errors++;
    }
  }

  // ── Phase 4: Invalidate cache on mutation ───────────────────────────────────
  searchCache.clear();

  return jsonResponse({ success: true, data: { added, dupes, errors } }, 200, origin);
}

// ── GET /api/campaigns/:id/source-leads ──────────────────────────────────────
// Return sourcing summary for a campaign
async function sourcingSummary(env: Env, origin: string | null, campaignId: number): Promise<Response> {
  const rows = await dbAll<any>(env.DB, `
    SELECT cl.status, cl.billing_status, COUNT(*) as count
    FROM campaign_leads cl
    WHERE cl.campaign_id = ?
    GROUP BY cl.status, cl.billing_status`, [campaignId]);

  const total = rows.reduce((a: number, r: any) => a + r.count, 0);
  return jsonResponse({ success: true, data: { rows, total } }, 200, origin);
}

// ── POST /api/global-leads/import ────────────────────────────────────────────
// Bulk import from CSV data (array of contact objects)
async function bulkImport(request: Request, env: Env, origin: string | null): Promise<Response> {
  const body = await request.json() as unknown;
  const { contacts } = validateContactsPayload(body);

  let added = 0, updated = 0, errors = 0;
  for (const rawContact of contacts) {
    const normalized = normalizeIncomingContact(rawContact);
    if (!normalized.email) { errors++; continue; }
    try {
      const existing = await dbFirst<any>(env.DB, `SELECT id FROM global_leads WHERE email=?`, [normalized.email]);
      await dbRun(env.DB, `
        INSERT INTO global_leads (email, first_name, last_name, name, title, company, domain, industry, company_size, country, city, phone, linkedin_url, source, enriched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'import', datetime('now'))
        ON CONFLICT(email) DO UPDATE SET
          first_name=COALESCE(excluded.first_name,first_name),last_name=COALESCE(excluded.last_name,last_name),
          title=COALESCE(excluded.title,title),company=COALESCE(excluded.company,company),
          industry=COALESCE(excluded.industry,industry),company_size=COALESCE(excluded.company_size,company_size),
          country=COALESCE(excluded.country,country),phone=COALESCE(excluded.phone,phone),
          linkedin_url=COALESCE(excluded.linkedin_url,linkedin_url),enriched_at=datetime('now')`,
        [normalized.email, normalized.first_name, normalized.last_name, normalized.full_name,
         normalized.title, normalized.company, normalized.domain, normalized.industry,
         normalized.company_size, normalized.country, normalized.city, normalized.phone, normalized.linkedin_url]);
      existing ? updated++ : added++;
    } catch { errors++; }
  }

  // ── Phase 4: Invalidate cache on bulk mutation ──────────────────────────────
  searchCache.clear();

  return jsonResponse({ success: true, data: { added, updated, errors } }, 200, origin);
}

// ── Router ────────────────────────────────────────────────────────────────────
export async function sourcingRouter(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url    = new URL(request.url);
  const path   = url.pathname;
  const method = request.method;

  if (path === '/api/global-leads' && method === 'GET')
    return searchOwnDB(url, env, origin);

  if (path === '/api/global-leads/import' && method === 'POST')
    return bulkImport(request, env, origin);

  if (path === '/api/apollo/search' && method === 'POST')
    return apolloSearch(request, env, origin);

  const sourceMatch = path.match(/^\/api\/campaigns\/(\d+)\/source-leads$/);
  if (sourceMatch) {
    const campaignId = parseInt(sourceMatch[1]);
    if (method === 'POST') return assignLeads(request, env, origin, campaignId);
    if (method === 'GET')  return sourcingSummary(env, origin, campaignId);
  }

  return jsonResponse({ error: 'Not found' }, 404, origin);
}

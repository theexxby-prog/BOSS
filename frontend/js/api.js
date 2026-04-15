// BOSS HQ — API Client
// All fetch() calls go through here. Swap BASE_URL for production.

const BASE_URL = 'https://boss-api.mehtahouse.cc';

async function apiFetch(path, options = {}) {
  try {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: json.error || `HTTP ${res.status}`, data: [] };
    return json;
  } catch (e) {
    console.warn('API error:', path, e.message);
    return { success: false, error: e.message, data: [] };
  }
}

const API = {
  // Clients
  getClients:    (params = '') => apiFetch(`/api/clients${params}`),
  getClient:     (id)          => apiFetch(`/api/clients/${id}`),
  createClient:  (body)        => apiFetch('/api/clients', { method: 'POST', body: JSON.stringify(body) }),
  updateClient:  (id, body)    => apiFetch(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteClient:  (id)          => apiFetch(`/api/clients/${id}`, { method: 'DELETE' }),

  // Campaigns
  getCampaigns:  (params = '') => apiFetch(`/api/campaigns${params}`),
  getCampaign:   (id)          => apiFetch(`/api/campaigns/${id}`),
  createCampaign:(body)        => apiFetch('/api/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  updateCampaign:(id, body)    => apiFetch(`/api/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Leads
  getLeads:      (params = '') => apiFetch(`/api/leads${params}`),
  getLead:       (id)          => apiFetch(`/api/leads/${id}`),
  createLead:    (body)        => apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(body) }),
  updateLead:    (id, body)    => apiFetch(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getQAQueue:    ()            => apiFetch('/api/leads?qa_queue=1'),

  // Deliveries
  getDeliveries: (params = '') => apiFetch(`/api/deliveries${params}`),
  createDelivery:(body)        => apiFetch('/api/deliveries', { method: 'POST', body: JSON.stringify(body) }),
  updateDelivery:(id, body)    => apiFetch(`/api/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Finance
  getRevenue:       (params = '') => apiFetch(`/api/finance/revenue${params}`),
  createRevenue:    (body)        => apiFetch('/api/finance/revenue', { method: 'POST', body: JSON.stringify(body) }),
  getExpenses:      ()            => apiFetch('/api/finance/expenses'),
  createExpense:    (body)        => apiFetch('/api/finance/expenses', { method: 'POST', body: JSON.stringify(body) }),
  deleteExpense:    (id)          => apiFetch(`/api/finance/expenses/${id}`, { method: 'DELETE' }),
  getInvoices:      (params = '') => apiFetch(`/api/finance/invoices${params}`),
  createInvoice:    (body)        => apiFetch('/api/finance/invoices', { method: 'POST', body: JSON.stringify(body) }),
  updateInvoice:    (id, body)    => apiFetch(`/api/finance/invoices/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getSubscriptions: ()            => apiFetch('/api/finance/subscriptions'),
  createSubscription:(body)       => apiFetch('/api/finance/subscriptions', { method: 'POST', body: JSON.stringify(body) }),
  updateSubscription:(id, body)   => apiFetch(`/api/finance/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Social
  getPosts:     (params = '') => apiFetch(`/api/social${params}`),
  createPost:   (body)        => apiFetch('/api/social', { method: 'POST', body: JSON.stringify(body) }),
  updatePost:   (id, body)    => apiFetch(`/api/social/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePost:   (id)          => apiFetch(`/api/social/${id}`, { method: 'DELETE' }),

  // BD Pipeline
  getDeals:     (params = '') => apiFetch(`/api/bd${params}`),
  createDeal:   (body)        => apiFetch('/api/bd', { method: 'POST', body: JSON.stringify(body) }),
  updateDeal:   (id, body)    => apiFetch(`/api/bd/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // System Logs
  getSystemLogs:  ()          => apiFetch('/api/system-logs'),
  updateSystemLog:(id, body)  => apiFetch(`/api/system-logs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Assets
  getAssets:      (params='') => apiFetch(`/api/assets${params}`),
  createAsset:    (body)      => apiFetch('/api/assets', { method: 'POST', body: JSON.stringify(body) }),
  updateAsset:    (id, body)  => apiFetch(`/api/assets/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAsset:    (id)        => apiFetch(`/api/assets/${id}`, { method: 'DELETE' }),

  // Landing Pages
  getPages:       ()          => apiFetch('/api/pages'),
  getPage:        (id)        => apiFetch(`/api/pages/${id}`),
  createPage:     (body)      => apiFetch('/api/pages', { method: 'POST', body: JSON.stringify(body) }),
  generatePage:   (campaignId) => apiFetch(`/api/campaigns/${campaignId}/generate-page`, { method: 'POST', body: '{}' }),
  updatePage:     (id, body)  => apiFetch(`/api/pages/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePage:     (id)        => apiFetch(`/api/pages/${id}`, { method: 'DELETE' }),
  submitPage:     (slug, body)=> apiFetch(`/api/pages/${slug}/submit`, { method: 'POST', body: JSON.stringify(body) }),

  // Documents
  getDocuments:   (params='') => apiFetch(`/api/documents${params}`),
  createDocument: (body)      => apiFetch('/api/documents', { method: 'POST', body: JSON.stringify(body) }),
  updateDocument: (id, body)  => apiFetch(`/api/documents/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDocument: (id)        => apiFetch(`/api/documents/${id}`, { method: 'DELETE' }),

  // Job Cards
  getJobCards:    (params='') => apiFetch(`/api/job-cards${params}`),
  createJobCard:  (body)      => apiFetch('/api/job-cards', { method: 'POST', body: JSON.stringify(body) }),
  updateJobCard:  (id, body)  => apiFetch(`/api/job-cards/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Settings
  getSettings:    ()          => apiFetch('/api/settings'),
  updateSettings: (body)      => apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(body) }),

  // Campaign Leads pipeline
  getCampaignLeads: (params = '') => apiFetch(`/api/campaign-leads${params}`),
  qaLead:           (id)          => apiFetch(`/api/campaign-leads/${id}/qa`,      { method: 'POST' }),
  deliverLead:      (id)          => apiFetch(`/api/campaign-leads/${id}/deliver`, { method: 'POST' }),
  acceptLead:       (id, body)    => apiFetch(`/api/campaign-leads/${id}/accept`,  { method: 'POST', body: JSON.stringify(body) }),
  billingOverride:  (id, body)    => apiFetch(`/api/campaign-leads/${id}/billing`, { method: 'POST', body: JSON.stringify(body) }),

  // ICP Scoring
  scoreLead:      (id)        => apiFetch(`/api/leads/${id}/score`, { method: 'POST' }),

  // Pipeline alerts
  getAlerts:      ()          => apiFetch('/api/alerts'),

  // Campaign pipeline actions
  getInvoicePreview: (id)     => apiFetch(`/api/campaigns/${id}/invoice-preview`),
  generateInvoice:   (id)     => apiFetch(`/api/campaigns/${id}/generate-invoice`, { method: 'POST' }),
  completeCampaign:  (id)     => apiFetch(`/api/campaigns/${id}/complete`, { method: 'POST' }),

  // Lead Sourcing
  searchGlobalLeads: (params = '') => apiFetch(`/api/global-leads${params}`),
  importGlobalLeads: (body)        => apiFetch('/api/global-leads/import', { method: 'POST', body: JSON.stringify(body) }),
  searchApollo:      (body)        => apiFetch('/api/apollo/search',        { method: 'POST', body: JSON.stringify(body) }),
  assignLeads:       (campaignId, contacts) => apiFetch(`/api/campaigns/${campaignId}/source-leads`, { method: 'POST', body: JSON.stringify({ contacts }) }),
  getSourcingSummary:(campaignId)  => apiFetch(`/api/campaigns/${campaignId}/source-leads`),
  cleanLeads:        (contacts)    => apiFetch('/api/global-leads/clean', { method: 'POST', body: JSON.stringify({ contacts }) }),
};

window.API = API;

// Campaigns module — v3

function setCampaignsTab(t) { State.campaignsTab = t; State.viewingCampaign = null; renderModule('campaigns'); }

async function renderCampaigns() {
  // If viewing a specific campaign, render detail view
  if (State.viewingCampaign) {
    return renderCampaignDetail(State.viewingCampaign);
  }

  const [cRes, clRes] = await Promise.all([API.getCampaigns(), API.getClients()]);
  const campaigns = cRes.success ? cRes.data : [];
  const clients   = clRes.success ? clRes.data : [];
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const draftCount = campaigns.filter(c => c.status === 'draft').length;
  const tabs     = ['active','draft','paused','completed','all'];
  const tabLabel = ['▶ Active',`📋 Requests${draftCount ? ` <span class="notif-badge">${draftCount}</span>` : ''}`,'⏸ Paused','✓ Completed','All'];
  const tabHtml  = tabs.map((t,i) => `<div class="tab${t===State.campaignsTab?' active':''}" onclick="setCampaignsTab('${t}')">${tabLabel[i]}</div>`).join('');

  const filtered = State.campaignsTab === 'all' ? campaigns : campaigns.filter(c => c.status === State.campaignsTab);

  const totalActive    = campaigns.filter(c => c.status === 'active').length;
  const totalRequests  = campaigns.filter(c => c.status === 'draft').length;
  const avgAcceptance  = campaigns.length ? Math.round(campaigns.reduce((a,b) => a + (b.acceptance_rate||0), 0) / campaigns.length) : 0;
  const totalValue     = campaigns.reduce((a,b) => a + ((b.delivered||0)*(b.cpl||0)), 0);

  // Draft tab shows request review cards
  if (State.campaignsTab === 'draft') {
    const drafts = campaigns.filter(c => c.status === 'draft');
    const requestCards = drafts.length ? drafts.map(c => renderRequestCard(c, clientMap)).join('') :
      `<div class="card" style="text-align:center;padding:60px;color:var(--t3)">
        <div style="font-size:40px;margin-bottom:12px">📭</div>
        <div class="fw7" style="margin-bottom:4px">No pending campaign requests</div>
        <div class="fs12">When a client submits a campaign request, it will appear here for your review.</div>
      </div>`;

    return `<div class="fade">
      <div class="g4 mb20">
        ${kpi('Active Campaigns', String(totalActive), null, '', '📋', 'var(--acc)')}
        ${kpi('Pending Requests', String(totalRequests), null, 'awaiting review', '📨', 'var(--yel)')}
        ${kpi('Avg Acceptance', avgAcceptance+'%', null, 'across all campaigns', '✓', 'var(--cyn)')}
        ${kpi('Pipeline Value', '$'+totalValue.toLocaleString(), null, 'delivered × CPL', '💰', 'var(--yel)')}
      </div>
      <div class="sec-hdr mb16">
        <div class="tabs" style="margin:0">${tabHtml}</div>
        <button class="btn btn-pri btn-sm" onclick="showNewCampaignForm()">+ New Campaign</button>
      </div>
      <div class="request-grid">${requestCards}</div>
    </div>`;
  }

  // Active/other tabs show campaign cards with logos
  const campaignCards = filtered.length ? filtered.map(c => {
    const brandColor = c.brand_color || 'var(--acc)';
    const pct = Math.min(100, Math.round((c.delivered / Math.max(c.target, 1)) * 100));
    return `<div class="camp-row card" onclick="viewCampaign(${c.id})" style="cursor:pointer;border-left:3px solid ${brandColor}">
      <div class="camp-row-top">
        <div class="camp-row-identity">
          ${c.logo_url ? `<div class="camp-logo" style="background:${brandColor}15;border-color:${brandColor}33"><img src="${c.logo_url}" alt=""/></div>` : `<div class="camp-logo-placeholder" style="background:${brandColor}22;color:${brandColor}">${(c.name||'C')[0]}</div>`}
          <div>
            <div class="fw7">${c.name}</div>
            <div class="fs12" style="color:var(--t3)">${clientMap[c.client_id]||'—'}</div>
          </div>
        </div>
        <div class="camp-row-stats">
          ${statusBadge(c.status)}
          <div class="camp-stat"><div class="camp-stat-label">Progress</div><div class="fw7">${c.delivered||0}/${c.target}</div></div>
          <div class="camp-stat"><div class="camp-stat-label">CPL</div><div class="fw7 clr-grn">$${c.cpl}</div></div>
          <div class="camp-stat"><div class="camp-stat-label">Acceptance</div><div class="fw7 ${c.acceptance_rate>=90?'clr-grn':c.acceptance_rate>=75?'clr-yel':'clr-red'}">${c.acceptance_rate||0}%</div></div>
          <div class="camp-stat"><div class="camp-stat-label">Dates</div><div class="fs12" style="color:var(--t3)">${fmtDate(c.start_date)} → ${fmtDate(c.end_date)}</div></div>
        </div>
      </div>
      <div class="prog" style="height:4px;margin-top:12px"><div class="prog-fill" style="width:${pct}%;background:${brandColor}"></div></div>
    </div>`;
  }).join('')
  : `<div class="card" style="text-align:center;padding:40px;color:var(--t3)">No ${State.campaignsTab === 'all' ? '' : State.campaignsTab + ' '}campaigns yet.</div>`;

  return `<div class="fade">
    <div class="g4 mb20">
      ${kpi('Active Campaigns', String(totalActive), null, '', '📋', 'var(--acc)')}
      ${kpi('Pending Requests', String(totalRequests), null, 'awaiting review', '📨', 'var(--yel)')}
      ${kpi('Avg Acceptance', avgAcceptance+'%', null, 'across all campaigns', '✓', 'var(--cyn)')}
      ${kpi('Pipeline Value', '$'+totalValue.toLocaleString(), null, 'delivered × CPL', '💰', 'var(--yel)')}
    </div>
    <div class="sec-hdr mb16">
      <div class="tabs" style="margin:0">${tabHtml}</div>
      <button class="btn btn-pri btn-sm" onclick="showNewCampaignForm()">+ New Campaign</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">${campaignCards}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// Request Card — visual, branded, with logo
// ═══════════════════════════════════════════════════════════
function renderRequestCard(c, clientMap) {
  let tal = [], suppression = [], customQ = [], geo = [], industries = [], titles = [], sizes = [];
  try { tal = JSON.parse(c.tal || '[]'); } catch {}
  try { suppression = JSON.parse(c.suppression_list || '[]'); } catch {}
  try { customQ = JSON.parse(c.custom_questions || '[]'); } catch {}
  try { geo = JSON.parse(c.geo || '[]'); } catch {}
  try { industries = JSON.parse(c.industries || '[]'); } catch {}
  try { titles = JSON.parse(c.titles || '[]'); } catch {}
  try { sizes = JSON.parse(c.company_sizes || '[]'); } catch {}

  const brandColor = c.brand_color || '#2563eb';
  const brandSecondary = c.brand_color_secondary || '#1e40af';
  const brandAccent = c.brand_accent || '#3b82f6';
  const totalBudget = (c.target||0) * (c.cpl||0);

  return `<div class="card rq-card" style="padding:0;overflow:hidden">
    <!-- Branded header strip -->
    <div class="rq-header" style="background:linear-gradient(135deg, ${brandColor}, ${brandSecondary})">
      <div class="rq-header-left">
        ${c.logo_url ? `<img src="${c.logo_url}" class="rq-logo" alt=""/>` : ''}
        <div>
          <div class="rq-name">${c.name}</div>
          <div class="rq-client">${clientMap[c.client_id] || 'Unknown Client'}</div>
        </div>
      </div>
      <span class="rq-badge">Pending Review</span>
    </div>

    <div style="padding:20px">
      <!-- Key metrics row -->
      <div class="rq-metrics">
        <div class="rq-metric">
          <div class="rq-metric-val">${(c.target||0).toLocaleString()}</div>
          <div class="rq-metric-label">Target Leads</div>
        </div>
        <div class="rq-metric">
          <div class="rq-metric-val">$${c.cpl}</div>
          <div class="rq-metric-label">Cost per Lead</div>
        </div>
        <div class="rq-metric">
          <div class="rq-metric-val">$${totalBudget.toLocaleString()}</div>
          <div class="rq-metric-label">Total Budget</div>
        </div>
        <div class="rq-metric">
          <div class="rq-metric-val">${fmtDate(c.start_date)}</div>
          <div class="rq-metric-label">Start → ${fmtDate(c.end_date)}</div>
        </div>
      </div>

      <!-- Two-column detail grid -->
      <div class="rq-details">
        <!-- Left column -->
        <div class="rq-col">
          <div class="rq-section">
            <div class="rq-section-icon">📄</div>
            <div>
              <div class="request-label">Asset</div>
              <div class="fw6 fs13">${c.asset_name || '—'}</div>
              ${c.asset_url ? `<a href="${c.asset_url}" target="_blank" class="fs12" style="color:${brandAccent}">View Asset ↗</a>` : ''}
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">🎯</div>
            <div>
              <div class="request-label">Target Titles</div>
              <div class="tag-list">${titles.map(t => `<span class="tag">${t}</span>`).join('')}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">🏢</div>
            <div>
              <div class="request-label">Industries</div>
              <div class="tag-list">${industries.map(i => `<span class="tag">${i}</span>`).join('')}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">📏</div>
            <div>
              <div class="request-label">Company Size</div>
              <div class="tag-list">${sizes.map(s => `<span class="tag">${s}</span>`).join('')}</div>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div class="rq-col">
          <div class="rq-section">
            <div class="rq-section-icon">🌍</div>
            <div>
              <div class="request-label">Geographies</div>
              <div class="tag-list">${geo.map(g => `<span class="tag">${g}</span>`).join('')}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">📋</div>
            <div>
              <div class="request-label">Target Account List (${tal.length})</div>
              <div class="fs12" style="color:var(--t3)">${tal.slice(0,8).join(', ')}${tal.length > 8 ? ` <span style="color:${brandAccent}">+${tal.length-8} more</span>` : ''}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">🚫</div>
            <div>
              <div class="request-label">Suppression List (${suppression.length})</div>
              <div class="fs12" style="color:var(--t3)">${suppression.length ? suppression.join(', ') : 'None'}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">🎨</div>
            <div>
              <div class="request-label">Branding</div>
              <div style="display:flex;gap:6px;align-items:center">
                <div class="rq-color-swatch" style="background:${brandColor}"></div>
                <div class="rq-color-swatch" style="background:${brandSecondary}"></div>
                <div class="rq-color-swatch" style="background:${brandAccent}"></div>
                ${c.logo_url ? `<span class="fs11" style="color:var(--t3);margin-left:4px">+ Logo</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      ${customQ.length ? `<div class="rq-questions">
        <div class="request-label" style="margin-bottom:8px">Custom Qualifying Questions</div>
        ${customQ.map((q,i) => `<div class="rq-question"><span class="rq-q-num" style="background:${brandAccent}22;color:${brandAccent}">${i+1}</span><span class="fs13">${q.question}</span></div>`).join('')}
      </div>` : ''}

      ${c.notes ? `<div class="rq-notes">
        <div class="request-label">Client Notes</div>
        <div class="fs13" style="color:var(--t3);line-height:1.5;margin-top:4px">${c.notes}</div>
      </div>` : ''}

      <div class="rq-actions">
        <button class="btn btn-pri btn-sm" onclick="deployLandingPage(${c.id})" style="flex:1">🚀 Deploy Landing Page</button>
        <button class="btn btn-ghost btn-sm" onclick="editCampaignRequest(${c.id})">Edit</button>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// Campaign Detail View — full scope + landing page links
// ═══════════════════════════════════════════════════════════
async function renderCampaignDetail(campaignId) {
  const [cRes, clRes, pRes] = await Promise.all([
    API.getCampaign(campaignId),
    API.getClients(),
    API.getPages()
  ]);
  if (!cRes.success) return `<div class="card" style="padding:40px;text-align:center;color:var(--t3)">Campaign not found</div>`;

  const c = cRes.data;
  const clients = clRes.success ? clRes.data : [];
  const clientMap = Object.fromEntries(clients.map(cl => [cl.id, cl.name]));
  const pages = (pRes.success ? pRes.data : []).filter(p => p.campaign_id === c.id);

  let tal = [], suppression = [], customQ = [], geo = [], industries = [], titles = [], sizes = [];
  try { tal = JSON.parse(c.tal || '[]'); } catch {}
  try { suppression = JSON.parse(c.suppression_list || '[]'); } catch {}
  try { customQ = JSON.parse(c.custom_questions || '[]'); } catch {}
  try { geo = JSON.parse(c.geo || '[]'); } catch {}
  try { industries = JSON.parse(c.industries || '[]'); } catch {}
  try { titles = JSON.parse(c.titles || '[]'); } catch {}
  try { sizes = JSON.parse(c.company_sizes || '[]'); } catch {}

  const brandColor = c.brand_color || '#2563eb';
  const brandSecondary = c.brand_color_secondary || '#1e40af';
  const brandAccent = c.brand_accent || '#3b82f6';
  const pct = Math.min(100, Math.round(((c.delivered||0) / Math.max(c.target, 1)) * 100));
  const totalBudget = (c.target||0) * (c.cpl||0);
  const revenueEarned = (c.delivered||0) * (c.cpl||0);

  const landingPagesHtml = pages.length ? pages.map(p => {
    const convRate = p.submissions && p.views ? Math.round(p.submissions / p.views * 100) : 0;
    const liveUrl = `https://boss-api.mehtahouse.cc/lp/${p.slug}`;
    return `<div class="cd-page-card">
      <div class="cd-page-info">
        <div class="fw7">${p.name}</div>
        <div class="fs12" style="color:var(--t3)">/${p.slug}</div>
      </div>
      <div class="cd-page-stats">
        <div class="camp-stat"><div class="camp-stat-label">Views</div><div class="fw7">${p.views||0}</div></div>
        <div class="camp-stat"><div class="camp-stat-label">Submissions</div><div class="fw7 clr-grn">${p.submissions||0}</div></div>
        <div class="camp-stat"><div class="camp-stat-label">Conv.</div><div class="fw7 clr-acc">${convRate}%</div></div>
      </div>
      <a href="${liveUrl}" target="_blank" class="btn btn-pri btn-sm">View Live Page ↗</a>
    </div>`;
  }).join('') : `<div style="text-align:center;padding:24px;color:var(--t3)"><div class="fs12">No landing pages deployed yet.</div>
    ${c.status === 'draft' ? `<button class="btn btn-pri btn-sm" style="margin-top:8px" onclick="deployLandingPage(${c.id})">🚀 Deploy Landing Page</button>` : ''}
  </div>`;

  return `<div class="fade">
    <!-- Back button -->
    <button class="btn btn-ghost btn-sm mb16" onclick="State.viewingCampaign=null;renderModule('campaigns')" style="gap:4px">← Back to Campaigns</button>

    <!-- Campaign header with branding -->
    <div class="cd-header" style="background:linear-gradient(135deg, ${brandColor}, ${brandSecondary})">
      <div class="cd-header-left">
        ${c.logo_url ? `<img src="${c.logo_url}" class="cd-logo" alt=""/>` : ''}
        <div>
          <div class="cd-title">${c.name}</div>
          <div class="cd-client">${clientMap[c.client_id] || '—'}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${statusBadge(c.status)}
      </div>
    </div>

    <!-- KPI row -->
    <div class="g4 mb20" style="margin-top:20px">
      ${kpi('Target Leads', c.target.toLocaleString(), null, '', '🎯', brandAccent)}
      ${kpi('Delivered', String(c.delivered||0), null, pct+'% complete', '📦', 'var(--grn)')}
      ${kpi('Revenue', '$'+revenueEarned.toLocaleString(), null, 'of $'+totalBudget.toLocaleString(), '💰', 'var(--grn)')}
      ${kpi('Acceptance', (c.acceptance_rate||0)+'%', null, '', '✓', 'var(--cyn)')}
    </div>

    <!-- Progress bar -->
    <div class="card mb20">
      <div class="sec-hdr mb12"><div class="sec-title">Delivery Progress</div><div class="fw7 fs13">${pct}%</div></div>
      <div class="prog" style="height:8px"><div class="prog-fill" style="width:${pct}%;background:${brandAccent}"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px">
        <div class="fs12" style="color:var(--t3)">${c.delivered||0} delivered</div>
        <div class="fs12" style="color:var(--t3)">${c.target} target</div>
      </div>
    </div>

    <div class="cd-grid mb20">
      <!-- Left: Campaign Scope -->
      <div class="card">
        <div class="sec-title mb16">Campaign Scope</div>

        <div class="cd-scope-grid">
          <div class="rq-section">
            <div class="rq-section-icon">📄</div>
            <div>
              <div class="request-label">Asset</div>
              <div class="fw6 fs13">${c.asset_name || '—'}</div>
              ${c.asset_url ? `<a href="${c.asset_url}" target="_blank" class="fs12" style="color:${brandAccent}">View Asset ↗</a>` : ''}
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">💰</div>
            <div>
              <div class="request-label">Budget</div>
              <div class="fw6 fs13">${c.target.toLocaleString()} leads × $${c.cpl} = $${totalBudget.toLocaleString()}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">📅</div>
            <div>
              <div class="request-label">Campaign Period</div>
              <div class="fw6 fs13">${fmtDate(c.start_date)} → ${fmtDate(c.end_date)}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">🎯</div>
            <div>
              <div class="request-label">Target Titles</div>
              <div class="tag-list">${titles.map(t => `<span class="tag">${t}</span>`).join('') || '<span class="fs12" style="color:var(--t3)">Not specified</span>'}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">🏢</div>
            <div>
              <div class="request-label">Industries</div>
              <div class="tag-list">${industries.map(i => `<span class="tag">${i}</span>`).join('') || '<span class="fs12" style="color:var(--t3)">Not specified</span>'}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">📏</div>
            <div>
              <div class="request-label">Company Size</div>
              <div class="tag-list">${sizes.map(s => `<span class="tag">${s}</span>`).join('') || '<span class="fs12" style="color:var(--t3)">Not specified</span>'}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">🌍</div>
            <div>
              <div class="request-label">Geographies</div>
              <div class="tag-list">${geo.map(g => `<span class="tag">${g}</span>`).join('') || '<span class="fs12" style="color:var(--t3)">Not specified</span>'}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">📋</div>
            <div>
              <div class="request-label">Target Account List (${tal.length})</div>
              <div class="fs12" style="color:var(--t3)">${tal.length ? tal.slice(0,10).join(', ') + (tal.length > 10 ? ` <span style="color:${brandAccent}">+${tal.length-10} more</span>` : '') : 'None specified'}</div>
            </div>
          </div>

          <div class="rq-section">
            <div class="rq-section-icon">🚫</div>
            <div>
              <div class="request-label">Suppression List (${suppression.length})</div>
              <div class="fs12" style="color:var(--t3)">${suppression.length ? suppression.join(', ') : 'None'}</div>
            </div>
          </div>
        </div>

        ${customQ.length ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--bd)">
          <div class="request-label" style="margin-bottom:8px">Custom Qualifying Questions</div>
          ${customQ.map((q,i) => `<div class="rq-question"><span class="rq-q-num" style="background:${brandAccent}22;color:${brandAccent}">${i+1}</span><span class="fs13">${q.question}</span></div>`).join('')}
        </div>` : ''}

        ${c.notes ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--bd)">
          <div class="request-label">Client Notes</div>
          <div class="fs13" style="color:var(--t3);line-height:1.5;margin-top:4px">${c.notes}</div>
        </div>` : ''}
      </div>

      <!-- Right: Landing Pages -->
      <div class="card">
        <div class="sec-hdr mb16"><div class="sec-title">Landing Pages</div></div>
        ${landingPagesHtml}
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// Deploy Landing Page
// ═══════════════════════════════════════════════════════════
async function deployLandingPage(campaignId) {
  const res = await API.getCampaign(campaignId);
  if (!res.success) { alert('Error loading campaign'); return; }
  const c = res.data;

  let customQ = [];
  try { customQ = JSON.parse(c.custom_questions || '[]'); } catch {}

  const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const pageData = {
    campaign_id: c.id,
    client_id: c.client_id,
    name: c.name + ' Landing Page',
    slug: slug,
    headline: c.asset_name ? `Download: ${c.asset_name}` : 'Download Your Free Resource',
    subheadline: 'Fill out the form below to get instant access to this exclusive resource.',
    cta_text: 'Download Now',
    status: 'active',
    custom_questions: customQ,
    brand_color: c.brand_color || '#2563eb',
    brand_color_secondary: c.brand_color_secondary || '#1e40af',
    brand_accent: c.brand_accent || '#3b82f6',
    logo_url: c.logo_url || null,
    asset_url: c.asset_url || null,
    asset_name: c.asset_name || null,
  };

  const createRes = await API.createPage(pageData);
  if (!createRes.success) { alert('Error creating page: ' + (createRes.error || 'Unknown')); return; }

  await API.updateCampaign(campaignId, { status: 'active' });

  const liveUrl = `https://boss-api.mehtahouse.cc/lp/${slug}`;
  State.campaignsTab = 'active';
  State.viewingCampaign = campaignId;
  renderModule('campaigns');
  refreshBadges();

  setTimeout(() => {
    if (confirm(`Landing page deployed!\n\nLive URL:\n${liveUrl}\n\nClick OK to open it.`)) {
      window.open(liveUrl, '_blank');
    }
  }, 300);
}

function viewCampaign(id) {
  State.viewingCampaign = id;
  renderModule('campaigns');
}

function editCampaignRequest(id) {
  alert('Campaign edit form — coming soon');
}

function showNewCampaignForm() {
  alert('New campaign form — coming soon');
}

window.setCampaignsTab     = setCampaignsTab;
window.renderCampaigns     = renderCampaigns;
window.viewCampaign        = viewCampaign;
window.deployLandingPage   = deployLandingPage;
window.editCampaignRequest = editCampaignRequest;
window.showNewCampaignForm = showNewCampaignForm;

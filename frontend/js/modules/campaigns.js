// Campaigns module — v4

function setCampaignsTab(t) { State.campaignsTab = t; State.viewingCampaign = null; renderModule('campaigns'); }

async function renderCampaigns() {
  if (State.viewingCampaign) return renderCampaignDetail(State.viewingCampaign);

  const [cRes, clRes] = await Promise.all([API.getCampaigns(), API.getClients()]);
  const campaigns = cRes.success ? cRes.data : [];
  const clients   = clRes.success ? clRes.data : [];
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const draftCount = campaigns.filter(c => c.status === 'draft').length;
  const tabs     = ['active','draft','paused','completed','all'];
  const tabLabel = ['▶ Active',`📋 Requests${draftCount ? ` <span class="notif-badge">${draftCount}</span>` : ''}`,'⏸ Paused','✓ Completed','All'];
  const tabHtml  = tabs.map((t,i) => `<div class="tab${t===State.campaignsTab?' active':''}" onclick="setCampaignsTab('${t}')">${tabLabel[i]}</div>`).join('');

  const filtered = State.campaignsTab === 'all' ? campaigns : campaigns.filter(c => c.status === State.campaignsTab);
  const totalActive   = campaigns.filter(c => c.status === 'active').length;
  const totalRequests = campaigns.filter(c => c.status === 'draft').length;
  const avgAcceptance = campaigns.length ? Math.round(campaigns.reduce((a,b) => a + (b.acceptance_rate||0), 0) / campaigns.length) : 0;
  const totalValue    = campaigns.reduce((a,b) => a + ((b.delivered||0)*(b.cpl||0)), 0);

  // Draft tab → request cards
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
      <div class="sec-hdr mb16"><div class="tabs" style="margin:0">${tabHtml}</div><button class="btn btn-pri btn-sm" onclick="showNewCampaignForm()">+ New Campaign</button></div>
      <div style="display:flex;flex-direction:column;gap:16px">${requestCards}</div>
    </div>`;
  }

  // Active/other tabs → campaign cards
  const campaignRows = filtered.length ? filtered.map(c => {
    const bc = c.brand_color || '#2563eb';
    const bs = c.brand_color_secondary || '#1e40af';
    const ba = c.brand_accent || bc;
    const pct = Math.min(100, Math.round(((c.delivered||0) / Math.max(c.target, 1)) * 100));
    const budget = (c.target||0)*(c.cpl||0);
    const acceptClass = c.acceptance_rate>=90?'clr-grn':c.acceptance_rate>=75?'clr-yel':'clr-red';
    return `<div class="cmp-card" onclick="viewCampaign(${c.id})">
      <div class="cmp-card-accent" style="background:linear-gradient(135deg,${bc},${bs})"></div>
      <div class="cmp-card-body">
        <div class="cmp-card-top">
          <div class="cmp-card-identity">
            ${c.logo_url
              ? `<img src="${c.logo_url}" class="cmp-card-logo"/>`
              : `<div class="cmp-card-logo-ph" style="background:${bc}22;color:${bc}">${(c.name||'C')[0]}</div>`}
            <div>
              <div class="cmp-card-name">${c.name}</div>
              <div class="cmp-card-client">${clientMap[c.client_id]||''}</div>
            </div>
          </div>
          <div class="cmp-card-right">
            ${statusBadge(c.status)}
            <div class="cmp-card-dates">${fmtDate(c.start_date)} → ${fmtDate(c.end_date)}</div>
          </div>
        </div>
        <div class="cmp-card-stats">
          <div class="cmp-card-stat">
            <div class="cmp-card-stat-v">${(c.delivered||0).toLocaleString()}<span class="cmp-card-stat-of">/${(c.target||0).toLocaleString()}</span></div>
            <div class="cmp-card-stat-l">Leads Delivered</div>
          </div>
          <div class="cmp-card-stat">
            <div class="cmp-card-stat-v clr-grn">$${c.cpl||0}</div>
            <div class="cmp-card-stat-l">Cost per Lead</div>
          </div>
          <div class="cmp-card-stat">
            <div class="cmp-card-stat-v ${ acceptClass}">${c.acceptance_rate||0}%</div>
            <div class="cmp-card-stat-l">Acceptance Rate</div>
          </div>
          <div class="cmp-card-stat">
            <div class="cmp-card-stat-v">$${budget.toLocaleString()}</div>
            <div class="cmp-card-stat-l">Total Budget</div>
          </div>
        </div>
        <div class="cmp-card-progress-wrap">
          <div class="cmp-card-progress-bar">
            <div class="cmp-card-progress-fill" style="width:${pct}%;background:${ba}"></div>
          </div>
          <span class="cmp-card-pct">${pct}%</span>
        </div>
      </div>
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
    <div class="sec-hdr mb16"><div class="tabs" style="margin:0">${tabHtml}</div><button class="btn btn-pri btn-sm" onclick="showNewCampaignForm()">+ New Campaign</button></div>
    <div style="display:flex;flex-direction:column;gap:16px">${campaignRows}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// Request Card
// ═══════════════════════════════════════════════════════════
function renderRequestCard(c, clientMap) {
  let tal=[], suppression=[], customQ=[], geo=[], industries=[], titles=[], sizes=[];
  try { tal=JSON.parse(c.tal||'[]'); } catch {}
  try { suppression=JSON.parse(c.suppression_list||'[]'); } catch {}
  try { customQ=JSON.parse(c.custom_questions||'[]'); } catch {}
  try { geo=JSON.parse(c.geo||'[]'); } catch {}
  try { industries=JSON.parse(c.industries||'[]'); } catch {}
  try { titles=JSON.parse(c.titles||'[]'); } catch {}
  try { sizes=JSON.parse(c.company_sizes||'[]'); } catch {}

  const bc = c.brand_color||'#2563eb', bs = c.brand_color_secondary||'#1e40af', ba = c.brand_accent||'#3b82f6';
  const budget = (c.target||0)*(c.cpl||0);

  return `<div class="card rq-card" style="padding:0;overflow:hidden">
    <div class="rq-header" style="background:linear-gradient(135deg,${bc},${bs})">
      ${c.logo_url ? `<img src="${c.logo_url}" class="rq-logo"/>` : ''}
      <div class="rq-header-text">
        <div class="rq-name">${c.name}</div>
        <div class="rq-client">${clientMap[c.client_id]||'Unknown Client'}</div>
      </div>
      <span class="rq-badge">Pending Review</span>
    </div>
    <div style="padding:20px">
      <div class="rq-metrics">
        <div class="rq-metric"><div class="rq-metric-val">${(c.target||0).toLocaleString()}</div><div class="rq-metric-label">Target Leads</div></div>
        <div class="rq-metric"><div class="rq-metric-val">$${c.cpl}</div><div class="rq-metric-label">Cost per Lead</div></div>
        <div class="rq-metric"><div class="rq-metric-val">$${budget.toLocaleString()}</div><div class="rq-metric-label">Total Budget</div></div>
        <div class="rq-metric"><div class="rq-metric-val">${fmtDate(c.start_date)}</div><div class="rq-metric-label">Start → ${fmtDate(c.end_date)}</div></div>
      </div>
      <div class="rq-details">
        <div class="rq-col">
          <div class="rq-section"><div class="rq-section-icon">📄</div><div><div class="request-label">Asset</div><div class="fw6 fs13">${c.asset_name||'—'}</div>${c.asset_url?`<a href="${c.asset_url}" target="_blank" class="fs12" style="color:${ba}">View Asset ↗</a>`:''}</div></div>
          <div class="rq-section"><div class="rq-section-icon">🎯</div><div><div class="request-label">Target Titles</div><div class="tag-list">${titles.map(t=>`<span class="tag">${t}</span>`).join('')}</div></div></div>
          <div class="rq-section"><div class="rq-section-icon">🏢</div><div><div class="request-label">Industries</div><div class="tag-list">${industries.map(i=>`<span class="tag">${i}</span>`).join('')}</div></div></div>
          <div class="rq-section"><div class="rq-section-icon">📏</div><div><div class="request-label">Company Size</div><div class="tag-list">${sizes.map(s=>`<span class="tag">${s}</span>`).join('')}</div></div></div>
        </div>
        <div class="rq-col">
          <div class="rq-section"><div class="rq-section-icon">🌍</div><div><div class="request-label">Geographies</div><div class="tag-list">${geo.map(g=>`<span class="tag">${g}</span>`).join('')}</div></div></div>
          <div class="rq-section"><div class="rq-section-icon">📋</div><div><div class="request-label">TAL (${tal.length})</div><div class="fs12" style="color:var(--t3)">${tal.slice(0,8).join(', ')}${tal.length>8?` <span style="color:${ba}">+${tal.length-8} more</span>`:''}</div></div></div>
          <div class="rq-section"><div class="rq-section-icon">🚫</div><div><div class="request-label">Suppression (${suppression.length})</div><div class="fs12" style="color:var(--t3)">${suppression.length?suppression.join(', '):'None'}</div></div></div>
          <div class="rq-section"><div class="rq-section-icon">🎨</div><div><div class="request-label">Branding</div><div style="display:flex;gap:6px;align-items:center"><div class="rq-color-swatch" style="background:${bc}"></div><div class="rq-color-swatch" style="background:${bs}"></div><div class="rq-color-swatch" style="background:${ba}"></div>${c.logo_url?`<span class="fs11" style="color:var(--t3);margin-left:4px">+ Logo</span>`:''}</div></div></div>
        </div>
      </div>
      ${customQ.length?`<div class="rq-questions"><div class="request-label" style="margin-bottom:8px">Custom Qualifying Questions</div>${customQ.map((q,i)=>`<div class="rq-question"><span class="rq-q-num" style="background:${ba}22;color:${ba}">${i+1}</span><span class="fs13">${q.question}</span></div>`).join('')}</div>`:''}
      ${c.notes?`<div class="rq-notes"><div class="request-label">Client Notes</div><div class="fs13" style="color:var(--t3);line-height:1.5;margin-top:4px">${c.notes}</div></div>`:''}
      <div class="rq-actions">
        <button class="btn btn-pri btn-sm" onclick="deployLandingPage(${c.id})" style="flex:1">🚀 Deploy Landing Page</button>
        <button class="btn btn-ghost btn-sm" onclick="editCampaignRequest(${c.id})">Edit</button>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// Campaign Detail View — compact, no dead space
// ═══════════════════════════════════════════════════════════
async function renderCampaignDetail(campaignId) {
  const [cRes, clRes, pRes] = await Promise.all([API.getCampaign(campaignId), API.getClients(), API.getPages()]);
  if (!cRes.success) return `<div class="card" style="padding:40px;text-align:center;color:var(--t3)">Campaign not found</div>`;

  const c = cRes.data;
  const clients = clRes.success ? clRes.data : [];
  const clientMap = Object.fromEntries(clients.map(cl => [cl.id, cl.name]));
  const pages = (pRes.success ? pRes.data : []).filter(p => p.campaign_id === c.id);

  let tal=[], suppression=[], customQ=[], geo=[], industries=[], titles=[], sizes=[];
  try { tal=JSON.parse(c.tal||'[]'); } catch {}
  try { suppression=JSON.parse(c.suppression_list||'[]'); } catch {}
  try { customQ=JSON.parse(c.custom_questions||'[]'); } catch {}
  try { geo=JSON.parse(c.geo||'[]'); } catch {}
  try { industries=JSON.parse(c.industries||'[]'); } catch {}
  try { titles=JSON.parse(c.titles||'[]'); } catch {}
  try { sizes=JSON.parse(c.company_sizes||'[]'); } catch {}

  const bc = c.brand_color||'#2563eb', bs = c.brand_color_secondary||'#1e40af', ba = c.brand_accent||'#3b82f6';
  const pct = Math.min(100, Math.round(((c.delivered||0) / Math.max(c.target, 1)) * 100));
  const budget = (c.target||0)*(c.cpl||0);
  const revenue = (c.delivered||0)*(c.cpl||0);

  const pagesHtml = pages.length ? pages.map(p => {
    const conv = p.submissions && p.views ? Math.round(p.submissions/p.views*100) : 0;
    const url = `https://boss-api.mehtahouse.cc/lp/${p.slug}`;
    return `<div class="cd-lp"><div style="flex:1"><div class="fw7 fs13">${p.name}</div><div class="fs11" style="color:var(--t3)">/${p.slug}</div></div>
      <span class="fs12 fw7">${p.views||0} views</span><span class="fs12 fw7 clr-grn">${p.submissions||0} subs</span><span class="fs12 fw7 clr-acc">${conv}%</span>
      <a href="${url}" target="_blank" class="btn btn-pri btn-sm">View Page ↗</a></div>`;
  }).join('') : `<div style="padding:16px;text-align:center;color:var(--t3)" class="fs12">No landing pages yet.${c.status==='draft'?` <button class="btn btn-pri btn-sm" style="margin-top:8px" onclick="deployLandingPage(${c.id})">🚀 Deploy</button>`:''}</div>`;

  // Build tag HTML helper
  const tagHtml = (arr) => arr.length ? arr.map(t=>`<span class="tag">${t}</span>`).join('') : '<span class="fs12" style="color:var(--t3)">—</span>';

  return `<div class="fade">
    <button class="btn btn-ghost btn-sm mb16" onclick="State.viewingCampaign=null;renderModule('campaigns')">← Back</button>

    <!-- Header -->
    <div class="cd-hdr" style="background:linear-gradient(135deg,${bc},${bs})">
      <div style="display:flex;align-items:center;gap:14px">
        ${c.logo_url ? `<img src="${c.logo_url}" class="cd-logo"/>` : ''}
        <div><div class="cd-title">${c.name}</div><div class="cd-sub">${clientMap[c.client_id]||'—'}</div></div>
      </div>
      ${statusBadge(c.status)}
    </div>

    <!-- Stats strip -->
    <div class="cd-stats">
      <div class="cd-stat"><div class="cd-stat-v">${(c.target||0).toLocaleString()}</div><div class="cd-stat-l">Target</div></div>
      <div class="cd-stat"><div class="cd-stat-v clr-grn">${(c.delivered||0).toLocaleString()}</div><div class="cd-stat-l">Delivered</div></div>
      <div class="cd-stat"><div class="cd-stat-v">${pct}%</div><div class="cd-stat-l">Complete</div></div>
      <div class="cd-stat"><div class="cd-stat-v clr-grn">$${c.cpl}</div><div class="cd-stat-l">CPL</div></div>
      <div class="cd-stat"><div class="cd-stat-v">$${budget.toLocaleString()}</div><div class="cd-stat-l">Budget</div></div>
      <div class="cd-stat"><div class="cd-stat-v clr-grn">$${revenue.toLocaleString()}</div><div class="cd-stat-l">Revenue</div></div>
      <div class="cd-stat"><div class="cd-stat-v ${c.acceptance_rate>=90?'clr-grn':c.acceptance_rate>=75?'clr-yel':'clr-red'}">${c.acceptance_rate||0}%</div><div class="cd-stat-l">Acceptance</div></div>
    </div>

    <!-- Progress -->
    <div style="height:6px;background:var(--bg3);border-radius:3px;margin-bottom:20px"><div style="height:100%;width:${pct}%;background:${ba};border-radius:3px;transition:width 0.3s"></div></div>

    <div class="cd-grid">
      <!-- Scope -->
      <div class="card">
        <div class="sec-title mb12">Campaign Scope</div>
        <div class="cd-scope">
          <div class="cd-row"><span class="cd-label">Asset</span><span class="fw6">${c.asset_name||'—'} ${c.asset_url?`<a href="${c.asset_url}" target="_blank" class="fs12" style="color:${ba}">↗</a>`:''}</span></div>
          <div class="cd-row"><span class="cd-label">Period</span><span>${fmtDate(c.start_date)} → ${fmtDate(c.end_date)}</span></div>
          <div class="cd-row"><span class="cd-label">Titles</span><div class="tag-list">${tagHtml(titles)}</div></div>
          <div class="cd-row"><span class="cd-label">Industries</span><div class="tag-list">${tagHtml(industries)}</div></div>
          <div class="cd-row"><span class="cd-label">Company Size</span><div class="tag-list">${tagHtml(sizes)}</div></div>
          <div class="cd-row"><span class="cd-label">Geo</span><div class="tag-list">${tagHtml(geo)}</div></div>
          <div class="cd-row"><span class="cd-label">TAL (${tal.length})</span><span class="fs12" style="color:var(--t3)">${tal.length?tal.slice(0,10).join(', ')+(tal.length>10?` +${tal.length-10} more`:''):'—'}</span></div>
          <div class="cd-row"><span class="cd-label">Suppression</span><span class="fs12" style="color:var(--t3)">${suppression.length?suppression.join(', '):'None'}</span></div>
          ${customQ.length?`<div class="cd-row"><span class="cd-label">Questions</span><div>${customQ.map((q,i)=>`<div class="fs13">${i+1}. ${q.question}</div>`).join('')}</div></div>`:''}
          ${c.notes?`<div class="cd-row"><span class="cd-label">Notes</span><span class="fs13" style="color:var(--t3)">${c.notes}</span></div>`:''}
        </div>
      </div>

      <!-- Landing Pages -->
      <div class="card">
        <div class="sec-title mb12">Landing Pages</div>
        ${pagesHtml}
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// Deploy Landing Page — with styled modal
// ═══════════════════════════════════════════════════════════
async function deployLandingPage(campaignId) {
  const res = await API.getCampaign(campaignId);
  if (!res.success) { showDeployModal(false, '', 'Error loading campaign'); return; }
  const c = res.data;

  let customQ = [];
  try { customQ = JSON.parse(c.custom_questions || '[]'); } catch {}
  const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const pageData = {
    campaign_id: c.id, client_id: c.client_id,
    name: c.name + ' Landing Page', slug,
    headline: c.asset_name ? `Download: ${c.asset_name}` : 'Download Your Free Resource',
    subheadline: 'Fill out the form below to get instant access to this exclusive resource.',
    cta_text: 'Download Now', status: 'active', custom_questions: customQ,
    brand_color: c.brand_color||'#2563eb', brand_color_secondary: c.brand_color_secondary||'#1e40af',
    brand_accent: c.brand_accent||'#3b82f6', logo_url: c.logo_url||null,
    asset_url: c.asset_url||null, asset_name: c.asset_name||null,
  };

  const createRes = await API.createPage(pageData);
  const liveUrl = `https://boss-api.mehtahouse.cc/lp/${slug}`;

  if (!createRes.success) {
    showDeployModal(false, liveUrl, createRes.error || 'Unknown error');
    return;
  }

  await API.updateCampaign(campaignId, { status: 'active' });
  State.campaignsTab = 'active';
  State.viewingCampaign = campaignId;
  renderModule('campaigns');
  refreshBadges();
  showDeployModal(true, liveUrl, c.name);
}

function showDeployModal(success, url, detail) {
  const existing = document.getElementById('deploy-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'deploy-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `<div class="modal-box">
    <div style="font-size:48px;margin-bottom:12px">${success ? '🎉' : '❌'}</div>
    <div class="fw7" style="font-size:18px;margin-bottom:4px">${success ? 'Landing Page Deployed!' : 'Deployment Failed'}</div>
    <div class="fs13" style="color:var(--t3);margin-bottom:20px">${success ? detail : detail}</div>
    ${success ? `<a href="${url}" target="_blank" class="btn btn-pri" style="width:100%;justify-content:center;margin-bottom:8px">🔗 View Live Page ↗</a>
    <div class="fs11" style="color:var(--t3);word-break:break-all">${url}</div>` : ''}
    <button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="this.closest('.modal-overlay').remove()">Close</button>
  </div>`;

  document.body.appendChild(overlay);
}

function viewCampaign(id) { State.viewingCampaign = id; renderModule('campaigns'); }
function editCampaignRequest(id) { alert('Campaign edit form — coming soon'); }
function showNewCampaignForm() { alert('New campaign form — coming soon'); }

window.setCampaignsTab     = setCampaignsTab;
window.renderCampaigns     = renderCampaigns;
window.viewCampaign        = viewCampaign;
window.deployLandingPage   = deployLandingPage;
window.editCampaignRequest = editCampaignRequest;
window.showNewCampaignForm = showNewCampaignForm;
window.showDeployModal     = showDeployModal;

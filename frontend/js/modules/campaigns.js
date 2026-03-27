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
      `<div class="card" style="text-align:center;padding:60px;color:var(--text-tertiary)">
        <div style="font-size:40px;margin-bottom:12px">📭</div>
        <div class="fw5" style="margin-bottom:4px">No pending campaign requests</div>
        <div class="fs12">When a client submits a campaign request, it will appear here for your review.</div>
      </div>`;
    return `<div class="fade">
      <div class="g4 mb20">
        ${kpi('Active Campaigns', String(totalActive), null, '', '📋', 'var(--blue-600)')}
        ${kpi('Pending Requests', String(totalRequests), null, 'awaiting review', '📨', 'var(--amber-600)')}
        ${kpi('Avg Acceptance', avgAcceptance+'%', null, 'across all campaigns', '✓', 'var(--blue-600)')}
        ${kpi('Pipeline Value', '$'+totalValue.toLocaleString(), null, 'delivered × CPL', '💰', 'var(--amber-600)')}
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
      <div class="cmp-card-accent" style="background:var(--blue-600)"></div>
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
            <div class="cmp-card-progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="cmp-card-pct">${pct}%</span>
        </div>
      </div>
    </div>`;
  }).join('')
  : `<div class="card" style="text-align:center;padding:40px;color:var(--text-tertiary)">No ${State.campaignsTab === 'all' ? '' : State.campaignsTab + ' '}campaigns yet.</div>`;

  return `<div class="fade">
    <div class="g4 mb20">
      ${kpi('Active Campaigns', String(totalActive), null, '', '📋', 'var(--blue-600)')}
      ${kpi('Pending Requests', String(totalRequests), null, 'awaiting review', '📨', 'var(--amber-600)')}
      ${kpi('Avg Acceptance', avgAcceptance+'%', null, 'across all campaigns', '✓', 'var(--blue-600)')}
      ${kpi('Pipeline Value', '$'+totalValue.toLocaleString(), null, 'delivered × CPL', '💰', 'var(--amber-600)')}
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
    <div class="rq-header" style="background:var(--blue-600)">
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
          <div class="rq-section"><div class="rq-section-icon">📄</div><div><div class="request-label">Asset</div><div class="fw5 fs13">${c.asset_name||'—'}</div>${c.asset_url?`<a href="${c.asset_url}" target="_blank" class="fs12" style="color:var(--blue-600)">View Asset ↗</a>`:''}</div></div>
          <div class="rq-section"><div class="rq-section-icon">🎯</div><div><div class="request-label">Target Titles</div><div class="tag-list">${titles.map(t=>`<span class="tag">${t}</span>`).join('')}</div></div></div>
          <div class="rq-section"><div class="rq-section-icon">🏢</div><div><div class="request-label">Industries</div><div class="tag-list">${industries.map(i=>`<span class="tag">${i}</span>`).join('')}</div></div></div>
          <div class="rq-section"><div class="rq-section-icon">📏</div><div><div class="request-label">Company Size</div><div class="tag-list">${sizes.map(s=>`<span class="tag">${s}</span>`).join('')}</div></div></div>
        </div>
        <div class="rq-col">
          <div class="rq-section"><div class="rq-section-icon">🌍</div><div><div class="request-label">Geographies</div><div class="tag-list">${geo.map(g=>`<span class="tag">${g}</span>`).join('')}</div></div></div>
          <div class="rq-section"><div class="rq-section-icon">📋</div><div><div class="request-label">TAL (${tal.length})</div><div class="fs12" style="color:var(--text-tertiary)">${tal.slice(0,8).join(', ')}${tal.length>8?` <span style="color:var(--blue-600)">+${tal.length-8} more</span>`:''}</div></div></div>
          <div class="rq-section"><div class="rq-section-icon">🚫</div><div><div class="request-label">Suppression (${suppression.length})</div><div class="fs12" style="color:var(--text-tertiary)">${suppression.length?suppression.join(', '):'None'}</div></div></div>
          <div class="rq-section"><div class="rq-section-icon">🎨</div><div><div class="request-label">Branding</div><div style="display:flex;gap:6px;align-items:center"><div class="rq-color-swatch" style="background:${bc}"></div><div class="rq-color-swatch" style="background:${bs}"></div><div class="rq-color-swatch" style="background:${ba}"></div>${c.logo_url?`<span class="fs11" style="color:var(--text-tertiary);margin-left:4px">+ Logo</span>`:''}</div></div></div>
        </div>
      </div>
      ${customQ.length?`<div class="rq-questions"><div class="request-label" style="margin-bottom:8px">Custom Qualifying Questions</div>${customQ.map((q,i)=>`<div class="rq-question"><span class="rq-q-num" style="background:var(--blue-100);color:var(--blue-600)">${i+1}</span><span class="fs13">${q.question}</span></div>`).join('')}</div>`:''}
      ${c.notes?`<div class="rq-notes"><div class="request-label">Client Notes</div><div class="fs13" style="color:var(--text-tertiary);line-height:1.5;margin-top:4px">${c.notes}</div></div>`:''}
      <div class="rq-actions">
        <button class="btn btn-pri btn-sm" onclick="deployLandingPage(${c.id})" style="flex:1">🚀 Deploy Landing Page</button>
        <button class="btn btn-ghost btn-sm" onclick="editCampaignRequest(${c.id})">Edit</button>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// Campaign Detail View — compact with metrics box
// ═══════════════════════════════════════════════════════════
async function renderCampaignDetail(campaignId) {
  const [cRes, clRes, pRes, invRes] = await Promise.all([API.getCampaign(campaignId), API.getClients(), API.getPages(), API.getInvoicePreview(campaignId)]);
  if (!cRes.success) return `<div class="card" style="padding:40px;text-align:center;color:var(--text-tertiary)">Campaign not found</div>`;

  const c = cRes.data;
  const clients = clRes.success ? clRes.data : [];
  const clientMap = Object.fromEntries(clients.map(cl => [cl.id, cl.name]));
  const pages = (pRes.success ? pRes.data : []).filter(p => p.campaign_id === c.id);
  const inv   = invRes.success ? invRes.data : null;

  let tal=[], suppression=[], customQ=[], geo=[], industries=[], titles=[], sizes=[], coRevenue=[];
  try { tal=JSON.parse(c.tal||'[]'); } catch {}
  try { suppression=JSON.parse(c.suppression_list||'[]'); } catch {}
  try { customQ=JSON.parse(c.custom_questions||'[]'); } catch {}
  try { geo=JSON.parse(c.geo||'[]'); } catch {}
  try { industries=JSON.parse(c.industries||'[]'); } catch {}
  try { titles=JSON.parse(c.titles||'[]'); } catch {}
  try { sizes=JSON.parse(c.company_sizes||'[]'); } catch {}
  try { coRevenue=JSON.parse(c.company_revenue||'[]'); } catch {}

  // Store TAL for modal access
  window._talCache = window._talCache || {};
  window._talCache[c.id] = tal;

  const bc = c.brand_color||'#2563eb', bs = c.brand_color_secondary||'#1e40af', ba = c.brand_accent||'#3b82f6';
  const pct = Math.min(100, Math.round(((c.delivered||0) / Math.max(c.target, 1)) * 100));
  const budget = (c.target||0)*(c.cpl||0);

  const tagHtml = (arr) => arr.length ? arr.map(t=>`<span class="tag">${t}</span>`).join('') : '<span class="fs12" style="color:var(--text-tertiary)">—</span>';

  const pagesHtml = pages.length ? pages.map(p => {
    const conv = p.submissions && p.views ? Math.round(p.submissions/p.views*100) : 0;
    const url = `https://boss-api.mehtahouse.cc/lp/${p.slug}`;
    return `<div class="cd-lp">
      <div style="flex:1"><div class="fw5 fs13">${p.name}</div><div class="fs11" style="color:var(--text-tertiary)">/${p.slug}</div></div>
      <span class="fs12 fw5">${p.views||0} views</span>
      <span class="fs12 fw5 clr-grn">${p.submissions||0} subs</span>
      <span class="fs12 fw5 clr-acc">${conv}%</span>
      <a href="${url}" target="_blank" class="btn btn-pri btn-sm">View ↗</a>
    </div>`;
  }).join('')
  : `<div style="padding:10px 0;color:var(--text-tertiary)" class="fs12 ta-c">No landing pages yet.${c.status==='draft'?` <button class="btn btn-pri btn-sm" style="margin-left:8px" onclick="deployLandingPage(${c.id})">🚀 Deploy</button>`:''}</div>`;

  return `<div class="fade">
    <button class="btn btn-ghost btn-sm mb12" onclick="State.viewingCampaign=null;renderModule('campaigns')">← Campaigns</button>

    <!-- Header -->
    <div class="cd-hdr" style="background:var(--blue-600)">
      <div style="display:flex;align-items:center;gap:12px">
        ${c.logo_url ? `<img src="${c.logo_url}" class="cd-logo"/>` : ''}
        <div><div class="cd-title">${c.name}</div><div class="cd-sub">${clientMap[c.client_id]||'—'}</div></div>
      </div>
      ${statusBadge(c.status)}
    </div>

    <!-- Key metrics box -->
    <div class="cd-metrics-box">
      <div class="cd-metric">
        <div class="cd-metric-v">${(c.target||0).toLocaleString()}</div>
        <div class="cd-metric-l">Target Leads</div>
      </div>
      <div class="cd-metric">
        <div class="cd-metric-v" style="color:var(--blue-600)">$${c.cpl}</div>
        <div class="cd-metric-l">Cost per Lead</div>
      </div>
      <div class="cd-metric">
        <div class="cd-metric-v">$${budget.toLocaleString()}</div>
        <div class="cd-metric-l">Total Budget</div>
      </div>
      <div class="cd-metric" style="border-right:none">
        <div class="cd-metric-v" style="font-size:15px">${fmtDate(c.start_date)}</div>
        <div class="cd-metric-l">Start → ${fmtDate(c.end_date)}</div>
      </div>
    </div>

    ${c.status==='active'?`<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <div style="flex:1;height:5px;background:var(--bg-muted);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:var(--blue-600);border-radius:3px;transition:width 0.3s"></div>
      </div>
      <span class="fs11 fw5" style="color:var(--text-tertiary);width:32px;text-align:right">${pct}%</span>
    </div>`:''}

    <!-- All details in one card -->
    <div class="card cd-detail-card">

      <!-- Two-column scope grid -->
      <div class="cd-scope-grid">
        <div>
          <div class="cd-row"><span class="cd-label">Asset</span><span class="fw5 fs13">${c.asset_name||'—'}${c.asset_url?` <a href="${c.asset_url}" target="_blank" style="color:var(--blue-600)" class="fs12">↗</a>`:''}</span></div>
          <div class="cd-row"><span class="cd-label">Titles</span><div class="tag-list">${tagHtml(titles)}</div></div>
          <div class="cd-row"><span class="cd-label">Industries</span><div class="tag-list">${tagHtml(industries)}</div></div>
          <div class="cd-row"><span class="cd-label">Coy Size</span><div class="tag-list">${tagHtml(sizes)}</div></div>
          ${coRevenue.length?`<div class="cd-row"><span class="cd-label">Revenue</span><div class="tag-list">${tagHtml(coRevenue)}</div></div>`:''}
        </div>
        <div>
          <div class="cd-row"><span class="cd-label">Geo</span><div class="tag-list">${tagHtml(geo)}</div></div>
          <div class="cd-row"><span class="cd-label">TAL</span>
            ${tal.length
              ? `<button class="btn btn-ghost btn-sm fs12" onclick="showTALModal(${c.id})" style="padding:3px 10px">View TAL — ${tal.length} companies →</button>`
              : '<span class="fs12" style="color:var(--text-tertiary)">—</span>'}
          </div>
          <div class="cd-row"><span class="cd-label">Suppression</span><span class="fs12" style="color:var(--text-tertiary)">${suppression.length?suppression.join(', '):'None'}</span></div>
          <div class="cd-row" style="border:none"><span class="cd-label">Branding</span>
            <div style="display:flex;gap:5px;align-items:center">
              <div class="rq-color-swatch" style="background:${bc}"></div>
              <div class="rq-color-swatch" style="background:${bs}"></div>
              <div class="rq-color-swatch" style="background:${ba}"></div>
              ${c.logo_url?`<span class="fs11" style="color:var(--text-tertiary);margin-left:4px">+ Logo</span>`:''}
            </div>
          </div>
        </div>
      </div>

      ${customQ.length?`<div class="cd-subsection">
        <div class="cd-sub-label">Custom Qualifying Questions</div>
        ${customQ.map((q,i)=>`<div class="rq-question"><span class="rq-q-num" style="background:var(--blue-100);color:var(--blue-600)">${i+1}</span><span class="fs13">${q.question}</span></div>`).join('')}
      </div>`:''}

      ${c.notes?`<div class="cd-subsection" style="border-bottom:none">
        <div class="cd-sub-label">Client Notes</div>
        <div class="fs13" style="color:var(--text-tertiary);line-height:1.5;margin-top:4px">${c.notes}</div>
      </div>`:''}

      <div class="cd-subsection" style="${!customQ.length&&!c.notes?'border-top:none':''}">
        <div class="cd-sub-label">Landing Pages</div>
        ${pagesHtml}
      </div>

      ${inv ? (() => {
        const hasInvoice  = !!inv.due_date;
        const canGenerate = !hasInvoice && inv.billable_count > 0;
        const overdueBadge = inv.overdue ? `<span class="badge badge-red" style="margin-left:8px">Overdue</span>` : '';
        return `<div class="cd-subsection">
          <div class="cd-sub-label" style="display:flex;align-items:center;gap:8px">Invoice &amp; Billing${inv.overdue?overdueBadge:''}</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px">
            <div style="text-align:center">
              <div class="fs18 fw5">${inv.accepted_count}</div>
              <div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Accepted</div>
            </div>
            <div style="text-align:center">
              <div class="fs18 fw5 clr-grn">${inv.billable_count}</div>
              <div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Billable</div>
            </div>
            <div style="text-align:center">
              <div class="fs18 fw5" style="color:var(--text-tertiary)">${inv.non_billable_count}</div>
              <div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Non-billable</div>
            </div>
            <div style="text-align:center">
              <div class="fs18 fw5 clr-grn">$${(inv.total_amount||0).toLocaleString()}</div>
              <div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Invoice Total</div>
            </div>
          </div>
          ${hasInvoice ? `<div class="fs12" style="color:var(--text-tertiary);margin-bottom:12px">Due: <strong style="color:${inv.overdue?'var(--red-600)':'var(--text-primary)'}">${fmtDate(inv.due_date)}</strong></div>` : ''}
          <div style="display:flex;gap:8px">
            ${canGenerate ? `<button class="btn btn-pri btn-sm" onclick="generateInvoiceForCampaign(${c.id})">Generate Invoice</button>` : ''}
            ${hasInvoice && c.status !== 'completed' ? `<button class="btn btn-pri btn-sm" onclick="completeCampaignAction(${c.id})">Complete Campaign</button>` : ''}
            ${!canGenerate && !hasInvoice ? `<span class="fs12" style="color:var(--text-tertiary)">No accepted billable leads yet.</span>` : ''}
            ${c.status === 'completed' ? `<span class="badge badge-green">Campaign Completed</span>` : ''}
          </div>
        </div>`;
      })() : ''}

    </div>

    ${c.status==='draft'?`<div class="rq-actions" style="margin-top:12px">
      <button class="btn btn-pri btn-sm" onclick="deployLandingPage(${c.id})" style="flex:1">🚀 Deploy Landing Page</button>
      <button class="btn btn-ghost btn-sm" onclick="editCampaignRequest(${c.id})">Edit</button>
    </div>`:''}
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// Deploy Landing Page — with styled modal
// ═══════════════════════════════════════════════════════════
async function deployLandingPage(campaignId) {
  const res = await API.getCampaign(campaignId);
  if (!res.success) { showToast('Error loading campaign', 'error'); return; }
  const c = res.data;

  // Show generating state
  showGeneratingModal(c.asset_name || c.name);

  const genRes = await API.generatePage(campaignId);
  removeGeneratingModal();

  if (!genRes.success) {
    showGenerateErrorModal(c, genRes.error || 'Unknown error');
    return;
  }

  showCopyPreviewModal(c, genRes.data);
}

function showGenerateErrorModal(c, errorMsg) {
  const existing = document.getElementById('gen-error-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'gen-error-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `<div class="modal-box" style="max-width:460px;text-align:center">
    <div style="font-size:36px;margin-bottom:12px">⚠️</div>
    <div class="fw5 fs16 mb8">AI Copy Generation Failed</div>
    <div class="fs13 mb12" style="color:var(--text-secondary);line-height:1.5">Claude couldn't generate copy for this campaign. The full error is shown below — use it to diagnose the problem before retrying.</div>
    <div class="fs12 mb20" style="background:var(--bg-muted);border:1px solid var(--border);padding:10px 12px;border-radius:6px;color:var(--red-600);text-align:left;word-break:break-all;line-height:1.6;font-family:monospace">${errorMsg}</div>
    <div style="display:flex;gap:8px;justify-content:center">
      <button class="btn btn-pri btn-sm" onclick="document.getElementById('gen-error-overlay').remove();deployLandingPage(${c.id})">↻ Retry</button>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('gen-error-overlay').remove()">Cancel</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function showGeneratingModal(assetName) {
  const existing = document.getElementById('gen-modal-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'gen-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box" style="text-align:center">
    <div style="font-size:36px;margin-bottom:16px">✍️</div>
    <div class="fw5 fs16 mb8">Writing your landing page…</div>
    <div class="fs13" style="color:var(--text-tertiary);margin-bottom:20px;max-width:300px;margin-left:auto;margin-right:auto">
      Claude is reading <strong style="color:var(--text-primary)">${assetName}</strong> and crafting copy for your target audience.
    </div>
    <div style="display:flex;justify-content:center;gap:6px">
      <div style="width:6px;height:6px;border-radius:50%;background:var(--blue-600);animation:pulse 1.2s ease-in-out infinite"></div>
      <div style="width:6px;height:6px;border-radius:50%;background:var(--blue-600);animation:pulse 1.2s ease-in-out 0.2s infinite"></div>
      <div style="width:6px;height:6px;border-radius:50%;background:var(--blue-600);animation:pulse 1.2s ease-in-out 0.4s infinite"></div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function removeGeneratingModal() {
  document.getElementById('gen-modal-overlay')?.remove();
}

function showCopyPreviewModal(c, copy) {
  const existing = document.getElementById('preview-modal-overlay');
  if (existing) existing.remove();

  const bulletsHtml = (copy.bullets || []).map(b =>
    `<div style="display:flex;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--border)">
      <span style="font-size:18px;flex-shrink:0">${b.icon}</span>
      <div>
        <div class="fw5 fs13">${b.title}</div>
        <div class="fs12" style="color:var(--text-secondary);margin-top:2px;line-height:1.5">${b.body}</div>
      </div>
    </div>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.id = 'preview-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `<div class="modal-box" style="max-width:560px;width:95vw;text-align:left;max-height:90vh;overflow-y:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div>
        <div class="page-overline">AI Generated Copy</div>
        <div class="fw5 fs16">Landing Page Preview</div>
      </div>
      <button class="btn-icon" onclick="document.getElementById('preview-modal-overlay').remove()">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div style="background:var(--bg-muted);border-radius:var(--radius-md);padding:16px 20px;margin-bottom:16px">
      <div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Headline</div>
      <div class="fw5 fs15" style="line-height:1.4">${copy.headline || '—'}</div>
    </div>

    <div style="background:var(--bg-muted);border-radius:var(--radius-md);padding:16px 20px;margin-bottom:16px">
      <div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Subheadline</div>
      <div class="fs13" style="color:var(--text-secondary);line-height:1.5">${copy.subheadline || '—'}</div>
    </div>

    ${copy.hook ? `<div style="background:var(--bg-muted);border-radius:var(--radius-md);padding:16px 20px;margin-bottom:16px">
      <div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Hook</div>
      <div class="fs13" style="color:var(--text-secondary);line-height:1.5">${copy.hook}</div>
    </div>` : ''}

    <div style="margin-bottom:16px">
      <div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;padding-left:2px">Benefits</div>
      <div style="border:0.5px solid var(--border);border-radius:var(--radius-md);overflow:hidden;padding:0 16px">
        ${bulletsHtml}
        <div style="padding:10px 0">
          <div class="fw5 fs13">CTA: <span style="color:var(--blue-600)">${copy.cta || 'Download Now'}</span></div>
        </div>
      </div>
    </div>

    ${copy.social_proof ? `<div class="fs12" style="color:var(--text-tertiary);margin-bottom:20px;font-style:italic">"${copy.social_proof}"</div>` : ''}

    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-pri" style="flex:1" onclick="approveCopyAndDeploy(${c.id}, ${c.client_id})">
        Deploy Live Page →
      </button>
      <button class="btn btn-secondary" onclick="regenerateCopy(${c.id})">↻ Regenerate</button>
    </div>
    <div class="fs11" style="color:var(--text-tertiary);text-align:center;margin-top:10px">Review the copy above before going live. You can regenerate if needed.</div>
  </div>`;

  // Stash copy on window so approve can access it
  window._pendingPageCopy = copy;
  document.body.appendChild(overlay);
}

async function approveCopyAndDeploy(campaignId, clientId) {
  const copy = window._pendingPageCopy;
  const cRes = await API.getCampaign(campaignId);
  if (!cRes.success) { showToast('Error loading campaign', 'error'); return; }

  document.getElementById('preview-modal-overlay')?.remove();
  await _deployPageWithCopy(cRes.data, copy);
}

async function regenerateCopy(campaignId) {
  document.getElementById('preview-modal-overlay')?.remove();
  const cRes = await API.getCampaign(campaignId);
  if (!cRes.success) { showToast('Error loading campaign', 'error'); return; }
  showGeneratingModal(cRes.data.asset_name || cRes.data.name);
  const genRes = await API.generatePage(campaignId);
  removeGeneratingModal();
  if (!genRes.success) {
    showToast('Regeneration failed: ' + (genRes.error || 'Unknown'), 'error');
    return;
  }
  showCopyPreviewModal(cRes.data, genRes.data);
}

async function _deployPageWithCopy(c, copy) {
  let customQ = [];
  try { customQ = JSON.parse(c.custom_questions || '[]'); } catch {}
  const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const pageData = {
    campaign_id: c.id, client_id: c.client_id,
    name: c.name + ' Landing Page', slug,
    headline: copy?.headline || (c.asset_name ? `Download: ${c.asset_name}` : 'Download Your Free Resource'),
    subheadline: copy?.subheadline || 'Fill out the form to get instant access.',
    cta_text: copy?.cta || 'Download Now',
    status: 'active', custom_questions: customQ,
    brand_color: c.brand_color||'#2563eb', brand_color_secondary: c.brand_color_secondary||'#1e40af',
    brand_accent: c.brand_accent||'#3b82f6', logo_url: c.logo_url||null,
    asset_url: c.asset_url||null, asset_name: c.asset_name||null,
    ai_copy: copy || null,
  };

  const createRes = await API.createPage(pageData);
  const liveUrl   = `https://boss-api.mehtahouse.cc/lp/${slug}`;

  if (!createRes.success) {
    showDeployModal(false, liveUrl, createRes.error || 'Unknown error');
    return;
  }

  await API.updateCampaign(c.id, { status: 'active' });
  State.campaignsTab    = 'active';
  State.viewingCampaign = c.id;
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
    <div class="fw5" style="font-size:18px;margin-bottom:4px">${success ? 'Landing Page Deployed!' : 'Deployment Failed'}</div>
    <div class="fs13" style="color:var(--text-tertiary);margin-bottom:20px">${success ? detail : detail}</div>
    ${success ? `<a href="${url}" target="_blank" class="btn btn-pri" style="width:100%;justify-content:center;margin-bottom:8px">🔗 View Live Page ↗</a>
    <div class="fs11" style="color:var(--text-tertiary);word-break:break-all">${url}</div>` : ''}
    <button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="this.closest('.modal-overlay').remove()">Close</button>
  </div>`;

  document.body.appendChild(overlay);
}

function viewCampaign(id) { State.viewingCampaign = id; renderModule('campaigns'); }
async function editCampaignRequest(id) {
  const [cRes, clRes] = await Promise.all([API.getCampaign(id), API.getClients()]);
  if (!cRes.success) { showToast('Could not load campaign', 'error'); return; }
  const c = cRes.data;
  const clients = clRes.success ? clRes.data : [];
  const clientOptions = clients.map(cl =>
    `<option value="${cl.id}" ${cl.id === c.client_id ? 'selected' : ''}>${cl.name}</option>`
  ).join('');

  const existing = document.getElementById('edit-campaign-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'edit-campaign-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `<div class="modal-box" style="width:480px;max-width:95vw">
    <div class="fw5 fs16 mb16">Edit Campaign</div>

    <div class="form-group">
      <label class="form-label">Campaign Name <span style="color:var(--red-600)">*</span></label>
      <input id="ec-name" class="form-input" type="text" value="${c.name || ''}"/>
    </div>
    <div class="form-group">
      <label class="form-label">Client <span style="color:var(--red-600)">*</span></label>
      <select id="ec-client" class="form-input">${clientOptions}</select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Target Leads <span style="color:var(--red-600)">*</span></label>
        <input id="ec-target" class="form-input" type="number" min="1" value="${c.target || ''}"/>
      </div>
      <div class="form-group">
        <label class="form-label">CPL ($) <span style="color:var(--red-600)">*</span></label>
        <input id="ec-cpl" class="form-input" type="number" min="0.01" step="0.01" value="${c.cpl || ''}"/>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Start Date</label>
        <input id="ec-start" class="form-input" type="date" value="${c.start_date || ''}"/>
      </div>
      <div class="form-group">
        <label class="form-label">End Date</label>
        <input id="ec-end" class="form-input" type="date" value="${c.end_date || ''}"/>
      </div>
    </div>
    <div class="form-group" style="margin-bottom:0">
      <label class="form-label">Status</label>
      <select id="ec-status" class="form-input">
        ${['draft','active','paused','completed'].map(s =>
          `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
        ).join('')}
      </select>
    </div>

    <div style="display:flex;gap:8px;margin-top:20px">
      <button id="ec-submit" class="btn btn-pri" style="flex:1" onclick="submitEditCampaign(${id})">Save Changes</button>
      <button class="btn btn-ghost" onclick="document.getElementById('edit-campaign-overlay').remove()">Cancel</button>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  document.getElementById('ec-name').focus();
}

async function submitEditCampaign(id) {
  const name      = document.getElementById('ec-name').value.trim();
  const client_id = parseInt(document.getElementById('ec-client').value);
  const target    = parseInt(document.getElementById('ec-target').value);
  const cpl       = parseFloat(document.getElementById('ec-cpl').value);
  const start_date = document.getElementById('ec-start').value || null;
  const end_date   = document.getElementById('ec-end').value || null;
  const status     = document.getElementById('ec-status').value;
  const submitBtn  = document.getElementById('ec-submit');

  clearAllFieldErrors('ec-name', 'ec-client', 'ec-target', 'ec-cpl');
  let valid = true;
  if (!name)                  { showFieldError('ec-name',   'Campaign name is required'); valid = false; }
  if (!client_id)             { showFieldError('ec-client', 'Please select a client');    valid = false; }
  if (!target || target <= 0) { showFieldError('ec-target', 'Must be greater than 0');    valid = false; }
  if (!cpl    || cpl    <= 0) { showFieldError('ec-cpl',    'Must be greater than 0');    valid = false; }
  if (!valid) return;

  submitBtn.disabled = true; submitBtn.textContent = 'Saving…';

  const res = await API.updateCampaign(id, { name, client_id, target, cpl, start_date, end_date, status });

  if (!res.success) {
    showToast(res.error || 'Failed to save changes', 'error');
    submitBtn.disabled = false; submitBtn.textContent = 'Save Changes';
    return;
  }

  document.getElementById('edit-campaign-overlay').remove();
  showToast('Campaign updated');
  renderModule('campaigns');
}
async function showNewCampaignForm() {
  const existing = document.getElementById('new-campaign-overlay');
  if (existing) existing.remove();

  const clRes = await API.getClients();
  const clients = clRes.success ? clRes.data : [];
  const clientOptions = clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  const overlay = document.createElement('div');
  overlay.id = 'new-campaign-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `<div class="modal-box" style="width:480px;max-width:95vw">
    <div class="fw5 fs16 mb16">New Campaign</div>

    <div class="form-group">
      <label class="form-label">Campaign Name <span style="color:var(--red-600)">*</span></label>
      <input id="nc-name" class="form-input" type="text" placeholder="e.g. DemandScience Q3 ABM"/>
    </div>
    <div class="form-group">
      <label class="form-label">Client <span style="color:var(--red-600)">*</span></label>
      <select id="nc-client" class="form-input">
        <option value="">— Select client —</option>
        ${clientOptions}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Target Leads <span style="color:var(--red-600)">*</span></label>
        <input id="nc-target" class="form-input" type="number" min="1" placeholder="500"/>
      </div>
      <div class="form-group">
        <label class="form-label">CPL ($) <span style="color:var(--red-600)">*</span></label>
        <input id="nc-cpl" class="form-input" type="number" min="0.01" step="0.01" placeholder="45"/>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Start Date</label>
        <input id="nc-start" class="form-input" type="date"/>
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">End Date</label>
        <input id="nc-end" class="form-input" type="date"/>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-top:20px">
      <button id="nc-submit" class="btn btn-pri" style="flex:1" onclick="submitNewCampaign()">Create Campaign</button>
      <button class="btn btn-ghost" onclick="document.getElementById('new-campaign-overlay').remove()">Cancel</button>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  document.getElementById('nc-name').focus();
}

async function submitNewCampaign() {
  const name      = document.getElementById('nc-name').value.trim();
  const client_id = parseInt(document.getElementById('nc-client').value);
  const target    = parseInt(document.getElementById('nc-target').value);
  const cpl       = parseFloat(document.getElementById('nc-cpl').value);
  const start_date = document.getElementById('nc-start').value || null;
  const end_date   = document.getElementById('nc-end').value || null;
  const submitBtn  = document.getElementById('nc-submit');

  clearAllFieldErrors('nc-name', 'nc-client', 'nc-target', 'nc-cpl');
  let valid = true;
  if (!name)                  { showFieldError('nc-name',   'Campaign name is required'); valid = false; }
  if (!client_id)             { showFieldError('nc-client', 'Please select a client');    valid = false; }
  if (!target || target <= 0) { showFieldError('nc-target', 'Must be greater than 0');    valid = false; }
  if (!cpl    || cpl    <= 0) { showFieldError('nc-cpl',    'Must be greater than 0');    valid = false; }
  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating…';

  const res = await API.createCampaign({ name, client_id, target, cpl, start_date, end_date, status: 'draft' });

  if (!res.success) {
    showToast(res.error || 'Failed to create campaign', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Campaign';
    return;
  }

  document.getElementById('new-campaign-overlay').remove();
  State.campaignsTab = 'draft';
  State.viewingCampaign = null;
  renderModule('campaigns');
  refreshBadges();
  showToast('Campaign created');
}

async function generateInvoiceForCampaign(id) {
  const btn = event.target;
  btn.disabled = true; btn.textContent = 'Generating…';
  const res = await API.generateInvoice(id);
  if (res.success) {
    showToast('Invoice generated');
    renderModule('campaigns');
  } else {
    btn.disabled = false; btn.textContent = 'Generate Invoice';
    showToast(res.error || 'Failed to generate invoice', 'error');
  }
}

async function completeCampaignAction(id) {
  const btn = event.target;
  btn.disabled = true; btn.textContent = 'Completing…';
  const res = await API.completeCampaign(id);
  if (res.success) {
    showToast('Campaign completed');
    renderModule('campaigns');
  } else {
    btn.disabled = false; btn.textContent = 'Complete Campaign';
    showToast(res.error || 'Failed to complete campaign', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// TAL Modal — full target account list
// ═══════════════════════════════════════════════════════════
function showTALModal(campaignId) {
  const tal = (window._talCache || {})[campaignId] || [];
  const existing = document.getElementById('tal-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'tal-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `<div class="modal-box tal-modal-box">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="fw5 fs16">Target Account List</div>
      <span class="fs13" style="color:var(--text-tertiary)">${tal.length.toLocaleString()} companies</span>
    </div>
    <div class="tal-modal-list">
      ${tal.map(t => `<span class="tag">${t}</span>`).join('')}
    </div>
    <button class="btn btn-ghost btn-sm" style="margin-top:14px;width:100%" onclick="this.closest('.modal-overlay').remove()">Close</button>
  </div>`;

  document.body.appendChild(overlay);
}

window.setCampaignsTab            = setCampaignsTab;
window.renderCampaigns            = renderCampaigns;
window.viewCampaign               = viewCampaign;
window.deployLandingPage          = deployLandingPage;
window.approveCopyAndDeploy       = approveCopyAndDeploy;
window.regenerateCopy             = regenerateCopy;
window.editCampaignRequest        = editCampaignRequest;
window.showNewCampaignForm        = showNewCampaignForm;
window.showDeployModal            = showDeployModal;
window.showTALModal               = showTALModal;
window.submitNewCampaign          = submitNewCampaign;
window.submitEditCampaign         = submitEditCampaign;
window.generateInvoiceForCampaign = generateInvoiceForCampaign;
window.completeCampaignAction     = completeCampaignAction;

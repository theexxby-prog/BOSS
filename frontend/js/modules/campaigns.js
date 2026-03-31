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
              ? `<img src="${c.logo_url}" class="cmp-card-logo" onerror="this.style.display='none'"/>`
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
  let tal=[], suppression=[], customQ=[], geo=[], industries=[], titles=[], sizes=[], seqList=[];
  try { tal=JSON.parse(c.tal||'[]'); } catch {}
  try { suppression=JSON.parse(c.suppression_list||'[]'); } catch {}
  try { customQ=JSON.parse(c.custom_questions||'[]'); } catch {}
  try { geo=JSON.parse(c.geo||'[]'); } catch {}
  try { industries=JSON.parse(c.industries||'[]'); } catch {}
  try { titles=JSON.parse(c.titles||'[]'); } catch {}
  try { sizes=JSON.parse(c.company_sizes||'[]'); } catch {}
  try { seqList=JSON.parse(c.email_sequences||'[]'); } catch {}

  // Cache campaign for sequence editor access
  window._campaignCache = window._campaignCache || {};
  window._campaignCache[c.id] = c;

  const bc = c.brand_color||'#2563eb', bs = c.brand_color_secondary||'#1e40af', ba = c.brand_accent||'#3b82f6';
  const budget = (c.target||0)*(c.cpl||0);

  return `<div class="card rq-card" style="padding:0;overflow:hidden">
    <div class="rq-header" style="background:var(--blue-600)">
      ${c.logo_url ? `<img src="${c.logo_url}" class="rq-logo" onerror="this.parentElement.querySelector('.rq-logo-ph')?.style.setProperty('display','flex');this.style.display='none'"/><div class="rq-logo-ph" style="display:none;width:36px;height:36px;border-radius:var(--radius-md);background:rgba(255,255,255,0.2);color:#fff;font-size:13px;font-weight:500;align-items:center;justify-content:center;flex-shrink:0">${(c.name||'C')[0].toUpperCase()}</div>` : ''}
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
      ${customQ.length?`<div class="rq-questions"><div class="request-label" style="margin-bottom:8px">Custom Qualifying Questions</div>${customQ.map((q,i)=>`<div class="rq-question"><span class="rq-q-num" style="background:var(--blue-100);color:var(--blue-600)">${i+1}</span><div><span class="fs13">${q.question}</span>${q.answer?`<div class="fs12" style="color:var(--text-tertiary);margin-top:2px">Expected: ${q.answer}</div>`:''}</div></div>`).join('')}</div>`:''}
      ${c.notes?`<div class="rq-notes"><div class="request-label">Client Notes</div><div class="fs13" style="color:var(--text-tertiary);line-height:1.5;margin-top:4px">${c.notes}</div></div>`:''}
      <!-- Email Sequences inline on request card -->
      <div style="border-top:0.5px solid var(--border);margin-top:16px;padding-top:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="fs11 fw5" style="text-transform:uppercase;letter-spacing:.06em;color:var(--blue-600)">Email Sequences</div>
          <button class="btn btn-ghost btn-sm" onclick="openSequenceEditor(${c.id})">+ Add Persona Track</button>
        </div>
        <div id="seq-list-${c.id}">${renderSequenceList(seqList, c.id)}</div>
      </div>
      <div class="rq-actions" style="margin-top:14px">
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

  let tal=[], suppression=[], customQ=[], geo=[], industries=[], titles=[], sizes=[], coRevenue=[], sequences=[];
  try { tal=JSON.parse(c.tal||'[]'); } catch {}
  try { suppression=JSON.parse(c.suppression_list||'[]'); } catch {}
  try { customQ=JSON.parse(c.custom_questions||'[]'); } catch {}
  try { geo=JSON.parse(c.geo||'[]'); } catch {}
  try { industries=JSON.parse(c.industries||'[]'); } catch {}
  try { titles=JSON.parse(c.titles||'[]'); } catch {}
  try { sizes=JSON.parse(c.company_sizes||'[]'); } catch {}
  try { coRevenue=JSON.parse(c.company_revenue||'[]'); } catch {}
  try { sequences=JSON.parse(c.email_sequences||'[]'); } catch {}

  // Store campaign + TAL for modal access
  window._talCache = window._talCache || {};
  window._talCache[c.id] = tal;
  window._campaignCache = window._campaignCache || {};
  window._campaignCache[c.id] = c;

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
      <a href="${url}" target="_blank" class="btn btn-ghost btn-sm">View ↗</a>
      <button class="btn btn-pri btn-sm" onclick="regeneratePage(${c.id},${p.id},'${p.slug}')">↻ Regen</button>
    </div>`;
  }).join('')
  : `<div style="padding:10px 0;color:var(--text-tertiary)" class="fs12 ta-c">No landing pages yet.${c.status==='draft'?` <button class="btn btn-pri btn-sm" style="margin-left:8px" onclick="deployLandingPage(${c.id})">🚀 Deploy</button>`:''}</div>`;

  return `<div class="fade">
    <button class="btn btn-ghost btn-sm mb12" onclick="State.viewingCampaign=null;renderModule('campaigns')">← Campaigns</button>

    <!-- Header -->
    <div class="cd-hdr" style="background:var(--blue-600)">
      <div style="display:flex;align-items:center;gap:12px">
        ${c.logo_url ? `<img src="${c.logo_url}" class="cd-logo" onerror="this.style.display='none'"/>` : ''}
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
        ${customQ.map((q,i)=>`<div class="rq-question"><span class="rq-q-num" style="background:var(--blue-100);color:var(--blue-600)">${i+1}</span><div><span class="fs13">${q.question}</span>${q.answer?`<div class="fs12" style="color:var(--text-tertiary);margin-top:2px">Expected: ${q.answer}</div>`:''}</div></div>`).join('')}
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

    <!-- Email Sequences -->
    <div class="card" style="margin-top:12px;padding:0;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div class="fs11 fw5" style="text-transform:uppercase;letter-spacing:.06em;color:var(--blue-600);margin-bottom:2px">Instantly Integration</div>
          <div class="fw5 fs14">Email Sequences</div>
        </div>
        <button class="btn btn-pri btn-sm" onclick="openSequenceEditor(${c.id})">+ Add Persona Track</button>
      </div>
      <div id="seq-list-${c.id}" style="padding:4px 0">
        ${renderSequenceList(sequences, c.id)}
      </div>
    </div>

    <!-- Lead Sourcing -->
    <div class="card" style="margin-top:12px;padding:0;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div class="fs11 fw5" style="text-transform:uppercase;letter-spacing:.06em;color:var(--blue-600);margin-bottom:2px">Lead Sourcing</div>
          <div class="fw5 fs14">Source Leads for this Campaign</div>
        </div>
        <button class="btn btn-pri btn-sm" onclick="openSourcingPanel(${c.id})">Source Leads</button>
      </div>
      <div id="sourcing-summary-${c.id}" style="padding:16px 20px">
        <div class="fs12" style="color:var(--text-tertiary)">Loading sourcing status…</div>
      </div>
    </div>

    ${c.status==='draft'?`<div class="rq-actions" style="margin-top:12px">
      <button class="btn btn-pri btn-sm" onclick="deployLandingPage(${c.id})" style="flex:1">🚀 Deploy Landing Page</button>
      <button class="btn btn-ghost btn-sm" onclick="editCampaignRequest(${c.id})">Edit</button>
    </div>`:''}
  </div>`;
  // Load sourcing summary async after render
  setTimeout(() => loadSourcingSummary(c.id), 0);
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

  const bc = c.brand_color || '#2563eb';
  const checkSvg = `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" style="flex-shrink:0;margin-top:1px"><circle cx="10" cy="10" r="9" stroke="${bc}" stroke-width="1.5"/><polyline points="6,10 9,13 14,7" stroke="${bc}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const bulletsHtml = (copy.bullets || []).map(b =>
    `<div style="display:flex;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--border)">
      ${checkSvg}
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
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px">
        ${c.logo_url ? `<img src="${c.logo_url}" style="height:24px;object-fit:contain;border-radius:4px" onerror="this.style.display='none'"/>` : ''}
        <div>
          <div class="page-overline">AI Generated Copy</div>
          <div class="fw5 fs16">Landing Page Preview</div>
        </div>
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

// Regenerate AI copy for an already-deployed landing page and save it
async function regeneratePage(campaignId, pageId, slug) {
  const cRes = await API.getCampaign(campaignId);
  if (!cRes.success) { showToast('Error loading campaign', 'error'); return; }
  const c = cRes.data;
  showGeneratingModal(c.asset_name || c.name);
  const genRes = await API.generatePage(campaignId);
  removeGeneratingModal();
  if (!genRes.success) {
    showGenerateErrorModal(c, genRes.error || 'Unknown error');
    return;
  }
  // Save new ai_copy directly to the existing page
  const saveRes = await apiFetch(`/api/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify({ ai_copy: JSON.stringify(genRes.data) }) });
  if (!saveRes.success) {
    showToast('Copy regenerated but failed to save: ' + (saveRes.error || ''), 'error');
    return;
  }
  showToast('Page copy regenerated — reload the live page to see changes', 'success');
  renderModule('campaigns');
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
window.regeneratePage             = regeneratePage;
window.editCampaignRequest        = editCampaignRequest;
window.showNewCampaignForm        = showNewCampaignForm;
window.showDeployModal            = showDeployModal;
window.showTALModal               = showTALModal;
window.submitNewCampaign          = submitNewCampaign;
window.submitEditCampaign         = submitEditCampaign;
window.generateInvoiceForCampaign = generateInvoiceForCampaign;
window.completeCampaignAction     = completeCampaignAction;

// ═══════════════════════════════════════════════════════════
// Email Sequence Builder
// ═══════════════════════════════════════════════════════════

// Substitute {{variables}} with sample lead data for preview
function resolveVars(text, lead, assetName) {
  return (text || '')
    .replace(/\{\{first_name\}\}/g, lead.first_name)
    .replace(/\{\{last_name\}\}/g, lead.last_name)
    .replace(/\{\{company\}\}/g, lead.company)
    .replace(/\{\{title\}\}/g, lead.title)
    .replace(/\{\{industry\}\}/g, lead.industry)
    .replace(/\{\{asset_name\}\}/g, assetName || 'our latest report')
    .replace(/\{\{asset_downloaded\}\}/g, assetName || 'the report');
}

function renderSequenceList(sequences, campaignId) {
  if (!sequences.length) {
    return `<div class="fs12" style="color:var(--text-tertiary);padding:4px 0">No persona tracks yet. Add one above to define personalised email sequences by seniority level.</div>`;
  }
  return sequences.map((seq, idx) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid var(--border)">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--blue-100);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="var(--blue-600)" stroke-width="1.5" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <div>
          <div class="fw5 fs13">${seq.name}</div>
          <div class="fs11" style="color:var(--text-tertiary);margin-top:1px">${seq.keywords.join(', ')} · ${seq.steps.length} step${seq.steps.length!==1?'s':''}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" onclick="openSequenceEditor(${campaignId},${idx})">Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="previewSequenceEmail(${campaignId},${idx},0)">Preview</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red-600)" onclick="deleteSequenceTrack(${campaignId},${idx})">Remove</button>
      </div>
    </div>`).join('');
}

function openSequenceEditor(campaignId, trackIdx) {
  const existing = document.getElementById('seq-editor-overlay');
  if (existing) existing.remove();

  const cRes = window._campaignCache?.[campaignId];
  let sequences = [];
  if (cRes) { try { sequences = JSON.parse(cRes.email_sequences || '[]'); } catch {} }

  const isEdit = trackIdx !== undefined;
  const track = isEdit ? sequences[trackIdx] : {
    name: '', keywords: [], steps: [
      { day: 0, subject: 'Quick question for {{company}}', body: 'Hi {{first_name}},\n\nI came across {{company}} while researching companies in the {{industry}} space — I noticed you recently downloaded our {{asset_name}}.\n\nI wanted to reach out personally and see if you had any questions or if there\'s a use case we could explore together.\n\nWould you be open to a 15-minute call this week?\n\nBest,\n[Your Name]' },
      { day: 3, subject: 'Re: Quick question for {{company}}', body: 'Hi {{first_name}},\n\nJust following up on my note from a few days ago — I know things get busy.\n\nGiven your role at {{company}}, I thought our {{asset_name}} might be particularly relevant to what you\'re working on.\n\nHappy to send over a few specific sections if that would be helpful.\n\nBest,\n[Your Name]' },
      { day: 7, subject: 'Last note — {{company}}', body: 'Hi {{first_name}},\n\nI\'ll keep this short. If now isn\'t the right time, no worries at all — I\'ll leave it here.\n\nIf things change and you\'d like to connect, feel free to book time directly: [calendar link]\n\nBest,\n[Your Name]' }
    ]
  };

  const stepsHtml = (track.steps || []).map((step, i) => `
    <div class="seq-step" id="seq-step-${i}" style="border:0.5px solid var(--border);border-radius:var(--radius-md);margin-bottom:10px;overflow:hidden">
      <div style="background:var(--bg-muted);padding:8px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:0.5px solid var(--border)">
        <span class="fs12 fw5">Step ${i+1} — Day ${step.day}</span>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:11px" onclick="seqPreviewStep(${campaignId},${i})">Preview</button>
          ${i > 0 ? `<button class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:11px;color:var(--red-600)" onclick="seqRemoveStep(${i})">✕</button>` : ''}
        </div>
      </div>
      <div style="padding:12px 14px">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <label class="fs11 fw5" style="color:var(--text-tertiary);width:52px;flex-shrink:0">Day</label>
          <input type="number" class="form-input" style="width:80px" value="${step.day}" data-step="${i}" data-field="day" min="0"/>
          <label class="fs11 fw5" style="color:var(--text-tertiary);margin-left:8px;width:52px;flex-shrink:0">Subject</label>
          <input type="text" class="form-input" style="flex:1" value="${step.subject.replace(/"/g,'&quot;')}" data-step="${i}" data-field="subject" placeholder="Email subject line…"/>
        </div>
        <textarea class="form-input" style="width:100%;height:140px;font-family:monospace;font-size:12px;line-height:1.6;resize:vertical;box-sizing:border-box" data-step="${i}" data-field="body" placeholder="Email body…">${step.body.replace(/</g,'&lt;')}</textarea>
      </div>
    </div>`).join('');

  const overlay = document.createElement('div');
  overlay.id = 'seq-editor-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:680px;width:96vw;text-align:left;max-height:92vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div class="page-overline">Email Sequences</div>
          <div class="fw5 fs16">${isEdit ? 'Edit' : 'New'} Persona Track</div>
        </div>
        <button class="btn-icon" onclick="document.getElementById('seq-editor-overlay').remove()">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style="background:var(--bg-muted);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:16px">
        <div class="fs11 fw5" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Persona Definition</div>
        <div style="display:flex;gap:10px;margin-bottom:10px">
          <div style="flex:1">
            <label class="fs11 fw5" style="color:var(--text-tertiary);display:block;margin-bottom:4px">Track Name</label>
            <input id="seq-track-name" type="text" class="form-input" value="${track.name.replace(/"/g,'&quot;')}" placeholder="e.g. C-Suite Track"/>
          </div>
        </div>
        <div>
          <label class="fs11 fw5" style="color:var(--text-tertiary);display:block;margin-bottom:4px">Title Keywords (comma-separated — leads whose title contains any of these get this sequence)</label>
          <input id="seq-keywords" type="text" class="form-input" value="${track.keywords.join(', ')}" placeholder="e.g. CEO, CTO, Chief, President"/>
        </div>
        <div class="fs11" style="color:var(--text-tertiary);margin-top:8px">Available variables: <code>{{first_name}}</code> <code>{{last_name}}</code> <code>{{company}}</code> <code>{{title}}</code> <code>{{industry}}</code> <code>{{asset_name}}</code></div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="fs11 fw5" style="text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary)">Email Steps</div>
        <button class="btn btn-ghost btn-sm" onclick="seqAddStep()">+ Add Step</button>
      </div>

      <div id="seq-steps-container">${stepsHtml}</div>

      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-pri" style="flex:1" onclick="saveSequenceTrack(${campaignId},${isEdit ? trackIdx : -1})">
          ${isEdit ? 'Save Changes' : 'Add Track'}
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('seq-editor-overlay').remove()">Cancel</button>
      </div>
    </div>`;

  window._seqEditorSteps = track.steps.map(s => ({ ...s }));
  document.body.appendChild(overlay);
}

function seqAddStep() {
  const steps = window._seqEditorSteps || [];
  const lastDay = steps.length ? steps[steps.length-1].day : 0;
  const newStep = { day: lastDay + 3, subject: '', body: '' };
  steps.push(newStep);
  window._seqEditorSteps = steps;
  const i = steps.length - 1;
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="seq-step" id="seq-step-${i}" style="border:0.5px solid var(--border);border-radius:var(--radius-md);margin-bottom:10px;overflow:hidden">
      <div style="background:var(--bg-muted);padding:8px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:0.5px solid var(--border)">
        <span class="fs12 fw5">Step ${i+1} — Day ${newStep.day}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:11px" onclick="seqPreviewStep(null,${i})">Preview</button>
          <button class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:11px;color:var(--red-600)" onclick="seqRemoveStep(${i})">✕</button>
        </div>
      </div>
      <div style="padding:12px 14px">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <label class="fs11 fw5" style="color:var(--text-tertiary);width:52px;flex-shrink:0">Day</label>
          <input type="number" class="form-input" style="width:80px" value="${newStep.day}" data-step="${i}" data-field="day" min="0"/>
          <label class="fs11 fw5" style="color:var(--text-tertiary);margin-left:8px;width:52px;flex-shrink:0">Subject</label>
          <input type="text" class="form-input" style="flex:1" value="" data-step="${i}" data-field="subject" placeholder="Email subject line…"/>
        </div>
        <textarea class="form-input" style="width:100%;height:140px;font-family:monospace;font-size:12px;line-height:1.6;resize:vertical;box-sizing:border-box" data-step="${i}" data-field="body" placeholder="Email body…"></textarea>
      </div>
    </div>`;
  document.getElementById('seq-steps-container').appendChild(div.firstElementChild);
}

function seqRemoveStep(idx) {
  const steps = window._seqEditorSteps || [];
  steps.splice(idx, 1);
  window._seqEditorSteps = steps;
  document.getElementById(`seq-step-${idx}`)?.remove();
}

function _readSeqFormSteps() {
  const steps = window._seqEditorSteps || [];
  document.querySelectorAll('[data-field]').forEach(el => {
    const i = parseInt(el.dataset.step);
    const field = el.dataset.field;
    if (!isNaN(i) && steps[i]) steps[i][field] = field === 'day' ? parseInt(el.value)||0 : el.value;
  });
  return steps;
}

async function saveSequenceTrack(campaignId, trackIdx) {
  const name     = document.getElementById('seq-track-name')?.value?.trim();
  const keywords = document.getElementById('seq-keywords')?.value?.split(',').map(k=>k.trim()).filter(Boolean);
  const steps    = _readSeqFormSteps();

  if (!name)         { showToast('Track name is required', 'error'); return; }
  if (!keywords?.length) { showToast('At least one keyword is required', 'error'); return; }
  if (!steps.length) { showToast('At least one email step is required', 'error'); return; }

  const cRes = await API.getCampaign(campaignId);
  if (!cRes.success) { showToast('Error loading campaign', 'error'); return; }
  const c = cRes.data;
  let sequences = [];
  try { sequences = JSON.parse(c.email_sequences || '[]'); } catch {}

  const track = { name, keywords, steps };
  if (trackIdx >= 0) sequences[trackIdx] = track;
  else sequences.push(track);

  const res = await API.updateCampaign(campaignId, { email_sequences: sequences });
  if (!res.success) { showToast('Failed to save', 'error'); return; }

  // Update cache
  if (!window._campaignCache) window._campaignCache = {};
  window._campaignCache[campaignId] = res.data;

  document.getElementById('seq-editor-overlay')?.remove();
  showToast('Sequence saved', 'success');

  // Re-render the sequence list in place
  const listEl = document.getElementById(`seq-list-${campaignId}`);
  if (listEl) {
    let updatedSeqs = [];
    try { updatedSeqs = JSON.parse(res.data.email_sequences || '[]'); } catch {}
    listEl.innerHTML = renderSequenceList(updatedSeqs, campaignId);
  }
}

async function deleteSequenceTrack(campaignId, trackIdx) {
  const cRes = await API.getCampaign(campaignId);
  if (!cRes.success) { showToast('Error loading campaign', 'error'); return; }
  const c = cRes.data;
  let sequences = [];
  try { sequences = JSON.parse(c.email_sequences || '[]'); } catch {}
  sequences.splice(trackIdx, 1);

  const res = await API.updateCampaign(campaignId, { email_sequences: sequences });
  if (!res.success) { showToast('Failed to remove track', 'error'); return; }
  showToast('Track removed', 'success');

  const listEl = document.getElementById(`seq-list-${campaignId}`);
  if (listEl) {
    let updatedSeqs = [];
    try { updatedSeqs = JSON.parse(res.data.email_sequences || '[]'); } catch {}
    listEl.innerHTML = renderSequenceList(updatedSeqs, campaignId);
  }
}

async function previewSequenceEmail(campaignId, trackIdx, stepIdx) {
  const cRes = await API.getCampaign(campaignId);
  if (!cRes.success) { showToast('Error loading campaign', 'error'); return; }
  const c = cRes.data;
  let sequences = [];
  try { sequences = JSON.parse(c.email_sequences || '[]'); } catch {}
  const track = sequences[trackIdx];
  if (!track) return;
  _showEmailPreviewModal(c, track, track.steps[stepIdx] || track.steps[0], stepIdx);
}

function seqPreviewStep(campaignId, stepIdx) {
  const steps = _readSeqFormSteps();
  const step = steps[stepIdx];
  if (!step) return;
  const mockCampaign = { name: 'Campaign', asset_name: 'the report', logo_url: null };
  const name = document.getElementById('seq-track-name')?.value || 'Preview Track';
  const keywords = (document.getElementById('seq-keywords')?.value || '').split(',').map(k=>k.trim()).filter(Boolean);
  _showEmailPreviewModal(mockCampaign, { name, keywords, steps }, step, stepIdx);
}

function _showEmailPreviewModal(c, track, step, stepIdx) {
  const existing = document.getElementById('email-preview-overlay');
  if (existing) existing.remove();

  const sampleLeads = [
    { first_name:'Sarah', last_name:'Chen',   company:'Acme Corp',      title:'VP of Engineering',        industry:'SaaS' },
    { first_name:'James', last_name:'Okafor', company:'Meridian Health', title:'Chief Information Officer', industry:'Healthcare' },
    { first_name:'Priya', last_name:'Nair',   company:'Sequoia Data',   title:'Head of Platform Eng',     industry:'Financial Services' },
    { first_name:'Tom',   last_name:'Werner', company:'BlueSky AI',     title:'CTO',                       industry:'Technology' },
  ];

  let activeLeadIdx = 0;

  const renderPreview = (leadIdx) => {
    const lead = sampleLeads[leadIdx];
    const assetName = c.asset_name || 'our latest report';
    const subject = resolveVars(step.subject, lead, assetName);
    const body    = resolveVars(step.body, lead, assetName);

    return `
      <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
        ${sampleLeads.map((l,i) => `
          <button onclick="document.getElementById('ep-lead-selector').querySelectorAll('button').forEach(b=>b.classList.remove('btn-pri'));this.classList.add('btn-pri');document.getElementById('ep-body').innerHTML=document.getElementById('ep-preview-fn').call(${i})"
            class="btn btn-sm ${i===leadIdx?'btn-pri':'btn-secondary'}" style="font-size:11px">${l.first_name} · ${l.title.split(' ')[0]}</button>`).join('')}
      </div>
      <div style="background:var(--bg-muted);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:12px">
        <div class="fs11 fw5" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">To</div>
        <div class="fs13 fw5">${lead.first_name} ${lead.last_name} &lt;${lead.first_name.toLowerCase()}.${lead.last_name.toLowerCase()}@${lead.company.toLowerCase().replace(/\s+/g,'')}.com&gt;</div>
        <div class="fs12" style="color:var(--text-tertiary);margin-top:2px">${lead.title} at ${lead.company}</div>
      </div>
      <div style="background:var(--bg-muted);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:12px">
        <div class="fs11 fw5" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Subject</div>
        <div class="fs13 fw5">${subject || '(no subject)'}</div>
      </div>
      <div style="border:0.5px solid var(--border);border-radius:var(--radius-md);padding:16px 18px;min-height:160px">
        <div class="fs13" style="line-height:1.8;white-space:pre-wrap;color:var(--text-primary)">${body || '(no body)'}</div>
      </div>`;
  };

  const overlay = document.createElement('div');
  overlay.id = 'email-preview-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const stepTabs = track.steps.map((s,i) => `
    <button class="btn btn-sm ${i===stepIdx?'btn-pri':'btn-secondary'}"
      style="font-size:11px"
      onclick="(function(){document.getElementById('email-preview-overlay').remove();_showEmailPreviewModal(window._epCampaign,window._epTrack,window._epTrack.steps[${i}],${i})})()">
      Step ${i+1} — Day ${s.day}
    </button>`).join('');

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:600px;width:96vw;text-align:left;max-height:92vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:10px">
          ${c.logo_url ? `<img src="${c.logo_url}" style="height:22px;object-fit:contain;border-radius:3px" onerror="this.style.display='none'"/>` : ''}
          <div>
            <div class="page-overline">${track.name}</div>
            <div class="fw5 fs15">Email Preview</div>
          </div>
        </div>
        <button class="btn-icon" onclick="document.getElementById('email-preview-overlay').remove()">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
        ${stepTabs}
      </div>

      <div class="fs11 fw5" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Preview as…</div>
      <div id="ep-lead-selector" style="margin-bottom:14px">
        ${sampleLeads.map((l,i) => `
          <button class="btn btn-sm ${i===0?'btn-pri':'btn-secondary'}" style="font-size:11px;margin:0 4px 6px 0"
            onclick="document.getElementById('ep-body').innerHTML=window._epRender(${i});document.getElementById('ep-lead-selector').querySelectorAll('button').forEach((b,bi)=>b.className='btn btn-sm '+(bi===${i}?'btn-pri':'btn-secondary')+' ep-lb');this.className='btn btn-sm btn-pri ep-lb'">
            ${l.first_name} · ${l.title.split(' ')[0]}
          </button>`).join('')}
      </div>

      <div id="ep-body">${renderPreview(0)}</div>
    </div>`;

  window._epCampaign = c;
  window._epTrack    = track;
  window._epRender   = renderPreview;
  document.body.appendChild(overlay);
}

window.openSequenceEditor    = openSequenceEditor;
window.saveSequenceTrack     = saveSequenceTrack;
window.deleteSequenceTrack   = deleteSequenceTrack;
window.previewSequenceEmail  = previewSequenceEmail;
window.seqAddStep            = seqAddStep;
window.seqRemoveStep         = seqRemoveStep;
window.seqPreviewStep        = seqPreviewStep;
window._showEmailPreviewModal = _showEmailPreviewModal;

// ═══════════════════════════════════════════════════════════
// Lead Sourcing Panel
// ═══════════════════════════════════════════════════════════

async function loadSourcingSummary(campaignId) {
  const el = document.getElementById(`sourcing-summary-${campaignId}`);
  if (!el) return;
  const res = await API.getSourcingSummary(campaignId);
  if (!res.success) { el.innerHTML = `<div class="fs12" style="color:var(--text-tertiary)">No leads sourced yet.</div>`; return; }
  const { total, rows } = res.data;
  if (!total) {
    el.innerHTML = `<div class="fs12" style="color:var(--text-tertiary)">No leads sourced yet. Click <strong>Source Leads</strong> to begin.</div>`;
    return;
  }
  const statusCount = (s) => rows.filter(r => r.status === s).reduce((a, r) => a + r.count, 0);
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
      <div style="text-align:center"><div class="fs20 fw5">${total}</div><div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Total Sourced</div></div>
      <div style="text-align:center"><div class="fs20 fw5" style="color:var(--amber-600)">${statusCount('pending')}</div><div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Pending</div></div>
      <div style="text-align:center"><div class="fs20 fw5" style="color:var(--blue-600)">${statusCount('delivered')}</div><div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">In Sequence</div></div>
      <div style="text-align:center"><div class="fs20 fw5 clr-grn">${statusCount('accepted')}</div><div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Converted</div></div>
    </div>`;
}

async function openSourcingPanel(campaignId) {
  const existing = document.getElementById('sourcing-panel-overlay');
  if (existing) existing.remove();

  const cRes = await API.getCampaign(campaignId);
  if (!cRes.success) { showToast('Error loading campaign', 'error'); return; }
  const c = cRes.data;

  let titles=[], industries=[], sizes=[], geos=[];
  try { titles     = JSON.parse(c.titles||'[]'); } catch {}
  try { industries = JSON.parse(c.industries||'[]'); } catch {}
  try { sizes      = JSON.parse(c.company_sizes||'[]'); } catch {}
  try { geos       = JSON.parse(c.geo||'[]'); } catch {}

  const overlay = document.createElement('div');
  overlay.id = 'sourcing-panel-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:900px;width:97vw;text-align:left;max-height:94vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div class="page-overline">Lead Sourcing</div>
          <div class="fw5 fs16">${c.name}</div>
        </div>
        <button class="btn-icon" onclick="document.getElementById('sourcing-panel-overlay').remove()">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Method selector -->
      <div style="display:flex;gap:10px;margin-bottom:20px">
        ${[
          { id:'owndb',    label:'Own Database',   icon:'🗄️',  sub:'Search your existing contacts' },
          { id:'apollo',   label:'Apollo',          icon:'🚀',  sub:'Search 275M+ B2B contacts' },
          { id:'linkedin', label:'LinkedIn',         icon:'💼',  sub:'Coming soon — upload export' },
        ].map(m => `
          <div class="sourcing-method${m.id==='owndb'?' active':''}" id="method-${m.id}"
            onclick="selectSourcingMethod('${m.id}')"
            style="flex:1;padding:14px 16px;border:0.5px solid var(--border);border-radius:var(--radius-md);cursor:pointer;transition:border-color .15s${m.id==='owndb'?';border-color:var(--blue-600);background:var(--blue-100)':''}${m.id==='linkedin'?';opacity:.5;pointer-events:none':''}">
            <div style="font-size:20px;margin-bottom:4px">${m.icon}</div>
            <div class="fw5 fs13">${m.label}</div>
            <div class="fs11" style="color:var(--text-tertiary);margin-top:2px">${m.sub}</div>
          </div>`).join('')}
      </div>

      <!-- CSV Import & Clean -->
      <div style="background:var(--bg-muted);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:16px;display:none" id="csv-import-section">
        <div class="fs11 fw5" style="text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary);margin-bottom:10px">Import & Clean Database</div>
        <div style="display:flex;gap:10px;align-items:center">
          <input id="csv-file-input" type="file" accept=".csv,.txt" style="display:none" onchange="handleCSVUpload(event)"/>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('csv-file-input').click()">📤 Upload CSV</button>
          <button class="btn btn-pri btn-sm" id="csv-clean-btn" onclick="cleanUploadedContacts()" style="display:none">✨ Clean Database</button>
          <span id="csv-status" class="fs12" style="color:var(--text-tertiary)"></span>
        </div>
      </div>

      <!-- ICP Filters -->
      <div style="background:var(--bg-muted);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:16px">
        <div class="fs11 fw5" style="text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary);margin-bottom:10px">ICP Filters <span style="font-weight:400;text-transform:none;letter-spacing:0"> — pre-filled from campaign</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label class="fs11 fw5" style="color:var(--text-tertiary);display:block;margin-bottom:4px">Target Titles</label>
            <input id="src-titles" type="text" class="form-input" value="${titles.join(', ')}" placeholder="VP Engineering, CTO, Head of Infra…"/>
          </div>
          <div>
            <label class="fs11 fw5" style="color:var(--text-tertiary);display:block;margin-bottom:4px">Industries</label>
            <input id="src-industries" type="text" class="form-input" value="${industries.join(', ')}" placeholder="SaaS, Technology…"/>
          </div>
          <div>
            <label class="fs11 fw5" style="color:var(--text-tertiary);display:block;margin-bottom:4px">Company Sizes</label>
            <input id="src-sizes" type="text" class="form-input" value="${sizes.join(', ')}" placeholder="500-1000, 1000-5000…"/>
          </div>
          <div>
            <label class="fs11 fw5" style="color:var(--text-tertiary);display:block;margin-bottom:4px">Geographies</label>
            <input id="src-geos" type="text" class="form-input" value="${geos.join(', ')}" placeholder="United States, United Kingdom…"/>
          </div>
        </div>
        <div id="apollo-extra" style="display:none;margin-top:10px">
          <label class="fs11 fw5" style="color:var(--text-tertiary);display:block;margin-bottom:4px">Free-text keyword search (Apollo)</label>
          <input id="src-keyword" type="text" class="form-input" placeholder="e.g. AI infrastructure, cloud security…"/>
        </div>
        <div style="margin-top:12px;display:flex;align-items:center;gap:10px">
          <button class="btn btn-pri btn-sm" onclick="runSourcingSearch(${campaignId})" id="src-search-btn">Search</button>
          <span id="src-status" class="fs12" style="color:var(--text-tertiary)"></span>
        </div>
      </div>

      <!-- Results -->
      <div id="src-results" style="display:none">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="fs13 fw5" id="src-results-label">Results</div>
          <button class="btn btn-pri btn-sm" id="src-assign-btn" onclick="assignSelectedLeads(${campaignId})" style="display:none">
            Assign Selected to Campaign
          </button>
        </div>
        <div style="border:0.5px solid var(--border);border-radius:var(--radius-md);overflow:hidden">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:var(--bg-muted)">
                <th style="width:36px;padding:8px 12px"><input type="checkbox" id="src-select-all" onchange="sourcingSelectAll(this)"/></th>
                <th class="fs11 fw5" style="text-align:left;padding:8px 12px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary)">Name</th>
                <th class="fs11 fw5" style="text-align:left;padding:8px 12px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary)">Title</th>
                <th class="fs11 fw5" style="text-align:left;padding:8px 12px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary)">Company</th>
                <th class="fs11 fw5" style="text-align:left;padding:8px 12px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary)">Location</th>
                <th class="fs11 fw5" style="text-align:left;padding:8px 12px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary)">Email</th>
                <th class="fs11 fw5" style="text-align:left;padding:8px 12px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary)">Source</th>
              </tr>
            </thead>
            <tbody id="src-results-body"></tbody>
          </table>
        </div>
      </div>
    </div>`;

  window._sourcingMethod = 'owndb';
  window._sourcingResults = [];
  window._currentSourcingCampaignId = campaignId;
  document.body.appendChild(overlay);

  // Show CSV import section
  const csvSection = document.getElementById('csv-import-section');
  if (csvSection) csvSection.style.display = 'block';
}

function selectSourcingMethod(method) {
  window._sourcingMethod = method;
  document.querySelectorAll('.sourcing-method').forEach(el => {
    el.style.borderColor = 'var(--border)';
    el.style.background = '';
  });
  const active = document.getElementById(`method-${method}`);
  if (active) { active.style.borderColor = 'var(--blue-600)'; active.style.background = 'var(--blue-100)'; }
  const apolloExtra = document.getElementById('apollo-extra');
  if (apolloExtra) apolloExtra.style.display = method === 'apollo' ? 'block' : 'none';
}

async function runSourcingSearch(campaignId) {
  const titles     = document.getElementById('src-titles')?.value.split(',').map(t=>t.trim()).filter(Boolean) || [];
  const industries = document.getElementById('src-industries')?.value.split(',').map(i=>i.trim()).filter(Boolean) || [];
  const sizes      = document.getElementById('src-sizes')?.value.split(',').map(s=>s.trim()).filter(Boolean) || [];
  const geos       = document.getElementById('src-geos')?.value.split(',').map(g=>g.trim()).filter(Boolean) || [];
  const keyword    = document.getElementById('src-keyword')?.value?.trim() || '';
  const method     = window._sourcingMethod || 'owndb';
  const statusEl   = document.getElementById('src-status');
  const btn        = document.getElementById('src-search-btn');

  if (statusEl) statusEl.textContent = 'Searching…';
  if (btn) btn.disabled = true;

  let res;
  if (method === 'apollo') {
    res = await API.searchApollo({ titles, industries, company_sizes: sizes, geos, q_keyword: keyword, per_page: 25 });
  } else {
    const params = new URLSearchParams();
    if (titles.length)     params.set('titles', titles.join(','));
    if (industries.length) params.set('industries', industries.join(','));
    if (sizes.length)      params.set('sizes', sizes.join(','));
    if (geos.length)       params.set('geos', geos.join(','));
    if (keyword)           params.set('q', keyword);
    params.set('campaign_id', campaignId);
    res = await API.searchGlobalLeads(`?${params.toString()}`);
  }

  if (btn) btn.disabled = false;

  if (!res.success) {
    if (statusEl) statusEl.textContent = `Error: ${res.error}`;
    return;
  }

  const contacts = res.data || [];
  window._sourcingResults = contacts;

  const resultsEl = document.getElementById('src-results');
  const labelEl   = document.getElementById('src-results-label');
  const tbody      = document.getElementById('src-results-body');
  const assignBtn  = document.getElementById('src-assign-btn');

  if (statusEl) statusEl.textContent = `${contacts.length} contacts found`;
  if (resultsEl) resultsEl.style.display = 'block';
  if (labelEl) labelEl.textContent = `${contacts.length} Contacts Found`;

  if (!contacts.length) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="padding:20px;text-align:center;color:var(--text-tertiary)" class="fs13">No contacts matched your filters.</td></tr>`;
    if (assignBtn) assignBtn.style.display = 'none';
    return;
  }

  if (assignBtn) assignBtn.style.display = 'block';

  tbody.innerHTML = contacts.map((p, i) => `
    <tr style="border-top:0.5px solid var(--border)">
      <td style="padding:8px 12px"><input type="checkbox" class="src-row-check" data-idx="${i}" checked/></td>
      <td style="padding:8px 12px">
        <div class="fw5 fs13">${p.first_name||''} ${p.last_name||''}</div>
        ${p.linkedin_url ? `<a href="${p.linkedin_url}" target="_blank" class="fs11" style="color:var(--blue-600)">LinkedIn ↗</a>` : ''}
      </td>
      <td style="padding:8px 12px" class="fs13">${p.title||'—'}</td>
      <td style="padding:8px 12px">
        <div class="fs13">${p.company||'—'}</div>
        <div class="fs11" style="color:var(--text-tertiary)">${p.industry||''}</div>
      </td>
      <td style="padding:8px 12px" class="fs12" style="color:var(--text-secondary)">${[p.city, p.country].filter(Boolean).join(', ')||'—'}</td>
      <td style="padding:8px 12px" class="fs12">${p.email||'<span style="color:var(--text-tertiary)">Requires enrichment</span>'}</td>
      <td style="padding:8px 12px"><span class="badge badge-${p.source==='apollo'?'blue':p.source==='import'?'amber':'gray'}">${p.source||'import'}</span></td>
    </tr>`).join('');
}

function sourcingSelectAll(checkbox) {
  document.querySelectorAll('.src-row-check').forEach(c => c.checked = checkbox.checked);
}

async function assignSelectedLeads(campaignId) {
  const allContacts = window._sourcingResults || [];
  const selected = [];
  document.querySelectorAll('.src-row-check').forEach((c, i) => {
    if (c.checked && allContacts[parseInt(c.dataset.idx)]) selected.push(allContacts[parseInt(c.dataset.idx)]);
  });

  if (!selected.length) { showToast('Select at least one contact', 'error'); return; }

  const btn = document.getElementById('src-assign-btn');
  if (btn) { btn.textContent = 'Assigning…'; btn.disabled = true; }

  const res = await API.assignLeads(campaignId, selected);

  if (btn) { btn.textContent = 'Assign Selected to Campaign'; btn.disabled = false; }

  if (!res.success) { showToast(`Error: ${res.error}`, 'error'); return; }

  const { added, dupes, errors } = res.data;
  showToast(`✓ ${added} leads assigned${dupes ? `, ${dupes} already in campaign` : ''}${errors ? `, ${errors} errors` : ''}`, 'success');
  document.getElementById('sourcing-panel-overlay')?.remove();
  loadSourcingSummary(campaignId);
}

window.openSourcingPanel    = openSourcingPanel;
window.selectSourcingMethod = selectSourcingMethod;
window.runSourcingSearch    = runSourcingSearch;
window.sourcingSelectAll    = sourcingSelectAll;
window.assignSelectedLeads  = assignSelectedLeads;
window.loadSourcingSummary  = loadSourcingSummary;

// ═══════════════════════════════════════════════════════════
// CSV Import & Database Cleaning
// ═══════════════════════════════════════════════════════════

function handleCSVUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const csv = e.target?.result;
    const lines = csv.split('\n').filter(l => l.trim());
    if (lines.length < 2) { showToast('CSV must have header + data rows', 'error'); return; }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const contacts = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = values[i] || null; });
      return obj;
    });

    window._uploadedContacts = contacts;
    const statusEl = document.getElementById('csv-status');
    if (statusEl) statusEl.textContent = `${contacts.length} contacts loaded`;
    const cleanBtn = document.getElementById('csv-clean-btn');
    if (cleanBtn) cleanBtn.style.display = 'block';
  };
  reader.readAsText(file);
}

async function cleanUploadedContacts() {
  const contacts = window._uploadedContacts || [];
  if (!contacts.length) { showToast('No contacts to clean', 'error'); return; }

  const btn = document.getElementById('csv-clean-btn');
  if (btn) { btn.textContent = 'Cleaning…'; btn.disabled = true; }

  const res = await API.cleanLeads(contacts);

  if (btn) { btn.textContent = '✨ Clean Database'; btn.disabled = false; }

  if (!res.success) {
    showToast(`Error: ${res.error}`, 'error');
    return;
  }

  const { cleaned, applied, flagged, flaggedRecords } = res.data || {};
  window._cleanedContacts = cleaned;

  showCleanResultsModal(applied, flagged, flaggedRecords || []);
}

function showCleanResultsModal(applied, flagged, flaggedRecords) {
  const existing = document.getElementById('clean-results-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'clean-results-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const flaggedHtml = flaggedRecords.length ? `
    <div style="margin-top:16px;padding-top:16px;border-top:0.5px solid var(--border)">
      <div class="fs13 fw5" style="margin-bottom:10px;color:var(--amber-600)">⚠️ ${flagged} Issues Flagged</div>
      <div style="max-height:200px;overflow-y:auto">
        ${flaggedRecords.slice(0, 10).map(f => `
          <div style="padding:8px;background:var(--amber-100);border-radius:6px;margin-bottom:6px;font-size:12px">
            <strong>Row ${(f._idx||0)+1}:</strong> ${f.reason || f.action}
          </div>`).join('')}
        ${flaggedRecords.length > 10 ? `<div style="font-size:12px;color:var(--text-tertiary)">+${flaggedRecords.length-10} more issues</div>` : ''}
      </div>
    </div>
  ` : '';

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:500px;width:96vw">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:40px;margin-bottom:10px">✨</div>
        <div class="fw5 fs16">Database Cleaned</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--blue-100);border-radius:var(--radius-md);padding:12px;text-align:center">
          <div class="fw5 fs18" style="color:var(--blue-600)">${applied}</div>
          <div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Fields Fixed</div>
        </div>
        <div style="background:${flagged?'var(--amber-100)':'var(--green-100)'};border-radius:var(--radius-md);padding:12px;text-align:center">
          <div class="fw5 fs18" style="color:${flagged?'var(--amber-600)':'var(--green-600)'}">${flagged}</div>
          <div class="fs11" style="color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Flagged for Review</div>
        </div>
      </div>

      ${flaggedHtml}

      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-pri" style="flex:1" onclick="assignCleanedLeads(window._currentSourcingCampaignId)">✓ Use Cleaned Data</button>
        <button class="btn btn-ghost" onclick="document.getElementById('clean-results-overlay').remove()">Review Later</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

async function assignCleanedLeads(campaignId) {
  const cleaned = window._cleanedContacts || [];
  if (!cleaned.length) { showToast('No cleaned contacts', 'error'); return; }

  const res = await API.assignLeads(campaignId, cleaned);
  if (!res.success) { showToast(`Error: ${res.error}`, 'error'); return; }

  const { added, dupes, errors } = res.data;
  showToast(`✓ ${added} leads imported${dupes?`, ${dupes} duplicates`:''}${errors?`, ${errors} errors`:''}`);
  document.getElementById('clean-results-overlay')?.remove();
  document.getElementById('sourcing-panel-overlay')?.remove();
  loadSourcingSummary(campaignId);
}

window.handleCSVUpload = handleCSVUpload;
window.cleanUploadedContacts = cleanUploadedContacts;
window.assignCleanedLeads = assignCleanedLeads;

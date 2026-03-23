// Campaigns module

function setCampaignsTab(t) { State.campaignsTab = t; renderModule('campaigns'); }

async function renderCampaigns() {
  const [cRes, clRes] = await Promise.all([API.getCampaigns(), API.getClients()]);
  const campaigns = cRes.success ? cRes.data : [];
  const clients   = clRes.success ? clRes.data : [];
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const tabs     = ['active','draft','paused','completed','all'];
  const tabLabel = ['▶ Active','📋 Requests','⏸ Paused','✓ Completed','All'];
  const tabHtml  = tabs.map((t,i) => `<div class="tab${t===State.campaignsTab?' active':''}" onclick="setCampaignsTab('${t}')">${tabLabel[i]}</div>`).join('');

  const filtered = State.campaignsTab === 'all' ? campaigns : campaigns.filter(c => c.status === State.campaignsTab);

  const totalActive    = campaigns.filter(c => c.status === 'active').length;
  const totalRequests  = campaigns.filter(c => c.status === 'draft').length;
  const totalDelivered = campaigns.reduce((a,b) => a + (b.delivered||0), 0);
  const totalTarget    = campaigns.reduce((a,b) => a + (b.target||0), 0);
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

  const rows = filtered.length ? filtered.map(c => `
    <tr>
      <td><div class="fw7">${c.name}</div><div class="fs11" style="color:var(--t3)">${clientMap[c.client_id]||'—'}</div></td>
      <td>${statusBadge(c.status)}</td>
      <td>
        <div class="fs12 mb4">${c.delivered}/${c.target} leads</div>
        <div class="prog" style="width:120px"><div class="prog-fill" style="width:${Math.min(100,Math.round((c.delivered/Math.max(c.target,1))*100))}%;background:var(--acc)"></div></div>
      </td>
      <td>${pacingBadge(c.pacing)}</td>
      <td class="fw7 clr-grn">$${c.cpl}</td>
      <td class="${c.acceptance_rate>=90?'clr-grn':c.acceptance_rate>=75?'clr-yel':'clr-red'} fw7">${c.acceptance_rate||0}%</td>
      <td class="fs12" style="color:var(--t3)">${fmtDate(c.start_date)} → ${fmtDate(c.end_date)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="viewCampaign(${c.id})">View</button>
      </td>
    </tr>`).join('')
  : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--t3)">No ${State.campaignsTab === 'all' ? '' : State.campaignsTab + ' '}campaigns yet.</td></tr>`;

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
    <div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap"><table>
        <thead><tr><th>Campaign / Client</th><th>Status</th><th>Progress</th><th>Pacing</th><th>CPL</th><th>Acceptance</th><th>Dates</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>
  </div>`;
}

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

  return `<div class="card request-card">
    <div class="request-header">
      <div>
        <div class="fw7" style="font-size:16px;margin-bottom:2px">${c.name}</div>
        <div class="fs12" style="color:var(--t3)">${clientMap[c.client_id] || 'Unknown Client'}</div>
      </div>
      <span class="badge b-yel">Pending Review</span>
    </div>

    <div class="request-grid-inner">
      <div class="request-section">
        <div class="request-label">Asset</div>
        <div class="fw6">${c.asset_name || '—'}</div>
        ${c.asset_url ? `<a href="${c.asset_url}" target="_blank" class="fs12" style="color:var(--acc)">View Asset ↗</a>` : ''}
      </div>
      <div class="request-section">
        <div class="request-label">Campaign Scope</div>
        <div class="fs13"><strong>${c.target}</strong> leads @ <strong>$${c.cpl}</strong>/lead</div>
        <div class="fs12" style="color:var(--t3)">${fmtDate(c.start_date)} → ${fmtDate(c.end_date)}</div>
      </div>
      <div class="request-section">
        <div class="request-label">Target ICP</div>
        <div class="tag-list">
          ${titles.map(t => `<span class="tag">${t}</span>`).join('')}
          ${industries.map(i => `<span class="tag">${i}</span>`).join('')}
          ${sizes.map(s => `<span class="tag">${s}</span>`).join('')}
          ${geo.map(g => `<span class="tag">${g}</span>`).join('')}
        </div>
      </div>
      <div class="request-section">
        <div class="request-label">TAL (${tal.length} accounts)</div>
        <div class="fs12" style="color:var(--t3)">${tal.slice(0,5).join(', ')}${tal.length > 5 ? ` +${tal.length-5} more` : ''}</div>
      </div>
      <div class="request-section">
        <div class="request-label">Suppression (${suppression.length})</div>
        <div class="fs12" style="color:var(--t3)">${suppression.length ? suppression.slice(0,3).join(', ') + (suppression.length > 3 ? ` +${suppression.length-3} more` : '') : 'None'}</div>
      </div>
      <div class="request-section">
        <div class="request-label">Branding</div>
        <div style="display:flex;gap:6px;align-items:center">
          <div style="width:20px;height:20px;border-radius:4px;background:${brandColor}"></div>
          <div style="width:20px;height:20px;border-radius:4px;background:${c.brand_color_secondary||'#1e40af'}"></div>
          <div style="width:20px;height:20px;border-radius:4px;background:${c.brand_accent||'#3b82f6'}"></div>
          ${c.logo_url ? `<span class="fs12" style="color:var(--t3)">+ Logo</span>` : ''}
        </div>
      </div>
    </div>

    ${customQ.length ? `<div class="request-section" style="margin-top:8px">
      <div class="request-label">Custom Questions</div>
      ${customQ.map((q,i) => `<div class="fs13">${i+1}. ${q.question}</div>`).join('')}
    </div>` : ''}

    ${c.notes ? `<div class="request-section" style="margin-top:8px">
      <div class="request-label">Notes</div>
      <div class="fs13" style="color:var(--t3)">${c.notes}</div>
    </div>` : ''}

    <div style="display:flex;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid var(--bd)">
      <button class="btn btn-pri btn-sm" onclick="deployLandingPage(${c.id})" style="flex:1">🚀 Deploy Landing Page</button>
      <button class="btn btn-ghost btn-sm" onclick="editCampaignRequest(${c.id})">Edit</button>
    </div>
  </div>`;
}

async function deployLandingPage(campaignId) {
  const res = await API.getCampaign(campaignId);
  if (!res.success) { alert('Error loading campaign'); return; }
  const c = res.data;

  let customQ = [];
  try { customQ = JSON.parse(c.custom_questions || '[]'); } catch {}

  // Generate slug from campaign name
  const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Create landing page with all branding and custom questions
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

  // Update campaign status to active
  await API.updateCampaign(campaignId, { status: 'active' });

  const liveUrl = `https://boss-api.mehtahouse.cc/lp/${slug}`;
  State.campaignsTab = 'active';
  renderModule('campaigns');

  // Show success with live URL
  setTimeout(() => {
    if (confirm(`Landing page deployed!\n\nLive URL:\n${liveUrl}\n\nClick OK to open it.`)) {
      window.open(liveUrl, '_blank');
    }
  }, 300);
}

function editCampaignRequest(id) {
  alert('Campaign edit form — coming soon');
}

function showNewCampaignForm() {
  alert('New campaign form — coming soon');
}

function viewCampaign(id) {
  alert('Campaign detail view — coming soon');
}

window.setCampaignsTab  = setCampaignsTab;
window.renderCampaigns  = renderCampaigns;
window.viewCampaign     = viewCampaign;
window.deployLandingPage = deployLandingPage;
window.editCampaignRequest = editCampaignRequest;
window.showNewCampaignForm = showNewCampaignForm;

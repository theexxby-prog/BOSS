// Assets & Pages module — v5 (with filters)

function setAssetsTab(t) { State.assetsTab = t; renderModule('assets'); }

async function renderAssets() {
  const [aRes, pRes, clRes, cmpRes] = await Promise.all([API.getAssets(), API.getPages(), API.getClients(), API.getCampaigns()]);
  const assets    = aRes.success ? aRes.data : [];
  const pages     = pRes.success ? pRes.data : [];
  const clients   = clRes.success ? clRes.data : [];
  const campaigns = cmpRes.success ? cmpRes.data : [];
  const clientMap  = Object.fromEntries(clients.map(c => [c.id, c.name]));
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c.name]));

  const tabs    = ['assets','pages'];
  const tabHtml = tabs.map(t => `<div class="tab${t===State.assetsTab?' active':''}" onclick="setAssetsTab('${t}')">${t==='assets'?'Assets':'Landing Pages'}</div>`).join('');

  // Filters
  const clientFilterHtml = `<select class="form-input" style="width:auto;min-width:140px;font-size:12px;padding:5px 10px" onchange="State.assetClientFilter=this.value;renderModule('assets')">
    <option value="">All Clients</option>
    ${clients.map(c => `<option value="${c.id}" ${String(State.assetClientFilter)===String(c.id)?'selected':''}>${c.name}</option>`).join('')}
  </select>`;

  const campaignFilterHtml = `<select class="form-input" style="width:auto;min-width:160px;font-size:12px;padding:5px 10px" onchange="State.assetCampaignFilter=this.value;renderModule('assets')">
    <option value="">All Campaigns</option>
    ${campaigns.map(c => `<option value="${c.id}" ${String(State.assetCampaignFilter)===String(c.id)?'selected':''}>${c.name}</option>`).join('')}
  </select>`;

  const typeIcon = { whitepaper:'whitepaper', ebook:'ebook', webinar:'webinar', report:'report', case_study:'case_study', other:'other' };

  let inner = '';

  if (State.assetsTab === 'assets') {
    let filteredAssets = assets;
    if (State.assetClientFilter) filteredAssets = filteredAssets.filter(a => String(a.client_id) === String(State.assetClientFilter));

    const rows = filteredAssets.length ? filteredAssets.map(a => `
      <tr>
        <td><div class="fw7">${a.name}</div><div class="fs11" style="color:var(--text-tertiary)">${clientMap[a.client_id]||'Unassigned'}</div></td>
        <td><span class="badge badge-blue">${(a.type||'other').replace('_',' ')}</span></td>
        <td>${a.file_url ? `<a href="${a.file_url}" target="_blank" class="btn btn-ghost btn-sm">View</a>` : '<span style="color:var(--text-tertiary)">No file</span>'}</td>
        <td><span class="badge ${a.status==='active'?'badge-green':'badge-amber'}">${a.status}</span></td>
        <td><button class="btn btn-ghost btn-sm">Edit</button></td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-tertiary)">No assets${State.assetClientFilter ? ' for this client' : ''} yet.</td></tr>`;

    inner = `
      <div class="sec-hdr mb16">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="sec-title">Client Assets</div>
          ${clientFilterHtml}
        </div>
        <button class="btn btn-pri btn-sm" onclick="showAddAsset()">+ Upload Asset</button>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Name / Client</th><th>Type</th><th>File</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  if (State.assetsTab === 'pages') {
    let filteredPages = pages;
    if (State.assetClientFilter) filteredPages = filteredPages.filter(p => String(p.client_id) === String(State.assetClientFilter));
    if (State.assetCampaignFilter) filteredPages = filteredPages.filter(p => String(p.campaign_id) === String(State.assetCampaignFilter));

    const rows = filteredPages.length ? filteredPages.map(p => `
      <tr>
        <td><div class="fw7">${p.name}</div><div class="fs11" style="color:var(--blue-600)">/${p.slug}</div></td>
        <td class="fs12" style="color:var(--text-tertiary)">${clientMap[p.client_id]||'—'}</td>
        <td class="fs12" style="color:var(--text-tertiary)">${campaignMap[p.campaign_id]||'—'}</td>
        <td><span class="badge ${p.status==='active'?'badge-green':p.status==='draft'?'badge-blue':'badge-amber'}">${p.status}</span></td>
        <td class="fw7">${p.views||0}</td>
        <td class="fw7" style="color:var(--green-600)">${p.submissions||0}</td>
        <td class="fs12" style="color:var(--text-tertiary)">${p.submissions&&p.views?Math.round(p.submissions/p.views*100)+'%':'—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="previewPage('${p.slug}')">Preview</button>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-tertiary)">No landing pages${State.assetClientFilter||State.assetCampaignFilter ? ' matching filters' : ''} yet.</td></tr>`;

    inner = `
      <div class="sec-hdr mb16">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="sec-title">Landing Pages</div>
          ${clientFilterHtml}
          ${campaignFilterHtml}
        </div>
        <button class="btn btn-pri btn-sm" onclick="showAddPage()">+ New Page</button>
      </div>
      <div class="alert a-blu mb16">Each landing page has a unique URL. Share it in your Instantly.ai email sequences. Form submissions go directly into your lead pipeline.</div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Page / Slug</th><th>Client</th><th>Campaign</th><th>Status</th><th>Views</th><th>Subs</th><th>Conv.</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  return `<div class="fade"><div class="tabs mb20">${tabHtml}</div>${inner}</div>`;
}

function showAddAsset() { alert('Asset upload form — coming in next build'); }
function showAddPage()  { alert('Landing page builder — coming in next build'); }
function previewPage(slug) { window.open(`https://boss-api.mehtahouse.cc/lp/${slug}`, '_blank'); }

window.setAssetsTab  = setAssetsTab;
window.renderAssets  = renderAssets;
window.showAddAsset  = showAddAsset;
window.showAddPage   = showAddPage;
window.previewPage   = previewPage;

// Assets & Pages module

function setAssetsTab(t) { State.assetsTab = t; renderModule('assets'); }

async function renderAssets() {
  const [aRes, pRes, clRes] = await Promise.all([API.getAssets(), API.getPages(), API.getClients()]);
  const assets  = aRes.success ? aRes.data : [];
  const pages   = pRes.success ? pRes.data : [];
  const clients = clRes.success ? clRes.data : [];
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const tabs    = ['assets','pages'];
  const tabHtml = tabs.map(t => `<div class="tab${t===State.assetsTab?' active':''}" onclick="setAssetsTab('${t}')">${t==='assets'?'🗂️ Assets':'🌐 Landing Pages'}</div>`).join('');

  const typeIcon = { whitepaper:'📄', ebook:'📚', webinar:'🎥', report:'📊', case_study:'📋', other:'📁' };

  let inner = '';

  if (State.assetsTab === 'assets') {
    const rows = assets.length ? assets.map(a => `
      <tr>
        <td><div class="fw7">${typeIcon[a.type]||'📁'} ${a.name}</div><div class="fs11" style="color:var(--t3)">${clientMap[a.client_id]||'Unassigned'}</div></td>
        <td><span class="badge b-acc">${a.type.replace('_',' ')}</span></td>
        <td>${a.file_url ? `<a href="${a.file_url}" target="_blank" class="btn btn-ghost btn-sm">View</a>` : '<span style="color:var(--t3)">No file</span>'}</td>
        <td><span class="badge ${a.status==='active'?'b-grn':'b-yel'}">${a.status}</span></td>
        <td><button class="btn btn-ghost btn-sm">Edit</button></td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--t3)">No assets yet.<br><span class="fs12">Upload a whitepaper or ebook to get started.</span></td></tr>`;

    inner = `
      <div class="sec-hdr mb16"><div class="sec-title">Client Assets</div><button class="btn btn-pri btn-sm" onclick="showAddAsset()">+ Upload Asset</button></div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Name / Client</th><th>Type</th><th>File</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  if (State.assetsTab === 'pages') {
    const rows = pages.length ? pages.map(p => `
      <tr>
        <td><div class="fw7">${p.name}</div><div class="fs11 clr-acc">/${p.slug}</div></td>
        <td class="fs12" style="color:var(--t3)">${clientMap[p.client_id]||'—'}</td>
        <td><span class="badge ${p.status==='active'?'b-grn':p.status==='draft'?'b-acc':'b-yel'}">${p.status}</span></td>
        <td class="fw7">${p.views||0}</td>
        <td class="fw7 clr-grn">${p.submissions||0}</td>
        <td class="fs12" style="color:var(--t3)">${p.submissions&&p.views?Math.round(p.submissions/p.views*100)+'%':'—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="previewPage('${p.slug}')">Preview</button>
          <button class="btn btn-ghost btn-sm">Edit</button>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--t3)">No landing pages yet.<br><span class="fs12">Create a page to capture leads for a campaign.</span></td></tr>`;

    inner = `
      <div class="sec-hdr mb16"><div class="sec-title">Landing Pages</div><button class="btn btn-pri btn-sm" onclick="showAddPage()">+ New Page</button></div>
      <div class="alert a-blu mb16">🌐 Each landing page has a unique URL. Share it in your Instantly.ai email sequences. Form submissions go directly into your lead pipeline.</div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Page / Slug</th><th>Client</th><th>Status</th><th>Views</th><th>Submissions</th><th>Conv. Rate</th><th></th></tr></thead>
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

// Campaigns module

function setCampaignsTab(t) { State.campaignsTab = t; renderModule('campaigns'); }

async function renderCampaigns() {
  const [cRes, clRes] = await Promise.all([API.getCampaigns(), API.getClients()]);
  const campaigns = cRes.success ? cRes.data : [];
  const clients   = clRes.success ? clRes.data : [];
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const tabs     = ['active','paused','completed','all'];
  const tabLabel = ['▶ Active','⏸ Paused','✓ Completed','All'];
  const tabHtml  = tabs.map((t,i) => `<div class="tab${t===State.campaignsTab?' active':''}" onclick="setCampaignsTab('${t}')">${tabLabel[i]}</div>`).join('');

  const filtered = State.campaignsTab === 'all' ? campaigns : campaigns.filter(c => c.status === State.campaignsTab);

  const totalActive    = campaigns.filter(c => c.status === 'active').length;
  const totalDelivered = campaigns.reduce((a,b) => a + (b.delivered||0), 0);
  const totalTarget    = campaigns.reduce((a,b) => a + (b.target||0), 0);
  const avgAcceptance  = campaigns.length ? Math.round(campaigns.reduce((a,b) => a + (b.acceptance_rate||0), 0) / campaigns.length) : 0;
  const totalValue     = campaigns.reduce((a,b) => a + ((b.delivered||0)*(b.cpl||0)), 0);

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
  : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--t3)">No ${State.campaignsTab === 'all' ? '' : State.campaignsTab + ' '}campaigns yet.<br><span class="fs12">Add a client first, then create a campaign.</span></td></tr>`;

  return `<div class="fade">
    <div class="g4 mb20">
      ${kpi('Active Campaigns', String(totalActive), null, '', '📋', 'var(--acc)')}
      ${kpi('Total Delivered', String(totalDelivered), null, `of ${totalTarget} target`, '🎯', 'var(--grn)')}
      ${kpi('Avg Acceptance', avgAcceptance+'%', null, 'across all campaigns', '✓', 'var(--cyn)')}
      ${kpi('Pipeline Value', '$'+totalValue.toLocaleString(), null, 'delivered × CPL', '💰', 'var(--yel)')}
    </div>
    <div class="sec-hdr mb16">
      <div class="tabs" style="margin:0">${tabHtml}</div>
      <button class="btn btn-pri btn-sm" onclick="alert('Add client first, then create campaign')">+ New Campaign</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap"><table>
        <thead><tr><th>Campaign / Client</th><th>Status</th><th>Progress</th><th>Pacing</th><th>CPL</th><th>Acceptance</th><th>Dates</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>
  </div>`;
}

function viewCampaign(id) {
  // TODO: campaign detail view
  alert('Campaign detail view coming soon');
}

window.setCampaignsTab = setCampaignsTab;
window.renderCampaigns = renderCampaigns;
window.viewCampaign    = viewCampaign;

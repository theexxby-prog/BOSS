// Lead Operations module

function setLeadsTab(t) { State.leadsTab = t; renderModule('leads'); }

async function renderLeads() {
  const [lRes, qaRes, cRes] = await Promise.all([
    API.getLeads(),
    API.getQAQueue(),
    API.getCampaigns(),
  ]);
  const allLeads  = lRes.success  ? lRes.data  : [];
  const qaLeads   = qaRes.success ? qaRes.data : [];
  const campaigns = cRes.success  ? cRes.data  : [];

  const approved  = allLeads.filter(l => l.status === 'approved').length;
  const rejected  = allLeads.filter(l => l.status === 'rejected').length;
  const pending   = allLeads.filter(l => l.status === 'pending').length;

  const tabs      = ['pipeline','qa_queue','all_leads','delivery'];
  const tabLabels = ['📡 Pipeline', `🔍 QA Queue${qaLeads.length?` (${qaLeads.length})`:''}`, '📋 All Leads', '📤 Delivery'];
  const tabHtml   = tabs.map((t,i) => `<div class="tab${t===State.leadsTab?' active':''}" onclick="setLeadsTab('${t}')">${tabLabels[i]}</div>`).join('');

  // Update QA badge
  const qaBadge = document.getElementById('qa-badge');
  if (qaBadge) { qaBadge.textContent = qaLeads.length || ''; qaBadge.style.display = qaLeads.length ? '' : 'none'; }

  let inner = '';

  if (State.leadsTab === 'pipeline') {
    const rows = campaigns.length ? campaigns.map(c => {
      const pct = c.target > 0 ? Math.round(c.delivered / c.target * 100) : 0;
      const fillColor = c.pacing === 'behind' ? 'var(--yel)' : 'var(--acc)';
      return `<tr>
        <td><div class="fw7 fs13">${c.name}</div><div class="fs11" style="color:var(--t3)">${c.asset_name||'—'}</div></td>
        <td class="fs12">${c.client_name||'—'}</td>
        <td style="min-width:140px">
          <div class="flex fxb fs11 mb4"><span style="color:var(--t3)">${c.delivered}/${c.target}</span><span class="fw7">${pct}%</span></div>
          <div class="prog"><div class="prog-fill" style="width:${pct}%;background:${fillColor}"></div></div>
        </td>
        <td class="${(c.acceptance_rate||0)>=90?'clr-grn':(c.acceptance_rate||0)>=80?'clr-yel':'clr-red'} fw7">${c.acceptance_rate||0}%</td>
        <td class="fw7 clr-grn">$${c.cpl}</td>
        <td>${statusBadge(c.status)}</td>
        <td>${pacingBadge(c.pacing)}</td>
      </tr>`;
    }).join('')
    : `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--t3)">No campaigns yet.</td></tr>`;

    inner = `
      <div class="g4 mb20">
        ${kpi('Total Leads', String(allLeads.length), null, 'in pipeline', '🎯', 'var(--acc)')}
        ${kpi('Approved', String(approved), null, 'ready to deliver', '✓', 'var(--grn)')}
        ${kpi('QA Queue', String(qaLeads.length), null, 'need review', '🔍', 'var(--yel)')}
        ${kpi('Rejected', String(rejected), null, 'below threshold', '✕', 'var(--red)')}
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Campaign</th><th>Client</th><th>Progress</th><th>Acceptance</th><th>CPL</th><th>Status</th><th>Pacing</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  if (State.leadsTab === 'qa_queue') {
    const cards = qaLeads.length ? qaLeads.map(l => {
      const scoreColor = l.icp_score>=90?'var(--grn)':l.icp_score>=80?'var(--yel)':'var(--red)';
      const r = 20, circ = 2*Math.PI*r, dash = (l.icp_score/100)*circ;
      return `<div class="qa-card">
        <div class="qa-hdr">
          <div>
            <div class="qa-name">${l.first_name} ${l.last_name}</div>
            <div class="qa-sub">${l.title} at <strong>${l.company}</strong></div>
          </div>
          <div class="flex fxc gap8">
            <svg width="50" height="50" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="${r}" fill="none" stroke="var(--brd)" stroke-width="4"/>
              <circle cx="25" cy="25" r="${r}" fill="none" stroke="${scoreColor}" stroke-width="4"
                stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ/4}" stroke-linecap="round" transform="rotate(-90 25 25)"/>
              <text x="25" y="29" text-anchor="middle" style="fill:${scoreColor};font-size:12px;font-weight:800;font-family:inherit">${l.icp_score}</text>
            </svg>
            <div class="fs11" style="color:var(--t3)">ICP<br>Score</div>
          </div>
        </div>
        <div class="qa-fields">
          <div><div class="qf-label">Industry</div><div class="qf-val">${l.industry||'—'}</div></div>
          <div><div class="qf-label">Company Size</div><div class="qf-val">${l.company_size||'—'}</div></div>
          <div><div class="qf-label">Country</div><div class="qf-val">${l.country||'—'}</div></div>
          <div><div class="qf-label">Email</div><div class="qf-val fs11">${l.email}</div></div>
          <div><div class="qf-label">Campaign</div><div class="qf-val fs11">${l.campaign_name||'—'}</div></div>
          <div><div class="qf-label">Source</div><div class="qf-val">${l.source||'—'}</div></div>
        </div>
        <div class="qa-actions">
          <button class="btn btn-grn btn-sm" onclick="approveLead(${l.id})">✓ Approve</button>
          <button class="btn btn-red btn-sm" onclick="rejectLead(${l.id})">✕ Reject</button>
          <button class="btn btn-ghost btn-sm" onclick="scoreLead(${l.id})">↻ Re-score</button>
          ${l.email_verified?'<span class="badge b-grn" style="margin-left:auto">✉ Verified</span>':''}
          <span class="badge b-blu">✓ Consent</span>
        </div>
      </div>`;
    }).join('')
    : `<div class="alert a-grn">✅ QA queue is clear. All leads have been reviewed.</div>`;

    const autoDelivered = allLeads.filter(l => l.icp_score >= 90 && l.status === 'approved').length;
    inner = `
      ${autoDelivered?`<div class="alert a-blu mb16">🤖 ${autoDelivered} leads auto-approved (90%+ ICP score). ${qaLeads.length} leads queued for your review.</div>`:''}
      ${cards}`;
  }

  if (State.leadsTab === 'all_leads') {
    const rows = allLeads.map(l => `<tr>
      <td class="fw7">${l.first_name} ${l.last_name}</td>
      <td style="color:var(--t2)">${l.title}</td>
      <td>${l.company}</td>
      <td class="fs12">${l.industry||'—'}</td>
      <td style="font-family:monospace;font-size:11px;color:var(--t3)">${l.email}</td>
      <td><span style="font-weight:700;color:${(l.icp_score||0)>=90?'var(--grn)':(l.icp_score||0)>=70?'var(--yel)':'var(--red)'}">${l.icp_score||'—'}</span></td>
      <td>${statusBadge(l.status)}</td>
      <td class="fs11" style="color:var(--t3)">${fmtDate(l.captured_at)}</td>
    </tr>`).join('') || `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--t3)">No leads yet.</td></tr>`;

    inner = `
      <div class="sec-hdr mb16">
        <div><div class="sec-title">All Leads</div><div class="sec-sub">${allLeads.length} total</div></div>
        <button class="btn btn-ghost btn-sm">⬇ Export CSV</button>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Name</th><th>Title</th><th>Company</th><th>Industry</th><th>Email</th><th>Score</th><th>Status</th><th>Captured</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  if (State.leadsTab === 'delivery') {
    const delivered = allLeads.filter(l => l.status === 'delivered' || l.status === 'accepted');
    inner = `
      <div class="g4 mb20">
        ${kpi('Total Delivered', String(delivered.length), null, '', '📤', 'var(--grn)')}
        ${kpi('Accepted', String(allLeads.filter(l=>l.status==='accepted').length), null, '', '✅', 'var(--grn)')}
        ${kpi('Rejected', String(rejected), null, '', '❌', 'var(--red)')}
        ${kpi('Pending Delivery', String(approved), null, 'approved, not yet sent', '⏳', 'var(--yel)')}
      </div>
      <div class="alert a-yel">📤 Delivery to client requires connecting your delivery method (Convertr, HubSpot, CSV). Configure in Settings.</div>`;
  }

  return `<div class="fade"><div class="tabs">${tabHtml}</div>${inner}</div>`;
}

async function approveLead(id) {
  await API.updateLead(id, { status: 'approved' });
  renderModule('leads');
}

async function rejectLead(id) {
  const reason = prompt('Rejection reason (optional):') || 'Does not meet ICP';
  await API.updateLead(id, { status: 'rejected', rejection_reason: reason });
  renderModule('leads');
}

async function scoreLead(id) {
  const res = await API.scoreLead(id);
  if (res.success) alert(`ICP Score: ${res.score} → ${res.status}`);
  renderModule('leads');
}

window.setLeadsTab  = setLeadsTab;
window.renderLeads  = renderLeads;
window.approveLead  = approveLead;
window.rejectLead   = rejectLead;
window.scoreLead    = scoreLead;

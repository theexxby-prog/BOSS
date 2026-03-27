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

  const tabs      = ['pipeline','qa_queue','all_leads','delivery','campaign_leads'];
  const tabLabels = ['📡 Campaign Status', `🔍 QA Queue${qaLeads.length?` (${qaLeads.length})`:''}`, '📋 ICP Leads', '📤 Delivery Log', '🔗 Pipeline Leads'];
  // First 4 tabs = ICP scoring model (leads table). Last tab = campaign delivery pipeline (campaign_leads table).
  const DIVIDER = `<span style="display:inline-flex;align-items:center;padding:0 4px;color:var(--border-strong);font-size:14px;user-select:none" title="ICP scoring model ↑  |  Campaign delivery pipeline ↓">│</span>`;
  const tabHtml = tabs.map((t,i) =>
    (i === 4 ? DIVIDER : '') +
    `<div class="tab${t===State.leadsTab?' active':''}" onclick="setLeadsTab('${t}')">${tabLabels[i]}</div>`
  ).join('');

  // Update QA badge
  const qaBadge = document.getElementById('qa-badge');
  if (qaBadge) { qaBadge.textContent = qaLeads.length || ''; qaBadge.style.display = qaLeads.length ? '' : 'none'; }

  let inner = '';

  if (State.leadsTab === 'pipeline') {
    const rows = campaigns.length ? campaigns.map(c => {
      const pct = c.target > 0 ? Math.round(c.delivered / c.target * 100) : 0;
      const fillColor = c.pacing === 'behind' ? 'var(--amber-600)' : 'var(--blue-600)';
      return `<tr>
        <td><div class="fw5 fs13">${c.name}</div><div class="fs11" style="color:var(--t3)">${c.asset_name||'—'}</div></td>
        <td class="fs12">${c.client_name||'—'}</td>
        <td style="min-width:140px">
          <div class="flex fxb fs11 mb4"><span style="color:var(--t3)">${c.delivered}/${c.target}</span><span class="fw5">${pct}%</span></div>
          <div class="prog"><div class="prog-fill" style="width:${pct}%;background:${fillColor}"></div></div>
        </td>
        <td class="${(c.acceptance_rate||0)>=90?'clr-grn':(c.acceptance_rate||0)>=80?'clr-yel':'clr-red'} fw5">${c.acceptance_rate||0}%</td>
        <td class="fw5 clr-grn">$${c.cpl}</td>
        <td>${statusBadge(c.status)}</td>
        <td>${pacingBadge(c.pacing)}</td>
      </tr>`;
    }).join('')
    : `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--t3)">No campaigns yet.</td></tr>`;

    inner = `
      <div class="g4 mb20">
        ${kpi('Total Leads', String(allLeads.length), null, 'in pipeline', '🎯', 'var(--blue-600)')}
        ${kpi('Approved', String(approved), null, 'ready to deliver', '✓', 'var(--green-600)')}
        ${kpi('QA Queue', String(qaLeads.length), null, 'need review', '🔍', 'var(--amber-600)')}
        ${kpi('Rejected', String(rejected), null, 'below threshold', '✕', 'var(--red-600)')}
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
      const scoreColor = l.icp_score>=90?'var(--green-600)':l.icp_score>=80?'var(--amber-600)':'var(--red-600)';
      const r = 20, circ = 2*Math.PI*r, dash = (l.icp_score/100)*circ;
      return `<div class="qa-card">
        <div class="qa-hdr">
          <div>
            <div class="qa-name">${l.first_name} ${l.last_name}</div>
            <div class="qa-sub">${l.title} at <strong>${l.company}</strong></div>
          </div>
          <div class="flex fxc gap8">
            <svg width="50" height="50" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="${r}" fill="none" stroke="var(--border)" stroke-width="4"/>
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
          ${l.email_verified?'<span class="badge badge-green" style="margin-left:auto">✉ Verified</span>':''}
          <span class="badge badge-blue">✓ Consent</span>
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
      <td class="fw5">${l.first_name} ${l.last_name}</td>
      <td style="color:var(--t2)">${l.title}</td>
      <td>${l.company}</td>
      <td class="fs12">${l.industry||'—'}</td>
      <td style="font-family:monospace;font-size:11px;color:var(--t3)">${l.email}</td>
      <td><span style="font-weight:500;color:${(l.icp_score||0)>=90?'var(--green-600)':(l.icp_score||0)>=70?'var(--amber-600)':'var(--red-600)'}">${l.icp_score||'—'}</span></td>
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
        ${kpi('Total Delivered', String(delivered.length), null, '', '📤', 'var(--green-600)')}
        ${kpi('Accepted', String(allLeads.filter(l=>l.status==='accepted').length), null, '', '✅', 'var(--green-600)')}
        ${kpi('Rejected', String(rejected), null, '', '❌', 'var(--red-600)')}
        ${kpi('Pending Delivery', String(approved), null, 'approved, not yet sent', '⏳', 'var(--amber-600)')}
      </div>
      <div class="alert a-yel">📤 Delivery to client requires connecting your delivery method (Convertr, HubSpot, CSV). Configure in Settings.</div>`;
  }

  if (State.leadsTab === 'campaign_leads') {
    const params  = State.clCampaignFilter ? `?campaign_id=${State.clCampaignFilter}` : '';
    const clRes   = await API.getCampaignLeads(params);
    const clLeads = clRes.success ? clRes.data : [];

    const campaignOptions = ['<option value="">All Campaigns</option>']
      .concat(campaigns.map(c => `<option value="${c.id}" ${String(c.id) === String(State.clCampaignFilter) ? 'selected' : ''}>${c.name}</option>`))
      .join('');

    const qaStatusBadge = (s) => {
      if (!s || s === 'pending') return `<span class="badge badge-amber">pending</span>`;
      if (s === 'approved')      return `<span class="badge badge-green">approved</span>`;
      if (s === 'rejected')      return `<span class="badge badge-red">rejected</span>`;
      return `<span class="badge">${s}</span>`;
    };

    const clStatusBadge = (s) => {
      if (s === 'pending')   return `<span class="badge badge-amber">pending</span>`;
      if (s === 'delivered') return `<span class="badge badge-blue">delivered</span>`;
      if (s === 'accepted')  return `<span class="badge badge-green">accepted</span>`;
      if (s === 'rejected')  return `<span class="badge badge-red">rejected</span>`;
      return `<span class="badge">${s}</span>`;
    };

    const billingBadge = (s) => {
      if (s === 'billable')     return `<span class="badge badge-green">billable</span>`;
      if (s === 'non-billable') return `<span class="badge badge-red">non-billable</span>`;
      return `<span class="badge badge-amber">${s||'—'}</span>`;
    };

    const rows = clLeads.length ? clLeads.map(l => {
      const canQA      = !l.qa_status || l.qa_status === 'pending';
      const canDeliver = l.qa_status === 'approved' && l.status === 'pending';
      const canAccept  = l.status === 'delivered';
      const canBilling = l.status === 'accepted';
      return `<tr>
        <td class="fs12" style="font-family:monospace;color:var(--t2)">${l.email}</td>
        <td class="fs12">${l.campaign_name||'—'}</td>
        <td>${qaStatusBadge(l.qa_status)}</td>
        <td>${clStatusBadge(l.status)}</td>
        <td>${billingBadge(l.billing_status)}</td>
        <td class="fs12 fw5 clr-grn">${l.price_at_acceptance != null ? '$'+l.price_at_acceptance : '—'}</td>
        <td>
          <div class="flex gap6">
            ${canQA      ? `<button class="btn btn-ghost btn-sm fs11" onclick="clQA(${l.campaign_lead_id}, this)">Run QA</button>` : ''}
            ${canDeliver ? `<button class="btn btn-ghost btn-sm fs11" onclick="clDeliver(${l.campaign_lead_id}, this)">Deliver</button>` : ''}
            ${canAccept  ? `<button class="btn btn-ghost btn-sm fs11" onclick="clAccept(${l.campaign_lead_id})">Accept</button>` : ''}
            ${canBilling ? `<button class="btn btn-ghost btn-sm fs11" onclick="clBilling(${l.campaign_lead_id},'${l.billing_status}')">${l.billing_status === 'billable' ? 'Non-billable' : 'Billable'}</button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('')
    : `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--t3)">No campaign leads yet.</td></tr>`;

    inner = `
      <div class="sec-hdr mb16">
        <div><div class="sec-title">Campaign Leads</div><div class="sec-sub">${clLeads.length} lead${clLeads.length !== 1 ? 's' : ''}${State.clCampaignFilter ? ' in campaign' : ' across all campaigns'}</div></div>
        <select class="form-input" style="width:220px;padding:6px 10px;font-size:13px" onchange="setCLCampaignFilter(this.value)">${campaignOptions}</select>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Email</th><th>Campaign</th><th>QA Status</th><th>Status</th><th>Billing</th><th>Price</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  return `<div class="fade"><div class="tabs">${tabHtml}</div>${inner}</div>`;
}

async function approveLead(id) {
  await API.updateLead(id, { status: 'approved' });
  showToast('Lead approved');
  renderModule('leads');
}

function rejectLead(id) {
  showPromptModal({
    title: 'Reject Lead',
    label: 'Reason (optional)',
    placeholder: 'Does not meet ICP',
    confirmText: 'Reject',
    onConfirm: async (reason) => {
      await API.updateLead(id, { status: 'rejected', rejection_reason: reason || 'Does not meet ICP' });
      showToast('Lead rejected', 'info');
      renderModule('leads');
    },
  });
}

async function scoreLead(id) {
  const res = await API.scoreLead(id);
  if (res.success) showToast(`ICP Score: ${res.score} → ${res.status}`);
  renderModule('leads');
}

function setCLCampaignFilter(val) { State.clCampaignFilter = val; renderModule('leads'); }

async function clQA(id, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }
  const res = await API.qaLead(id);
  if (!res.success) {
    if (btn) { btn.disabled = false; btn.textContent = 'Run QA'; }
    showToast('QA error: ' + (res.error || 'Unknown'), 'error');
    return;
  }
  showToast('QA complete — ' + (res.qa_status || 'done'));
  renderModule('leads');
}

async function clDeliver(id, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Delivering…'; }
  const res = await API.deliverLead(id);
  if (!res.success) {
    if (btn) { btn.disabled = false; btn.textContent = 'Deliver'; }
    showToast('Deliver error: ' + (res.error || 'Unknown'), 'error');
    return;
  }
  showToast('Lead delivered');
  renderModule('leads');
}

function clAccept(id) {
  showPromptModal({
    title: 'Accept Lead',
    label: 'Price per lead ($)',
    placeholder: '0.00',
    type: 'number',
    confirmText: 'Accept',
    onConfirm: async (priceStr) => {
      const price = parseFloat(priceStr);
      if (isNaN(price) || price < 0) throw new Error('Enter a valid price (0 or more)');
      const res = await API.acceptLead(id, { price });
      if (!res.success) throw new Error(res.error || 'Accept failed');
      showToast('Lead accepted');
      renderModule('leads');
    },
  });
}

function clBilling(id, current) {
  const next = current === 'billable' ? 'non-billable' : 'billable';
  showPromptModal({
    title: `Override billing → ${next}`,
    label: 'Reason (optional)',
    placeholder: 'e.g. Duplicate, wrong target…',
    confirmText: 'Override',
    onConfirm: async (reason) => {
      const res = await API.billingOverride(id, { billing_status: next, reason, overridden_by: 'Vishal' });
      if (!res.success) throw new Error(res.error || 'Override failed');
      showToast(`Marked ${next}`);
      renderModule('leads');
    },
  });
}

window.setLeadsTab  = setLeadsTab;
window.renderLeads  = renderLeads;
window.approveLead  = approveLead;
window.rejectLead   = rejectLead;
window.scoreLead    = scoreLead;
window.setCLCampaignFilter = setCLCampaignFilter;
window.clQA         = clQA;
window.clDeliver    = clDeliver;
window.clAccept     = clAccept;
window.clBilling    = clBilling;

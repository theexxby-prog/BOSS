// Finance & P&L module — v5 (with invoice generator + PDF)

const finClients = [
  { name: 'DemandScience', revenue: 11052 },
  { name: 'TechTarget',    revenue: 3840  },
  { name: 'NetLine',       revenue: 1280  },
  { name: 'Integrate.com', revenue: 2460  },
];

function setFinTab(t) { State.finTab = t; renderModule('finance'); }

async function renderFinance() {
  const tabs      = ['overview', 'invoices', 'expenses', 'subscriptions'];
  const tabLabels = ['P&amp;L Overview', 'Invoices', 'Expenses', 'Subscriptions'];
  const tabHtml   = tabs.map((t, i) => `<div class="tab${t === State.finTab ? ' active' : ''}" onclick="setFinTab('${t}')">${tabLabels[i]}</div>`).join('');

  let inner = '';

  if (State.finTab === 'overview') {
    const chartData = finClients.map(c => ({ label: c.name.split(' ')[0], val: c.revenue }));
    inner = `
      <div class="g4 mb20">
        ${kpi('Revenue (Mar)', '$14,800', '32',  'vs Feb', '', 'var(--green-600)')}
        ${kpi('Costs (Mar)',   '$820',    '-5',  'vs Feb', '', 'var(--red-600)')}
        ${kpi('Net Profit (Mar)', '$13,980', '34', 'vs Feb', '', 'var(--blue-600)')}
        ${kpi('Profit Margin', '94.5%',  '1.5', 'vs Feb', '', 'var(--blue-600)')}
      </div>
      <div class="g2 mb16">
        <div class="card">
          <div class="sec-title mb12">Year-to-Date P&amp;L</div>
          <div class="mrow"><span class="mlabel">Total Revenue</span><span class="mval fw8" style="font-size:18px;color:var(--green-600)">$38,800</span></div>
          <div class="mrow"><span class="mlabel">Total Costs</span><span class="mval" style="color:var(--red-600)">$2,280</span></div>
          <div class="mrow"><span class="mlabel">Gross Profit</span><span class="mval fw8" style="font-size:18px;color:var(--green-600)">$36,520</span></div>
          <div class="divider"></div>
          <div class="mrow"><span class="mlabel">Revenue / Lead</span><span class="mval">$5.82</span></div>
          <div class="mrow"><span class="mlabel">Cost / Lead</span><span class="mval">$0.54</span></div>
          <div class="mrow"><span class="mlabel">Profit / Lead</span><span class="mval" style="color:var(--green-600)">$5.28</span></div>
        </div>
        <div class="card">
          <div class="sec-title mb12">Revenue by Client</div>
          ${barChart(chartData, 340, 180)}
          <div class="flex fxc gap12 mt8" style="justify-content:center">
            ${chartData.map(d => `<div class="fs11" style="color:var(--text-tertiary)">${d.label}: <span class="fw7" style="color:var(--green-600)">$${d.val.toLocaleString()}</span></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="alert a-blu">On track for $18,000 revenue in March. Break-even at 70 leads/month — you're running at 38x break-even.</div>`;
  }

  if (State.finTab === 'subscriptions') {
    const res = await API.getSubscriptions();
    const subs = res.success ? res.data : [];
    const totalSubs = subs.reduce((a, b) => a + b.cost, 0);
    const catLabels = { email: 'Email', data: 'Data', hosting: 'Hosting', ai: 'AI', social: 'Social', other: 'Other' };
    const catBadge  = { email: 'badge-blue', data: 'badge-blue', hosting: 'badge-green', ai: 'badge-amber', social: 'badge-amber', other: 'badge-green' };
    const rows = subs.map(s => `<tr>
      <td class="fw7">${s.name}</td>
      <td><span class="badge ${catBadge[s.category] || 'badge-blue'}">${catLabels[s.category] || s.category}</span></td>
      <td class="fw7" style="color:var(--green-600)">${s.cost === 0 ? 'Usage' : '$' + s.cost}</td>
      <td class="fs12" style="color:${s.renewal_date <= '2026-04-05' ? 'var(--amber-600)' : 'var(--text-secondary)'}">${fmtDate(s.renewal_date)}</td>
      <td><span class="badge badge-green">Active</span></td>
      <td><button class="btn btn-ghost btn-sm">Edit</button></td>
    </tr>`).join('');
    const aprilCount = subs.filter(s => s.renewal_date <= '2026-04-05' && s.cost > 0);
    const aprilTotal = aprilCount.reduce((a, b) => a + b.cost, 0);
    inner = `
      <div class="sec-hdr mb16"><div><div class="sec-title">Subscription Tracker</div><div class="sec-sub">$${totalSubs}/mo</div></div><button class="btn btn-ghost btn-sm">+ Add</button></div>
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Tool</th><th>Category</th><th>Cost/mo</th><th>Renewal</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}
            <tr style="background:var(--bg-muted)"><td colspan="2" class="fw7" style="font-size:14px">TOTAL</td><td class="fw8" style="font-size:15px;color:var(--green-600)">$${totalSubs}/mo</td><td colspan="3"></td></tr>
          </tbody>
        </table></div>
      </div>
      ${aprilCount.length ? `<div class="alert a-yel">${aprilCount.length} subscriptions renewing soon. Total: $${aprilTotal}.</div>` : ''}`;
  }

  if (State.finTab === 'invoices') {
    const [invRes, clRes, cmpRes] = await Promise.all([API.getInvoices(), API.getClients(), API.getCampaigns()]);
    const invoices  = invRes.success ? invRes.data : [];
    const clients   = clRes.success ? clRes.data : [];
    const campaigns = cmpRes.success ? cmpRes.data : [];
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

    const statusBdg = { paid: 'badge-green', sent: 'badge-amber', overdue: 'badge-red', draft: 'badge-blue', cancelled: 'badge-red' };
    const statusLbl = { paid: 'Paid', sent: 'Sent', overdue: 'Overdue', draft: 'Draft', cancelled: 'Cancelled' };
    const rows = invoices.length
      ? invoices.map(inv => `<tr>
          <td style="font-family:monospace;font-size:11px">${inv.invoice_number}</td>
          <td>${clientMap[inv.client_id] || inv.client_name || 'Client #'+inv.client_id}</td>
          <td>${inv.leads_count} x $${inv.cpl}</td>
          <td class="fw7" style="color:var(--green-600)">$${Number(inv.total).toLocaleString()}</td>
          <td class="fs12">${fmtDate(inv.created_at)}</td>
          <td><span class="badge ${statusBdg[inv.status] || 'badge-blue'}">${statusLbl[inv.status] || inv.status}</span></td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="downloadInvoicePDF(${inv.id})">PDF</button>
            ${inv.status==='draft'?`<button class="btn btn-ghost btn-sm" onclick="markInvoiceSent(${inv.id})">Send</button>`:''}
            ${inv.status==='sent'?`<button class="btn btn-ghost btn-sm" onclick="markInvoicePaid(${inv.id})">Mark Paid</button>`:''}
          </td>
        </tr>`).join('')
      : '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-tertiary)">No invoices yet — generate one from a completed campaign.</td></tr>';

    // Completed campaigns available for invoicing
    const completedCampaigns = campaigns.filter(c => c.status === 'completed');

    inner = `
      <div class="sec-hdr mb16">
        <div class="sec-title">Invoices</div>
        <button class="btn btn-pri" onclick="showInvoiceGenerator()">+ Generate Invoice</button>
      </div>
      ${completedCampaigns.length ? `<div class="alert a-blu mb16">${completedCampaigns.length} completed campaign${completedCampaigns.length>1?'s':''} available for invoicing.</div>` : ''}
      <div class="card" style="padding:0;overflow:hidden">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Invoice #</th><th>Client</th><th>Leads x CPL</th><th>Amount</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  if (State.finTab === 'expenses') {
    const res = await API.getExpenses();
    const expenses = res.success ? res.data : [];
    const catBadge = { tool: 'badge-blue', data: 'badge-blue', hosting: 'badge-green', other: 'badge-amber' };
    const rows = expenses.length
      ? expenses.map(e => `<tr>
          <td class="fs12">${fmtDate(e.date)}</td>
          <td><span class="badge ${catBadge[e.category] || 'badge-amber'}">${e.category}</span></td>
          <td>${e.description}</td>
          <td class="fw7" style="color:var(--red-600)">-$${e.amount}</td>
        </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-tertiary)">No expenses logged yet.</td></tr>';
    const total = expenses.reduce((a, b) => a + b.amount, 0);
    inner = `
      <div class="card">
        <div class="sec-hdr mb12"><div class="sec-title">Expense Log</div><button class="btn btn-ghost btn-sm">+ Add Expense</button></div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>${rows}
            ${total > 0 ? `<tr style="background:var(--bg-muted)"><td colspan="3" class="fw7">Total</td><td class="fw8" style="font-size:15px;color:var(--red-600)">-$${total}</td></tr>` : ''}
          </tbody>
        </table></div>
      </div>`;
  }

  return `<div class="fade"><div class="tabs">${tabHtml}</div>${inner}</div>`;
}

// ═══════════════════════════════════════════════════════════
// Invoice Generator Modal
// ═══════════════════════════════════════════════════════════
async function showInvoiceGenerator(preselectedClientId) {
  const [clRes, cmpRes] = await Promise.all([API.getClients(), API.getCampaigns()]);
  const clients   = clRes.success ? clRes.data : [];
  const campaigns = cmpRes.success ? cmpRes.data : [];

  const existing = document.getElementById('invoice-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'invoice-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  // Pre-build campaign options grouped by client
  const campaignsByClient = {};
  campaigns.forEach(c => {
    if (!campaignsByClient[c.client_id]) campaignsByClient[c.client_id] = [];
    campaignsByClient[c.client_id].push(c);
  });

  // Store for dynamic updates
  window._invoiceCampaigns = campaignsByClient;
  window._invoiceClients = clients;

  const clientOptions = clients.map(c => `<option value="${c.id}" ${preselectedClientId && String(preselectedClientId)===String(c.id)?'selected':''}>${c.name} (CPL: $${c.cpl})</option>`).join('');

  const today = new Date().toISOString().slice(0,10);
  const dueDate = new Date(Date.now() + 30*86400000).toISOString().slice(0,10);
  const invNum = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  overlay.innerHTML = `<div class="modal-box" style="max-width:520px;max-height:85vh;overflow-y:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div class="sec-title">Generate Invoice</div>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">Close</button>
    </div>
    <form id="invoice-form" onsubmit="createInvoice(event)">
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="form-row">
          <label class="form-label">Invoice Number</label>
          <input class="form-input" name="invoice_number" value="${invNum}" required/>
        </div>
        <div class="form-row">
          <label class="form-label">Client *</label>
          <select class="form-input" name="client_id" required onchange="updateInvoiceCampaigns(this.value)">
            <option value="">Select client...</option>
            ${clientOptions}
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Campaign <span class="fs11" style="color:var(--text-tertiary)">(optional — auto-fills leads & CPL)</span></label>
          <select class="form-input" name="campaign_id" id="inv-campaign-select" onchange="fillFromCampaign(this.value)">
            <option value="">Manual entry</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-row">
            <label class="form-label">Leads Count *</label>
            <input class="form-input" name="leads_count" id="inv-leads" type="number" required placeholder="500"/>
          </div>
          <div class="form-row">
            <label class="form-label">CPL ($) *</label>
            <input class="form-input" name="cpl" id="inv-cpl" type="number" step="0.01" required placeholder="6.00"/>
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">Total Amount</label>
          <input class="form-input" name="total" id="inv-total" type="number" step="0.01" required placeholder="Auto-calculated" style="font-weight:500;color:var(--green-600)"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-row">
            <label class="form-label">Period</label>
            <input class="form-input" name="period" type="month" value="${today.slice(0,7)}"/>
          </div>
          <div class="form-row">
            <label class="form-label">Due Date</label>
            <input class="form-input" name="due_date" type="date" value="${dueDate}"/>
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">Notes</label>
          <textarea class="form-input" name="notes" rows="2" placeholder="Payment terms, special notes..."></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-pri">Create Invoice</button>
        </div>
      </div>
    </form>
  </div>`;

  document.body.appendChild(overlay);

  // Auto-calculate total on input change
  const leadsInput = document.getElementById('inv-leads');
  const cplInput = document.getElementById('inv-cpl');
  const totalInput = document.getElementById('inv-total');
  const calcTotal = () => {
    const l = parseFloat(leadsInput.value) || 0;
    const c = parseFloat(cplInput.value) || 0;
    if (l && c) totalInput.value = (l * c).toFixed(2);
  };
  leadsInput.addEventListener('input', calcTotal);
  cplInput.addEventListener('input', calcTotal);

  // If preselected client, load their campaigns
  if (preselectedClientId) {
    updateInvoiceCampaigns(preselectedClientId);
  }
}

function updateInvoiceCampaigns(clientId) {
  const select = document.getElementById('inv-campaign-select');
  if (!select) return;
  const campaigns = (window._invoiceCampaigns || {})[clientId] || [];
  select.innerHTML = '<option value="">Manual entry</option>' +
    campaigns.map(c => `<option value="${c.id}">${c.name} (${c.status}) — ${c.delivered||0}/${c.target} leads</option>`).join('');

  // Auto-fill CPL from client
  const client = (window._invoiceClients || []).find(cl => String(cl.id) === String(clientId));
  if (client) {
    const cplInput = document.getElementById('inv-cpl');
    if (cplInput && !cplInput.value) cplInput.value = client.cpl;
  }
}

function fillFromCampaign(campaignId) {
  if (!campaignId) return;
  const clientId = document.querySelector('[name="client_id"]').value;
  const campaigns = (window._invoiceCampaigns || {})[clientId] || [];
  const c = campaigns.find(x => String(x.id) === String(campaignId));
  if (!c) return;
  document.getElementById('inv-leads').value = c.delivered || c.target || '';
  document.getElementById('inv-cpl').value = c.cpl || '';
  document.getElementById('inv-total').value = ((c.delivered || c.target || 0) * (c.cpl || 0)).toFixed(2);
}

async function createInvoice(e) {
  e.preventDefault();
  const form = document.getElementById('invoice-form');
  const fd = new FormData(form);

  const body = {
    client_id: parseInt(fd.get('client_id')),
    invoice_number: fd.get('invoice_number'),
    leads_count: parseInt(fd.get('leads_count')),
    cpl: parseFloat(fd.get('cpl')),
    total: parseFloat(fd.get('total')),
    due_date: fd.get('due_date') || null,
    period: fd.get('period') || null,
    notes: fd.get('notes') || null,
    status: 'draft',
  };

  const res = await API.createInvoice(body);
  if (res.success) {
    document.getElementById('invoice-modal-overlay')?.remove();
    renderModule('finance');
  } else {
    alert('Error: ' + (res.error || 'Unknown error'));
  }
}

async function markInvoiceSent(id) {
  await API.updateInvoice(id, { status: 'sent' });
  renderModule('finance');
}

async function markInvoicePaid(id) {
  await API.updateInvoice(id, { status: 'paid' });
  renderModule('finance');
}

// ═══════════════════════════════════════════════════════════
// Invoice PDF Generator — opens printable HTML in new window
// ═══════════════════════════════════════════════════════════
async function downloadInvoicePDF(invoiceId) {
  const [invRes, clRes] = await Promise.all([
    API.getInvoices(),
    API.getClients(),
  ]);
  const invoices = invRes.success ? invRes.data : [];
  const clients  = clRes.success ? clRes.data : [];
  const inv = invoices.find(i => i.id === invoiceId);
  if (!inv) { alert('Invoice not found'); return; }

  const client = clients.find(c => c.id === inv.client_id);
  const clientName = client?.name || inv.client_name || 'Client';
  const clientEmail = client?.contact_email || '';

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Invoice ${inv.invoice_number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; color:#1C1C1E; padding:48px; max-width:800px; margin:0 auto; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:48px; }
  .logo { font-size:28px; font-weight:500; letter-spacing:-0.5px; }
  .logo-sub { font-size:12px; color:#6B7280; margin-top:2px; }
  .inv-badge { font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.08em; padding:4px 12px; border-radius:6px; }
  .inv-paid { background:#EBFBEE; color:#2F9E44; }
  .inv-sent { background:#FFF9DB; color:#E67700; }
  .inv-draft { background:#EDF2FF; color:#3B5BDB; }
  .meta { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-bottom:40px; }
  .meta-group label { font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.06em; color:#9CA3AF; display:block; margin-bottom:4px; }
  .meta-group div { font-size:14px; line-height:1.6; }
  table { width:100%; border-collapse:collapse; margin-bottom:32px; }
  th { font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.06em; color:#9CA3AF; text-align:left; padding:10px 12px; border-bottom:1px solid #E5E7EB; }
  td { padding:14px 12px; border-bottom:1px solid #F3F4F6; font-size:14px; }
  .total-row td { border-top:2px solid #1C1C1E; border-bottom:none; font-weight:500; font-size:16px; padding-top:16px; }
  .footer { margin-top:48px; padding-top:24px; border-top:1px solid #E5E7EB; font-size:12px; color:#9CA3AF; text-align:center; }
  .notes { background:#F8F9FA; border-radius:8px; padding:16px; margin-bottom:32px; font-size:13px; color:#6B7280; }
  .notes-label { font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.06em; color:#9CA3AF; margin-bottom:6px; }
  @media print { body { padding:24px; } .no-print { display:none; } }
</style></head><body>
  <div class="no-print" style="text-align:right;margin-bottom:24px">
    <button onclick="window.print()" style="padding:8px 20px;background:#3B5BDB;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500">Print / Save PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="logo">BOSS HQ</div>
      <div class="logo-sub">Business Operating Single System</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:22px;font-weight:500;margin-bottom:4px">INVOICE</div>
      <div style="font-size:13px;color:#6B7280">${inv.invoice_number}</div>
      <div class="inv-badge ${inv.status==='paid'?'inv-paid':inv.status==='sent'?'inv-sent':'inv-draft'}" style="margin-top:8px;display:inline-block">${inv.status.toUpperCase()}</div>
    </div>
  </div>
  <div class="meta">
    <div>
      <div class="meta-group"><label>Bill To</label><div><strong>${clientName}</strong>${clientEmail?'<br>'+clientEmail:''}</div></div>
    </div>
    <div style="text-align:right">
      <div class="meta-group"><label>Invoice Date</label><div>${new Date(inv.created_at).toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'})}</div></div>
      ${inv.due_date ? `<div class="meta-group" style="margin-top:12px"><label>Due Date</label><div>${new Date(inv.due_date).toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'})}</div></div>` : ''}
      ${inv.period ? `<div class="meta-group" style="margin-top:12px"><label>Period</label><div>${inv.period}</div></div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      <tr>
        <td>Lead Generation Services<br><span style="font-size:12px;color:#9CA3AF">${clientName} — ${inv.period || 'Current period'}</span></td>
        <td style="text-align:right">${inv.leads_count.toLocaleString()}</td>
        <td style="text-align:right">$${Number(inv.cpl).toFixed(2)}</td>
        <td style="text-align:right">$${Number(inv.total).toLocaleString()}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align:right">Total Due</td>
        <td style="text-align:right">$${Number(inv.total).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>
  ${inv.notes ? `<div class="notes"><div class="notes-label">Notes</div>${inv.notes}</div>` : ''}
  <div class="footer">
    BOSS HQ — Generated ${new Date().toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'})}
  </div>
</body></html>`);
  printWindow.document.close();
}

window.setFinTab            = setFinTab;
window.renderFinance        = renderFinance;
window.showInvoiceGenerator = showInvoiceGenerator;
window.updateInvoiceCampaigns = updateInvoiceCampaigns;
window.fillFromCampaign     = fillFromCampaign;
window.createInvoice        = createInvoice;
window.markInvoiceSent      = markInvoiceSent;
window.markInvoicePaid      = markInvoicePaid;
window.downloadInvoicePDF   = downloadInvoicePDF;

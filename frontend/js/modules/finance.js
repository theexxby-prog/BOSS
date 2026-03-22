// Finance & P&L module

const finClients = [
  { name: 'DemandScience', revenue: 11052 },
  { name: 'TechTarget',    revenue: 3840  },
  { name: 'NetLine',       revenue: 1280  },
  { name: 'Integrate.com', revenue: 2460  },
];

function setFinTab(t) { State.finTab = t; renderModule('finance'); }

async function renderFinance() {
  const tabs      = ['overview', 'invoices', 'expenses', 'subscriptions'];
  const tabLabels = ['📊 P&amp;L Overview', '📄 Invoices', '💸 Expenses', '🔄 Subscriptions'];
  const tabHtml   = tabs.map((t, i) => `<div class="tab${t === State.finTab ? ' active' : ''}" onclick="setFinTab('${t}')">${tabLabels[i]}</div>`).join('');

  let inner = '';

  if (State.finTab === 'overview') {
    const chartData = finClients.map(c => ({ label: c.name.split(' ')[0], val: c.revenue }));
    inner = `
      <div class="g4 mb20">
        ${kpi('Revenue (Mar)', '$14,800', '32',  'vs Feb', '💰', 'var(--grn)')}
        ${kpi('Costs (Mar)',   '$820',    '-5',  'vs Feb', '💸', 'var(--red)')}
        ${kpi('Net Profit (Mar)', '$13,980', '34', 'vs Feb', '📈', 'var(--cyn)')}
        ${kpi('Profit Margin', '94.5%',  '1.5', 'vs Feb', '🎯', 'var(--acc)')}
      </div>
      <div class="g2 mb16">
        <div class="card">
          <div class="sec-title mb12">Year-to-Date P&amp;L</div>
          <div class="mrow"><span class="mlabel">Total Revenue</span><span class="mval clr-grn fw8" style="font-size:18px">$38,800</span></div>
          <div class="mrow"><span class="mlabel">Total Costs</span><span class="mval clr-red">$2,280</span></div>
          <div class="mrow"><span class="mlabel">Gross Profit</span><span class="mval clr-grn fw8" style="font-size:18px">$36,520</span></div>
          <div class="divider"></div>
          <div class="mrow"><span class="mlabel">Revenue / Lead</span><span class="mval">$5.82</span></div>
          <div class="mrow"><span class="mlabel">Cost / Lead</span><span class="mval">$0.54</span></div>
          <div class="mrow"><span class="mlabel">Profit / Lead</span><span class="mval clr-grn">$5.28</span></div>
        </div>
        <div class="card">
          <div class="sec-title mb12">Revenue by Client</div>
          ${barChart(chartData, 340, 180)}
          <div class="flex fxc gap12 mt8" style="justify-content:center">
            ${chartData.map(d => `<div class="fs11" style="color:var(--t3)">${d.label}: <span class="fw7 clr-grn">$${d.val.toLocaleString()}</span></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="alert a-blu">📊 On track for $18,000 revenue in March. Break-even at 70 leads/month — you're running at 38× break-even.</div>`;
  }

  if (State.finTab === 'subscriptions') {
    const res = await API.getSubscriptions();
    const subs = res.success ? res.data : [];
    const totalSubs = subs.reduce((a, b) => a + b.cost, 0);
    const catLabels = { email: 'Email', data: 'Data', hosting: 'Hosting', ai: 'AI', social: 'Social', other: 'Other' };
    const catBadge  = { email: 'b-blu', data: 'b-cyn', hosting: 'b-grn', ai: 'b-acc', social: 'b-yel', other: 'b-grn' };
    const rows = subs.map(s => `<tr>
      <td class="fw7">${s.name}</td>
      <td><span class="badge ${catBadge[s.category] || 'b-acc'}">${catLabels[s.category] || s.category}</span></td>
      <td class="fw7 clr-grn">${s.cost === 0 ? 'Usage' : '$' + s.cost}</td>
      <td class="fs12" style="color:${s.renewal_date <= '2026-04-05' ? 'var(--yel)' : 'var(--t2)'}">${fmtDate(s.renewal_date)}</td>
      <td><span class="badge b-grn">● Active</span></td>
      <td><button class="btn btn-ghost btn-sm">Edit</button></td>
    </tr>`).join('');
    const aprilCount = subs.filter(s => s.renewal_date <= '2026-04-05' && s.cost > 0);
    const aprilTotal = aprilCount.reduce((a, b) => a + b.cost, 0);
    inner = `
      <div class="sec-hdr mb16"><div><div class="sec-title">Subscription Tracker</div><div class="sec-sub">$${totalSubs}/mo · ~$${totalSubs * 12}/yr</div></div><button class="btn btn-ghost btn-sm">+ Add</button></div>
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Tool</th><th>Category</th><th>Cost/mo</th><th>Renewal</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}
            <tr style="background:var(--card2)"><td colspan="2" class="fw7" style="font-size:14px">TOTAL</td><td class="fw8 clr-grn" style="font-size:15px">$${totalSubs}/mo</td><td colspan="3"></td></tr>
          </tbody>
        </table></div>
      </div>
      ${aprilCount.length ? `<div class="alert a-yel">⚠️ ${aprilCount.length} subscriptions renewing soon. Total: $${aprilTotal}.</div>` : ''}`;
  }

  if (State.finTab === 'invoices') {
    const res = await API.getInvoices();
    const invoices = res.success ? res.data : [];
    const statusBadge = { paid: 'b-grn', sent: 'b-yel', overdue: 'b-red', draft: 'b-acc', cancelled: 'b-red' };
    const statusLabel = { paid: '✓ Paid', sent: '⏳ Sent', overdue: '⚠️ Overdue', draft: '📝 Draft', cancelled: '✗ Cancelled' };
    const rows = invoices.length
      ? invoices.map(inv => `<tr>
          <td style="font-family:monospace;font-size:11px">${inv.invoice_number}</td>
          <td>${inv.client_id}</td>
          <td>${inv.leads_count} × $${inv.cpl}</td>
          <td class="fw7 clr-grn">$${inv.total.toLocaleString()}</td>
          <td class="fs12">${fmtDate(inv.created_at)}</td>
          <td><span class="badge ${statusBadge[inv.status] || 'b-acc'}">${statusLabel[inv.status] || inv.status}</span></td>
          <td><button class="btn btn-ghost btn-sm">PDF</button></td>
        </tr>`).join('')
      : '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--t3)">No invoices yet — create your first campaign and generate an invoice.</td></tr>';
    inner = `
      <div class="sec-hdr mb16"><div class="sec-title">Invoices</div><button class="btn btn-pri">+ Generate Invoice</button></div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Invoice #</th><th>Client</th><th>Leads × CPL</th><th>Amount</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  if (State.finTab === 'expenses') {
    const res = await API.getExpenses();
    const expenses = res.success ? res.data : [];
    const catBadge = { tool: 'b-blu', data: 'b-cyn', hosting: 'b-grn', other: 'b-acc' };
    const rows = expenses.length
      ? expenses.map(e => `<tr>
          <td class="fs12">${fmtDate(e.date)}</td>
          <td><span class="badge ${catBadge[e.category] || 'b-acc'}">${e.category}</span></td>
          <td>${e.description}</td>
          <td class="fw7 clr-red">-$${e.amount}</td>
        </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--t3)">No expenses logged yet.</td></tr>';
    const total = expenses.reduce((a, b) => a + b.amount, 0);
    inner = `
      <div class="card">
        <div class="sec-hdr mb12"><div class="sec-title">Expense Log</div><button class="btn btn-ghost btn-sm">+ Add Expense</button></div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>${rows}
            ${total > 0 ? `<tr style="background:var(--card2)"><td colspan="3" class="fw7">Total</td><td class="fw8 clr-red" style="font-size:15px">-$${total}</td></tr>` : ''}
          </tbody>
        </table></div>
      </div>`;
  }

  return `<div class="fade"><div class="tabs">${tabHtml}</div>${inner}</div>`;
}

window.setFinTab     = setFinTab;
window.renderFinance = renderFinance;

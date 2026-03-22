// Documents module

function setDocsTab(t) { State.docsTab = t; renderModule('documents'); }

async function renderDocuments() {
  const [dRes, clRes, jRes] = await Promise.all([
    API.getDocuments(),
    API.getClients(),
    API.getJobCards(),
  ]);
  const docs     = dRes.success ? dRes.data : [];
  const clients  = clRes.success ? clRes.data : [];
  const jobCards = jRes.success ? jRes.data : [];
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const tabs     = ['all','invoice','msa','insertion_order','job_card'];
  const tabLabel = ['All','Invoices','MSAs','Insertion Orders','Job Cards'];
  const tabHtml  = tabs.map((t,i) => `<div class="tab${t===State.docsTab?' active':''}" onclick="setDocsTab('${t}')">${tabLabel[i]}</div>`).join('');

  const filtered = State.docsTab === 'all' ? docs : docs.filter(d => d.type === State.docsTab);

  const typeIcon   = { invoice:'🧾', msa:'📝', insertion_order:'📋', job_card:'🗂️', nda:'🔒', other:'📄' };
  const statusCls  = { draft:'b-acc', sent:'b-yel', signed:'b-grn', paid:'b-grn', cancelled:'b-red' };
  const statusIcon = { draft:'📝 Draft', sent:'📤 Sent', signed:'✅ Signed', paid:'✓ Paid', cancelled:'✗ Cancelled' };

  const docRows = filtered.length ? filtered.map(d => `
    <tr>
      <td><div class="fw7">${typeIcon[d.type]||'📄'} ${d.title}</div><div class="fs11" style="color:var(--t3)">${clientMap[d.client_id]||'—'}</div></td>
      <td><span class="badge b-blu">${d.type.replace('_',' ')}</span></td>
      <td><span class="badge ${statusCls[d.status]||'b-acc'}">${statusIcon[d.status]||d.status}</span></td>
      <td class="fs12" style="color:var(--t3)">${fmtDate(d.created_at)}</td>
      <td class="fs12" style="color:${d.due_date&&d.due_date<new Date().toISOString().slice(0,10)?'var(--red)':'var(--t3)'}">${fmtDate(d.due_date)}</td>
      <td>
        <button class="btn btn-ghost btn-sm">View</button>
        <button class="btn btn-ghost btn-sm">Send</button>
      </td>
    </tr>`).join('')
  : `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--t3)">No documents yet.<br><span class="fs12">Generate an invoice, MSA, or job card to get started.</span></td></tr>`;

  // Job Cards panel
  const jcRows = jobCards.length ? jobCards.map(j => `
    <tr>
      <td class="fw7">${j.title}</td>
      <td class="fs12" style="color:var(--t3)">${clientMap[j.client_id]||'—'}</td>
      <td>${j.target_leads} leads × $${j.cpl} = <span class="fw7 clr-grn">$${j.total_value||0}</span></td>
      <td><span class="badge ${j.status==='active'?'b-grn':j.status==='draft'?'b-acc':'b-yel'}">${j.status}</span></td>
      <td>${fmtDate(j.start_date)} → ${fmtDate(j.end_date)}</td>
      <td><button class="btn btn-ghost btn-sm">View</button></td>
    </tr>`).join('')
  : `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--t3)">No job cards yet.</td></tr>`;

  return `<div class="fade">
    <div class="g3 mb20">
      ${kpi('Total Documents', String(docs.length), null, '', '📄', 'var(--acc)')}
      ${kpi('Pending Signature', String(docs.filter(d=>d.status==='sent').length), null, '', '✍️', 'var(--yel)')}
      ${kpi('Active Job Cards', String(jobCards.filter(j=>j.status==='active').length), null, '', '🗂️', 'var(--grn)')}
    </div>
    <div class="sec-hdr mb12">
      <div class="tabs" style="margin:0">${tabHtml}</div>
      <div class="flex gap8">
        <button class="btn btn-ghost btn-sm" onclick="genDoc('invoice')">🧾 Invoice</button>
        <button class="btn btn-ghost btn-sm" onclick="genDoc('msa')">📝 MSA</button>
        <button class="btn btn-pri btn-sm" onclick="genDoc('job_card')">+ Job Card</button>
      </div>
    </div>
    <div class="card mb16" style="padding:0;overflow:hidden">
      <div class="tbl-wrap"><table>
        <thead><tr><th>Document</th><th>Type</th><th>Status</th><th>Created</th><th>Due</th><th></th></tr></thead>
        <tbody>${docRows}</tbody>
      </table></div>
    </div>
    <div class="sec-title mb12">Job Cards</div>
    <div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap"><table>
        <thead><tr><th>Title</th><th>Client</th><th>Scope</th><th>Status</th><th>Dates</th><th></th></tr></thead>
        <tbody>${jcRows}</tbody>
      </table></div>
    </div>
  </div>`;
}

function genDoc(type) { alert(`${type} generator — coming in next build`); }

window.setDocsTab      = setDocsTab;
window.renderDocuments = renderDocuments;
window.genDoc          = genDoc;

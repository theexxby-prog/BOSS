// Client Management module — v5 (full CRUD)

function setClientDetail(id) { State.clientDetail = id; renderModule('clients'); }
function backToClients()     { State.clientDetail = null; renderModule('clients'); }

async function renderClients() {
  const res     = await API.getClients();
  const clients = res.success ? res.data : [];

  if (State.clientDetail !== null) {
    const c = clients.find(x => x.id === State.clientDetail);
    if (!c) return renderClientList(clients);
    const icp = c.icp_spec ? JSON.parse(c.icp_spec) : {};
    return `<div class="fade">
      <div class="flex fxc gap12 mb20">
        <button class="btn btn-ghost btn-sm" onclick="backToClients()">← Back</button>
        <div class="sec-title">${c.name}</div>
        <span class="badge ${c.status==='active'?'badge-green':c.status==='pilot'?'badge-amber':'badge-red'}">${c.status}</span>
        <button class="btn btn-ghost btn-sm" onclick="showEditClientModal(${c.id})" style="margin-left:auto">Edit Client</button>
      </div>
      <div class="g2">
        <div>
          <div class="card mb16">
            <div class="sec-title mb12">Contact</div>
            <div class="mrow"><span class="mlabel">Name</span><span class="mval">${c.contact_name||'—'}</span></div>
            <div class="mrow"><span class="mlabel">Email</span><span class="mval fs12">${c.contact_email||'—'}</span></div>
            <div class="mrow"><span class="mlabel">Phone</span><span class="mval">${c.contact_phone||'—'}</span></div>
            <div class="mrow"><span class="mlabel">Type</span><span class="mval">${c.type}</span></div>
            <div class="mrow"><span class="mlabel">CPL</span><span class="mval clr-grn fw7">$${c.cpl}</span></div>
            <div class="mrow"><span class="mlabel">Delivery</span><span class="mval">${c.delivery_method}</span></div>
          </div>
          <div class="card">
            <div class="sec-title mb12">Notes</div>
            <p class="fs13" style="color:var(--text-secondary);line-height:1.6">${c.notes||'No notes.'}</p>
          </div>
        </div>
        <div>
          <div class="card mb16">
            <div class="sec-title mb12">ICP Specification</div>
            ${icp.industries?.length   ? `<div class="mrow"><span class="mlabel">Industries</span><span class="mval fs12">${icp.industries.join(', ')}</span></div>` : ''}
            ${icp.titles?.length       ? `<div class="mrow"><span class="mlabel">Titles</span><span class="mval fs12">${icp.titles.join(', ')}</span></div>` : ''}
            ${icp.company_sizes?.length? `<div class="mrow"><span class="mlabel">Company Size</span><span class="mval fs12">${icp.company_sizes.join(', ')}</span></div>` : ''}
            ${icp.geographies?.length  ? `<div class="mrow"><span class="mlabel">Geographies</span><span class="mval fs12">${icp.geographies.join(', ')}</span></div>` : ''}
            ${!Object.keys(icp).length ? '<p style="color:var(--text-tertiary)">No ICP spec defined.</p>' : ''}
          </div>
          <div class="card">
            <div class="sec-title mb12">Quick Actions</div>
            <div class="flex gap8" style="flex-wrap:wrap">
              <button class="btn btn-ghost btn-sm" onclick="navigate('campaigns')">New Campaign</button>
              <button class="btn btn-ghost btn-sm" onclick="generateClientInvoice(${c.id})">Generate Invoice</button>
              <button class="btn btn-ghost btn-sm" onclick="navigate('documents')">View MSA</button>
              <button class="btn btn-ghost btn-sm" onclick="navigate('documents')">Job Card</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  return renderClientList(clients);
}

function renderClientList(clients) {
  const typeColor = { direct:'badge-green', agency:'badge-blue', aggregator:'badge-amber' };
  const cards = clients.length ? clients.map(c => `
    <div class="client-card card" onclick="setClientDetail(${c.id})" style="cursor:pointer">
      <div class="client-hdr">
        <div class="client-avatar">${c.name.slice(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div class="client-name">${c.name}</div>
          <div class="flex fxc gap6 mt4">
            <span class="badge ${typeColor[c.type]||'badge-amber'}">${c.type}</span>
            <span class="badge ${c.status==='active'?'badge-green':c.status==='pilot'?'badge-amber':'badge-red'}">${c.status}</span>
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="mrow" style="padding:6px 0"><span class="mlabel">CPL</span><span class="mval clr-grn fw8">$${c.cpl}</span></div>
      <div class="mrow" style="padding:6px 0"><span class="mlabel">Delivery</span><span class="mval fs12">${c.delivery_method}</span></div>
      <div class="mrow" style="padding:6px 0"><span class="mlabel">Contact</span><span class="mval fs12">${c.contact_name||'—'}</span></div>
    </div>`).join('')
  : `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-tertiary)">No clients yet.<br><span class="fs12">Add your first client to get started.</span></div>`;

  return `<div class="fade">
    <div class="sec-hdr mb20">
      <div><div class="sec-title">Clients</div><div class="sec-sub">${clients.length} client${clients.length!==1?'s':''}</div></div>
      <button class="btn btn-pri btn-sm" onclick="showAddClientModal()">+ Add Client</button>
    </div>
    <div class="client-grid">${cards}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// Add / Edit Client Modal
// ═══════════════════════════════════════════════════════════
async function showAddClientModal() {
  showClientModal(null);
}

async function showEditClientModal(clientId) {
  const res = await API.getClient(clientId);
  if (!res.success) { alert('Could not load client'); return; }
  showClientModal(res.data);
}

function showClientModal(client) {
  const isEdit = !!client;
  const existing = document.getElementById('client-modal-overlay');
  if (existing) existing.remove();

  const icp = client?.icp_spec ? JSON.parse(client.icp_spec) : {};

  const overlay = document.createElement('div');
  overlay.id = 'client-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `<div class="modal-box" style="max-width:560px;max-height:85vh;overflow-y:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div class="sec-title">${isEdit ? 'Edit Client' : 'Add New Client'}</div>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">Close</button>
    </div>
    <form id="client-form" onsubmit="saveClient(event, ${client?.id || 'null'})">
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="form-row">
          <label class="form-label">Company Name *</label>
          <input class="form-input" name="name" required value="${client?.name||''}" placeholder="e.g. Acme Corp"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-row">
            <label class="form-label">Client Type *</label>
            <select class="form-input" name="type" required>
              <option value="direct" ${client?.type==='direct'?'selected':''}>Direct</option>
              <option value="agency" ${client?.type==='agency'?'selected':''}>Agency</option>
              <option value="aggregator" ${client?.type==='aggregator'?'selected':''}>Aggregator</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">Status</label>
            <select class="form-input" name="status">
              <option value="active" ${client?.status==='active'?'selected':''}>Active</option>
              <option value="pilot" ${client?.status==='pilot'?'selected':''}>Pilot</option>
              <option value="paused" ${client?.status==='paused'?'selected':''}>Paused</option>
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-row">
            <label class="form-label">CPL ($) *</label>
            <input class="form-input" name="cpl" type="number" step="0.01" required value="${client?.cpl||''}" placeholder="6.00"/>
          </div>
          <div class="form-row">
            <label class="form-label">Delivery Method *</label>
            <select class="form-input" name="delivery_method" required>
              <option value="API" ${client?.delivery_method==='API'?'selected':''}>API</option>
              <option value="SFTP" ${client?.delivery_method==='SFTP'?'selected':''}>SFTP</option>
              <option value="Email" ${client?.delivery_method==='Email'?'selected':''}>Email</option>
              <option value="CRM Push" ${client?.delivery_method==='CRM Push'?'selected':''}>CRM Push</option>
              <option value="Manual" ${client?.delivery_method==='Manual'?'selected':''}>Manual</option>
            </select>
          </div>
        </div>

        <div class="divider"></div>
        <div class="page-overline" style="margin-bottom:-8px">Contact Information</div>

        <div class="form-row">
          <label class="form-label">Contact Name</label>
          <input class="form-input" name="contact_name" value="${client?.contact_name||''}" placeholder="Full name"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-row">
            <label class="form-label">Email</label>
            <input class="form-input" name="contact_email" type="email" value="${client?.contact_email||''}" placeholder="name@company.com"/>
          </div>
          <div class="form-row">
            <label class="form-label">Phone</label>
            <input class="form-input" name="contact_phone" value="${client?.contact_phone||''}" placeholder="+1 (555) 000-0000"/>
          </div>
        </div>

        <div class="divider"></div>
        <div class="page-overline" style="margin-bottom:-8px">ICP Specification</div>

        <div class="form-row">
          <label class="form-label">Industries <span class="fs11" style="color:var(--text-tertiary)">(comma-separated)</span></label>
          <input class="form-input" name="icp_industries" value="${(icp.industries||[]).join(', ')}" placeholder="Technology, Healthcare, Finance"/>
        </div>
        <div class="form-row">
          <label class="form-label">Target Titles <span class="fs11" style="color:var(--text-tertiary)">(comma-separated)</span></label>
          <input class="form-input" name="icp_titles" value="${(icp.titles||[]).join(', ')}" placeholder="CTO, VP Engineering, IT Director"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-row">
            <label class="form-label">Company Sizes</label>
            <input class="form-input" name="icp_company_sizes" value="${(icp.company_sizes||[]).join(', ')}" placeholder="51-200, 201-500"/>
          </div>
          <div class="form-row">
            <label class="form-label">Geographies</label>
            <input class="form-input" name="icp_geographies" value="${(icp.geographies||[]).join(', ')}" placeholder="US, UK, Canada"/>
          </div>
        </div>

        <div class="divider"></div>

        <div class="form-row">
          <label class="form-label">Notes</label>
          <textarea class="form-input" name="notes" rows="3" placeholder="Any additional notes about this client...">${client?.notes||''}</textarea>
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          ${isEdit ? `<button type="button" class="btn btn-ghost" style="color:var(--red-600)" onclick="deleteClientConfirm(${client.id})">Delete</button>` : ''}
          <button type="submit" class="btn btn-pri">${isEdit ? 'Save Changes' : 'Create Client'}</button>
        </div>
      </div>
    </form>
  </div>`;

  document.body.appendChild(overlay);
}

async function saveClient(e, clientId) {
  e.preventDefault();
  const form = document.getElementById('client-form');
  const fd = new FormData(form);

  const icpSpec = {};
  const ind = fd.get('icp_industries')?.trim();
  const tit = fd.get('icp_titles')?.trim();
  const siz = fd.get('icp_company_sizes')?.trim();
  const geo = fd.get('icp_geographies')?.trim();
  if (ind) icpSpec.industries = ind.split(',').map(s => s.trim()).filter(Boolean);
  if (tit) icpSpec.titles = tit.split(',').map(s => s.trim()).filter(Boolean);
  if (siz) icpSpec.company_sizes = siz.split(',').map(s => s.trim()).filter(Boolean);
  if (geo) icpSpec.geographies = geo.split(',').map(s => s.trim()).filter(Boolean);

  const body = {
    name: fd.get('name'),
    type: fd.get('type'),
    status: fd.get('status'),
    cpl: parseFloat(fd.get('cpl')),
    delivery_method: fd.get('delivery_method'),
    contact_name: fd.get('contact_name') || null,
    contact_email: fd.get('contact_email') || null,
    contact_phone: fd.get('contact_phone') || null,
    icp_spec: Object.keys(icpSpec).length ? JSON.stringify(icpSpec) : null,
    notes: fd.get('notes') || null,
  };

  let res;
  if (clientId) {
    res = await API.updateClient(clientId, body);
  } else {
    res = await API.createClient(body);
  }

  if (res.success) {
    document.getElementById('client-modal-overlay')?.remove();
    if (clientId) {
      State.clientDetail = clientId;
    }
    renderModule('clients');
  } else {
    alert('Error: ' + (res.error || 'Unknown error'));
  }
}

async function deleteClientConfirm(clientId) {
  if (!confirm('Are you sure you want to delete this client? This cannot be undone.')) return;
  const res = await API.deleteClient(clientId);
  if (res.success) {
    document.getElementById('client-modal-overlay')?.remove();
    State.clientDetail = null;
    renderModule('clients');
  } else {
    alert('Error: ' + (res.error || 'Failed to delete'));
  }
}

function generateClientInvoice(clientId) {
  State.finTab = 'invoices';
  navigate('finance');
  setTimeout(() => showInvoiceGenerator(clientId), 300);
}

window.setClientDetail      = setClientDetail;
window.backToClients        = backToClients;
window.renderClients        = renderClients;
window.showAddClientModal   = showAddClientModal;
window.showEditClientModal  = showEditClientModal;
window.saveClient           = saveClient;
window.deleteClientConfirm  = deleteClientConfirm;
window.generateClientInvoice = generateClientInvoice;

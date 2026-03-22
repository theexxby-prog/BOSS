// Client Management module

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
        <span class="badge ${c.status==='active'?'b-grn':c.status==='pilot'?'b-yel':'b-red'}">${c.status}</span>
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
            <p class="fs13" style="color:var(--t2);line-height:1.6">${c.notes||'No notes.'}</p>
          </div>
        </div>
        <div>
          <div class="card mb16">
            <div class="sec-title mb12">ICP Specification</div>
            ${icp.industries?.length   ? `<div class="mrow"><span class="mlabel">Industries</span><span class="mval fs12">${icp.industries.join(', ')}</span></div>` : ''}
            ${icp.titles?.length       ? `<div class="mrow"><span class="mlabel">Titles</span><span class="mval fs12">${icp.titles.join(', ')}</span></div>` : ''}
            ${icp.company_sizes?.length? `<div class="mrow"><span class="mlabel">Company Size</span><span class="mval fs12">${icp.company_sizes.join(', ')}</span></div>` : ''}
            ${icp.geographies?.length  ? `<div class="mrow"><span class="mlabel">Geographies</span><span class="mval fs12">${icp.geographies.join(', ')}</span></div>` : ''}
            ${!Object.keys(icp).length ? '<p style="color:var(--t3)">No ICP spec defined.</p>' : ''}
          </div>
          <div class="card">
            <div class="sec-title mb12">Quick Actions</div>
            <div class="flex gap8" style="flex-wrap:wrap">
              <button class="btn btn-ghost btn-sm">📋 New Campaign</button>
              <button class="btn btn-ghost btn-sm">🧾 Generate Invoice</button>
              <button class="btn btn-ghost btn-sm">📝 View MSA</button>
              <button class="btn btn-ghost btn-sm">📄 Job Card</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  return renderClientList(clients);
}

function renderClientList(clients) {
  const typeColor = { direct:'b-grn', agency:'b-blu', aggregator:'b-acc' };
  const cards = clients.length ? clients.map(c => `
    <div class="client-card card" onclick="setClientDetail(${c.id})" style="cursor:pointer">
      <div class="client-hdr">
        <div class="client-avatar">${c.name.slice(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div class="client-name">${c.name}</div>
          <div class="flex fxc gap6 mt4">
            <span class="badge ${typeColor[c.type]||'b-acc'}">${c.type}</span>
            <span class="badge ${c.status==='active'?'b-grn':c.status==='pilot'?'b-yel':'b-red'}">${c.status}</span>
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="mrow" style="padding:6px 0"><span class="mlabel">CPL</span><span class="mval clr-grn fw8">$${c.cpl}</span></div>
      <div class="mrow" style="padding:6px 0"><span class="mlabel">Delivery</span><span class="mval fs12">${c.delivery_method}</span></div>
      <div class="mrow" style="padding:6px 0"><span class="mlabel">Contact</span><span class="mval fs12">${c.contact_name||'—'}</span></div>
    </div>`).join('')
  : `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--t3)">No clients yet.<br><span class="fs12">Add your first client to get started.</span></div>`;

  return `<div class="fade">
    <div class="sec-hdr mb20">
      <div><div class="sec-title">Clients</div><div class="sec-sub">${clients.length} client${clients.length!==1?'s':''}</div></div>
      <button class="btn btn-pri btn-sm">+ Add Client</button>
    </div>
    <div class="client-grid">${cards}</div>
  </div>`;
}

window.setClientDetail = setClientDetail;
window.backToClients   = backToClients;
window.renderClients   = renderClients;

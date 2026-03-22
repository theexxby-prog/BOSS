// BD Pipeline module

const bdPipeline = [
  { name: 'Foundry (IDG)',   stage: 'proposal',     value: 18000, contact: 'Amanda Torres', title: 'VP Demand Gen',        next: 'Send proposal',   date: 'Mar 25', prob: 70  },
  { name: 'Anteriad',        stage: 'discovery',    value: 12000, contact: 'Kevin Park',    title: 'Director, BD',         next: 'Follow-up call',  date: 'Mar 24', prob: 40  },
  { name: 'Madison Logic',   stage: 'negotiation',  value: 30000, contact: 'Lisa Huang',    title: 'COO',                  next: 'Review contract', date: 'Mar 23', prob: 85  },
  { name: 'Bombora',         stage: 'qualified',    value: 8400,  contact: 'Ryan Mills',    title: 'Head of Partnerships', next: 'Book intro call', date: 'Mar 26', prob: 25  },
  { name: 'Ziff Davis B2B',  stage: 'closed',       value: 24000, contact: 'Sarah Blake',   title: 'VP Marketing',         next: '✅ Signed',       date: 'Mar 20', prob: 100 },
];

function renderBD() {
  const stages      = ['qualified', 'discovery', 'proposal', 'negotiation', 'closed'];
  const stageLabels = { qualified: 'Qualified', discovery: 'Discovery', proposal: 'Proposal', negotiation: 'Negotiation', closed: 'Closed Won' };
  const stageColors = { qualified: 'var(--blu)', discovery: 'var(--cyn)', proposal: 'var(--yel)', negotiation: 'var(--acc)', closed: 'var(--grn)' };
  const totalPipe   = bdPipeline.filter(d => d.stage !== 'closed').reduce((a, b) => a + b.value, 0);
  const totalClosed = bdPipeline.filter(d => d.stage === 'closed').reduce((a, b) => a + b.value, 0);

  const cols = stages.map(s => {
    const deals = bdPipeline.filter(d => d.stage === s);
    const cards = deals.map(d => `
      <div class="k-card">
        <div class="k-cname">${d.name}</div>
        <div class="k-csub">${d.contact} · ${d.title}</div>
        <div class="k-cfoot">
          <span style="font-weight:700;color:${stageColors[s]};font-size:13px">$${d.value.toLocaleString()}</span>
          <span class="badge b-blu fs11">${d.prob}%</span>
        </div>
        <div class="k-cnext">Next: ${d.next} · ${d.date}</div>
      </div>`).join('');
    return `<div class="k-col">
      <div class="k-hdr" style="background:${stageColors[s]}22;color:${stageColors[s]}">
        <span>${stageLabels[s]}</span>
        <span class="k-count" style="color:${stageColors[s]}">${deals.length}</span>
      </div>
      <div class="k-cards">${cards}</div>
    </div>`;
  }).join('');

  const actionRows = bdPipeline.filter(d => d.stage !== 'closed').map(d => `
    <div class="mrow">
      <div><div class="fw7 fs13">${d.name}</div><div class="fs12" style="color:var(--t3)">${d.next}</div></div>
      <div class="flex gap8"><button class="btn btn-ghost btn-sm">📄 Proposal</button><button class="btn btn-ghost btn-sm">📅 Book Call</button></div>
    </div>`).join('');

  return `<div class="fade">
    <div class="g4 mb20">
      ${kpi('Pipeline Value',  '$' + totalPipe.toLocaleString(),   null, '', '📊', 'var(--acc)')}
      ${kpi('Closed Won (Mar)','$' + totalClosed.toLocaleString(), null, '', '🏆', 'var(--grn)')}
      ${kpi('Open Deals', bdPipeline.filter(d => d.stage !== 'closed').length, null, '', '🤝', null)}
      ${kpi('Avg Deal Size', '$17,700', null, '', '💰', 'var(--cyn)')}
    </div>
    <div class="sec-hdr mb16"><div class="sec-title">Sales Pipeline</div><button class="btn btn-pri">+ Add Prospect</button></div>
    <div class="kanban mb20">${cols}</div>
    <div class="g2">
      <div class="card"><div class="sec-title mb12">Today's Actions</div>${actionRows}</div>
      <div class="card">
        <div class="sec-title mb12">Quick Proposal Generator</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <input class="input" placeholder="Company name..."/>
          <input class="input" placeholder="Contact name &amp; title..."/>
          <div class="flex gap8">
            <input class="input" placeholder="Lead volume (e.g. 500/mo)"/>
            <select class="input"><option>$3/MQL (Pilot)</option><option>$6/MQL (Contract)</option><option>$25/MQL (Direct)</option></select>
          </div>
          <textarea class="input" rows="3" placeholder="Campaign brief / ICP notes..."></textarea>
          <button class="btn btn-pri">🤖 Generate Proposal with Claude</button>
        </div>
      </div>
    </div>
  </div>`;
}

window.renderBD = renderBD;

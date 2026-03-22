// Operations Centre module

const systemHealth = [
  { name: 'Apollo API',     icon: '🔮', status: 'ok',   lat: '142ms', up: '99.9%' },
  { name: 'NeverBounce',    icon: '✉️', status: 'ok',   lat: '89ms',  up: '100%'  },
  { name: 'Instantly.ai',   icon: '⚡', status: 'ok',   lat: '210ms', up: '99.7%' },
  { name: 'Convertr API',   icon: '🔄', status: 'ok',   lat: '178ms', up: '99.8%' },
  { name: 'n8n Workflows',  icon: '⚙️', status: 'ok',   lat: '—',     up: '99.9%' },
  { name: 'HubSpot API',    icon: '🧡', status: 'warn', lat: '650ms', up: '98.1%' },
  { name: 'Cloudflare CDN', icon: '☁️', status: 'ok',   lat: '14ms',  up: '100%'  },
  { name: 'D1 Database',    icon: '🗄️', status: 'ok',   lat: '22ms',  up: '100%'  },
];

async function renderOps() {
  const res = await API.getSystemLogs();
  const logs = res.success ? res.data : [];

  const healthItems = systemHealth.map(s => `
    <div class="health-item">
      <div class="h-icon" style="background:${s.status === 'ok' ? 'var(--grn2)' : s.status === 'warn' ? 'var(--yel2)' : 'var(--red2)'}">${s.icon}</div>
      <div style="flex:1">
        <div class="h-name">${s.name}</div>
        <div class="h-status h-${s.status}">${s.status === 'ok' ? '● Online' : s.status === 'warn' ? '⚠ Degraded' : '✕ Down'} · ${s.lat} · ${s.up} uptime</div>
      </div>
      ${statusBadge(s.status)}
    </div>`).join('');

  const logRows = logs.map(l => {
    const rate = l.runs > 0 ? Math.round(l.successes / l.runs * 100) : 100;
    const clr  = rate >= 95 ? 'clr-grn' : rate >= 80 ? 'clr-yel' : 'clr-red';
    const lastRun = l.last_run_at
      ? new Date(l.last_run_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : '—';
    return `<tr>
      <td>${l.workflow_name}</td>
      <td>${l.runs}</td>
      <td class="${clr}">${l.successes} ✓</td>
      <td class="fs11" style="color:var(--t3)">${lastRun}</td>
    </tr>`;
  }).join('');

  const activeWorkflows = logs.filter(l => l.runs > 0).length;
  const totalRuns       = logs.reduce((a, b) => a + b.runs, 0);

  return `<div class="fade">
    <div class="g4 mb20">
      ${kpi('n8n Workflows',   `${logs.length} Active`, null, '', '⚙️', 'var(--grn)')}
      ${kpi('Processed Today', totalRuns > 0 ? String(totalRuns) : '0', null, '', '🎯', 'var(--acc)')}
      ${kpi('APIs Online',     '7/8',       null, '', '🔌', 'var(--yel)')}
      ${kpi('System Uptime',   '99.9%',     null, '', '☁️', 'var(--cyn)')}
    </div>
    <div class="g2">
      <div class="card"><div class="sec-title mb12">System Health</div>${healthItems}</div>
      <div>
        <div class="card mb14">
          <div class="sec-title mb12">n8n Workflow Activity — Today</div>
          <div class="tbl-wrap"><table>
            <thead><tr><th>Workflow</th><th>Runs</th><th>Success</th><th>Last Run</th></tr></thead>
            <tbody>${logRows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--t3)">No workflow runs yet</td></tr>'}</tbody>
          </table></div>
        </div>
        <div class="card">
          <div class="sec-title mb12">Automation Mode</div>
          <div style="background:var(--grn2);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:14px;margin-bottom:12px">
            <div class="fw7 clr-grn mb8" style="font-size:14px">🤖 Smart Gating — Active</div>
            <div class="fs12" style="color:var(--t2);line-height:1.6">90%+ ICP score → Auto-deliver<br>70–89% → QA queue (Vishal reviews)<br>&lt;70% → Auto-discard</div>
          </div>
          <div class="flex gap8">
            <button class="btn btn-ghost btn-sm" style="flex:1">Sampling QA Mode</button>
            <button class="btn btn-ghost btn-sm" style="flex:1">Fire &amp; Forget Mode</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

window.renderOps = renderOps;

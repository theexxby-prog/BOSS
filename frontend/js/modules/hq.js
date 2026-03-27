// HQ Overview module

const revenueData = [
  { month: 'Oct', revenue: 3200,  leads: 820  },
  { month: 'Nov', revenue: 5800,  leads: 1100 },
  { month: 'Dec', revenue: 7200,  leads: 1480 },
  { month: 'Jan', revenue: 9600,  leads: 1820 },
  { month: 'Feb', revenue: 11200, leads: 2100 },
  { month: 'Mar', revenue: 14800, leads: 2680 },
];

async function renderOverview() {
  const [cRes, alertsRes] = await Promise.all([
    API.getCampaigns(),
    API.getAlerts(),
  ]);
  const campaigns = cRes.success ? cRes.data : [];
  const alerts    = alertsRes.success ? alertsRes.data.alerts : [];
  const pendingRequests = campaigns.filter(c => c.status === 'draft').length;

  return `<div class="fade">
    ${pendingRequests ? `<div class="alert a-yel mb16" style="cursor:pointer" onclick="navigate('campaigns');setTimeout(()=>setCampaignsTab('draft'),100)">
      <div style="display:flex;align-items:center;gap:12px;width:100%">
        <span style="font-size:24px">📨</span>
        <div style="flex:1"><strong>${pendingRequests} campaign request${pendingRequests>1?'s':''} pending review</strong><div class="fs12" style="margin-top:2px">Click to review and deploy landing pages</div></div>
        <span class="notif-badge">${pendingRequests}</span>
      </div>
    </div>` : ''}
    <div class="brief-card">
      <div class="brief-hdr">
        <span style="font-size:24px">☀️</span>
        <div style="flex:1">
          <div class="brief-title">Good morning, Vishal — here's your BOSS daily briefing</div>
          <div class="brief-time">Sunday, March 22, 2026 · Last updated 6:00 AM EST</div>
        </div>
        <span class="badge b-grn pulse">● Live</span>
      </div>
      <div class="brief-item"><div class="brief-dot" style="background:var(--grn)"></div><div><strong>💰 Revenue:</strong> $14,800 this month — up 32% vs last month. On track for $18K by March 31.</div></div>
      <div class="brief-item"><div class="brief-dot" style="background:var(--acc)"></div><div><strong>🎯 Leads:</strong> 312 new leads processed overnight. 287 auto-delivered. <strong>4 leads in QA queue</strong> need your 3-second review.</div></div>
      <div class="brief-item"><div class="brief-dot" style="background:var(--yel)"></div><div><strong>⚠️ Alert:</strong> TechTarget campaign is 14% behind pacing. Recommend increasing daily send volume by 20% today.</div></div>
      <div class="brief-item"><div class="brief-dot" style="background:var(--blu)"></div><div><strong>📅 Today:</strong> Madison Logic negotiation call at 2PM. Follow up with Anteriad. LinkedIn post scheduled for 9AM.</div></div>
      <div class="brief-item" style="margin-bottom:0"><div class="brief-dot" style="background:var(--grn)"></div><div><strong>🏆 Win:</strong> DemandScience Q2 hit 91% acceptance rate — highest ever. Case study material locked.</div></div>
    </div>

    <div class="g4 mb20">
      ${kpi('Monthly Revenue', '$14,800', '32', 'vs last month', '💰', 'var(--grn)', [40,55,45,65,55,72,80,68,78,85,90,100])}
      ${kpi('Leads Delivered', '2,684',   '28', 'vs last month', '🎯', 'var(--acc)', [35,48,42,58,52,65,72,62,75,80,88,100])}
      ${kpi('Acceptance Rate', '91%',     '4',  'vs last month', '✅', 'var(--cyn)', [70,75,72,80,78,82,85,81,87,88,90,91])}
      ${kpi('Active Campaigns','3',       null, '',              '📡', 'var(--yel)', [20,20,40,40,60,60,60,80,80,80,100,100])}
    </div>

    <div class="g21 mb20">
      <div class="card">
        <div class="sec-hdr mb12">
          <div><div class="sec-title">Revenue &amp; Lead Volume</div><div class="sec-sub">Last 6 months</div></div>
          <div class="flex gap8">
            <span class="badge b-acc">─ Revenue</span>
            <span class="badge b-grn">─ Leads</span>
          </div>
        </div>
        ${areaChart(revenueData, 480, 180)}
      </div>
      <div class="card">
        <div class="sec-title mb12">Business Health</div>
        <div class="mrow"><span class="mlabel">Revenue (MTD)</span><span class="mval clr-grn">$14,800</span></div>
        <div class="mrow"><span class="mlabel">Operating Costs</span><span class="mval clr-red">$820</span></div>
        <div class="mrow"><span class="mlabel">Net Profit</span><span class="mval clr-grn fw8">$13,980</span></div>
        <div class="mrow"><span class="mlabel">Profit Margin</span><span class="mval clr-grn">94.5%</span></div>
        <div class="mrow"><span class="mlabel">Leads in Pipeline</span><span class="mval clr-acc">2,684</span></div>
        <div class="mrow"><span class="mlabel">QA Queue</span><span class="mval clr-yel">4 leads</span></div>
        <div class="mrow"><span class="mlabel">Active Clients</span><span class="mval">4</span></div>
      </div>
    </div>

    <div class="card">
      <div class="sec-hdr mb12">
        <div><div class="sec-title">🔔 Active Alerts</div><div class="sec-sub">${alerts.length} issue${alerts.length !== 1 ? 's' : ''} detected</div></div>
      </div>
      ${alerts.length === 0
        ? `<div class="alert a-grn">✅ <div>No alerts — all campaigns healthy.</div></div>`
        : alerts.map(a => {
            if (a.type === 'no_delivery') {
              return `<div class="alert a-red">❌ <div><strong>${a.campaign_name}</strong> — no leads delivered yet. ${a.total_leads} lead${a.total_leads !== 1 ? 's' : ''} in pipeline.</div></div>`;
            }
            if (a.type === 'low_acceptance') {
              return `<div class="alert a-yel">⚠️ <div><strong>${a.campaign_name}</strong> — low acceptance rate: ${a.acceptance_rate}% (${a.accepted} accepted / ${a.delivered} delivered).</div></div>`;
            }
            if (a.type === 'behind_pacing') {
              return `<div class="alert a-yel">📉 <div><strong>${a.campaign_name}</strong> — behind pacing: ${a.actual} delivered, ${a.expected} expected (${a.progress_pct}% through campaign).</div></div>`;
            }
            return '';
          }).join('')
      }
    </div>
  </div>`;
}

window.renderOverview = renderOverview;

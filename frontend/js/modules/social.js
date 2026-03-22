// Social Command module

function setSocTab(t) { State.socTab = t; renderModule('social'); }

function renderSocial() {
  const tabs      = ['calendar', 'drafts', 'analytics'];
  const tabLabels = ['📅 Content Calendar', '✏️ Drafts &amp; Queue', '📊 Analytics'];
  const tabHtml   = tabs.map((t, i) => `<div class="tab${t === State.socTab ? ' active' : ''}" onclick="setSocTab('${t}')">${tabLabels[i]}</div>`).join('');
  let inner = '';

  if (State.socTab === 'calendar') {
    inner = `
      <div class="g2">
        <div>
          <div class="sec-hdr mb12"><div class="sec-title">Upcoming Posts</div><button class="btn btn-pri btn-sm">+ Schedule</button></div>
          <div class="cal-slot"><div class="cal-time">9:00 AM</div><div class="cal-dot" style="background:#0077b5"></div><div class="flex" style="flex:1;flex-direction:column"><div class="cal-title">LinkedIn · Mar 23</div><div class="cal-sub">🚀 Most B2B lead gen vendors charge $25-50/MQL for basic data...</div></div><span class="badge b-blu">🕐 Scheduled</span></div>
          <div class="cal-slot"><div class="cal-time">2:00 PM</div><div class="cal-dot" style="background:#1d9bf0"></div><div class="flex" style="flex:1;flex-direction:column"><div class="cal-title">X/Twitter · Mar 23</div><div class="cal-sub">Thread: How to build a B2B lead gen business that runs itself...</div></div><span class="badge b-blu">🕐 Scheduled</span></div>
          <div class="divider"></div>
          <div class="sec-title mb12">Recently Published</div>
          <div class="cal-slot"><div class="cal-time">Mar 20</div><div class="cal-dot" style="background:#0077b5"></div><div class="flex" style="flex:1;flex-direction:column"><div class="cal-title">LinkedIn</div><div class="cal-sub">The dirty secret of content syndication: 40% of leads fail ICP matching...</div></div><span class="badge b-grn">✓ Published</span></div>
        </div>
        <div>
          <div class="sec-title mb12">Post Preview</div>
          <div style="background:var(--bg2);border-radius:10px;padding:16px;border:1px solid var(--brd)">
            <div class="flex fxc gap8 mb12">
              <div class="avatar" style="width:40px;height:40px;font-size:16px">VM</div>
              <div><div class="fw7 fs13">Vishal Mehta</div><div class="fs11" style="color:var(--t3)">Director, BD at Datamatics · Scheduled Mar 23</div></div>
            </div>
            <div class="fs13" style="color:var(--t2);line-height:1.6">🚀 Most B2B lead gen vendors charge $25-50/MQL for basic data. We deliver Name, Email, Phone, Title, Company, Industry, Size, Revenue Range + Tech Stack at $6. Here's how we do it...</div>
            <div class="flex gap12 mt12 fs12" style="color:var(--t3)"><span>👍 Like</span><span>💬 Comment</span><span>🔁 Repost</span><span>📤 Send</span></div>
          </div>
          <div class="mt12"><button class="btn btn-ghost btn-sm" style="width:100%">🤖 AI Generate Post</button></div>
        </div>
      </div>`;
  }

  if (State.socTab === 'analytics') {
    inner = `
      <div class="g4 mb20">
        ${kpi('LinkedIn Followers', '2,847', '12', 'this month', '👥', null)}
        ${kpi('Post Impressions',   '48,200','34', 'this month', '👁️','var(--blu)')}
        ${kpi('Avg Engagement',     '4.2%',  '0.8','vs last month','💬','var(--grn)')}
        ${kpi('Profile Views',      '1,240', '22', 'this month', '🔍','var(--yel)')}
      </div>
      <div class="card">
        <div class="sec-title mb12">Top Performing Posts</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Post</th><th>Platform</th><th>Date</th><th>Impressions</th><th>Likes</th><th>Comments</th><th>Reposts</th></tr></thead>
          <tbody>
            <tr>
              <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">The dirty secret of content syndication: 40% of leads fail ICP matching...</td>
              <td><span class="badge b-blu">LinkedIn</span></td>
              <td class="fs12" style="color:var(--t3)">Mar 20</td>
              <td class="fw7">12,400</td><td class="fw7 clr-acc">284</td><td class="fw7">47</td><td class="fw7">63</td>
            </tr>
          </tbody>
        </table></div>
      </div>`;
  }

  if (State.socTab === 'drafts') {
    inner = `
      <div class="soc-post">
        <div class="soc-hdr"><span class="badge b-blu">LinkedIn</span><span class="badge b-yel">✏ Draft</span></div>
        <div class="soc-body">Why $6/MQL with full transparency beats $50/MQL with a black box. Client portal demo coming soon.</div>
        <div class="soc-foot">
          <button class="btn btn-pri btn-sm">📅 Schedule</button>
          <button class="btn btn-ghost btn-sm">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm">🤖 AI Improve</button>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto;color:var(--red)">🗑 Delete</button>
        </div>
      </div>`;
  }

  return `<div class="fade"><div class="tabs">${tabHtml}</div>${inner}</div>`;
}

window.setSocTab    = setSocTab;
window.renderSocial = renderSocial;

// KPI card renderer

function kpi(label, val, chg, chgLbl, icon, col, sparks) {
  const sp = sparks || [30, 42, 36, 55, 48, 62, 70, 60, 72, 80, 88, 100];
  const bars = sp.map((h, i) =>
    `<div class="spark-b${i === sp.length - 1 ? ' hi' : ''}" style="height:${h}%"></div>`
  ).join('');
  const chgHtml = chg
    ? `<div class="kpi-chg ${parseFloat(chg) >= 0 ? 'up' : 'dn'}">${parseFloat(chg) >= 0 ? '↑' : '↓'} ${Math.abs(parseFloat(chg))}% ${chgLbl}</div>`
    : '';
  return `<div class="card fade">
    <div class="flex fxb fxc mb8">
      <div class="kpi-label">${label}</div>
      <span style="font-size:17px;opacity:.6">${icon}</span>
    </div>
    <div class="kpi-val" style="color:${col || 'var(--t1)'}">${val}</div>
    ${chgHtml}
    <div class="sparkline">${bars}</div>
  </div>`;
}

window.kpi = kpi;

// SVG chart renderers

function areaChart(data, w, h) {
  const maxRev  = Math.max(...data.map(d => d.revenue));
  const maxLead = Math.max(...data.map(d => d.leads));
  const pad = { t: 10, r: 10, b: 24, l: 44 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const n = data.length;
  const xStep = cw / (n - 1);

  const revPoints  = data.map((d, i) => [pad.l + i * xStep, pad.t + ch - (d.revenue / maxRev) * ch]);
  const leadPoints = data.map((d, i) => [pad.l + i * xStep, pad.t + ch - (d.leads / maxLead) * ch]);
  const bottom = pad.t + ch;

  const polyline = pts => pts.map(p => p.join(',')).join(' ');
  const polyArea = (pts, btm) => {
    const last  = pts[pts.length - 1];
    const first = pts[0];
    return `${polyline(pts)} ${last[0]},${btm} ${first[0]},${btm}`;
  };

  const xLabels = data.map((d, i) =>
    `<text x="${pad.l + i * xStep}" y="${h - 6}" text-anchor="middle" style="fill:var(--t3);font-size:10px">${d.month}</text>`
  ).join('');

  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#6c63ff" stop-opacity=".3"/>
        <stop offset="100%" stop-color="#6c63ff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#22c55e" stop-opacity=".2"/>
        <stop offset="100%" stop-color="#22c55e" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polygon points="${polyArea(revPoints, bottom)}"  fill="url(#g1)"/>
    <polyline points="${polyline(revPoints)}"          fill="none" stroke="#6c63ff" stroke-width="2"/>
    <polygon points="${polyArea(leadPoints, bottom)}" fill="url(#g2)"/>
    <polyline points="${polyline(leadPoints)}"         fill="none" stroke="#22c55e" stroke-width="2"/>
    ${xLabels}
  </svg>`;
}

function barChart(data, w, h) {
  const maxVal = Math.max(...data.map(d => d.val));
  const pad = { t: 10, r: 10, b: 28, l: 10 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const n = data.length;
  const bw  = (cw / n) * 0.6;
  const gap = cw / n;

  const bars = data.map((d, i) => {
    const bh = (d.val / maxVal) * ch;
    const x  = pad.l + i * gap + (gap - bw) / 2;
    const y  = pad.t + ch - bh;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="#6c63ff" rx="3"/>
    <text x="${x + bw / 2}" y="${h - 8}" text-anchor="middle" style="fill:var(--t3);font-size:9px">${d.label}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px">${bars}</svg>`;
}

window.areaChart = areaChart;
window.barChart  = barChart;

// Shared badge and table helpers

function badge(type, text) {
  const map = {
    active: 'b-grn', paused: 'b-yel', draft: 'b-blu', complete: 'b-acc',
    on_track: 'b-grn', behind: 'b-yel', closed: 'b-grn', negotiation: 'b-acc',
    proposal: 'b-yel', discovery: 'b-cyn', qualified: 'b-blu',
    ok: 'b-grn', warn: 'b-yel', down: 'b-red',
    scheduled: 'b-blu', published: 'b-grn',
  };
  return `<span class="badge ${map[type] || 'b-blu'}">${text}</span>`;
}

function pacingBadge(p) {
  const map = {
    on_track: ['b-grn', '↑ On Track'],
    behind:   ['b-yel', '⚠ Behind'],
    complete: ['b-acc', '✓ Complete'],
    draft:    ['b-blu', '✏ Draft'],
  };
  const [cls, lbl] = map[p] || ['b-blu', p];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

function statusBadge(s) {
  const map = {
    active:   ['b-grn', '● Active'],
    paused:   ['b-yel', '⏸ Paused'],
    draft:    ['b-blu', '✏ Draft'],
    contract: ['b-acc', '📋 Contract'],
    ok:       ['b-grn', '● Online'],
    warn:     ['b-yel', '⚠ Degraded'],
    down:     ['b-red', '✕ Down'],
  };
  const [cls, lbl] = map[s] || ['b-blu', s];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

function fmtCurrency(n) {
  return '$' + Number(n).toLocaleString();
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

window.badge       = badge;
window.pacingBadge = pacingBadge;
window.statusBadge = statusBadge;
window.fmtCurrency = fmtCurrency;
window.fmtDate     = fmtDate;

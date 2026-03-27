// BOSS HQ — App Init

// ── Theme ─────────────────────────────────────────────────────────────────
const THEME_KEY = 'boss-theme';

const SUN_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.5" fill="none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const MOON_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = theme === 'light' ? MOON_ICON : SUN_ICON;
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Load saved preference (default: light)
applyTheme(localStorage.getItem(THEME_KEY) || 'light');

window.toggleTheme = toggleTheme;

// ── Date chip ────────────────────────────────────────────────────────────
(function setDate() {
  const el = document.getElementById('date-chip');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
})();

// ── Auth gate ────────────────────────────────────────────────────────────
function showUnlockScreen() {
  document.getElementById('content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:60vh">
      <div style="text-align:center;max-width:340px;width:100%">
        <div style="font-size:36px;margin-bottom:16px">🔐</div>
        <div style="font-size:18px;font-weight:500;margin-bottom:6px">BOSS HQ</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:24px">Enter your API token to continue.</div>
        <input id="token-input" type="password" class="form-input"
          placeholder="Paste token here…"
          style="width:100%;margin-bottom:12px;text-align:center"
          onkeydown="if(event.key==='Enter')saveToken()"/>
        <button class="btn btn-pri" style="width:100%" onclick="saveToken()">Unlock</button>
        <div id="token-error" style="margin-top:10px;font-size:12px;color:var(--red-600);display:none">
          Invalid token — check and try again.
        </div>
      </div>
    </div>`;
  setTimeout(() => document.getElementById('token-input')?.focus(), 50);
}

async function saveToken() {
  const val = document.getElementById('token-input')?.value.trim();
  if (!val) return;
  // Verify against health endpoint before committing
  const res = await fetch('https://boss-api.mehtahouse.cc/api/health', {
    headers: { 'Authorization': `Bearer ${val}` },
  }).catch(() => null);
  if (!res || res.status === 401) {
    const errEl = document.getElementById('token-error');
    if (errEl) errEl.style.display = '';
    return;
  }
  localStorage.setItem('boss_token', val);
  renderModule('overview');
}

window.saveToken = saveToken;

// Re-show unlock screen on any 401 from the API layer
window.addEventListener('boss:unauthorized', showUnlockScreen);

// ── Boot ─────────────────────────────────────────────────────────────────
if (localStorage.getItem('boss_token')) {
  renderModule('overview');
} else {
  showUnlockScreen();
}

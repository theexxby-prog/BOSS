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

// ── Boot ─────────────────────────────────────────────────────────────────
renderModule('overview');

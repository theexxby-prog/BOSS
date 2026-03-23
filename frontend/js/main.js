// BOSS HQ — App Init

// ── Theme ─────────────────────────────────────────────────────────────────
const THEME_KEY = 'boss-theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
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
  el.textContent = '📅 ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
})();

// ── Boot ─────────────────────────────────────────────────────────────────
renderModule('overview');

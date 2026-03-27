// BOSS HQ — Shared UI Components v1

// ── Inject toast CSS once ─────────────────────────────────────────────────────
(function injectToastStyles() {
  if (document.getElementById('boss-toast-css')) return;
  const style = document.createElement('style');
  style.id = 'boss-toast-css';
  style.textContent = `
    .boss-toast {
      position: fixed;
      bottom: 80px;
      right: 24px;
      z-index: 9999;
      padding: 10px 18px;
      border-radius: var(--radius-md, 8px);
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      transform: translateY(12px);
      opacity: 0;
      transition: opacity 0.22s ease, transform 0.22s ease;
      pointer-events: none;
      max-width: 340px;
      line-height: 1.45;
    }
    .boss-toast-show   { opacity: 1; transform: translateY(0); }
    .boss-toast-success { background: var(--green-600, #2F9E44); color: #fff; }
    .boss-toast-error   { background: var(--red-600, #E03131);   color: #fff; }
    .boss-toast-info    { background: var(--blue-600, #3B5BDB);  color: #fff; }
    .field-error {
      font-size: 12px;
      color: var(--red-600, #E03131);
      margin-top: 4px;
      line-height: 1.4;
    }
    .field-error-input {
      border-color: var(--red-600, #E03131) !important;
    }
    .prompt-inline-error {
      font-size: 12px;
      color: var(--red-600, #E03131);
      margin-top: 8px;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
})();

// ── Toast Notifications ───────────────────────────────────────────────────────
let _toastTimer;

function showToast(message, type = 'success', duration = 3500) {
  // type: 'success' | 'error' | 'info'
  const existing = document.getElementById('boss-toast');
  if (existing) { existing.remove(); clearTimeout(_toastTimer); }

  const toast = document.createElement('div');
  toast.id = 'boss-toast';
  toast.className = `boss-toast boss-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('boss-toast-show')));

  _toastTimer = setTimeout(() => {
    toast.classList.remove('boss-toast-show');
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

// ── Prompt Modal (replaces window.prompt) ────────────────────────────────────
// options:
//   title        — modal heading (string)
//   label        — input label (string, optional)
//   placeholder  — input placeholder (string)
//   defaultValue — pre-filled value (string)
//   confirmText  — confirm button label (default 'Confirm')
//   type         — input type (default 'text')
//   onConfirm    — async function(value) — throw Error to show inline error, resolve to close
function showPromptModal({ title, label = '', placeholder = '', defaultValue = '', confirmText = 'Confirm', type = 'text', onConfirm }) {
  const existing = document.getElementById('boss-prompt-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'boss-prompt-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `<div class="modal-box" style="width:400px;max-width:95vw">
    <div class="fw7 fs15 mb16">${title}</div>
    ${label ? `<label class="form-label" style="display:block;margin-bottom:6px">${label}</label>` : ''}
    <input id="boss-prompt-input" class="form-input" type="${type}" placeholder="${placeholder}" value="${defaultValue}" style="width:100%;margin-bottom:16px"/>
    <div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
      <span id="boss-prompt-err" class="prompt-inline-error" style="display:none;flex:1;text-align:left"></span>
      <button class="btn btn-ghost" onclick="document.getElementById('boss-prompt-overlay').remove()">Cancel</button>
      <button id="boss-prompt-confirm" class="btn btn-pri">${confirmText}</button>
    </div>
  </div>`;

  document.body.appendChild(overlay);

  const input   = document.getElementById('boss-prompt-input');
  const btn     = document.getElementById('boss-prompt-confirm');
  const errSpan = document.getElementById('boss-prompt-err');

  input.focus();
  input.select();

  const handleConfirm = async () => {
    const value = input.value;
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'Working…';
    errSpan.style.display = 'none';

    try {
      await onConfirm(value);
      overlay.remove();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = orig;
      errSpan.textContent = err.message || 'An error occurred';
      errSpan.style.display = '';
    }
  };

  btn.addEventListener('click', handleConfirm);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  handleConfirm();
    if (e.key === 'Escape') overlay.remove();
  });
}

// ── Inline Field Errors ───────────────────────────────────────────────────────
function showFieldError(inputId, message) {
  clearFieldError(inputId);
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.add('field-error-input');
  const errDiv = document.createElement('div');
  errDiv.className = 'field-error';
  errDiv.id = `${inputId}-ferr`;
  errDiv.textContent = message;
  input.parentNode.insertBefore(errDiv, input.nextSibling);
}

function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  if (input) input.classList.remove('field-error-input');
  const errDiv = document.getElementById(`${inputId}-ferr`);
  if (errDiv) errDiv.remove();
}

function clearAllFieldErrors(...ids) {
  ids.forEach(clearFieldError);
}

window.showToast           = showToast;
window.showPromptModal     = showPromptModal;
window.showFieldError      = showFieldError;
window.clearFieldError     = clearFieldError;
window.clearAllFieldErrors = clearAllFieldErrors;

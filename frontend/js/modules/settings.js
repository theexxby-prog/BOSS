// Settings module

async function renderSettings() {
  const res      = await API.getSettings();
  const settings = res.success ? res.data : [];
  const byKey    = Object.fromEntries(settings.map(s => [s.key, s]));

  const field = (key, label, type='text', hint='') => {
    const s = byKey[key] || { value: '', description: hint };
    const isKey = key.includes('api_key');
    return `
      <div class="setting-row">
        <div>
          <div class="fw7 fs13">${label}</div>
          <div class="fs11" style="color:var(--t3)">${s.description||hint}</div>
        </div>
        <input class="input" style="width:280px" type="${isKey?'password':type}"
          id="s_${key}" value="${isKey&&s.value?'••••••••':s.value||''}"
          placeholder="${isKey?'Enter API key':''}"/>
      </div>`;
  };

  return `<div class="fade">
    <div class="alert a-blu mb20">⚙️ Changes are saved immediately. API keys are masked in the UI but stored securely in D1.</div>

    <div class="g2">
      <div>
        <div class="card mb16">
          <div class="sec-title mb16">🏢 Company Info</div>
          ${field('company_name',    'Company Name',    'text', 'Used on invoices and documents')}
          ${field('company_email',   'Company Email',   'email','Appears on contracts and invoices')}
          ${field('company_address', 'Company Address', 'text', 'Full address for legal documents')}
          <div class="mt16 flex" style="justify-content:flex-end">
            <button class="btn btn-pri btn-sm" onclick="saveSettings(['company_name','company_email','company_address'])">Save</button>
          </div>
        </div>

        <div class="card mb16">
          <div class="sec-title mb16">🎯 ICP Scoring Thresholds</div>
          ${field('icp_score_auto_deliver', 'Auto-Deliver Threshold', 'number', 'Leads above this score are auto-approved')}
          ${field('icp_score_qa_min',       'QA Queue Minimum',       'number', 'Leads above this score go to QA queue')}
          ${field('default_cpl',            'Default CPL ($)',        'number', 'Default cost per lead for new campaigns')}
          <div class="mt16 flex" style="justify-content:flex-end">
            <button class="btn btn-pri btn-sm" onclick="saveSettings(['icp_score_auto_deliver','icp_score_qa_min','default_cpl'])">Save</button>
          </div>
        </div>
      </div>

      <div>
        <div class="card mb16">
          <div class="sec-title mb16">🔑 API Keys</div>
          ${field('apollo_api_key',     'Apollo.io API Key',     'password')}
          ${field('neverbounce_api_key','NeverBounce API Key',   'password')}
          ${field('instantly_api_key',  'Instantly.ai API Key',  'password')}
          ${field('n8n_webhook_url',    'n8n Webhook Base URL',  'url', 'e.g. https://your-n8n.com/webhook')}
          <div class="mt16 flex" style="justify-content:flex-end">
            <button class="btn btn-pri btn-sm" onclick="saveSettings(['apollo_api_key','neverbounce_api_key','instantly_api_key','n8n_webhook_url'])">Save Keys</button>
          </div>
        </div>

        <div class="card">
          <div class="sec-title mb12">🔌 Integration Status</div>
          ${[
            ['Apollo.io',   byKey['apollo_api_key']?.value,     '🔮'],
            ['NeverBounce', byKey['neverbounce_api_key']?.value,'✉️'],
            ['Instantly.ai',byKey['instantly_api_key']?.value,  '⚡'],
            ['n8n',         byKey['n8n_webhook_url']?.value,    '⚙️'],
          ].map(([name, val, icon]) => `
            <div class="mrow">
              <span class="mlabel">${icon} ${name}</span>
              <span class="badge ${val&&val!=='••••••••'?'b-grn':'b-red'}">${val&&val!=='••••••••'?'● Connected':'○ Not set'}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

async function saveSettings(keys) {
  const body = {};
  keys.forEach(k => {
    const el = document.getElementById('s_' + k);
    if (el && el.value && !el.value.includes('•')) body[k] = el.value;
  });
  if (!Object.keys(body).length) return;
  const res = await API.updateSettings(body);
  if (res.success) {
    const saved = document.createElement('span');
    saved.textContent = ' ✓ Saved';
    saved.style.cssText = 'color:var(--grn);font-size:13px;margin-left:8px';
    event.target.parentNode.appendChild(saved);
    setTimeout(() => saved.remove(), 2000);
  }
}

window.renderSettings = renderSettings;
window.saveSettings   = saveSettings;

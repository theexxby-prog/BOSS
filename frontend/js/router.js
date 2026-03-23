// BOSS HQ — SPA Router

const MODULE_TITLES = {
  overview:  'HQ Overview',
  campaigns: 'Campaigns',
  leads:     'Lead Operations',
  clients:   'Client Management',
  assets:    'Assets & Pages',
  finance:   'Finance & P&L',
  documents: 'Documents',
  social:    'Social Command',
  bd:        'BD Pipeline',
  ops:       'Operations Centre',
  settings:  'Settings',
};

const MODULE_SUBS = {
  overview:  'Your complete business at a glance',
  campaigns: 'Campaign management, pacing & job cards',
  leads:     'Lead pipeline, QA queue & delivery',
  clients:   'Client profiles, ICP specs & contracts',
  assets:    'Whitepapers, landing pages & capture forms',
  finance:   'Revenue, invoicing, expenses & P&L',
  documents: 'Invoices, MSAs, insertion orders & job cards',
  social:    'LinkedIn & X content calendar & analytics',
  bd:        'Prospect pipeline & proposal tracker',
  ops:       'System health, n8n workflows & automation',
  settings:  'API keys, ICP templates & platform config',
};

const MODULE_RENDERERS = {
  overview:  () => renderOverview(),
  campaigns: () => renderCampaigns(),
  leads:     () => renderLeads(),
  clients:   () => renderClients(),
  assets:    () => renderAssets(),
  finance:   () => renderFinance(),
  documents: () => renderDocuments(),
  social:    () => renderSocial(),
  bd:        () => renderBD(),
  ops:       () => renderOps(),
  settings:  () => renderSettings(),
};

function navigate(id) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-module') === id);
  });
  document.getElementById('topbar-title').textContent = MODULE_TITLES[id] || id;
  document.getElementById('topbar-sub').textContent   = MODULE_SUBS[id]   || '';
  renderModule(id);
  State.currentModule = id;
}

async function renderModule(id) {
  const el       = document.getElementById('content');
  const renderer = MODULE_RENDERERS[id] || MODULE_RENDERERS.overview;
  const result   = renderer();
  if (result instanceof Promise) {
    el.innerHTML = '<div style="padding:60px;text-align:center;color:var(--t3);font-size:14px">Loading…</div>';
    el.innerHTML = await result;
  } else {
    el.innerHTML = result;
  }
}

async function refreshBadges() {
  try {
    const cRes = await API.getCampaigns();
    const drafts = cRes.success ? cRes.data.filter(c => c.status === 'draft').length : 0;
    const badge = document.getElementById('campaign-badge');
    if (badge) {
      badge.textContent = drafts || '';
      badge.className = 'nav-badge' + (drafts ? ' red' : '');
      badge.style.display = drafts ? '' : 'none';
    }
  } catch {}
}

// Refresh badges on load and periodically
setTimeout(refreshBadges, 500);
setInterval(refreshBadges, 60000);

window.navigate     = navigate;
window.renderModule = renderModule;
window.refreshBadges = refreshBadges;

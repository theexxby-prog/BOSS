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

let _renderGuard = 0;

function navigate(id) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-module') === id);
  });
  document.getElementById('topbar-title').textContent = MODULE_TITLES[id] || id;
  document.getElementById('topbar-sub').textContent   = MODULE_SUBS[id]   || '';
  // Preserve drilldown state across module switches; only reset on explicit back-nav
  if (typeof State !== 'undefined') {
    // Always land on the active tab when clicking nav items
    if (id === 'campaigns') { State.campaignsTab = 'active'; State.viewingCampaign = null; }
    if (id === 'leads') { State.leadsTab = 'pipeline'; }
    if (id === 'clients') { State.clientDetail = null; }
    if (id === 'assets') { State.assetTab = 'assets'; State.assetClientFilter = ''; State.assetCampaignFilter = ''; }
    if (id === 'finance') { State.finTab = 'overview'; }
    if (id === 'documents') { State.docsTab = 'all'; }
    if (id === 'social') { State.socTab = 'calendar'; }
  }
  renderModule(id);
  State.currentModule = id;
}

async function renderModule(id) {
  const el       = document.getElementById('content');
  const renderer = MODULE_RENDERERS[id] || MODULE_RENDERERS.overview;
  const guard    = ++_renderGuard; // Guard against stale async renders
  const result   = renderer();
  if (result instanceof Promise) {
    el.innerHTML = `<div style="padding:0">
      <div class="skeleton" style="height:18px;width:140px;margin-bottom:20px;border-radius:6px"></div>
      <div class="g4" style="margin-bottom:20px">
        ${Array(4).fill('<div class="skeleton" style="height:88px;border-radius:12px"></div>').join('')}
      </div>
      <div class="skeleton" style="height:320px;border-radius:12px"></div>
    </div>`;
    const html = await result;
    if (_renderGuard === guard) el.innerHTML = html; // Only render if this is still the latest request
  } else {
    if (_renderGuard === guard) el.innerHTML = result;
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

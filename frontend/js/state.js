// BOSS HQ — App State
// Central place for all UI state (active tabs, drill-through selections, etc.)

const State = {
  currentModule: 'overview',
  leadsTab:      'pipeline',
  finTab:        'overview',
  socTab:        'calendar',
  clientDetail:  null,
  campaignsTab:  'active',
  viewingCampaign: null,
  assetsTab:     'assets',
  assetClientFilter: '',
  assetCampaignFilter: '',
  docsTab:       'all',
  clCampaignFilter: '',
};

window.State = State;

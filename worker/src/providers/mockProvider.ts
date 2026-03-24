// BOSS HQ — MockDataProvider
// In-memory implementation of DataProvider. Seeded with simulation dataset.
// No DB, no async, no external calls.

import type { DataProvider } from './DataProvider'
import { InvoiceLockError } from './DataProvider'
import type {
  BillingClient,
  BillingCampaign,
  LeadRecord,
  InvoiceRecord,
  InvoiceLineItem,
  BillingPayment,
} from './types'

// ─── Seed Data ──────────────────────────────────────────────────────────────

const clients: BillingClient[] = [
  { id: 'c1', name: 'Apex Ventures',      industry: 'VC / Private Equity', created_at: '2026-01-10' },
  { id: 'c2', name: 'NovaTech Solutions', industry: 'B2B SaaS',            created_at: '2026-01-15' },
]

const campaigns: BillingCampaign[] = [
  {
    id: 'camp1', client_id: 'c1',
    name: 'Apex Q1 Lead Gen',
    status: 'active', billing_type: 'per_lead', unit_price: 150,
    created_at: '2026-01-20',
  },
  {
    id: 'camp2', client_id: 'c2',
    name: 'NovaTech Enterprise Outreach',
    status: 'active', billing_type: 'per_lead', unit_price: 200,
    created_at: '2026-01-25',
  },
]

// Camp 1 — 30 leads: 14 accepted (manual), 6 rejected (manual), 10 pending
// Camp 2 — 25 leads: 16 accepted (manual), 4 rejected (manual), 3 pending, 2 delivered
// l2-21 and l2-22 have external_ids — used to demo Convertr webhook mapping
const leads: LeadRecord[] = [
  // ── Camp 1 — Accepted (14) — manual, price_at_acceptance = 150 ──────────
  { id: 'l1-01', campaign_id: 'camp1', name: 'James Whitfield',   email: 'j.whitfield@apexvc.com',     external_id: null, status: 'accepted', delivered_at: '2026-02-01', accepted_at: '2026-02-03', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-01-28' },
  { id: 'l1-02', campaign_id: 'camp1', name: 'Sarah Okafor',      email: 's.okafor@capitalx.io',       external_id: null, status: 'accepted', delivered_at: '2026-02-01', accepted_at: '2026-02-03', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-01-28' },
  { id: 'l1-03', campaign_id: 'camp1', name: 'Marcus Chen',       email: 'm.chen@peakequity.com',      external_id: null, status: 'accepted', delivered_at: '2026-02-02', accepted_at: '2026-02-04', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-01-29' },
  { id: 'l1-04', campaign_id: 'camp1', name: 'Priya Sharma',      email: 'p.sharma@nexusgrowth.com',   external_id: null, status: 'accepted', delivered_at: '2026-02-02', accepted_at: '2026-02-04', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-01-29' },
  { id: 'l1-05', campaign_id: 'camp1', name: 'Tom Brauer',        email: 't.brauer@stonebridge.vc',    external_id: null, status: 'accepted', delivered_at: '2026-02-03', accepted_at: '2026-02-05', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-01-30' },
  { id: 'l1-06', campaign_id: 'camp1', name: 'Elena Moser',       email: 'e.moser@clearview.vc',       external_id: null, status: 'accepted', delivered_at: '2026-02-03', accepted_at: '2026-02-05', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-01-30' },
  { id: 'l1-07', campaign_id: 'camp1', name: 'Daniel Park',       email: 'd.park@northshoreinv.com',   external_id: null, status: 'accepted', delivered_at: '2026-02-04', accepted_at: '2026-02-06', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-01-31' },
  { id: 'l1-08', campaign_id: 'camp1', name: 'Lisa Tanaka',       email: 'l.tanaka@redcedarvc.com',    external_id: null, status: 'accepted', delivered_at: '2026-02-04', accepted_at: '2026-02-06', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-01-31' },
  { id: 'l1-09', campaign_id: 'camp1', name: 'Ahmed Hassan',      email: 'a.hassan@crescentcap.com',   external_id: null, status: 'accepted', delivered_at: '2026-02-05', accepted_at: '2026-02-07', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-02-01' },
  { id: 'l1-10', campaign_id: 'camp1', name: 'Nina Vogt',         email: 'n.vogt@alpinegrowth.com',    external_id: null, status: 'accepted', delivered_at: '2026-02-05', accepted_at: '2026-02-07', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-02-01' },
  { id: 'l1-11', campaign_id: 'camp1', name: 'Carlos Rivera',     email: 'c.rivera@meridian.vc',       external_id: null, status: 'accepted', delivered_at: '2026-02-06', accepted_at: '2026-02-08', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-02-02' },
  { id: 'l1-12', campaign_id: 'camp1', name: 'Olivia Banks',      email: 'o.banks@frontierpartners.io',external_id: null, status: 'accepted', delivered_at: '2026-02-06', accepted_at: '2026-02-08', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-02-02' },
  { id: 'l1-13', campaign_id: 'camp1', name: 'Ryan Hollis',       email: 'r.hollis@goldengatecap.com', external_id: null, status: 'accepted', delivered_at: '2026-02-07', accepted_at: '2026-02-09', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-02-03' },
  { id: 'l1-14', campaign_id: 'camp1', name: 'Maya Patel',        email: 'm.patel@summitvc.com',       external_id: null, status: 'accepted', delivered_at: '2026-02-07', accepted_at: '2026-02-09', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv1', price_at_acceptance: 150, created_at: '2026-02-03' },
  // ── Camp 1 — Rejected (6) — manual ────────────────────────────────────
  { id: 'l1-15', campaign_id: 'camp1', name: 'Greg Fowler',       email: 'g.fowler@test.com',          external_id: null, status: 'rejected', delivered_at: '2026-02-01', accepted_at: null, rejected_at: '2026-02-03', acceptance_source: 'manual', invoice_id: null, price_at_acceptance: null, created_at: '2026-01-28' },
  { id: 'l1-16', campaign_id: 'camp1', name: 'Amy Schultz',       email: 'a.schultz@oldmail.net',      external_id: null, status: 'rejected', delivered_at: '2026-02-02', accepted_at: null, rejected_at: '2026-02-04', acceptance_source: 'manual', invoice_id: null, price_at_acceptance: null, created_at: '2026-01-29' },
  { id: 'l1-17', campaign_id: 'camp1', name: 'Ben Porter',        email: 'b.porter@generic.biz',       external_id: null, status: 'rejected', delivered_at: '2026-02-03', accepted_at: null, rejected_at: '2026-02-05', acceptance_source: 'manual', invoice_id: null, price_at_acceptance: null, created_at: '2026-01-30' },
  { id: 'l1-18', campaign_id: 'camp1', name: 'Chloe Martin',      email: 'c.martin@freemail.com',      external_id: null, status: 'rejected', delivered_at: '2026-02-04', accepted_at: null, rejected_at: '2026-02-06', acceptance_source: 'manual', invoice_id: null, price_at_acceptance: null, created_at: '2026-01-31' },
  { id: 'l1-19', campaign_id: 'camp1', name: 'Dan West',          email: 'd.west@noreply.org',         external_id: null, status: 'rejected', delivered_at: '2026-02-05', accepted_at: null, rejected_at: '2026-02-07', acceptance_source: 'manual', invoice_id: null, price_at_acceptance: null, created_at: '2026-02-01' },
  { id: 'l1-20', campaign_id: 'camp1', name: 'Eve Crawford',      email: 'e.crawford@unknown.io',      external_id: null, status: 'rejected', delivered_at: '2026-02-06', accepted_at: null, rejected_at: '2026-02-08', acceptance_source: 'manual', invoice_id: null, price_at_acceptance: null, created_at: '2026-02-02' },
  // ── Camp 1 — Pending (10) ─────────────────────────────────────────────
  { id: 'l1-21', campaign_id: 'camp1', name: 'Frank Gibson',      email: 'f.gibson@prestige.vc',       external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-02-08' },
  { id: 'l1-22', campaign_id: 'camp1', name: 'Grace Lin',         email: 'g.lin@highland.cap',         external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-02-08' },
  { id: 'l1-23', campaign_id: 'camp1', name: 'Henry Marsh',       email: 'h.marsh@ironwood.vc',        external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-02-09' },
  { id: 'l1-24', campaign_id: 'camp1', name: 'Iris Norton',       email: 'i.norton@blueridgecap.com',  external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-02-09' },
  { id: 'l1-25', campaign_id: 'camp1', name: 'Jack Owens',        email: 'j.owens@torchvc.com',        external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-02-10' },
  { id: 'l1-26', campaign_id: 'camp1', name: 'Kara Palmer',       email: 'k.palmer@foundry.vc',        external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-02-10' },
  { id: 'l1-27', campaign_id: 'camp1', name: 'Leo Quinn',         email: 'l.quinn@harborvcap.com',     external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-02-11' },
  { id: 'l1-28', campaign_id: 'camp1', name: 'Mia Roberts',       email: 'm.roberts@dawnequity.com',   external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-02-11' },
  { id: 'l1-29', campaign_id: 'camp1', name: 'Noah Scott',        email: 'n.scott@vistacapital.io',    external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-02-12' },
  { id: 'l1-30', campaign_id: 'camp1', name: 'Olivia Turner',     email: 'o.turner@keystonevc.com',    external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-02-12' },

  // ── Camp 2 — Accepted (16) — manual, price_at_acceptance = 200 ──────────
  { id: 'l2-01', campaign_id: 'camp2', name: 'Paul Adeyemi',      email: 'p.adeyemi@novatech.io',      external_id: null, status: 'accepted', delivered_at: '2026-02-15', accepted_at: '2026-02-17', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-12' },
  { id: 'l2-02', campaign_id: 'camp2', name: 'Quinn Blake',       email: 'q.blake@cloudscale.com',     external_id: null, status: 'accepted', delivered_at: '2026-02-15', accepted_at: '2026-02-17', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-12' },
  { id: 'l2-03', campaign_id: 'camp2', name: 'Rachel Cole',       email: 'r.cole@stackops.io',         external_id: null, status: 'accepted', delivered_at: '2026-02-16', accepted_at: '2026-02-18', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-13' },
  { id: 'l2-04', campaign_id: 'camp2', name: 'Sam Diaz',          email: 's.diaz@buildfast.com',       external_id: null, status: 'accepted', delivered_at: '2026-02-16', accepted_at: '2026-02-18', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-13' },
  { id: 'l2-05', campaign_id: 'camp2', name: 'Tara Evans',        email: 't.evans@launchpad.io',       external_id: null, status: 'accepted', delivered_at: '2026-02-17', accepted_at: '2026-02-19', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-14' },
  { id: 'l2-06', campaign_id: 'camp2', name: 'Umar Farouk',       email: 'u.farouk@datasync.com',      external_id: null, status: 'accepted', delivered_at: '2026-02-17', accepted_at: '2026-02-19', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-14' },
  { id: 'l2-07', campaign_id: 'camp2', name: 'Vera Gomez',        email: 'v.gomez@infracloud.io',      external_id: null, status: 'accepted', delivered_at: '2026-02-18', accepted_at: '2026-02-20', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-15' },
  { id: 'l2-08', campaign_id: 'camp2', name: 'Will Harrison',     email: 'w.harrison@meshwork.com',    external_id: null, status: 'accepted', delivered_at: '2026-02-18', accepted_at: '2026-02-20', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-15' },
  { id: 'l2-09', campaign_id: 'camp2', name: 'Xena Ivanova',      email: 'x.ivanova@nextlayer.io',     external_id: null, status: 'accepted', delivered_at: '2026-02-19', accepted_at: '2026-02-21', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-16' },
  { id: 'l2-10', campaign_id: 'camp2', name: 'Yusuf Jafari',      email: 'y.jafari@devpilot.com',      external_id: null, status: 'accepted', delivered_at: '2026-02-19', accepted_at: '2026-02-21', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-16' },
  { id: 'l2-11', campaign_id: 'camp2', name: 'Zoe Kwan',          email: 'z.kwan@horizonstack.io',     external_id: null, status: 'accepted', delivered_at: '2026-02-20', accepted_at: '2026-02-22', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-17' },
  { id: 'l2-12', campaign_id: 'camp2', name: 'Aaron Lane',        email: 'a.lane@coreplatform.com',    external_id: null, status: 'accepted', delivered_at: '2026-02-20', accepted_at: '2026-02-22', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-17' },
  { id: 'l2-13', campaign_id: 'camp2', name: 'Bella Mora',        email: 'b.mora@cloudhive.io',        external_id: null, status: 'accepted', delivered_at: '2026-02-21', accepted_at: '2026-02-23', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-18' },
  { id: 'l2-14', campaign_id: 'camp2', name: 'Carl Nguyen',       email: 'c.nguyen@gridbase.com',      external_id: null, status: 'accepted', delivered_at: '2026-02-21', accepted_at: '2026-02-23', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-18' },
  { id: 'l2-15', campaign_id: 'camp2', name: 'Diana Osei',        email: 'd.osei@rundeckio.com',       external_id: null, status: 'accepted', delivered_at: '2026-02-22', accepted_at: '2026-02-24', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-19' },
  { id: 'l2-16', campaign_id: 'camp2', name: 'Ethan Price',       email: 'e.price@cloudform.io',       external_id: null, status: 'accepted', delivered_at: '2026-02-22', accepted_at: '2026-02-24', rejected_at: null, acceptance_source: 'manual', invoice_id: 'inv2', price_at_acceptance: 200, created_at: '2026-02-19' },
  // ── Camp 2 — Rejected (4) — manual ────────────────────────────────────
  { id: 'l2-17', campaign_id: 'camp2', name: 'Faye Quinn',        email: 'f.quinn@disposable.net',     external_id: null, status: 'rejected', delivered_at: '2026-02-15', accepted_at: null, rejected_at: '2026-02-17', acceptance_source: 'manual', invoice_id: null, price_at_acceptance: null, created_at: '2026-02-12' },
  { id: 'l2-18', campaign_id: 'camp2', name: 'Gary Reed',         email: 'g.reed@fakeorg.io',          external_id: null, status: 'rejected', delivered_at: '2026-02-16', accepted_at: null, rejected_at: '2026-02-18', acceptance_source: 'manual', invoice_id: null, price_at_acceptance: null, created_at: '2026-02-13' },
  { id: 'l2-19', campaign_id: 'camp2', name: 'Hannah Stone',      email: 'h.stone@noreply.com',        external_id: null, status: 'rejected', delivered_at: '2026-02-17', accepted_at: null, rejected_at: '2026-02-19', acceptance_source: 'manual', invoice_id: null, price_at_acceptance: null, created_at: '2026-02-14' },
  { id: 'l2-20', campaign_id: 'camp2', name: 'Ivan Torres',       email: 'i.torres@testdomain.biz',    external_id: null, status: 'rejected', delivered_at: '2026-02-18', accepted_at: null, rejected_at: '2026-02-20', acceptance_source: 'manual', invoice_id: null, price_at_acceptance: null, created_at: '2026-02-15' },
  // ── Camp 2 — Delivered, awaiting Convertr review (2) ─────────────────
  // external_id set — these will be resolved via webhook when Convertr posts back
  { id: 'l2-21', campaign_id: 'camp2', name: 'Julia Upton',       email: 'j.upton@scalehub.io',        external_id: 'cvtr-001', status: 'delivered', delivered_at: '2026-03-17', accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-03-14' },
  { id: 'l2-22', campaign_id: 'camp2', name: 'Kevin Vale',        email: 'k.vale@cloudmesh.com',       external_id: 'cvtr-002', status: 'delivered', delivered_at: '2026-03-18', accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-03-15' },
  // ── Camp 2 — Pending (3) ─────────────────────────────────────────────
  { id: 'l2-23', campaign_id: 'camp2', name: 'Laura Webb',        email: 'l.webb@nexusops.io',         external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-03-20' },
  { id: 'l2-24', campaign_id: 'camp2', name: 'Mike Xu',           email: 'm.xu@infralogic.com',        external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-03-21' },
  { id: 'l2-25', campaign_id: 'camp2', name: 'Nadia Yuen',        email: 'n.yuen@corestream.io',       external_id: null, status: 'pending',  delivered_at: null, accepted_at: null, rejected_at: null, acceptance_source: null, invoice_id: null, price_at_acceptance: null, created_at: '2026-03-22' },
]

// Line items are pre-built from the accepted leads above.
// Each entry captures the lead_id and its price_at_acceptance at the time of invoicing.
// NOTE: statuses on seeded invoices are manually set to reflect real-world state.
//       Going forward, invoice status is auto-derived by paymentService after each payment.
const inv1LineItems: InvoiceLineItem[] = [
  'l1-01','l1-02','l1-03','l1-04','l1-05','l1-06','l1-07',
  'l1-08','l1-09','l1-10','l1-11','l1-12','l1-13','l1-14',
].map(id => ({ lead_id: id, price: 150 }))

const inv2LineItems: InvoiceLineItem[] = [
  'l2-01','l2-02','l2-03','l2-04','l2-05','l2-06','l2-07','l2-08',
  'l2-09','l2-10','l2-11','l2-12','l2-13','l2-14','l2-15','l2-16',
].map(id => ({ lead_id: id, price: 200 }))

const invoices: InvoiceRecord[] = [
  {
    id: 'inv1', invoice_number: 'INV-001',
    client_id: 'c1', campaign_id: 'camp1',
    billing_type: 'per_lead', unit_count: 14, unit_price: 150,
    total: 2100, line_items: inv1LineItems,
    status: 'paid', created_at: '2026-02-10', sent_at: '2026-02-12',
  },
  {
    id: 'inv2', invoice_number: 'INV-002',
    client_id: 'c2', campaign_id: 'camp2',
    billing_type: 'per_lead', unit_count: 16, unit_price: 200,
    total: 3200, line_items: inv2LineItems,
    status: 'partial', created_at: '2026-03-05', sent_at: '2026-03-07',
  },
]

const payments: BillingPayment[] = [
  { id: 'pay1', invoice_id: 'inv1', amount: 1000, paid_at: '2026-02-15' },
  { id: 'pay2', invoice_id: 'inv1', amount: 1100, paid_at: '2026-03-01' },
  { id: 'pay3', invoice_id: 'inv2', amount: 1500, paid_at: '2026-03-10' },
]

// Tracks next invoice number. Starts at 3 (INV-001 and INV-002 already seeded).
let invoiceSeq = 2

// ─── ID Generator ───────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function now(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── MockDataProvider ────────────────────────────────────────────────────────

export const mockProvider: DataProvider = {

  // ── Clients ───────────────────────────────────────────────────────────────

  listClients() {
    return [...clients]
  },

  getClient(id) {
    return clients.find(c => c.id === id) ?? null
  },

  // ── Campaigns ─────────────────────────────────────────────────────────────

  listCampaigns(clientId) {
    if (clientId) return campaigns.filter(c => c.client_id === clientId)
    return [...campaigns]
  },

  getCampaign(id) {
    return campaigns.find(c => c.id === id) ?? null
  },

  // ── Leads ─────────────────────────────────────────────────────────────────

  listLeads(filters) {
    let result = [...leads]
    if (filters?.campaign_id) result = result.filter(l => l.campaign_id === filters.campaign_id)
    if (filters?.status)      result = result.filter(l => l.status === filters.status)
    return result
  },

  getLead(id) {
    return leads.find(l => l.id === id) ?? null
  },

  getLeadByExternalId(externalId) {
    return leads.find(l => l.external_id === externalId) ?? null
  },

  createLead(data) {
    const lead: LeadRecord = { ...data, id: uid(), created_at: now() }
    leads.push(lead)
    return lead
  },

  updateLeadStatus(id, status, timestamps = {}) {
    const lead = leads.find(l => l.id === id)
    if (!lead) return null
    lead.status = status
    if (timestamps.delivered_at        !== undefined) lead.delivered_at        = timestamps.delivered_at
    if (timestamps.accepted_at         !== undefined) lead.accepted_at         = timestamps.accepted_at
    if (timestamps.rejected_at         !== undefined) lead.rejected_at         = timestamps.rejected_at
    if (timestamps.acceptance_source   !== undefined) lead.acceptance_source   = timestamps.acceptance_source
    if (timestamps.price_at_acceptance !== undefined) lead.price_at_acceptance = timestamps.price_at_acceptance
    return lead
  },

  setLeadInvoice(id, invoiceId) {
    const lead = leads.find(l => l.id === id)
    if (!lead) return null
    lead.invoice_id = invoiceId
    return lead
  },

  // ── Invoices ──────────────────────────────────────────────────────────────

  listInvoices(filters) {
    let result = [...invoices]
    if (filters?.campaign_id) result = result.filter(i => i.campaign_id === filters.campaign_id)
    if (filters?.status)      result = result.filter(i => i.status === filters.status)
    return result
  },

  getInvoice(id) {
    return invoices.find(i => i.id === id) ?? null
  },

  createInvoice(data) {
    const invoice: InvoiceRecord = { ...data, id: uid(), created_at: now() }
    invoices.push(invoice)
    return invoice
  },

  updateInvoice(id, patch) {
    const invoice = invoices.find(i => i.id === id)
    if (!invoice) return null

    // Financial fields are immutable once an invoice has been sent.
    // Only status and sent_at may be updated on non-draft invoices (e.g. by paymentService).
    if (invoice.status !== 'draft') {
      const financialFields: (keyof typeof patch)[] = [
        'total', 'unit_count', 'unit_price', 'line_items',
        'billing_type', 'client_id', 'campaign_id', 'invoice_number',
      ]
      const illegalFields = financialFields.filter(f => f in patch)
      if (illegalFields.length > 0) {
        throw new InvoiceLockError(
          `Invoice "${id}" is locked (status: "${invoice.status}") — ` +
          `cannot modify financial fields: ${illegalFields.join(', ')}`
        )
      }
    }

    Object.assign(invoice, patch)
    return invoice
  },

  // ── Payments ──────────────────────────────────────────────────────────────

  listPayments(invoiceId) {
    return payments.filter(p => p.invoice_id === invoiceId)
  },

  createPayment(data) {
    const payment: BillingPayment = { ...data, id: uid() }
    payments.push(payment)
    return payment
  },

  // ── Sequences ─────────────────────────────────────────────────────────────

  nextInvoiceNumber() {
    invoiceSeq += 1
    return `INV-${String(invoiceSeq).padStart(3, '0')}`
  },
}

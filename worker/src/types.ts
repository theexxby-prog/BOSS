// BOSS HQ — Shared TypeScript Types

export interface Env {
  DB: D1Database;
  BOSS_API_TOKEN: string;
  ANTHROPIC_API_KEY: string;
  NEVERBOUNCE_API_KEY: string;
  CLAUDE_MODEL_FOR_CLEANING?: string;
}

// ─── Clients ───────────────────────────────────────────────────────────────
export interface Client {
  id: number;
  name: string;
  type: 'agency' | 'aggregator' | 'direct';
  status: 'active' | 'inactive' | 'pilot' | 'churned';
  cpl: number;
  delivery_method: 'convertr' | 'integrate' | 'hubspot' | 'csv' | 'api';
  icp_spec: string | null;
  suppression_list: string | null;
  contract_details: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Campaigns ─────────────────────────────────────────────────────────────
export interface Campaign {
  id: number;
  client_id: number;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  target: number;
  delivered: number;
  accepted: number;
  rejected: number;
  cpl: number;
  acceptance_rate: number;
  pacing: 'on_track' | 'at_risk' | 'behind' | 'completed';
  asset_name: string | null;
  asset_url: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Leads ─────────────────────────────────────────────────────────────────
export interface Lead {
  id: number;
  campaign_id: number;
  client_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string;
  title: string;
  industry: string | null;
  company_size: string | null;
  revenue_range: string | null;
  tech_stack: string | null;
  country: string | null;
  state: string | null;
  asset_downloaded: string | null;
  consent_flag: 0 | 1;
  icp_score: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'accepted' | 'bounced';
  rejection_reason: string | null;
  email_verified: 0 | 1;
  enriched: 0 | 1;
  source: string | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Deliveries ────────────────────────────────────────────────────────────
export interface Delivery {
  id: number;
  lead_id: number;
  campaign_id: number;
  client_id: number;
  method: 'convertr' | 'integrate' | 'hubspot' | 'csv' | 'api';
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'failed';
  response_code: number | null;
  response_body: string | null;
  delivered_at: string | null;
  created_at: string;
}

// ─── Finance ───────────────────────────────────────────────────────────────
export interface FinanceRevenue {
  id: number;
  client_id: number;
  campaign_id: number | null;
  amount: number;
  leads_count: number;
  cpl: number;
  period: string;
  notes: string | null;
  created_at: string;
}

export interface FinanceExpense {
  id: number;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  recurring: 0 | 1;
  created_at: string;
}

export interface Invoice {
  id: number;
  client_id: number;
  invoice_number: string;
  leads_count: number;
  cpl: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string | null;
  paid_date: string | null;
  period: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  name: string;
  category: string;
  cost: number;
  currency: string;
  billing_cycle: 'monthly' | 'annual' | 'usage';
  renewal_date: string;
  status: 'active' | 'cancelled' | 'paused';
  url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Social ────────────────────────────────────────────────────────────────
export interface SocialPost {
  id: number;
  platform: 'linkedin' | 'twitter' | 'both';
  content: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_at: string | null;
  published_at: string | null;
  impressions: number;
  likes: number;
  comments: number;
  reposts: number;
  utm_campaign: string | null;
  created_at: string;
  updated_at: string;
}

// ─── BD Pipeline ───────────────────────────────────────────────────────────
export interface BDDeal {
  id: number;
  company: string;
  stage: 'qualified' | 'pitched' | 'pilot' | 'negotiation' | 'closed_won' | 'closed_lost';
  value: number;
  probability: number;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── System Logs ───────────────────────────────────────────────────────────
export interface SystemLog {
  id: number;
  workflow_name: string;
  runs: number;
  successes: number;
  failures: number;
  last_run_at: string | null;
  last_status: 'success' | 'failure' | 'running' | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

// ─── API Helpers ───────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export type RouteHandler = (
  request: Request,
  env: Env,
  params?: Record<string, string>
) => Promise<Response>;

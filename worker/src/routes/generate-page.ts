// generate-page.ts — Template-based AI landing page copy generation
// POST /api/campaigns/:id/generate-page
//
// Step 1: Claude extracts compact semantic slots from the campaign brief + asset.
// Step 2: Server composes final copy deterministically from doc_type templates.
//
// Does NOT write to DB — the frontend previews before deploying.

import { jsonResponse } from '../cors';
import { dbFirst } from '../db';
import type { Env } from '../types';

// ── Asset fetching ────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

async function fetchAssetContent(assetUrl: string): Promise<
  | { type: 'pdf'; base64: string }
  | { type: 'text'; content: string }
  | { type: 'none' }
> {
  try {
    const res = await fetch(assetUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'BOSS-HQ/1.0' },
    });
    if (!res.ok) return { type: 'none' };

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/pdf')) {
      // Hard cap at 800KB — PDFs are token-dense and truncating corrupts them.
      const MAX_PDF_BYTES = 800 * 1024;
      const contentLength = parseInt(res.headers.get('content-length') || '0');
      if (contentLength > 0 && contentLength > MAX_PDF_BYTES) return { type: 'none' };
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > MAX_PDF_BYTES) return { type: 'none' };
      return { type: 'pdf', base64: uint8ToBase64(new Uint8Array(buffer)) };
    }

    if (contentType.includes('text/html') || contentType.includes('text/plain')) {
      const text = await res.text();
      const stripped = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000);
      return { type: 'text', content: stripped };
    }

    return { type: 'none' };
  } catch {
    return { type: 'none' };
  }
}

// ── Slot schema (what Claude outputs) ────────────────────────────────────────

interface Slots {
  pain_statement:    string;
  outcome_statement: string;
  persona:           string;
  proof_points:      string[];
  cta_focus:         string;
  social_context:    string;
  hero_stat:         string;
  doc_type:          string;
}

// ── Template definitions ──────────────────────────────────────────────────────

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Hard cap: truncate to N words if the AI ignored the length instructions
function capWords(s: string, max: number): string {
  const words = s.trim().split(/\s+/);
  return words.length <= max ? s : words.slice(0, max).join(' ');
}

interface TemplateDef {
  headline:    (s: Slots) => string;
  subheadline: (s: Slots) => string;
  hook:        (s: Slots) => string;
  cta:         ()         => string;
}

const TEMPLATES: Record<string, TemplateDef> = {
  Report: {
    headline:    (s) => `${cap(s.outcome_statement)}: The ${cap(s.persona)} Report`,
    subheadline: (s) => `${cap(s.pain_statement)} This report surfaces the data and analysis your team needs to act.`,
    hook:        (s) => `For ${s.persona}`,
    cta:         ()  => 'Download the Report',
  },
  Guide: {
    headline:    (s) => `The ${cap(s.persona)} Guide to ${cap(s.outcome_statement)}`,
    subheadline: (s) => `${cap(s.pain_statement)} This guide gives you a clear, practical path forward.`,
    hook:        (s) => `For ${s.persona}`,
    cta:         ()  => 'Get the Guide',
  },
  Checklist: {
    headline:    (s) => `The ${cap(s.outcome_statement)} Checklist`,
    subheadline: (s) => `${cap(s.pain_statement)} Work through this checklist to close every gap.`,
    hook:        (s) => `For ${s.persona}`,
    cta:         ()  => 'Get the Checklist',
  },
  Playbook: {
    headline:    (s) => `${cap(s.outcome_statement)}: The ${cap(s.persona)} Playbook`,
    subheadline: (s) => `${cap(s.pain_statement)} This playbook gives your team a repeatable, proven system.`,
    hook:        (s) => `For ${s.persona}`,
    cta:         ()  => 'Download the Playbook',
  },
  Framework: {
    headline:    (s) => `A Framework for ${cap(s.outcome_statement)}`,
    subheadline: (s) => `${cap(s.pain_statement)} Apply this framework to drive consistent, measurable results.`,
    hook:        (s) => `For ${s.persona}`,
    cta:         ()  => 'Get the Framework',
  },
};

// ── Bullet parsing ────────────────────────────────────────────────────────────
// Proof points expected as "Short Title: one sentence body".
// Falls back to splitting on first 4 words if no colon separator found.

function parseBullet(pp: string): { icon: string; title: string; body: string } {
  const sepIdx = pp.indexOf(': ');
  if (sepIdx > 0 && sepIdx < 50) {
    return { icon: 'check', title: pp.slice(0, sepIdx), body: pp.slice(sepIdx + 2) };
  }
  const words = pp.split(' ');
  const title = words.slice(0, Math.min(4, words.length)).join(' ');
  return { icon: 'check', title, body: pp };
}

const BULLET_FALLBACKS = [
  { icon: 'check', title: 'Key Insight',     body: 'Actionable guidance drawn directly from the asset.' },
  { icon: 'check', title: 'Practical Steps', body: 'Step-by-step guidance you can apply immediately.' },
  { icon: 'check', title: 'Proven Approach', body: 'Methods validated by leading practitioners.' },
  { icon: 'check', title: 'Clear Outcomes',  body: 'Measurable results from a focused effort.' },
];

// ── Copy composition (deterministic) ─────────────────────────────────────────

function composeCopy(slots: Slots): Record<string, unknown> {
  const validTypes = Object.keys(TEMPLATES);
  const docType = validTypes.includes(slots.doc_type) ? slots.doc_type : 'Guide';
  const tmpl    = TEMPLATES[docType];

  // Enforce word caps regardless of what the AI returned
  slots = {
    ...slots,
    persona:           capWords(slots.persona,           3),
    outcome_statement: capWords(slots.outcome_statement, 5),
  };

  const proofPoints = Array.isArray(slots.proof_points) ? slots.proof_points : [];
  const bullets = proofPoints.slice(0, 4).map(parseBullet);
  while (bullets.length < 4) {
    bullets.push(BULLET_FALLBACKS[bullets.length]);
  }

  return {
    headline:     tmpl.headline(slots),
    subheadline:  tmpl.subheadline(slots),
    hook:         tmpl.hook(slots),
    bullets,
    cta:          tmpl.cta(),
    social_proof: slots.social_context || '',
    design: {
      theme:     'light',
      hero_stat: slots.hero_stat || '',
      doc_type:  docType,
    },
  };
}

// ── Slot generation system prompt ────────────────────────────────────────────

const SLOT_SYSTEM_PROMPT = `You are a B2B content strategist extracting semantic signals from a campaign brief.
Output ONLY valid JSON with these exact fields — no markdown fences, no explanation, nothing else.

Field rules:
- pain_statement: One sentence. The specific challenge this persona faces right now. Max 25 words. Do not start with "I" or "We".
- outcome_statement: 3-5 words MAXIMUM. Noun phrase (no verbs). The core transformation, ultra-concise. Lowercase. Example: "consistent inbound pipeline" or "production-ready GPU infrastructure". Never exceed 5 words.
- persona: 2-3 words MAXIMUM. Job function only, no adjectives. Lowercase. Example: "revenue leaders" or "IT managers" or "engineering teams". Never exceed 3 words.
- proof_points: Exactly 4 items. Format each as "Short Title: one concrete sentence about what the reader learns or gets". Title is 2-4 words. Derive only from actual asset content, not generic claims.
- cta_focus: 2-4 words. The download action. Example: "Download Now" or "Get Instant Access".
- social_context: Short credibility line. No invented numbers. Example: "Trusted by demand generation teams at leading B2B organisations."
- hero_stat: A specific statistic or data point found in the asset. If none available, use "". Never invent numbers.
- doc_type: Infer from asset name and content. Must be exactly one of: Report | Guide | Checklist | Playbook | Framework

{
  "pain_statement": "string",
  "outcome_statement": "string",
  "persona": "string",
  "proof_points": ["string", "string", "string", "string"],
  "cta_focus": "string",
  "social_context": "string",
  "hero_stat": "string",
  "doc_type": "Report|Guide|Checklist|Playbook|Framework"
}`;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function generatePageRouter(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url      = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // segments: ['api', 'campaigns', ':id', 'generate-page']
  const campaignId = Number(segments[2]);

  if (!campaignId || isNaN(campaignId)) {
    return jsonResponse({ success: false, error: 'Invalid campaign ID' }, 400, origin);
  }

  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({ success: false, error: 'ANTHROPIC_API_KEY not configured' }, 500, origin);
  }

  // Load campaign + client
  const campaign = await dbFirst<any>(env.DB,
    `SELECT c.*, cl.name as client_name
     FROM campaigns c
     LEFT JOIN clients cl ON c.client_id = cl.id
     WHERE c.id = ?`,
    [campaignId]
  );
  if (!campaign) return jsonResponse({ success: false, error: 'Campaign not found' }, 404, origin);

  // Parse JSON fields
  let titles: string[] = [], industries: string[] = [], sizes: string[] = [],
      geo: string[] = [], customQ: { question: string }[] = [];
  try { titles     = JSON.parse(campaign.titles          || '[]'); } catch {}
  try { industries = JSON.parse(campaign.industries      || '[]'); } catch {}
  try { sizes      = JSON.parse(campaign.company_sizes   || '[]'); } catch {}
  try { geo        = JSON.parse(campaign.geo             || '[]'); } catch {}
  try { customQ    = JSON.parse(campaign.custom_questions || '[]'); } catch {}

  // Build campaign brief
  const briefLines = [
    `ASSET NAME: ${campaign.asset_name || campaign.name}`,
    campaign.asset_url ? `ASSET URL: ${campaign.asset_url}` : '',
    `CLIENT: ${campaign.client_name || 'Unknown'}`,
    `CAMPAIGN: ${campaign.name}`,
    titles.length     ? `TARGET TITLES: ${titles.join(', ')}`         : '',
    industries.length ? `TARGET INDUSTRIES: ${industries.join(', ')}` : '',
    sizes.length      ? `COMPANY SIZE: ${sizes.join(', ')}`           : '',
    geo.length        ? `GEOGRAPHY: ${geo.join(', ')}`                : '',
    campaign.notes    ? `CAMPAIGN NOTES: ${campaign.notes}`           : '',
    customQ.length
      ? `QUALIFYING QUESTIONS ON FORM:\n${customQ.map(q => `- ${q.question}`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n');

  // Fetch asset content (for hero_stat extraction)
  const asset = campaign.asset_url ? await fetchAssetContent(campaign.asset_url) : { type: 'none' as const };

  // Build Claude message content
  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'document'; source: { type: 'base64'; media_type: string; data: string }; title: string };

  let userContent: string | ContentBlock[];

  if (asset.type === 'pdf') {
    userContent = [
      { type: 'text', text: briefLines },
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: asset.base64 },
        title: campaign.asset_name || 'Asset',
      },
      { type: 'text', text: 'Extract the semantic slots from the campaign brief and PDF asset above.' },
    ];
  } else if (asset.type === 'text') {
    userContent = `${briefLines}\n\nASSET CONTENT EXTRACT:\n---\n${asset.content}\n---\n\nExtract the semantic slots from the above.`;
  } else {
    userContent = `${briefLines}\n\n(Asset file not directly accessible — infer slots from the asset name, campaign name, and brief above.)\n\nExtract the semantic slots.`;
  }

  // Step 1: Call Claude for slots only (compact output, lower token budget)
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: SLOT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text().catch(() => 'unknown');
    return jsonResponse({ success: false, error: `Claude API error ${claudeRes.status}: ${errText}` }, 500, origin);
  }

  const claudeData = await claudeRes.json() as any;
  const rawText = claudeData.content?.[0]?.text || '';

  // Step 2: Parse slots and compose final copy via templates
  let slots: Slots;
  try {
    // Strip markdown fences if present, then extract outermost {...} as fallback
    let cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    if (!cleaned.startsWith('{')) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) cleaned = match[0];
    }
    slots = JSON.parse(cleaned);
  } catch {
    return jsonResponse({ success: false, error: 'Claude returned unparseable slot JSON', raw: rawText }, 500, origin);
  }

  const copy = composeCopy(slots);
  return jsonResponse({ success: true, data: copy }, 200, origin);
}

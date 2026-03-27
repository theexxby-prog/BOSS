// generate-page.ts — AI-powered landing page copy generation
// POST /api/campaigns/:id/generate-page
// Reads the asset, builds a campaign brief, calls Claude, returns structured copy JSON.
// Does NOT write to DB — the frontend previews the copy before deploying.

import { jsonResponse } from '../cors';
import { dbFirst } from '../db';
import type { Env } from '../types';

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
      const buffer = await res.arrayBuffer();
      // Cap at 400KB to stay within token limits
      const bytes = new Uint8Array(buffer).slice(0, 400 * 1024);
      return { type: 'pdf', base64: uint8ToBase64(bytes) };
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
  try { titles     = JSON.parse(campaign.titles         || '[]'); } catch {}
  try { industries = JSON.parse(campaign.industries     || '[]'); } catch {}
  try { sizes      = JSON.parse(campaign.company_sizes  || '[]'); } catch {}
  try { geo        = JSON.parse(campaign.geo            || '[]'); } catch {}
  try { customQ    = JSON.parse(campaign.custom_questions || '[]'); } catch {}

  // Build campaign brief text
  const briefLines = [
    `ASSET NAME: ${campaign.asset_name || campaign.name}`,
    campaign.asset_url ? `ASSET URL: ${campaign.asset_url}` : '',
    `CLIENT: ${campaign.client_name || 'Unknown'}`,
    `CAMPAIGN: ${campaign.name}`,
    titles.length     ? `TARGET TITLES: ${titles.join(', ')}`      : '',
    industries.length ? `TARGET INDUSTRIES: ${industries.join(', ')}` : '',
    sizes.length      ? `COMPANY SIZE: ${sizes.join(', ')}`         : '',
    geo.length        ? `GEOGRAPHY: ${geo.join(', ')}`              : '',
    campaign.notes    ? `CAMPAIGN NOTES: ${campaign.notes}`         : '',
    customQ.length
      ? `QUALIFYING QUESTIONS ON FORM:\n${customQ.map(q => `- ${q.question}`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n');

  // Fetch asset content
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
      { type: 'text', text: 'Based on the campaign brief and the PDF asset above, write the landing page copy as specified.' },
    ];
  } else if (asset.type === 'text') {
    userContent = `${briefLines}\n\nASSET CONTENT EXTRACT:\n---\n${asset.content}\n---\n\nWrite the landing page copy based on the above.`;
  } else {
    userContent = `${briefLines}\n\n(Asset file not directly accessible — infer the content and value proposition from the asset name, campaign name, and campaign brief above.)\n\nWrite the landing page copy based on the above.`;
  }

  const systemPrompt = `You are a B2B conversion copywriter specialising in gated content lead generation campaigns.
You write landing page copy that speaks directly to a specific business persona and makes a compelling, evidence-based case for downloading an asset.

Rules:
- Never invent statistics or specific numbers you cannot verify from the asset
- Focus on outcomes and value the reader will get, not generic praise
- Write in second person ("you", "your team")
- Be specific to the stated audience — not generic business copy
- Every bullet should describe a concrete outcome or insight, never a vague benefit like "expert analysis"
- Keep copy tight and credible — no hype or superlatives
- The social_proof line must be believable and general (e.g. "Trusted by revenue leaders at leading B2B organisations") — never invent a specific company count

Return ONLY valid JSON with no markdown fences, no explanation, nothing else:
{
  "headline": "string (8-12 words, speaks to the reader's pain point or desired outcome)",
  "subheadline": "string (clarifies the value in one sentence, max 20 words)",
  "hook": "string (one sentence problem statement that resonates with this specific audience)",
  "bullets": [
    { "icon": "📊", "title": "string (3-5 words)", "body": "string (concrete outcome, 1-2 sentences)" },
    { "icon": "🎯", "title": "string", "body": "string" },
    { "icon": "💡", "title": "string", "body": "string" },
    { "icon": "⚡", "title": "string", "body": "string" }
  ],
  "cta": "string (action-oriented, 3-5 words)",
  "social_proof": "string (short credibility statement, no invented numbers)"
}`;

  // Call Claude API
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text().catch(() => 'unknown');
    return jsonResponse({ success: false, error: `Claude API error ${claudeRes.status}: ${errText}` }, 500, origin);
  }

  const claudeData = await claudeRes.json() as any;
  const rawText = claudeData.content?.[0]?.text || '';

  let copy: any;
  try {
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    copy = JSON.parse(cleaned);
  } catch {
    return jsonResponse({ success: false, error: 'Claude returned unparseable JSON', raw: rawText }, 500, origin);
  }

  return jsonResponse({ success: true, data: copy }, 200, origin);
}

import type { Env } from '../types';
import { jsonResponse } from '../cors';

// ── POST /api/global-leads/clean ────────────────────────────────────────────
// Claude-powered database cleaning: fix data quality issues, normalize fields
export async function cleanLeadsRoute(request: Request, env: Env, origin: string | null): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, origin);
  }

  const { contacts } = await request.json() as { contacts: any[] };
  if (!contacts?.length) return jsonResponse({ success: false, error: 'No contacts provided' }, 400, origin);

  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({ success: false, error: 'Claude API not configured' }, 500, origin);
  }

  try {
    // Batch into groups of 50 for Claude processing
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < contacts.length; i += batchSize) {
      batches.push(contacts.slice(i, i + batchSize));
    }

    const allFixes: any[] = [];
    const flagged: any[] = [];

    for (const batch of batches) {
      const cleaningPrompt = `You are a B2B contact data quality expert. I'll give you a batch of contacts with potential data quality issues.

For each contact, identify and suggest fixes for:
1. Name capitalization (John Doe not JOHN DOE or john doe)
2. OCR artifacts (J0hn → John, Sm!th → Smith)
3. Derive full name from first+last if name field is empty
4. Extract domain from email if domain field is missing
5. Normalize company names (remove extra punctuation, legal suffixes clutter)
6. Expand country abbreviations (US → United States, UK → United Kingdom)
7. Normalize company size to standard bucket format
8. Format phone numbers to standard format

Flag (don't auto-fix) if:
- Email doesn't match name pattern (wrong contact?)
- Email domain doesn't match company domain
- Invalid email format (no @, no TLD)
- Completely missing email
- Duplicate emails with conflicting data

Return ONLY a valid JSON array. Each fix should be: { id: (index), field: "field_name", old: "old_value", new: "new_value", action: "fix"|"flag", reason: "brief reason" }

Contacts (index-by-index):
${JSON.stringify(batch.map((c, i) => ({ _idx: i, ...c })), null, 2)}

Return ONLY the JSON array, no other text.`;

      const response = await fetch('https://api.anthropic.com/v1/messages/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: cleaningPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('Claude API error:', err);
        return jsonResponse({ success: false, error: `Claude error: ${response.status}` }, 502, origin);
      }

      const data = (await response.json()) as any;
      const content = data.content?.[0]?.text || '';

      // Parse Claude's response
      let fixes: any[] = [];
      try {
        fixes = JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse Claude response:', content);
        fixes = [];
      }

      if (Array.isArray(fixes)) {
        fixes.forEach((fix: any) => {
          if (fix.action === 'flag') flagged.push(fix);
          else allFixes.push(fix);
        });
      }
    }

    // Apply fixes to original contacts
    const cleaned = JSON.parse(JSON.stringify(contacts)); // Deep copy
    const applied: { field: string; old: any; new: any }[] = [];

    for (const fix of allFixes) {
      const idx = fix.id || fix._idx;
      if (idx >= 0 && idx < cleaned.length) {
        const old = cleaned[idx][fix.field];
        cleaned[idx][fix.field] = fix.new;
        applied.push({ field: fix.field, old, new: fix.new });
      }
    }

    return jsonResponse(
      {
        success: true,
        data: {
          cleaned,
          applied: applied.length,
          flagged: flagged.length,
          flaggedRecords: flagged,
        },
      },
      200,
      origin
    );
  } catch (e) {
    console.error('Clean error:', e);
    return jsonResponse({ success: false, error: 'Processing error' }, 500, origin);
  }
}

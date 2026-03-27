// Public landing page renderer — serves HTML at /lp/:slug
import type { Env } from '../types';
import { dbFirst, dbRun } from '../db';

export async function landingPageRenderer(request: Request, env: Env): Promise<Response> {
  const url  = new URL(request.url);
  const slug = url.pathname.replace('/lp/', '').split('/')[0];

  if (!slug) return new Response('Not found', { status: 404 });

  const page = await dbFirst<any>(env.DB,
    `SELECT lp.*, c.name as campaign_name, cl.name as client_name
     FROM landing_pages lp
     LEFT JOIN campaigns c ON lp.campaign_id = c.id
     LEFT JOIN clients cl  ON lp.client_id   = cl.id
     WHERE lp.slug = ? AND lp.status = 'active'`, [slug]
  );

  if (!page) {
    return new Response('Page not found', { status: 404, headers: { 'Content-Type': 'text/html' } });
  }

  await dbRun(env.DB, `UPDATE landing_pages SET views=views+1, updated_at=datetime('now') WHERE id=?`, [String(page.id)]);

  // Brand
  const bc  = page.brand_color             || '#2563eb';
  const bs  = page.brand_color_secondary   || '#1e40af';
  const ba  = page.brand_accent            || '#3b82f6';
  const logoUrl   = page.logo_url   || '';
  const assetName = page.asset_name || 'Resource';
  const assetUrl  = page.asset_url  || '';

  // AI copy — generated at deploy time, falls back gracefully if missing
  let ai: {
    headline: string; subheadline: string; hook: string;
    bullets: { icon: string; title: string; body: string }[];
    cta: string; social_proof: string;
  } | null = null;
  try { ai = page.ai_copy ? JSON.parse(page.ai_copy) : null; } catch {}

  const headline    = ai?.headline    || page.headline    || `Download: ${assetName}`;
  const subheadline = ai?.subheadline || page.subheadline || 'Fill out the form to get instant access.';
  const hook        = ai?.hook        || '';
  const ctaText     = ai?.cta         || page.cta_text    || 'Download Now';
  const socialProof = ai?.social_proof || '';

  const defaultBullets = [
    { icon: '📊', title: 'Data-Driven Insights',   body: 'Research-backed analysis with actionable recommendations.' },
    { icon: '🎯', title: 'Actionable Frameworks',  body: 'Step-by-step guidance you can apply immediately.' },
    { icon: '💡', title: 'Expert Perspective',     body: 'Curated insights from leading practitioners.' },
    { icon: '⚡', title: 'Immediate Value',        body: 'Practical takeaways you can use from day one.' },
  ];
  const bullets = (ai?.bullets && ai.bullets.length > 0) ? ai.bullets : defaultBullets;

  // Custom form questions
  let customQuestions: { question: string; type: string; options?: string[] }[] = [];
  try { customQuestions = JSON.parse(page.custom_questions || '[]'); } catch {}

  const customFieldsHtml = customQuestions.map((q, i) => {
    const opts = (q.options && q.options.length > 0)
      ? q.options.map((o: string) => `<option value="${o}">${o}</option>`).join('')
      : `<option value="Yes">Yes</option><option value="No">No</option><option value="Evaluating">Evaluating</option><option value="Not sure">Not sure</option>`;
    return `<div class="fg">
      <label>${q.question}</label>
      <select name="custom_q${i+1}" required>
        <option value="">Select...</option>${opts}
      </select>
    </div>`;
  }).join('');

  const apiBase     = url.origin;
  const bulletsHtml = bullets.map(b => `
    <div class="bullet">
      <div class="bullet-icon">${b.icon}</div>
      <div>
        <div class="bullet-title">${b.title}</div>
        <div class="bullet-body">${b.body}</div>
      </div>
    </div>`).join('');

  // Validate logo URL — only use if it's an actual HTTP URL
  const hasLogo = logoUrl && (logoUrl.startsWith('http://') || logoUrl.startsWith('https://'));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${headline}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #111827;
      height: 100vh; overflow: hidden;
      display: flex; flex-direction: column;
    }

    /* ── Topbar: solid brand color ── */
    .topbar {
      height: 52px; min-height: 52px;
      background: ${bc};
      display: flex; align-items: center;
      padding: 0 36px; gap: 10px; flex-shrink: 0;
    }
    .topbar img { height: 24px; object-fit: contain; max-width: 100px; filter: brightness(10); }
    .brand-initial {
      width: 26px; height: 26px; border-radius: 5px;
      background: rgba(255,255,255,0.22); color: #fff;
      font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .topbar .brand { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.95); }
    .topbar .asset-pill {
      margin-left: auto; display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: rgba(255,255,255,0.65);
    }

    /* ── Layout ── */
    .layout { flex: 1; display: grid; grid-template-columns: 1fr 420px; min-height: 0; }

    /* ── Left panel ── */
    .left {
      display: grid; grid-template-rows: 1fr 1fr;
      overflow: hidden; position: relative; background: #111827;
    }
    .left::before {
      content: ''; position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 80% 60% at -5% 25%, ${bc}55, transparent 55%),
        radial-gradient(ellipse 60% 50% at 105% 85%, ${ba}22, transparent 55%);
      pointer-events: none; z-index: 0;
    }
    .left::after {
      content: ''; position: absolute; inset: 0;
      background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 24px 24px; pointer-events: none; z-index: 0;
    }

    /* Zone 1: Document visual */
    .doc-zone {
      display: flex; align-items: center;
      padding: 36px 52px 24px;
      position: relative; z-index: 1;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    /* Book-cover style document */
    .doc-cover {
      display: flex; width: 100%; max-width: 540px; height: 148px;
      border-radius: 12px; overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07);
    }
    .doc-spine {
      width: 38%; background: ${bc};
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 16px 18px;
    }
    .doc-spine-client { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 0.05em; }
    .doc-spine-year { font-size: 32px; font-weight: 700; color: rgba(255,255,255,0.12); line-height: 1; }
    .doc-body {
      flex: 1; background: rgba(255,255,255,0.055);
      border-left: 1px solid rgba(255,255,255,0.07);
      padding: 16px 18px;
      display: flex; flex-direction: column; justify-content: space-between;
    }
    .doc-body-type { font-size: 10px; font-weight: 600; color: ${ba}; text-transform: uppercase; letter-spacing: 0.08em; }
    .doc-body-title { font-size: 14px; font-weight: 700; color: #f1f5f9; line-height: 1.3; }
    .doc-body-lines { display: flex; flex-direction: column; gap: 5px; }
    .dcl { height: 2px; border-radius: 2px; background: rgba(255,255,255,0.08); }

    .hook-quote {
      margin-top: 14px; max-width: 540px;
      font-size: 13px; font-weight: 400; color: rgba(255,255,255,0.4);
      line-height: 1.65; font-style: italic;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }

    /* Zone 2: Copy */
    .copy-zone {
      padding: 24px 52px 32px; overflow-y: auto;
      position: relative; z-index: 1;
      display: flex; flex-direction: column; justify-content: center;
      color: #e2e8f0;
    }
    h1 {
      font-size: clamp(24px, 2.8vw, 38px); font-weight: 700;
      line-height: 1.18; letter-spacing: -0.5px;
      color: #f8fafc; margin-bottom: 10px; max-width: 540px;
    }
    .subheadline {
      font-size: 14px; color: rgba(255,255,255,0.48);
      line-height: 1.65; max-width: 480px; margin-bottom: 18px;
    }
    .bullets { display: flex; flex-direction: column; gap: 10px; }
    .bullet { display: flex; gap: 10px; align-items: flex-start; }
    .bullet-icon {
      width: 28px; height: 28px; flex-shrink: 0;
      background: ${bc}1a; border: 1px solid ${bc}30;
      border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px;
    }
    .bullet-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88); margin-bottom: 1px; }
    .bullet-body  { font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.45; }
    .trust-row {
      display: flex; gap: 16px; flex-wrap: wrap;
      margin-top: 16px; padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .trust-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: rgba(255,255,255,0.28); }
    .trust-dot { width: 4px; height: 4px; border-radius: 50%; background: #10b981; flex-shrink: 0; }

    /* ── Right panel: WHITE ── */
    .right {
      background: #ffffff;
      border-left: 3px solid ${bc};
      display: flex; flex-direction: column; overflow-y: auto;
    }
    .form-inner { padding: 24px 22px; flex: 1; }
    .form-header {
      background: ${bc}0d; border: 1px solid ${bc}22;
      border-radius: 9px; padding: 13px 15px; margin-bottom: 16px;
    }
    .form-header-label { font-size: 10px; font-weight: 600; color: ${bc}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
    .form-title { font-size: 14px; font-weight: 700; color: #111827; line-height: 1.3; }

    .fg { margin-bottom: 9px; }
    .fg label { display: block; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .fg input, .fg select {
      width: 100%; padding: 8px 10px;
      background: #f9fafb; border: 1px solid #e5e7eb;
      border-radius: 6px; font-size: 13px; color: #111827;
      font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .fg input::placeholder { color: #9ca3af; }
    .fg input:focus, .fg select:focus { outline: none; border-color: ${bc}; box-shadow: 0 0 0 3px ${bc}18; }
    .fg select option { background: #fff; color: #111827; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

    .divider { border: none; border-top: 1px solid #f3f4f6; margin: 10px 0; }
    .custom-label { font-size: 10px; font-weight: 600; color: ${bc}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }

    .btn-submit {
      width: 100%; padding: 12px; background: ${bc};
      color: #fff; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
      margin-top: 4px; transition: opacity 0.15s, transform 0.15s;
    }
    .btn-submit:hover { opacity: 0.88; transform: translateY(-1px); }
    .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    .consent { font-size: 11px; color: #9ca3af; margin-top: 8px; line-height: 1.5; text-align: center; }

    ${socialProof ? `.social-proof { padding: 10px 22px; border-top: 1px solid #f3f4f6; font-size: 11px; color: #9ca3af; text-align: center; line-height: 1.5; }` : ''}

    /* ── Success state ── */
    .success { display: none; text-align: center; padding: 40px 20px; }
    .success-icon { font-size: 40px; margin-bottom: 12px; }
    .success h2 { font-size: 18px; font-weight: 700; color: #059669; margin-bottom: 6px; }
    .success p  { font-size: 13px; color: #6b7280; margin-bottom: 20px; line-height: 1.6; }
    .dl-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 11px 24px; background: ${bc};
      color: #fff; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;
    }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      body { overflow: auto; height: auto; }
      .layout { grid-template-columns: 1fr; }
      .left { grid-template-rows: auto auto; overflow: visible; }
      .doc-zone { padding: 24px 20px 16px; }
      .doc-cover { height: 110px; }
      .copy-zone { padding: 16px 20px 24px; }
      .right { border-left: none; border-top: 3px solid ${bc}; }
      .form-inner { padding: 20px 16px; }
      .row2 { grid-template-columns: 1fr; }
      .topbar { padding: 0 16px; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="topbar">
    ${hasLogo
      ? `<img src="${logoUrl}" alt="${page.client_name || ''}" onerror="this.style.display='none'"/>`
      : `<div class="brand-initial">${(page.client_name || 'B').charAt(0).toUpperCase()}</div>`}
    <div class="brand">${page.client_name || ''}</div>
    <div class="asset-pill">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      ${assetName}
    </div>
  </div>

  <!-- Main layout -->
  <div class="layout">

    <!-- Left: two zones -->
    <div class="left">

      <!-- Zone 1: Document visual -->
      <div class="doc-zone">
        <div style="width:100%">
          <div class="doc-cover">
            <div class="doc-spine">
              <div class="doc-spine-client">${page.client_name || ''}</div>
              <div class="doc-spine-year">2026</div>
            </div>
            <div class="doc-body">
              <div class="doc-body-type">Free Download</div>
              <div class="doc-body-title">${assetName}</div>
              <div class="doc-body-lines">
                <div class="dcl" style="width:90%"></div>
                <div class="dcl" style="width:70%"></div>
                <div class="dcl" style="width:80%"></div>
              </div>
            </div>
          </div>
          ${hook ? `<div class="hook-quote">"${hook}"</div>` : ''}
        </div>
      </div>

      <!-- Zone 2: Copy -->
      <div class="copy-zone">
        <h1>${headline}</h1>
        <p class="subheadline">${subheadline}</p>

        <div class="bullets">
          ${bulletsHtml}
        </div>

        <div class="trust-row">
          <div class="trust-item"><div class="trust-dot"></div> No spam, ever</div>
          <div class="trust-item"><div class="trust-dot"></div> Instant download</div>
          <div class="trust-item"><div class="trust-dot"></div> Unsubscribe anytime</div>
        </div>
      </div>

    </div>

    <!-- Right: form -->
    <div class="right">
      <div class="form-inner">
        <div class="form-header">
          <div class="form-header-label">Free Download</div>
          <div class="form-title">${assetName}</div>
        </div>

        <div id="form-section">
          <form id="lead-form">
            <div class="row2">
              <div class="fg">
                <label>First Name</label>
                <input type="text" name="first_name" required placeholder="Jane"/>
              </div>
              <div class="fg">
                <label>Last Name</label>
                <input type="text" name="last_name" required placeholder="Smith"/>
              </div>
            </div>
            <div class="fg">
              <label>Business Email</label>
              <input type="email" name="email" required placeholder="jane@company.com"/>
            </div>
            <div class="row2">
              <div class="fg">
                <label>Company</label>
                <input type="text" name="company" required placeholder="Acme Inc"/>
              </div>
              <div class="fg">
                <label>Job Title</label>
                <input type="text" name="title" required placeholder="VP Marketing"/>
              </div>
            </div>
            <div class="row2">
              <div class="fg">
                <label>Phone</label>
                <input type="tel" name="phone" placeholder="+1 555 000 0000"/>
              </div>
              <div class="fg">
                <label>Country</label>
                <input type="text" name="country" placeholder="United States"/>
              </div>
            </div>
            ${customQuestions.length ? `
            <hr class="divider"/>
            <div class="custom-label">A few quick questions</div>
            ${customFieldsHtml}` : ''}
            <button type="submit" class="btn-submit">${ctaText}</button>
          </form>
          <div class="consent">By downloading, you agree to receive relevant communications. Unsubscribe anytime.</div>
        </div>

        <div id="success-section" class="success">
          <div class="success-icon">🎉</div>
          <h2>You're all set!</h2>
          <p>Your copy of "<strong>${assetName}</strong>" is ready to download.</p>
          ${assetUrl
            ? `<a href="${assetUrl}" target="_blank" class="dl-btn">⬇ Download Now</a>`
            : `<p style="color:#10b981;font-weight:600">Your resource will be sent to your email shortly.</p>`}
        </div>
      </div>
      ${socialProof ? `<div class="social-proof">${socialProof}</div>` : ''}
    </div>

  </div>

  <script>
    document.getElementById('lead-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('[type="submit"]');
      btn.textContent = 'Submitting…';
      btn.disabled = true;

      const data = Object.fromEntries(new FormData(this));
      const customAnswers = {};
      ${customQuestions.map((_, i) => `if (data.custom_q${i+1}) customAnswers['q${i+1}'] = data.custom_q${i+1};`).join('\n      ')}
      data.custom_answers = JSON.stringify(customAnswers);

      try {
        const res = await fetch('${apiBase}/api/pages/${slug}/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          document.getElementById('form-section').style.display = 'none';
          document.getElementById('success-section').style.display = 'block';
        } else {
          btn.textContent = 'Error — Try Again';
          btn.disabled = false;
        }
      } catch {
        btn.textContent = 'Error — Try Again';
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

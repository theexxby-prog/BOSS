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
      background: #0d1117;
      color: #e2e8f0;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .topbar {
      height: 56px; min-height: 56px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      display: flex; align-items: center;
      padding: 0 40px; gap: 10px;
      flex-shrink: 0;
    }
    .topbar img { height: 26px; object-fit: contain; max-width: 120px; }
    .brand-initial {
      width: 28px; height: 28px; border-radius: 6px;
      background: ${bc}; color: #fff;
      font-size: 13px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .topbar .brand { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.8); }
    .topbar .asset-pill {
      margin-left: auto;
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.45);
    }
    .topbar .asset-pill svg { opacity: 0.5; }

    /* ── Main: two columns ── */
    .layout {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 400px;
      min-height: 0;
    }

    /* ── Left panel: two zones stacked ── */
    .left {
      display: grid;
      grid-template-rows: 1fr 1fr;
      overflow: hidden;
      position: relative;
    }

    /* Shared background glow */
    .left::before {
      content: '';
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 100% 70% at -5% 30%, ${bc}60, transparent 55%),
        radial-gradient(ellipse 70% 60% at 110% 80%, ${ba}28, transparent 55%);
      pointer-events: none;
      z-index: 0;
    }
    .left::after {
      content: '';
      position: absolute; inset: 0;
      background-image: radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px);
      background-size: 26px 26px;
      pointer-events: none;
      z-index: 0;
    }

    /* ── Zone 1: Document visual ── */
    .doc-zone {
      display: flex;
      align-items: center;
      padding: 40px 52px 28px;
      position: relative;
      z-index: 1;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    /* The document card */
    .doc-card {
      width: 100%;
      max-width: 520px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 14px;
      overflow: hidden;
    }
    .doc-card-header {
      background: ${bc};
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .doc-card-client {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9);
    }
    .doc-card-client-dot {
      width: 22px; height: 22px; border-radius: 6px;
      background: rgba(255,255,255,0.25);
      font-size: 11px; font-weight: 700; color: #fff;
      display: flex; align-items: center; justify-content: center;
    }
    .doc-card-type {
      font-size: 10px; font-weight: 600;
      background: rgba(255,255,255,0.18);
      color: rgba(255,255,255,0.9);
      padding: 2px 8px; border-radius: 20px;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .doc-card-body {
      padding: 18px 20px 20px;
    }
    .doc-card-name {
      font-size: 17px; font-weight: 700;
      color: #f1f5f9; line-height: 1.3;
      margin-bottom: 14px;
    }
    /* Decorative page-content lines */
    .doc-card-lines { display: flex; flex-direction: column; gap: 6px; }
    .dcl { height: 3px; border-radius: 2px; background: rgba(255,255,255,0.07); }
    .dcl-short { width: 55%; }
    .dcl-med   { width: 80%; }

    /* Hook quote under the doc card */
    .hook-quote {
      margin-top: 16px;
      max-width: 520px;
      font-size: 12px; font-weight: 500;
      color: rgba(255,255,255,0.38);
      line-height: 1.6;
      font-style: italic;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ── Zone 2: Copy ── */
    .copy-zone {
      padding: 28px 52px 36px;
      overflow-y: auto;
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    h1 {
      font-size: clamp(22px, 2.6vw, 36px);
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.5px;
      color: #f8fafc;
      margin-bottom: 10px;
      max-width: 560px;
    }
    .subheadline {
      font-size: 14px;
      color: rgba(255,255,255,0.45);
      line-height: 1.6;
      max-width: 500px;
      margin-bottom: 20px;
    }

    /* ── Bullets ── */
    .bullets { display: flex; flex-direction: column; gap: 12px; }
    .bullet { display: flex; gap: 10px; align-items: flex-start; }
    .bullet-icon {
      width: 30px; height: 30px; flex-shrink: 0;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px;
    }
    .bullet-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88); margin-bottom: 1px; }
    .bullet-body  { font-size: 12px; color: rgba(255,255,255,0.33); line-height: 1.45; }

    /* Trust row */
    .trust-row {
      display: flex; gap: 18px; flex-wrap: wrap;
      margin-top: 18px; padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .trust-item {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: rgba(255,255,255,0.28);
    }
    .trust-dot { width: 4px; height: 4px; border-radius: 50%; background: #10b981; flex-shrink: 0; }

    /* ── Right panel: form ── */
    .right {
      background: rgba(255,255,255,0.018);
      border-left: 1px solid rgba(255,255,255,0.06);
      display: flex; flex-direction: column;
      overflow-y: auto;
    }
    .form-inner { padding: 32px 28px; flex: 1; }

    /* Form header accent bar */
    .form-header {
      padding: 16px 20px;
      background: ${bc}18;
      border: 1px solid ${bc}25;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .form-header-label { font-size: 10px; font-weight: 600; color: ${ba}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
    .form-title { font-size: 15px; font-weight: 700; color: #f1f5f9; line-height: 1.3; }

    .fg { margin-bottom: 10px; }
    .fg label {
      display: block; font-size: 10px; font-weight: 600;
      color: rgba(255,255,255,0.35);
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .fg input, .fg select {
      width: 100%; padding: 9px 11px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 7px;
      font-size: 13px; color: #f1f5f9;
      font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .fg input::placeholder { color: rgba(255,255,255,0.16); }
    .fg input:focus, .fg select:focus {
      outline: none;
      border-color: ${ba};
      box-shadow: 0 0 0 3px ${ba}18;
    }
    .fg select option { background: #161b27; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

    .divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 12px 0; }
    .custom-label {
      font-size: 10px; font-weight: 600;
      color: ${ba}; text-transform: uppercase;
      letter-spacing: 0.5px; margin-bottom: 10px;
    }

    .btn-submit {
      width: 100%; padding: 13px;
      background: ${bc};
      color: #fff; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 700;
      cursor: pointer; font-family: inherit;
      margin-top: 6px;
      transition: opacity 0.15s, transform 0.15s;
    }
    .btn-submit:hover { opacity: 0.88; transform: translateY(-1px); }
    .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

    .consent {
      font-size: 11px; color: rgba(255,255,255,0.2);
      margin-top: 10px; line-height: 1.5; text-align: center;
    }

    ${socialProof ? `.social-proof {
      padding: 12px 28px;
      border-top: 1px solid rgba(255,255,255,0.05);
      font-size: 11px; color: rgba(255,255,255,0.28);
      text-align: center; line-height: 1.5;
    }` : ''}

    /* ── Success state ── */
    .success { display: none; text-align: center; padding: 48px 24px; }
    .success-icon { font-size: 48px; margin-bottom: 16px; }
    .success h2 { font-size: 20px; font-weight: 700; color: #10b981; margin-bottom: 8px; }
    .success p  { font-size: 13px; color: rgba(255,255,255,0.45); margin-bottom: 24px; line-height: 1.6; }
    .dl-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 28px; background: ${bc};
      color: #fff; border-radius: 8px;
      text-decoration: none; font-weight: 700; font-size: 14px;
    }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      body { overflow: auto; height: auto; }
      .layout { grid-template-columns: 1fr; }
      .left { grid-template-rows: auto auto; overflow: visible; }
      .doc-zone { padding: 28px 24px 20px; }
      .copy-zone { padding: 20px 24px 28px; }
      .right { border-left: none; border-top: 1px solid rgba(255,255,255,0.06); }
      .form-inner { padding: 24px 20px; }
      .row2 { grid-template-columns: 1fr; }
      .topbar { padding: 0 20px; }
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
        <div>
          <div class="doc-card">
            <div class="doc-card-header">
              <div class="doc-card-client">
                <div class="doc-card-client-dot">${(page.client_name || 'B').charAt(0).toUpperCase()}</div>
                ${page.client_name || ''}
              </div>
              <div class="doc-card-type">Free Download</div>
            </div>
            <div class="doc-card-body">
              <div class="doc-card-name">${assetName}</div>
              <div class="doc-card-lines">
                <div class="dcl dcl-med"></div>
                <div class="dcl dcl-short"></div>
                <div class="dcl dcl-med"></div>
                <div class="dcl" style="width:40%"></div>
              </div>
            </div>
          </div>
          ${hook ? `<div class="hook-quote">${hook}</div>` : ''}
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

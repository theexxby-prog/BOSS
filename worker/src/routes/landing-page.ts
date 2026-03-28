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

  // Brand colors
  const bc = page.brand_color  || '#2563eb';
  const logoUrl   = page.logo_url   || '';
  const assetName = page.asset_name || 'Resource';
  const assetUrl  = page.asset_url  || '';

  // AI copy
  let ai: {
    headline:     string;
    subheadline:  string;
    hook:         string;
    bullets:      { icon: string; title: string; body: string }[];
    cta:          string;
    social_proof: string;
    design?: { theme?: string; hero_stat?: string; doc_type?: string };
  } | null = null;
  try { ai = page.ai_copy ? JSON.parse(page.ai_copy) : null; } catch {}

  const headline    = ai?.headline     || page.headline    || `Download: ${assetName}`;
  const subheadline = ai?.subheadline  || page.subheadline || 'Fill out the form to get instant access.';
  const hook        = ai?.hook         || '';
  const ctaText     = ai?.cta          || page.cta_text    || 'Download Now';
  const socialProof = ai?.social_proof || '';
  const docType     = ai?.design?.doc_type  || '';
  const heroStat    = ai?.design?.hero_stat || '';
  const formTitle   = ai?.cta          || 'Get Your Free Copy';

  const defaultBullets = [
    { icon: 'check', title: 'Data-Driven Insights',  body: 'Research-backed analysis with actionable recommendations.' },
    { icon: 'check', title: 'Actionable Frameworks', body: 'Step-by-step guidance you can apply immediately.' },
    { icon: 'check', title: 'Expert Perspective',    body: 'Curated insights from leading practitioners.' },
    { icon: 'check', title: 'Immediate Value',       body: 'Practical takeaways you can use from day one.' },
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
      <select name="custom_q${i + 1}" required>
        <option value="">Select...</option>${opts}
      </select>
    </div>`;
  }).join('');

  // SVG checkmark bullet icon (inline, uses brand color)
  const checkSvg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style="flex-shrink:0;margin-top:2px">
    <circle cx="10" cy="10" r="10" fill="${bc}"/>
    <path d="M6.5 10.5L9 13L13.5 8" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  const bulletsHtml = bullets.map(b => `
    <div class="bullet">
      ${checkSvg}
      <div class="bullet-text">
        <div class="bullet-title">${b.title}</div>
        <div class="bullet-body">${b.body}</div>
      </div>
    </div>`).join('');

  const apiBase = url.origin;

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
      background: #F1F5F9;
      color: #0F172A;
      min-height: 100vh;
    }

    /* ── Topbar ── */
    .topbar {
      height: 56px;
      background: ${bc};
      border-bottom: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 40px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar-left { display: flex; align-items: center; gap: 10px; }
    .logo { height: 28px; object-fit: contain; filter: brightness(0) invert(1); }
    .brand-name { font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.95); }
    .asset-name-badge {
      font-size: 12px; font-weight: 500;
      color: rgba(255,255,255,0.85);
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      padding: 4px 14px;
      border-radius: 20px;
      letter-spacing: 0.01em;
      max-width: 420px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Layout ── */
    .layout {
      max-width: 1160px;
      margin: 0 auto;
      padding: 56px 40px 72px;
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 56px;
      align-items: stretch;
    }

    /* ── Left: copy ── */
    .copy { padding-right: 8px; }

    .overline {
      font-size: 11px; font-weight: 600;
      color: ${bc};
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 14px;
    }

    h1 {
      font-size: clamp(30px, 3.8vw, 48px);
      font-weight: 700;
      line-height: 1.13;
      letter-spacing: -0.5px;
      color: #0F172A;
      margin-bottom: 18px;
    }

    .sub {
      font-size: 16px;
      color: #475569;
      line-height: 1.65;
      max-width: 520px;
      margin-bottom: 32px;
    }

    /* ── Hero stat callout ── */
    .stat-callout {
      background: ${bc}0d;
      border: 1px solid ${bc}28;
      border-left: 3px solid ${bc};
      border-radius: 0 8px 8px 0;
      padding: 14px 20px;
      margin-bottom: 32px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      line-height: 1.55;
    }

    /* ── Bullets ── */
    .bullets { display: flex; flex-direction: column; gap: 20px; margin-bottom: 32px; }
    .bullet  { display: flex; gap: 14px; align-items: flex-start; }
    .bullet-title { font-size: 14px; font-weight: 600; color: #0F172A; margin-bottom: 4px; }
    .bullet-body  { font-size: 14px; color: #475569; line-height: 1.55; }

    /* ── Social proof & trust ── */
    .social-proof { font-size: 12px; color: #94A3B8; line-height: 1.5; margin-bottom: 16px; }
    .trust-row { display: flex; flex-wrap: wrap; gap: 4px; font-size: 12px; color: #94A3B8; }
    .trust-row span::after { content: ' \u00b7 '; }
    .trust-row span:last-child::after { content: ''; }

    /* ── Right: form card ── */
    .form-wrap { display: flex; flex-direction: column; }
    .form-card {
      flex: 1;
      background: #fff;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      box-shadow: 0 4px 32px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04);
      padding: 36px 32px 32px;
    }

    .form-title { font-size: 20px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
    .form-sub   { font-size: 13px; color: #64748B; margin-bottom: 24px; line-height: 1.4; }

    /* ── Form fields ── */
    .fg { margin-bottom: 14px; }
    .fg label {
      display: block;
      font-size: 11px; font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 5px;
    }
    .fg input, .fg select {
      width: 100%; padding: 10px 12px;
      background: #fff;
      border: 1.5px solid #E2E8F0;
      border-radius: 8px;
      font-size: 14px; color: #0F172A;
      font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
      appearance: none;
    }
    .fg input::placeholder { color: #CBD5E1; }
    .fg select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394A3B8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 32px;
      cursor: pointer;
    }
    .fg input:hover, .fg select:hover { border-color: #CBD5E1; }
    .fg input:focus, .fg select:focus {
      outline: none;
      border-color: ${bc};
      box-shadow: 0 0 0 3px ${bc}22;
    }

    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    /* ── Custom questions divider ── */
    .custom-divider {
      display: flex; align-items: center; gap: 10px;
      margin: 20px 0 16px;
      font-size: 11px; font-weight: 600;
      color: ${bc};
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .custom-divider::before, .custom-divider::after {
      content: ''; flex: 1; height: 1px; background: #E2E8F0;
    }

    /* ── Submit button ── */
    .btn-submit {
      width: 100%; padding: 13px;
      background: ${bc}; color: #fff;
      border: none; border-radius: 8px;
      font-size: 15px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      margin-top: 6px;
      transition: filter 0.15s, transform 0.1s;
      letter-spacing: 0.01em;
    }
    .btn-submit:hover   { filter: brightness(1.08); transform: translateY(-1px); }
    .btn-submit:active  { transform: translateY(0); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; filter: none; }

    .consent { font-size: 11px; color: #94A3B8; margin-top: 12px; line-height: 1.6; text-align: center; }

    /* ── Success state ── */
    .success { text-align: center; padding: 24px 8px 8px; }
    .success-check { margin-bottom: 20px; }
    .success-title { font-size: 24px; font-weight: 700; color: #0F172A; margin-bottom: 10px; }
    .success-body  { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
    .dl-btn {
      display: inline-block; padding: 12px 28px;
      background: ${bc}; color: #fff; border-radius: 8px;
      text-decoration: none; font-weight: 600; font-size: 14px;
      transition: filter 0.15s;
    }
    .dl-btn:hover { filter: brightness(1.08); }
    .success-email { font-size: 14px; font-weight: 600; color: #059669; }

    /* ── Mobile ── */
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; gap: 36px; padding: 36px 24px 56px; }
      .copy { padding-right: 0; }
    }
    @media (max-width: 480px) {
      .topbar { padding: 0 20px; }
      h1 { letter-spacing: -0.3px; }
      .form-card { padding: 24px 20px 20px; border-radius: 12px; }
      .row2 { grid-template-columns: 1fr; gap: 0; }
    }
  </style>
</head>
<body>

  <header class="topbar">
    <div class="topbar-left">
      ${logoUrl ? `<img src="${logoUrl}" class="logo" alt=""/>` : ''}
      ${page.client_name ? `<span class="brand-name">${page.client_name}</span>` : ''}
    </div>
    <span class="asset-name-badge">${assetName}</span>
  </header>

  <main class="layout">

    <div class="copy">
      ${hook ? `<div class="overline">${hook}</div>` : ''}
      <h1>${headline}</h1>
      <p class="sub">${subheadline}</p>
      ${heroStat ? `<div class="stat-callout">${heroStat}</div>` : ''}
      <div class="bullets">${bulletsHtml}</div>
      ${socialProof ? `<p class="social-proof">${socialProof}</p>` : ''}
      <div class="trust-row">
        <span>No spam, ever</span>
        <span>Instant download</span>
        <span>Unsubscribe anytime</span>
      </div>
    </div>

    <div class="form-wrap">
      <div class="form-card">
        <div id="form-section">
          <h2 class="form-title">${formTitle}</h2>
          <p class="form-sub">${assetName}</p>
          <form id="lead-form">
            <div class="row2">
              <div class="fg"><label>First Name</label><input type="text" name="first_name" required placeholder="Jane"/></div>
              <div class="fg"><label>Last Name</label><input type="text" name="last_name" required placeholder="Smith"/></div>
            </div>
            <div class="fg"><label>Business Email</label><input type="email" name="email" required placeholder="jane@company.com"/></div>
            <div class="row2">
              <div class="fg"><label>Company</label><input type="text" name="company" required placeholder="Acme Inc"/></div>
              <div class="fg"><label>Job Title</label><input type="text" name="title" required placeholder="VP Marketing"/></div>
            </div>
            <div class="row2">
              <div class="fg"><label>Phone</label><input type="tel" name="phone" placeholder="+1 555 000 0000"/></div>
              <div class="fg"><label>Country</label><input type="text" name="country" placeholder="United States"/></div>
            </div>
            ${customQuestions.length ? `<div class="custom-divider"><span>A few quick questions</span></div>${customFieldsHtml}` : ''}
            <button type="submit" class="btn-submit">${ctaText}</button>
          </form>
          <p class="consent">By downloading, you agree to receive relevant communications. Unsubscribe anytime.</p>
        </div>
        <div id="success-section" class="success" style="display:none">
          <div class="success-check">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="${bc}"/>
              <path d="M15 24.5L21 30.5L33 18" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2 class="success-title">You're all set!</h2>
          <p class="success-body">Your copy of <strong>${assetName}</strong> is ready to download.</p>
          ${assetUrl
            ? `<a href="${assetUrl}" target="_blank" class="dl-btn">Download Now</a>`
            : `<p class="success-email">Your resource will be sent to your email shortly.</p>`}
        </div>
      </div>
    </div>

  </main>

  <script>
    document.getElementById('lead-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('[type="submit"]');
      btn.textContent = 'Submitting\u2026';
      btn.disabled = true;
      const data = Object.fromEntries(new FormData(this));
      const customAnswers = {};
      ${customQuestions.map((_, i) => `if (data.custom_q${i + 1}) customAnswers['q${i + 1}'] = data.custom_q${i + 1};`).join('\n      ')}
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
          btn.textContent = 'Error \u2014 Try Again';
          btn.disabled = false;
        }
      } catch {
        btn.textContent = 'Error \u2014 Try Again';
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

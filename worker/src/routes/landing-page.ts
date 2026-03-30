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
  const bc      = page.brand_color || '#2563eb';
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
  const heroStat    = ai?.design?.hero_stat || '';

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

  // Outline SVG icons — one per bullet position, generically applicable to B2B content
  const bulletIcons = [
    `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="2" width="8" height="8" rx="1.5" stroke="${bc}" stroke-width="1.5"/><rect x="12" y="2" width="8" height="8" rx="1.5" stroke="${bc}" stroke-width="1.5"/><rect x="2" y="12" width="8" height="8" rx="1.5" stroke="${bc}" stroke-width="1.5"/><rect x="12" y="12" width="8" height="8" rx="1.5" stroke="${bc}" stroke-width="1.5"/></svg>`,
    `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2L3 5.5V10.5c0 4.5 3.5 7.5 8 9 4.5-1.5 8-4.5 8-9V5.5L11 2z" stroke="${bc}" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><polyline points="2,17 8,10 13,14 20,5" stroke="${bc}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14,5 20,5 20,11" stroke="${bc}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><ellipse cx="11" cy="8" rx="8" ry="3" stroke="${bc}" stroke-width="1.5"/><path d="M3 8v6c0 1.66 3.58 3 8 3s8-1.34 8-3V8" stroke="${bc}" stroke-width="1.5"/><path d="M3 11c0 1.66 3.58 3 8 3s8-1.34 8-3" stroke="${bc}" stroke-width="1.5"/></svg>`,
  ];

  // Scale headline font down if the text is long — safety net for any edge cases
  const h1Size = headline.length > 80 ? 'clamp(24px, 3vw, 38px)'
    : headline.length > 55             ? 'clamp(28px, 3.5vw, 48px)'
    :                                    'clamp(36px, 4.5vw, 68px)';

  const bulletsHtml = bullets.slice(0, 4).map((b, i) => `
    <div class="bullet">
      <div class="bullet-icon">${bulletIcons[i % 4]}</div>
      <div class="bullet-title">${b.title}</div>
      <div class="bullet-body">${b.body}</div>
    </div>`).join('');

  const apiBase = url.origin;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${headline}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #F5F5F3;
      color: #0F172A;
      min-height: 100vh;
    }

    /* ── Topbar ── */
    .topbar {
      height: 52px;
      background: #fff;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 40px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar-left  { display: flex; align-items: center; gap: 10px; }
    .logo         { height: 26px; object-fit: contain; }
    .brand-name   { font-size: 14px; font-weight: 600; color: #0F172A; letter-spacing: 0.01em; }
    .topbar-asset {
      font-size: 12px; font-weight: 500;
      color: #6B7280;
      max-width: 380px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Layout ── */
    .layout {
      max-width: 1200px;
      margin: 0 auto;
      padding: 64px 40px 80px;
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 64px;
      align-items: stretch;
    }

    /* ── Left: copy ── */
    .copy { padding-right: 8px; display: flex; flex-direction: column; }

    .overline {
      font-size: 11px; font-weight: 600;
      color: ${bc};
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 20px;
    }

    h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: ${h1Size};
      font-weight: 700;
      line-height: 1.05;
      letter-spacing: -1px;
      color: #0A0A0A;
      margin-bottom: 24px;
    }

    .sub {
      font-size: 17px;
      color: #4B5563;
      line-height: 1.65;
      max-width: 540px;
      margin-bottom: 48px;
    }

    /* ── Hero stat ── */
    .stat-callout {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: ${bc}0d;
      border-left: 3px solid ${bc};
      padding: 12px 18px;
      margin-bottom: 40px;
      font-size: 14px; font-weight: 500;
      color: #374151;
      line-height: 1.5;
    }

    /* ── 2×2 Bullet grid ── */
    .bullets {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px 48px;
      margin-bottom: 40px;
    }
    .bullet { display: flex; flex-direction: column; gap: 8px; }
    .bullet-icon { color: ${bc}; line-height: 0; }
    .bullet-title {
      font-size: 15px; font-weight: 600;
      color: #0F172A;
      margin-top: 2px;
    }
    .bullet-body {
      font-size: 14px; color: #6B7280;
      line-height: 1.6;
      padding-left: 12px;
      border-left: 2px solid ${bc}35;
    }

    /* ── Social proof & trust ── */
    .social-proof { font-size: 12px; color: #9CA3AF; line-height: 1.5; margin-bottom: 12px; }
    .trust-row {
      margin-top: auto;
      display: flex; flex-wrap: wrap; gap: 20px;
      font-size: 12px; color: #9CA3AF;
    }

    /* ── Right: form card ── */
    .form-wrap { display: flex; flex-direction: column; }
    .form-card {
      flex: 1;
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.06);
      padding: 40px 36px 36px;
    }

    .form-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 26px; font-weight: 700;
      color: #0A0A0A; margin-bottom: 6px;
      letter-spacing: -0.3px;
    }
    .form-sub { font-size: 14px; color: #6B7280; margin-bottom: 32px; line-height: 1.5; }

    /* ── Underline form fields ── */
    .fg { margin-bottom: 24px; }
    .fg label {
      display: block;
      font-size: 11px; font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .fg input, .fg select {
      width: 100%;
      padding: 6px 0 10px;
      background: transparent;
      border: none;
      border-bottom: 1.5px solid #D1D5DB;
      border-radius: 0;
      font-size: 15px; color: #0F172A;
      font-family: inherit;
      transition: border-color 0.15s;
      appearance: none;
    }
    .fg input::placeholder { color: #D1D5DB; }
    .fg select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 4px center;
      padding-right: 24px;
      cursor: pointer;
    }
    .fg input:focus, .fg select:focus {
      outline: none;
      border-bottom-color: ${bc};
    }

    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

    /* ── Custom questions divider ── */
    .custom-divider {
      display: flex; align-items: center; gap: 10px;
      margin: 8px 0 20px;
      font-size: 10px; font-weight: 600;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .custom-divider::before, .custom-divider::after {
      content: ''; flex: 1; height: 1px; background: #E5E7EB;
    }

    /* ── Submit button ── */
    .btn-submit {
      width: 100%; padding: 15px;
      background: ${bc}; color: #fff;
      border: none; border-radius: 3px;
      font-size: 12px; font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer; font-family: inherit;
      margin-top: 8px;
      transition: filter 0.15s, transform 0.1s;
    }
    .btn-submit:hover   { filter: brightness(1.08); transform: translateY(-1px); }
    .btn-submit:active  { transform: translateY(0); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; filter: none; }

    .consent {
      font-size: 11px; color: #9CA3AF;
      margin-top: 16px; line-height: 1.6;
      text-align: center;
    }

    /* ── Success state ── */
    .success { text-align: center; padding: 40px 16px 16px; }
    .success-check { margin-bottom: 24px; }
    .success-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 28px; font-weight: 700;
      color: #0A0A0A; margin-bottom: 12px;
    }
    .success-body  { font-size: 15px; color: #4B5563; line-height: 1.6; margin-bottom: 28px; }
    .dl-btn {
      display: inline-block; padding: 14px 32px;
      background: ${bc}; color: #fff; border-radius: 3px;
      text-decoration: none; font-weight: 600;
      font-size: 12px; letter-spacing: 0.1em;
      text-transform: uppercase;
      transition: filter 0.15s;
    }
    .dl-btn:hover { filter: brightness(1.08); }
    .success-email { font-size: 14px; font-weight: 600; color: #059669; }

    /* ── Mobile ── */
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; gap: 40px; padding: 36px 24px 56px; }
      .copy { padding-right: 0; }
      .bullets { grid-template-columns: 1fr; gap: 24px; }
    }
    @media (max-width: 480px) {
      .topbar { padding: 0 20px; }
      h1 { letter-spacing: -0.5px; }
      .form-card { padding: 28px 20px 24px; }
      .row2 { grid-template-columns: 1fr; gap: 0; }
    }
  </style>
</head>
<body>

  <header class="topbar">
    <div class="topbar-left">
      ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="" onerror="this.style.display='none'"/>` : ''}
      ${page.client_name ? `<span class="brand-name">${page.client_name}</span>` : ''}
    </div>
    <span class="topbar-asset">${assetName}</span>
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
          <h2 class="form-title">${ctaText}</h2>
          <p class="form-sub">Fill in your details to receive the ${assetName} directly.</p>

          <form id="lead-form">
            <div class="row2">
              <div class="fg"><label>First Name</label><input type="text" name="first_name" required placeholder="Jane"/></div>
              <div class="fg"><label>Last Name</label><input type="text" name="last_name" required placeholder="Smith"/></div>
            </div>
            <div class="fg"><label>Work Email</label><input type="email" name="email" required placeholder="jane@company.com"/></div>
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
          <p class="consent">By submitting, you agree to receive relevant communications. Unsubscribe anytime.</p>
        </div>

        <div id="success-section" class="success" style="display:none">
          <div class="success-check">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="26" fill="${bc}"/>
              <path d="M16 26.5L22 33L36 19" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2 class="success-title">You're all set.</h2>
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

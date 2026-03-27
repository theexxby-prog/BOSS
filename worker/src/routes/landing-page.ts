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
      background: #0c1220;
      color: #e2e8f0;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .topbar {
      height: 52px; min-height: 52px;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex; align-items: center;
      padding: 0 40px; gap: 12px;
      flex-shrink: 0;
    }
    .topbar img { height: 28px; object-fit: contain; }
    .topbar .brand { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); }
    .topbar .asset-badge {
      margin-left: auto;
      font-size: 11px; font-weight: 500;
      color: ${ba};
      background: ${ba}18;
      border: 1px solid ${ba}33;
      padding: 3px 10px; border-radius: 20px;
    }

    /* ── Main: two columns, full remaining height ── */
    .layout {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 0;
      overflow: hidden;
      position: relative;
    }

    /* ── Left panel ── */
    .left {
      padding: 48px 52px 40px;
      display: flex; flex-direction: column;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .left::before {
      content: '';
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 70% 60% at 20% 50%, ${bc}22, transparent),
        radial-gradient(ellipse 50% 40% at 80% 20%, ${ba}11, transparent);
      pointer-events: none;
    }
    .left-content { position: relative; z-index: 1; }

    .hook {
      font-size: 12px; font-weight: 600;
      color: ${ba};
      text-transform: uppercase; letter-spacing: 0.08em;
      margin-bottom: 16px;
    }
    h1 {
      font-size: clamp(24px, 2.8vw, 38px);
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.5px;
      color: #f1f5f9;
      margin-bottom: 14px;
    }
    .subheadline {
      font-size: 15px;
      color: rgba(255,255,255,0.5);
      line-height: 1.6;
      max-width: 480px;
      margin-bottom: 36px;
    }

    /* ── Bullets ── */
    .bullets { display: flex; flex-direction: column; gap: 20px; }
    .bullet { display: flex; gap: 14px; align-items: flex-start; }
    .bullet-icon {
      width: 36px; height: 36px; flex-shrink: 0;
      background: ${ba}15;
      border: 1px solid ${ba}25;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .bullet-title { font-size: 14px; font-weight: 600; color: #f1f5f9; margin-bottom: 3px; }
    .bullet-body  { font-size: 13px; color: rgba(255,255,255,0.42); line-height: 1.5; }

    /* Trust row */
    .trust-row {
      display: flex; gap: 20px; flex-wrap: wrap;
      margin-top: 28px; padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .trust-item {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: rgba(255,255,255,0.35);
    }
    .trust-dot { width: 5px; height: 5px; border-radius: 50%; background: #10b981; flex-shrink: 0; }

    /* ── Right panel: form ── */
    .right {
      background: rgba(255,255,255,0.025);
      border-left: 1px solid rgba(255,255,255,0.06);
      display: flex; flex-direction: column;
      overflow-y: auto;
    }
    .form-inner { padding: 36px 32px; flex: 1; }

    .form-title { font-size: 17px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
    .form-sub   { font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 20px; }

    .fg { margin-bottom: 12px; }
    .fg label {
      display: block; font-size: 11px; font-weight: 600;
      color: rgba(255,255,255,0.4);
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .fg input, .fg select {
      width: 100%; padding: 10px 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 8px;
      font-size: 13px; color: #f1f5f9;
      font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .fg input::placeholder { color: rgba(255,255,255,0.18); }
    .fg input:focus, .fg select:focus {
      outline: none;
      border-color: ${ba};
      box-shadow: 0 0 0 3px ${ba}20;
    }
    .fg select option { background: #1a2235; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    .divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 14px 0; }
    .custom-label {
      font-size: 11px; font-weight: 600;
      color: ${ba}; text-transform: uppercase;
      letter-spacing: 0.5px; margin-bottom: 12px;
    }

    .btn-submit {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg, ${bc}, ${ba});
      color: #fff; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 700;
      cursor: pointer; font-family: inherit;
      margin-top: 4px;
      transition: opacity 0.15s, transform 0.15s;
    }
    .btn-submit:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .consent {
      font-size: 11px; color: rgba(255,255,255,0.25);
      margin-top: 10px; line-height: 1.5; text-align: center;
    }

    ${socialProof ? `.social-proof {
      padding: 12px 32px;
      border-top: 1px solid rgba(255,255,255,0.05);
      font-size: 11px; color: rgba(255,255,255,0.3);
      text-align: center;
    }` : ''}

    /* ── Success state ── */
    .success { display: none; text-align: center; padding: 48px 24px; }
    .success-icon { font-size: 48px; margin-bottom: 16px; }
    .success h2 { font-size: 20px; font-weight: 700; color: #10b981; margin-bottom: 8px; }
    .success p  { font-size: 13px; color: rgba(255,255,255,0.45); margin-bottom: 24px; line-height: 1.6; }
    .dl-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 28px;
      background: linear-gradient(135deg, ${bc}, ${ba});
      color: #fff; border-radius: 8px;
      text-decoration: none; font-weight: 700; font-size: 14px;
    }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      body { overflow: auto; height: auto; }
      .layout { grid-template-columns: 1fr; overflow: visible; }
      .left { padding: 36px 24px 32px; }
      .right { border-left: none; border-top: 1px solid rgba(255,255,255,0.06); }
      .form-inner { padding: 28px 24px; }
      .row2 { grid-template-columns: 1fr; }
      .topbar { padding: 0 20px; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="topbar">
    ${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : ''}
    <div class="brand">${page.client_name || ''}</div>
    <div class="asset-badge">📄 ${assetName}</div>
  </div>

  <!-- Main layout -->
  <div class="layout">

    <!-- Left: copy -->
    <div class="left">
      <div class="left-content">
        ${hook ? `<div class="hook">${hook}</div>` : ''}
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
        <div class="form-title">Get Your Free Copy</div>
        <div class="form-sub">${assetName}</div>

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

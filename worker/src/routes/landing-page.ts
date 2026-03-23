// Public landing page renderer — serves HTML at /lp/:slug
import type { Env } from '../types';
import { dbFirst, dbRun } from '../db';

export async function landingPageRenderer(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const slug = url.pathname.replace('/lp/', '').split('/')[0];

  if (!slug) {
    return new Response('Not found', { status: 404 });
  }

  const page = await dbFirst<any>(env.DB,
    `SELECT lp.*, c.name as campaign_name, cl.name as client_name
     FROM landing_pages lp
     LEFT JOIN campaigns c ON lp.campaign_id = c.id
     LEFT JOIN clients cl ON lp.client_id = cl.id
     WHERE lp.slug = ? AND lp.status = 'active'`, [slug]
  );

  if (!page) {
    return new Response('Page not found', { status: 404, headers: { 'Content-Type': 'text/html' } });
  }

  // Increment views
  await dbRun(env.DB, `UPDATE landing_pages SET views=views+1, updated_at=datetime('now') WHERE id=?`, [String(page.id)]);

  const brandColor = page.brand_color || '#2563eb';
  const brandSecondary = page.brand_color_secondary || '#1e40af';
  const brandAccent = page.brand_accent || '#3b82f6';
  const logoUrl = page.logo_url || '';
  const headline = page.headline || 'Download Your Free Resource';
  const subheadline = page.subheadline || 'Fill out the form below to get instant access.';
  const ctaText = page.cta_text || 'Download Now';
  const assetName = page.asset_name || 'Resource';
  const assetUrl = page.asset_url || '';

  let customQuestions: { question: string; type: string }[] = [];
  try { customQuestions = JSON.parse(page.custom_questions || '[]'); } catch {}

  const customFieldsHtml = customQuestions.map((q, i) => {
    if (q.type === 'select') {
      return `<div class="form-group">
        <label>${q.question}</label>
        <select name="custom_q${i+1}" required>
          <option value="">Select...</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
          <option value="Considering">Considering</option>
        </select>
      </div>`;
    }
    return `<div class="form-group">
      <label>${q.question}</label>
      <input type="text" name="custom_q${i+1}" required placeholder="Your answer" />
    </div>`;
  }).join('');

  const apiBase = url.origin;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${headline}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      min-height: 100vh;
    }
    .header {
      background: linear-gradient(135deg, ${brandColor}, ${brandSecondary});
      padding: 24px 40px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header img { height: 40px; }
    .header .company { color: white; font-size: 18px; font-weight: 600; }
    .hero {
      background: linear-gradient(135deg, ${brandColor}, ${brandSecondary});
      padding: 60px 40px 80px;
      text-align: center;
      color: white;
    }
    .hero h1 { font-size: 36px; font-weight: 700; margin-bottom: 12px; line-height: 1.2; }
    .hero p { font-size: 18px; opacity: 0.9; max-width: 600px; margin: 0 auto; }
    .container {
      max-width: 520px;
      margin: -40px auto 60px;
      padding: 0 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      padding: 36px;
    }
    .card h2 {
      font-size: 20px;
      margin-bottom: 4px;
      color: ${brandColor};
    }
    .card .sub { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; }
    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 4px;
    }
    .form-group input, .form-group select {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
      background: #f8fafc;
    }
    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: ${brandAccent};
      box-shadow: 0 0 0 3px ${brandAccent}22;
    }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .btn-submit {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, ${brandColor}, ${brandSecondary});
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      transition: transform 0.1s, box-shadow 0.2s;
    }
    .btn-submit:hover { transform: translateY(-1px); box-shadow: 0 4px 12px ${brandColor}44; }
    .btn-submit:active { transform: translateY(0); }
    .consent { font-size: 12px; color: #94a3b8; margin-top: 12px; line-height: 1.5; }
    .consent a { color: ${brandAccent}; }
    .footer { text-align: center; padding: 40px; color: #94a3b8; font-size: 12px; }
    .success { display: none; text-align: center; padding: 40px 20px; }
    .success .check { font-size: 48px; margin-bottom: 16px; }
    .success h2 { color: #10b981; margin-bottom: 8px; }
    .success p { color: #64748b; margin-bottom: 24px; }
    .success .dl-btn {
      display: inline-block;
      padding: 12px 32px;
      background: ${brandColor};
      color: white;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
    }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
    .custom-section h3 { font-size: 14px; color: ${brandColor}; margin-bottom: 12px; font-weight: 600; }
    @media (max-width: 600px) {
      .hero { padding: 40px 20px 60px; }
      .hero h1 { font-size: 26px; }
      .card { padding: 24px; }
      .row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : ''}
    <div class="company">${page.client_name || ''}</div>
  </div>
  <div class="hero">
    <h1>${headline}</h1>
    <p>${subheadline}</p>
  </div>
  <div class="container">
    <div class="card">
      <div id="form-section">
        <h2>Get Your Copy</h2>
        <div class="sub">${assetName} — Free Download</div>
        <form id="lead-form" onsubmit="submitForm(event)">
          <div class="row">
            <div class="form-group">
              <label>First Name *</label>
              <input type="text" name="first_name" required placeholder="John" />
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input type="text" name="last_name" required placeholder="Smith" />
            </div>
          </div>
          <div class="form-group">
            <label>Business Email *</label>
            <input type="email" name="email" required placeholder="john@company.com" />
          </div>
          <div class="row">
            <div class="form-group">
              <label>Company *</label>
              <input type="text" name="company" required placeholder="Acme Inc" />
            </div>
            <div class="form-group">
              <label>Job Title *</label>
              <input type="text" name="title" required placeholder="VP Marketing" />
            </div>
          </div>
          <div class="row">
            <div class="form-group">
              <label>Phone</label>
              <input type="tel" name="phone" placeholder="+1 (555) 000-0000" />
            </div>
            <div class="form-group">
              <label>Country</label>
              <input type="text" name="country" placeholder="United States" />
            </div>
          </div>
          ${customQuestions.length ? `<hr class="divider"/><div class="custom-section"><h3>A couple of quick questions</h3>${customFieldsHtml}</div>` : ''}
          <button type="submit" class="btn-submit">${ctaText}</button>
          <div class="consent">By downloading, you agree to receive relevant communications. You can unsubscribe at any time. <a href="#">Privacy Policy</a></div>
        </form>
      </div>
      <div id="success-section" class="success">
        <div class="check">✅</div>
        <h2>Thank you!</h2>
        <p>Your download is ready. Click below to access your copy.</p>
        ${assetUrl ? `<a href="${assetUrl}" target="_blank" class="dl-btn">Download ${assetName}</a>` : '<p style="color:#10b981;font-weight:600">Your resource will be sent to your email shortly.</p>'}
      </div>
    </div>
  </div>
  <div class="footer">Powered by BOSS HQ</div>
  <script>
    async function submitForm(e) {
      e.preventDefault();
      const form = e.target;
      const btn = form.querySelector('.btn-submit');
      btn.textContent = 'Submitting...';
      btn.disabled = true;

      const data = Object.fromEntries(new FormData(form));
      // Collect custom question answers
      const customAnswers = {};
      ${customQuestions.map((_, i) => `if(data.custom_q${i+1}) customAnswers['q${i+1}'] = data.custom_q${i+1};`).join('\n      ')}
      data.custom_answers = JSON.stringify(customAnswers);

      try {
        const res = await fetch('${apiBase}/api/pages/${slug}/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
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
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

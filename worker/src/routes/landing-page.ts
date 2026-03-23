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

  let customQuestions: { question: string; type: string; options?: string[] }[] = [];
  try { customQuestions = JSON.parse(page.custom_questions || '[]'); } catch {}

  // All custom questions render as dropdowns with pre-populated options
  const customFieldsHtml = customQuestions.map((q, i) => {
    const opts = (q.options && q.options.length > 0)
      ? q.options.map((o: string) => `<option value="${o}">${o}</option>`).join('')
      : `<option value="Yes">Yes</option><option value="No">No</option><option value="Evaluating">Evaluating</option><option value="Not sure">Not sure</option>`;
    return `<div class="form-group">
      <label>${q.question}</label>
      <select name="custom_q${i+1}" required>
        <option value="">Select an option...</option>
        ${opts}
      </select>
    </div>`;
  }).join('');

  const apiBase = url.origin;
  const downloadCount = 2847 + (page.submissions || 0) * 3;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${headline}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* ── Header ─────────────────────── */
    .topbar {
      background: rgba(0,0,0,0.3);
      backdrop-filter: blur(12px);
      padding: 14px 40px;
      display: flex;
      align-items: center;
      gap: 14px;
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .topbar img { height: 32px; filter: drop-shadow(0 0 8px rgba(255,255,255,0.2)); }
    .topbar .company { color: rgba(255,255,255,0.9); font-size: 15px; font-weight: 600; letter-spacing: -0.3px; }
    .topbar .dl-count {
      margin-left: auto;
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .topbar .dl-count .dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: pulse-dot 2s ease-in-out infinite; }

    /* ── Hero ─────────────────────── */
    .hero {
      position: relative;
      padding: 140px 40px 100px;
      text-align: center;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 80% 60% at 50% 40%, ${brandColor}44, transparent),
                  radial-gradient(ellipse 60% 50% at 20% 80%, ${brandAccent}22, transparent),
                  radial-gradient(ellipse 60% 50% at 80% 20%, ${brandSecondary}33, transparent);
    }
    .hero::after {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 120px;
      background: linear-gradient(to top, #0f172a, transparent);
    }
    .hero-content { position: relative; z-index: 2; max-width: 700px; margin: 0 auto; }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border-radius: 20px;
      background: ${brandAccent}22;
      border: 1px solid ${brandAccent}44;
      color: ${brandAccent};
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .hero h1 {
      font-size: 44px;
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 16px;
      letter-spacing: -1px;
      background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero p {
      font-size: 18px;
      color: rgba(255,255,255,0.6);
      max-width: 560px;
      margin: 0 auto 32px;
      line-height: 1.6;
    }

    /* ── Social Proof ─────────────────────── */
    .social-proof {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 24px;
    }
    .avatars { display: flex; }
    .avatars .av {
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 2px solid #0f172a;
      margin-left: -8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
    }
    .avatars .av:first-child { margin-left: 0; }
    .social-text { font-size: 13px; color: rgba(255,255,255,0.5); }
    .social-text strong { color: rgba(255,255,255,0.8); }

    /* ── Main layout ─────────────────────── */
    .main { max-width: 1000px; margin: -40px auto 0; padding: 0 20px 60px; position: relative; z-index: 3; }
    .grid { display: grid; grid-template-columns: 1fr 420px; gap: 32px; align-items: start; }

    /* ── Benefits panel ─────────────────────── */
    .benefits { padding-top: 24px; }
    .benefit-item {
      display: flex;
      gap: 14px;
      padding: 20px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .benefit-item:last-child { border-bottom: none; }
    .benefit-icon {
      width: 40px; height: 40px;
      border-radius: 10px;
      background: ${brandAccent}18;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .benefit-item h3 { font-size: 15px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
    .benefit-item p { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.5; }

    .trust-row {
      display: flex;
      gap: 16px;
      margin-top: 24px;
      flex-wrap: wrap;
    }
    .trust-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: rgba(255,255,255,0.4);
    }
    .trust-item svg { width: 14px; height: 14px; fill: #10b981; }

    .testimonial-strip {
      max-width: 1000px;
      margin: 48px auto 0;
      padding: 0 20px;
    }
    .testimonial-inner {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      padding: 28px 32px;
      border-radius: 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
    }
    .testimonial-avatar {
      width: 48px; height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${brandColor}, ${brandAccent});
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 16px;
      flex-shrink: 0;
    }
    .testimonial-content { flex: 1; }
    .testimonial-content .quote { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.7; font-style: italic; margin-bottom: 12px; }
    .testimonial-content .author { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.8); }
    .testimonial-content .role { font-size: 12px; color: rgba(255,255,255,0.4); }
    .testimonial-stars { color: #f59e0b; font-size: 14px; letter-spacing: 2px; margin-bottom: 8px; }

    /* ── Form card ─────────────────────── */
    .form-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 32px;
      backdrop-filter: blur(12px);
    }
    .form-header { margin-bottom: 24px; }
    .form-header h2 { font-size: 20px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
    .form-header .sub { color: rgba(255,255,255,0.45); font-size: 13px; }

    .form-group { margin-bottom: 14px; }
    .form-group label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.5);
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-group input, .form-group select {
      width: 100%;
      padding: 11px 14px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      font-size: 14px;
      background: rgba(255,255,255,0.04);
      color: #f1f5f9;
      font-family: inherit;
      transition: all 0.2s;
    }
    .form-group input::placeholder { color: rgba(255,255,255,0.2); }
    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: ${brandAccent};
      box-shadow: 0 0 0 3px ${brandAccent}22;
      background: rgba(255,255,255,0.06);
    }
    .form-group select option { background: #1e293b; color: #f1f5f9; }
    .form-group.valid input { border-color: #10b981; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    .btn-submit {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, ${brandColor}, ${brandAccent});
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 8px;
      font-family: inherit;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }
    .btn-submit::before {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 200%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      animation: shimmer 3s ease-in-out infinite;
    }
    .btn-submit:hover { transform: translateY(-1px); box-shadow: 0 8px 24px ${brandColor}44; }
    .btn-submit:active { transform: translateY(0); }
    .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

    .consent { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 14px; line-height: 1.6; text-align: center; }
    .consent a { color: ${brandAccent}; text-decoration: none; }

    .divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.08);
      margin: 20px 0;
    }
    .custom-section h3 {
      font-size: 13px;
      color: ${brandAccent};
      margin-bottom: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Success state ─────────────────────── */
    .success { display: none; text-align: center; padding: 40px 20px; }
    .success-anim { font-size: 56px; margin-bottom: 16px; animation: success-pop 0.5s ease; }
    .success h2 { font-size: 22px; color: #10b981; margin-bottom: 8px; font-weight: 700; }
    .success p { color: rgba(255,255,255,0.5); margin-bottom: 24px; font-size: 14px; line-height: 1.6; }
    .dl-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 32px;
      background: linear-gradient(135deg, ${brandColor}, ${brandAccent});
      color: white;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      transition: all 0.2s;
    }
    .dl-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px ${brandColor}44; }

    /* ── Footer ─────────────────────── */
    .footer {
      text-align: center;
      padding: 40px;
      color: rgba(255,255,255,0.2);
      font-size: 12px;
      border-top: 1px solid rgba(255,255,255,0.04);
    }

    /* ── Mobile sticky CTA ─────────────────────── */
    .sticky-cta {
      display: none;
      position: fixed;
      bottom: 0; left: 0; right: 0;
      padding: 12px 20px;
      background: rgba(15,23,42,0.95);
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(255,255,255,0.08);
      z-index: 100;
    }
    .sticky-cta button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, ${brandColor}, ${brandAccent});
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
    }

    /* ── Animations ─────────────────────── */
    @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }
    @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    @keyframes success-pop { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .fade-up { animation: fade-up 0.6s ease forwards; }
    .fade-up-d1 { animation-delay: 0.1s; opacity: 0; }
    .fade-up-d2 { animation-delay: 0.2s; opacity: 0; }
    .fade-up-d3 { animation-delay: 0.3s; opacity: 0; }

    /* ── Responsive ─────────────────────── */
    @media (max-width: 768px) {
      .hero { padding: 120px 20px 60px; }
      .hero h1 { font-size: 28px; }
      .hero p { font-size: 15px; }
      .grid { grid-template-columns: 1fr; }
      .benefits { order: 2; }
      .form-card { order: 1; }
      .row { grid-template-columns: 1fr; }
      .sticky-cta { display: block; }
      .main { padding-bottom: 100px; }
      .topbar { padding: 12px 20px; }
      .testimonial-inner { flex-direction: column; align-items: center; text-align: center; }
    }
  </style>
</head>
<body>
  <!-- Top bar -->
  <div class="topbar">
    ${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : ''}
    <div class="company">${page.client_name || ''}</div>
    <div class="dl-count">
      <div class="dot"></div>
      <span><strong>${downloadCount.toLocaleString()}</strong> professionals downloaded</span>
    </div>
  </div>

  <!-- Hero -->
  <div class="hero">
    <div class="hero-content fade-up">
      <div class="hero-badge">📄 Free ${assetName.includes('Report') ? 'Report' : assetName.includes('Guide') ? 'Guide' : assetName.includes('Playbook') ? 'Playbook' : 'Resource'}</div>
      <h1>${headline}</h1>
      <p>${subheadline}</p>
      <div class="social-proof">
        <div class="avatars">
          <div class="av" style="background:${brandColor}">JD</div>
          <div class="av" style="background:${brandAccent}">SK</div>
          <div class="av" style="background:${brandSecondary}">MR</div>
          <div class="av" style="background:#10b981">AL</div>
          <div class="av" style="background:#f59e0b">TP</div>
        </div>
        <span class="social-text">Join <strong>${downloadCount.toLocaleString()}+</strong> professionals</span>
      </div>
    </div>
  </div>

  <!-- Main content -->
  <div class="main">
    <div class="grid">
      <!-- Left: Benefits -->
      <div class="benefits fade-up fade-up-d1">
        <div class="benefit-item">
          <div class="benefit-icon">📊</div>
          <div>
            <h3>Data-Driven Insights</h3>
            <p>Research-backed analysis with actionable recommendations from industry experts and real-world case studies.</p>
          </div>
        </div>
        <div class="benefit-item">
          <div class="benefit-icon">🎯</div>
          <div>
            <h3>Actionable Frameworks</h3>
            <p>Step-by-step frameworks you can implement immediately — not just theory, but proven playbooks.</p>
          </div>
        </div>
        <div class="benefit-item">
          <div class="benefit-icon">💡</div>
          <div>
            <h3>Expert Analysis</h3>
            <p>Curated insights from leading practitioners and analysts to help you stay ahead of the curve.</p>
          </div>
        </div>
        <div class="benefit-item">
          <div class="benefit-icon">🔒</div>
          <div>
            <h3>Exclusive Content</h3>
            <p>Original research not available anywhere else — compiled specifically for senior decision-makers.</p>
          </div>
        </div>

        <div class="trust-row">
          <div class="trust-item">
            <svg viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
            No spam, ever
          </div>
          <div class="trust-item">
            <svg viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
            Instant download
          </div>
          <div class="trust-item">
            <svg viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
            Unsubscribe anytime
          </div>
        </div>

      </div>

      <!-- Right: Form -->
      <div class="form-card fade-up fade-up-d2">
        <div class="form-header">
          <h2>Get Your Free Copy</h2>
          <div class="sub">${assetName}</div>
        </div>

        <div id="form-section">
          <form id="lead-form">
            <div class="row">
              <div class="form-group">
                <label>First Name</label>
                <input type="text" name="first_name" required placeholder="John" />
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" name="last_name" required placeholder="Smith" />
              </div>
            </div>
            <div class="form-group">
              <label>Business Email</label>
              <input type="email" name="email" required placeholder="john@company.com" />
            </div>
            <div class="row">
              <div class="form-group">
                <label>Company</label>
                <input type="text" name="company" required placeholder="Acme Inc" />
              </div>
              <div class="form-group">
                <label>Job Title</label>
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
            ${customQuestions.length ? `<hr class="divider"/>
            <div class="custom-section">
              <h3>A few quick questions</h3>
              ${customFieldsHtml}
            </div>` : ''}
            <button type="submit" class="btn-submit">${ctaText}</button>
          </form>
          <div class="consent">By downloading, you agree to receive relevant communications. You can unsubscribe at any time. <a href="#">Privacy Policy</a></div>
        </div>

        <div id="success-section" class="success">
          <div class="success-anim">🎉</div>
          <h2>You're all set!</h2>
          <p>Your copy of "${assetName}" is ready. Click below to download it now.</p>
          ${assetUrl ? `<a href="${assetUrl}" target="_blank" class="dl-btn">⬇ Download Now</a>` : '<p style="color:#10b981;font-weight:600">Your resource will be sent to your email shortly.</p>'}
        </div>
      </div>
    </div>
  </div>

  <!-- Testimonial strip — full width below grid -->
  <div class="testimonial-strip fade-up fade-up-d3">
    <div class="testimonial-inner">
      <div class="testimonial-avatar">SM</div>
      <div class="testimonial-content">
        <div class="testimonial-stars">★★★★★</div>
        <div class="quote">"This resource completely changed how we approach our strategy. The frameworks are immediately actionable and the data is incredibly thorough. Highly recommend for any senior leader."</div>
        <div class="author">Sarah M.</div>
        <div class="role">VP of Operations · Fortune 500 Company</div>
      </div>
    </div>
  </div>

  <!-- Mobile sticky CTA -->
  <div class="sticky-cta" id="sticky-cta">
    <button onclick="document.querySelector('.form-card').scrollIntoView({behavior:'smooth'})">Get Free ${assetName.includes('Report') ? 'Report' : assetName.includes('Guide') ? 'Guide' : assetName.includes('Playbook') ? 'Playbook' : 'Resource'} →</button>
  </div>

  <div class="footer">Powered by BOSS HQ · All rights reserved</div>

  <script>
    // Inline validation
    document.querySelectorAll('.form-group input').forEach(input => {
      input.addEventListener('blur', function() {
        if (this.hasAttribute('required')) {
          this.parentElement.classList.toggle('valid', !!this.value.trim());
        }
      });
    });

    // Form submit
    document.getElementById('lead-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('[type="submit"]');
      btn.textContent = 'Submitting...';
      btn.disabled = true;

      const data = Object.fromEntries(new FormData(this));
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
          document.getElementById('sticky-cta').style.display = 'none';
        } else {
          btn.textContent = 'Error — Try Again';
          btn.disabled = false;
        }
      } catch {
        btn.textContent = 'Error — Try Again';
        btn.disabled = false;
      }
    });

    // Mobile sticky CTA visibility
    const observer = new IntersectionObserver(entries => {
      const sticky = document.getElementById('sticky-cta');
      if (sticky) sticky.style.display = entries[0].isIntersecting ? 'none' : '';
    }, { threshold: 0.1 });
    const formCard = document.querySelector('.form-card');
    if (formCard && window.innerWidth <= 768) observer.observe(formCard);
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

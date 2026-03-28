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

  const esc = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const bc       = page.brand_color || '#2563eb';
  const assetName = esc(page.asset_name || 'Resource');
  const assetUrl  = page.asset_url  || '';
  const logoUrl   = page.logo_url   || '';
  const clientName = esc(page.client_name || '');

  let ai: {
    headline: string; subheadline: string; hook: string;
    bullets: { icon: string; title: string; body: string }[];
    cta: string; social_proof: string;
    design?: { theme?: string; hero_stat?: string; doc_type?: string };
  } | null = null;
  try { ai = page.ai_copy ? JSON.parse(page.ai_copy) : null; } catch {}

  const headline    = esc(ai?.headline    || page.headline    || `Download: ${assetName}`);
  const subheadline = esc(ai?.subheadline || page.subheadline || 'Fill out the form to get instant access.');
  const hook        = esc(ai?.hook        || '');
  const ctaText     = esc(ai?.cta         || page.cta_text    || 'Download Now');
  const socialProof = esc(ai?.social_proof || '');
  const heroStat    = esc(ai?.design?.hero_stat || '');
  const docType     = esc(ai?.design?.doc_type  || 'Guide');
  const isDark      = (ai?.design?.theme !== 'light');

  const defaultBullets = [
    { icon: '📊', title: 'Data-Driven Insights',   body: 'Research-backed analysis with actionable recommendations.' },
    { icon: '🎯', title: 'Actionable Frameworks',  body: 'Step-by-step guidance you can apply immediately.' },
    { icon: '💡', title: 'Expert Perspective',     body: 'Curated insights from leading practitioners.' },
    { icon: '⚡', title: 'Immediate Value',        body: 'Practical takeaways you can use from day one.' },
  ];
  const bullets = (ai?.bullets && ai.bullets.length > 0) ? ai.bullets : defaultBullets;

  let customQuestions: { question: string; type: string; options?: string[] }[] = [];
  try { customQuestions = JSON.parse(page.custom_questions || '[]'); } catch {}

  const customFieldsHtml = customQuestions.map((q, i) => {
    const opts = (q.options && q.options.length > 0)
      ? q.options.map((o: string) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')
      : `<option value="Yes">Yes</option><option value="No">No</option><option value="Evaluating">Evaluating</option><option value="Not sure">Not sure</option>`;
    return `<div class="fg">
      <label>${esc(q.question)}</label>
      <select name="custom_q${i+1}" required><option value="">Select...</option>${opts}</select>
    </div>`;
  }).join('');

  const hasLogo = logoUrl && (logoUrl.startsWith('http://') || logoUrl.startsWith('https://'));
  const hasPdf  = assetUrl && /\.pdf(\?|$)/i.test(assetUrl);
  const apiBase = url.origin;

  const bulletsHtml = bullets.map(b => `
    <div class="bullet">
      <div class="bullet-icon">${b.icon}</div>
      <div>
        <div class="bullet-title">${esc(b.title)}</div>
        <div class="bullet-body">${esc(b.body)}</div>
      </div>
    </div>`).join('');

  // ─── SHARED BASE CSS ───────────────────────────────────────────────────────
  const baseCss = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      height: 100vh; overflow: hidden; display: flex; flex-direction: column;
    }
    .layout { flex: 1; display: grid; grid-template-columns: 1fr 420px; min-height: 0; }
    .left { display: grid; grid-template-rows: minmax(340px, 1.25fr) 0.9fr; overflow: hidden; }

    /* Form panel — height:100% forces full grid-cell fill so spacers can center */
    .right { display: flex; flex-direction: column; overflow-y: auto; height: 100%; }
    .right-spacer { flex: 1; min-height: 20px; }
    .right-inner { padding: 24px 22px; }
    .form-header { border-radius: 9px; padding: 13px 15px; margin-bottom: 16px; }
    .form-header-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }
    .form-title { font-size: 14px; font-weight: 700; line-height: 1.3; }
    .fg { margin-bottom: 9px; }
    .fg label { display: block; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .fg input, .fg select {
      width: 100%; padding: 8px 10px; border-radius: 6px;
      font-size: 13px; font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .fg input:focus, .fg select:focus { outline: none; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .divider { border: none; margin: 10px 0; }
    .custom-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: ${bc}; }
    .btn-submit {
      width: 100%; padding: 12px; background: ${bc};
      color: #fff; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
      margin-top: 4px; transition: opacity 0.15s, transform 0.1s;
    }
    .btn-submit:hover { opacity: 0.88; transform: translateY(-1px); }
    .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    .consent { font-size: 11px; margin-top: 8px; line-height: 1.5; text-align: center; }
    .social-proof { padding: 10px 22px; font-size: 11px; text-align: center; line-height: 1.5; }
    .success { display: none; text-align: center; padding: 40px 20px; }
    .success-icon { font-size: 40px; margin-bottom: 12px; }
    .success h2 { font-size: 18px; font-weight: 700; color: #059669; margin-bottom: 6px; }
    .success p  { font-size: 13px; line-height: 1.6; margin-bottom: 20px; }
    .dl-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 11px 24px; background: ${bc};
      color: #fff; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;
    }

    /* Bullets */
    .bullets { display: flex; flex-direction: column; gap: 10px; }
    .bullet  { display: flex; gap: 10px; align-items: flex-start; }
    .bullet-icon {
      width: 30px; height: 30px; flex-shrink: 0; border-radius: 7px;
      display: flex; align-items: center; justify-content: center; font-size: 13px;
    }

    /* Trust */
    .trust-row { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 16px; padding-top: 12px; }
    .trust-item { display: flex; align-items: center; gap: 4px; font-size: 11px; }
    .trust-dot  { width: 4px; height: 4px; border-radius: 50%; background: #10b981; flex-shrink: 0; }

    @media (max-width: 768px) {
      body { overflow: auto; height: auto; }
      .layout { grid-template-columns: 1fr; }
      .left { grid-template-rows: auto auto; overflow: visible; }
      .topbar { padding: 0 16px; }
      .right-inner { padding: 20px 16px; }
      .row2 { grid-template-columns: 1fr; }
    }
  `;

  // ─── DARK THEME (tech / cyber / data / SaaS / fintech) ────────────────────
  // Top zone: dark with brand gradient — doc badge + big headline + hook
  // Bottom zone: dark — subheadline + bullets
  const darkCss = `
    body { background: #0d1117; }

    .topbar {
      height: 52px; min-height: 52px; background: ${bc};
      display: flex; align-items: center; padding: 0 36px; gap: 10px; flex-shrink: 0;
    }
    .topbar img { height: 24px; object-fit: contain; max-width: 100px; filter: brightness(10); }
    .brand-initial {
      width: 26px; height: 26px; border-radius: 5px;
      background: rgba(255,255,255,0.22); color: #fff;
      font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .topbar .brand { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.95); }
    .topbar .asset-pill {
      margin-left: auto; display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: rgba(255,255,255,0.6);
    }

    /* Left panel: dark with gradient */
    .left { background: #0d1117; position: relative; }
    .left::before {
      content: ''; position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 80% 60% at -5% 15%, ${bc}55, transparent 55%),
        radial-gradient(ellipse 60% 50% at 105% 90%, ${bc}22, transparent 55%);
      pointer-events: none; z-index: 0;
    }
    .left::after {
      content: ''; position: absolute; inset: 0;
      background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
      background-size: 28px 28px; pointer-events: none; z-index: 0;
    }

    /* Top zone: headline + badge + hook */
    .doc-zone {
      padding: 40px 52px 32px;
      display: flex; flex-direction: column; justify-content: flex-end;
      position: relative; z-index: 1;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .doc-badge-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap;
    }
    .doc-type-pill {
      font-size: 10px; font-weight: 700; color: ${bc};
      text-transform: uppercase; letter-spacing: 0.12em;
      background: ${bc}18; border: 1px solid ${bc}30;
      padding: 3px 10px; border-radius: 4px;
    }
    .doc-badge-sep { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.2); }
    .doc-badge-client { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.4); }
    .doc-badge-year { font-size: 11px; color: rgba(255,255,255,0.25); margin-left: auto; }

    .doc-zone h1 {
      font-size: clamp(30px, 3.4vw, 52px); font-weight: 700;
      line-height: 1.05; letter-spacing: -0.02em;
      color: #f8fafc; max-width: 560px; margin-bottom: 12px;
    }
    .hook-text {
      font-size: 13px; color: rgba(255,255,255,0.38); font-style: italic;
      line-height: 1.6; max-width: 520px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    ${heroStat ? `
    .hero-stat-block {
      display: inline-flex; align-items: baseline; gap: 8px;
      margin-bottom: 14px; padding: 10px 16px;
      background: ${bc}18; border: 1px solid ${bc}28; border-radius: 8px;
    }
    .hero-stat-number { font-size: 28px; font-weight: 700; color: #f8fafc; line-height: 1; }
    .hero-stat-label  { font-size: 12px; color: rgba(255,255,255,0.45); }
    ` : ''}

    /* Bottom zone: subheadline + bullets */
    .copy-zone {
      padding: 28px 52px 32px;
      display: flex; flex-direction: column; justify-content: center;
      position: relative; z-index: 1;
    }
    .subheadline {
      font-size: 16px; color: rgba(255,255,255,0.45);
      line-height: 1.6; max-width: 60ch; margin-bottom: 18px;
    }
    .bullet-icon { background: ${bc}1a; border: 1px solid ${bc}28; }
    .bullet-title { font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.88); margin-bottom: 1px; }
    .bullet-body  { font-size: 14px; color: rgba(255,255,255,0.32); line-height: 1.55; }
    .trust-row { border-top: 1px solid rgba(255,255,255,0.06); }
    .trust-item { color: rgba(255,255,255,0.25); }

    /* PDF preview tease */
    .pdf-tease { margin-top: 16px; }
    .pdf-pages { position: relative; padding-top: 3px; }
    .pdf-page { padding: 11px 14px; border-radius: 7px; display: flex; flex-direction: column; gap: 5px; }
    .pdf-back {
      position: absolute; top: 0; left: 4px; right: 4px; bottom: 0;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 7px;
    }
    .pdf-front { position: relative; z-index: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); }
    .pfl { height: 6px; border-radius: 2px; background: rgba(255,255,255,0.09); }
    .pfl-h { height: 9px; background: rgba(255,255,255,0.14); margin-bottom: 3px; }
    .pdf-overlay {
      position: absolute; inset: 0; z-index: 2; border-radius: 7px;
      background: linear-gradient(to bottom, transparent 20%, rgba(13,17,23,0.92) 75%);
    }
    .pdf-lock {
      position: absolute; bottom: 9px; left: 0; right: 0; z-index: 3;
      text-align: center; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5); letter-spacing: 0.01em;
    }

    /* Right: white form panel */
    .right { background: #ffffff; border-left: 1px solid rgba(17,24,39,.08); box-shadow: -16px 0 42px rgba(2,6,23,.10); }
    .right-inner { width: min(100%, 360px); margin: 0 auto; border: 1px solid rgba(17,24,39,.08); border-radius: 14px; box-shadow: 0 10px 30px rgba(2,6,23,.08); background: #fff; }
    .btn-submit { min-height: 46px; border-radius: 10px; }
    .form-header { background: ${bc}0e; border: 1px solid ${bc}20; }
    .form-header-label { color: ${bc}; }
    .form-title { color: #111827; }
    .fg label { color: #6b7280; }
    .fg input, .fg select {
      background: #f9fafb; border: 1px solid #e5e7eb; color: #111827;
    }
    .fg input::placeholder { color: #9ca3af; }
    .fg input:focus, .fg select:focus { border-color: ${bc}; box-shadow: 0 0 0 3px ${bc}1a; }
    .fg select option { background: #fff; color: #111827; }
    .divider { border-top: 1px solid #f3f4f6; }
    .consent { color: #9ca3af; }
    .social-proof { border-top: 1px solid #f0f0f0; color: #9ca3af; }
    .success p { color: #6b7280; }

    @media (max-width: 768px) {
      .doc-zone { padding: 28px 20px 20px; }
      .copy-zone { padding: 20px 20px 28px; }
      .right { border-left: none; border-top: 3px solid ${bc}; }
    }
  `;

  // ─── LIGHT THEME (HR / health / consulting / professional services) ─────────
  // Top zone: FULL brand color — overline + big headline + hook in white
  // Bottom zone: white — subheadline + bullets
  const lightCss = `
    body { background: #f7f6f3; }

    .topbar {
      height: 52px; min-height: 52px; background: #ffffff;
      border-bottom: 1px solid #e5e2dc;
      display: flex; align-items: center; padding: 0 36px; gap: 10px; flex-shrink: 0;
    }
    .topbar img { height: 24px; object-fit: contain; max-width: 110px; }
    .brand-initial {
      width: 26px; height: 26px; border-radius: 5px;
      background: ${bc}; color: #fff;
      font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .topbar .brand { font-size: 14px; font-weight: 600; color: #1a1a1a; }
    .topbar .asset-pill {
      margin-left: auto; display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: #a0a0a0; font-weight: 500;
    }

    /* Top zone: rich gradient on brand color */
    .doc-zone {
      background: linear-gradient(165deg, color-mix(in srgb, ${bc} 92%, #fff 8%) 0%, ${bc} 58%, color-mix(in srgb, ${bc} 80%, #000 20%) 100%);
      padding: 40px 52px 36px;
      display: flex; flex-direction: column; justify-content: flex-end;
      position: relative; overflow: hidden;
    }
    /* White vignette overlay */
    .doc-zone::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,.20), transparent 55%);
      pointer-events: none; z-index: 0;
    }
    /* Subtle pattern overlay */
    .doc-zone::after {
      content: ''; position: absolute; inset: 0;
      background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
      background-size: 24px 24px; pointer-events: none;
    }
    .doc-badge-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
      position: relative; z-index: 2;
    }
    .doc-type-pill {
      font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.95);
      text-transform: uppercase; letter-spacing: 0.12em;
      background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.25);
      padding: 3px 10px; border-radius: 4px;
    }
    .doc-badge-sep { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.3); }
    .doc-badge-client { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.65); }
    .doc-badge-year { font-size: 11px; color: rgba(255,255,255,0.45); margin-left: auto; }

    .doc-zone h1 {
      font-size: clamp(30px, 3.4vw, 52px); font-weight: 700;
      line-height: 1.05; letter-spacing: -0.02em;
      color: #ffffff; max-width: 560px; margin-bottom: 12px;
      position: relative; z-index: 2;
    }
    .hook-text {
      font-size: 13px; color: rgba(255,255,255,0.72); font-style: italic;
      line-height: 1.65; max-width: 520px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      position: relative; z-index: 2;
    }
    ${heroStat ? `
    .hero-stat-block {
      display: inline-flex; align-items: baseline; gap: 8px;
      margin-bottom: 14px; padding: 10px 16px;
      background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22);
      border-radius: 8px; position: relative; z-index: 2;
    }
    .hero-stat-number { font-size: 28px; font-weight: 700; color: #fff; line-height: 1; }
    .hero-stat-label  { font-size: 12px; color: rgba(255,255,255,0.7); }
    ` : ''}

    /* Bottom zone: white — subheadline + bullets */
    .copy-zone {
      background: #ffffff;
      border-top: 3px solid ${bc};
      padding: 28px 52px 32px;
      display: flex; flex-direction: column; justify-content: center;
    }
    .subheadline {
      font-size: 16px; color: #6b6b6b;
      line-height: 1.6; max-width: 60ch; margin-bottom: 18px;
    }
    .bullet-icon { background: ${bc}10; border: 1.5px solid ${bc}20; }
    .bullet-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 1px; }
    .bullet-body  { font-size: 14px; color: #8a8a8a; line-height: 1.55; }
    .trust-row { border-top: 1px solid #ede9e3; }
    .trust-item { color: #b0b0b0; }

    /* PDF preview tease */
    .pdf-tease { margin-top: 16px; }
    .pdf-pages { position: relative; padding-top: 3px; }
    .pdf-page { padding: 11px 14px; border-radius: 7px; display: flex; flex-direction: column; gap: 5px; }
    .pdf-back {
      position: absolute; top: 0; left: 4px; right: 4px; bottom: 0;
      background: #f5f4f1; border: 1px solid #e5e2dc; border-radius: 7px;
    }
    .pdf-front { position: relative; z-index: 1; background: #ffffff; border: 1px solid #e5e2dc; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .pfl { height: 6px; border-radius: 2px; background: #e0ddd8; }
    .pfl-h { height: 9px; background: #c8c5c0; margin-bottom: 3px; }
    .pdf-overlay {
      position: absolute; inset: 0; z-index: 2; border-radius: 7px;
      background: linear-gradient(to bottom, transparent 20%, rgba(247,246,243,0.94) 75%);
    }
    .pdf-lock {
      position: absolute; bottom: 9px; left: 0; right: 0; z-index: 3;
      text-align: center; font-size: 11px; font-weight: 600; color: #8a8a8a; letter-spacing: 0.01em;
    }

    /* Right: white form panel with shadow */
    .right { background: #ffffff; border-left: 1px solid rgba(17,24,39,.08); box-shadow: -16px 0 42px rgba(2,6,23,.08); }
    .right-inner { width: min(100%, 360px); margin: 0 auto; border: 1px solid rgba(17,24,39,.07); border-radius: 14px; box-shadow: 0 10px 30px rgba(2,6,23,.06); background: #fff; }
    .btn-submit { min-height: 46px; border-radius: 10px; }
    .form-header { background: ${bc}0a; border: 1.5px solid ${bc}18; }
    .form-header-label { color: ${bc}; }
    .form-title { color: #1a1a1a; }
    .fg label { color: #7a7a7a; }
    .fg input, .fg select {
      background: #fafafa; border: 1px solid #e5e2dc; color: #1a1a1a;
    }
    .fg input::placeholder { color: #b0b0b0; }
    .fg input:focus, .fg select:focus { border-color: ${bc}; box-shadow: 0 0 0 3px ${bc}14; background: #fff; }
    .fg select option { background: #fff; color: #1a1a1a; }
    .divider { border-top: 1px solid #f0ece8; }
    .consent { color: #b0b0b0; }
    .social-proof { border-top: 1px solid #f0ece8; color: #aaaaaa; }
    .success p { color: #6b7280; }

    @media (max-width: 768px) {
      .doc-zone { padding: 28px 20px 24px; }
      .copy-zone { border-top: 2px solid ${bc}; padding: 20px 20px 28px; }
      .right { border-left: none; border-top: 1px solid #e5e2dc; }
    }
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${headline}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${baseCss}
    ${isDark ? darkCss : lightCss}
  </style>
</head>
<body>

  <!-- Topbar -->
  <div class="topbar">
    ${hasLogo
      ? `<img src="${logoUrl}" alt="${clientName}" onerror="this.style.display='none'"/>`
      : `<div class="brand-initial">${(page.client_name || 'B').charAt(0).toUpperCase()}</div>`}
    <div class="brand">${clientName}</div>
    <div class="asset-pill">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      ${assetName}
    </div>
  </div>

  <div class="layout">

    <!-- Left: two zones -->
    <div class="left">

      <!-- Zone 1: headline zone (brand color for light / dark gradient for dark) -->
      <div class="doc-zone">
        <div class="doc-badge-row">
          <span class="doc-type-pill">${docType}</span>
          <span class="doc-badge-sep"></span>
          <span class="doc-badge-client">${clientName}</span>
          <span class="doc-badge-year">2026</span>
        </div>
        ${heroStat ? `<div class="hero-stat-block">
          <span class="hero-stat-number">${heroStat}</span>
        </div>` : ''}
        <h1>${headline}</h1>
        ${hook ? `<p class="hook-text">${hook}</p>` : ''}
      </div>

      <!-- Zone 2: proof zone (bullets) -->
      <div class="copy-zone">
        <p class="subheadline">${subheadline}</p>
        <div class="bullets">${bulletsHtml}</div>
        <div class="trust-row">
          <div class="trust-item"><div class="trust-dot"></div> No spam, ever</div>
          <div class="trust-item"><div class="trust-dot"></div> Instant download</div>
          <div class="trust-item"><div class="trust-dot"></div> Unsubscribe anytime</div>
        </div>
        ${hasPdf ? `<div class="pdf-tease">
          <div class="pdf-pages">
            <div class="pdf-page pdf-back"></div>
            <div class="pdf-page pdf-front">
              <div class="pfl pfl-h"></div>
              <div class="pfl" style="width:88%"></div>
              <div class="pfl" style="width:73%"></div>
              <div class="pfl" style="width:81%"></div>
              <div class="pfl" style="width:58%"></div>
              <div class="pfl pfl-h" style="width:46%;margin-top:8px"></div>
              <div class="pfl" style="width:92%"></div>
              <div class="pfl" style="width:67%"></div>
            </div>
            <div class="pdf-overlay"></div>
            <div class="pdf-lock">🔒 Sign up to access the full ${docType}</div>
          </div>
        </div>` : ''}
      </div>

    </div>

    <!-- Right: form panel -->
    <div class="right">
      <div class="right-spacer"></div>
      <div class="right-inner">
        <div class="form-header">
          <div class="form-header-label">${docType}</div>
          <div class="form-title">${assetName}</div>
        </div>

        <div id="form-section">
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
            ${customQuestions.length ? `<hr class="divider"/><div class="custom-label">A few quick questions</div>${customFieldsHtml}` : ''}
            <button type="submit" class="btn-submit">${ctaText}</button>
          </form>
          <div class="consent">By downloading, you agree to receive relevant communications. Unsubscribe anytime.</div>
        </div>

        <div id="success-section" class="success">
          <div class="success-icon">🎉</div>
          <h2>You're all set!</h2>
          <p>Your copy of "<strong>${assetName}</strong>" is ready.</p>
          ${assetUrl
            ? `<a href="${assetUrl}" target="_blank" class="dl-btn">⬇ Download Now</a>`
            : `<p style="color:#10b981;font-weight:600">Your resource will be sent to your inbox shortly.</p>`}
        </div>
      </div>
      <div class="right-spacer"></div>
      ${socialProof ? `<div class="social-proof">${socialProof}</div>` : ''}
    </div>

  </div>

  <script>
    document.getElementById('lead-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('[type="submit"]');
      btn.textContent = 'Submitting…'; btn.disabled = true;
      const data = Object.fromEntries(new FormData(this));
      const customAnswers = {};
      ${customQuestions.map((_, i) => `if (data.custom_q${i+1}) customAnswers['q${i+1}'] = data.custom_q${i+1};`).join('\n      ')}
      data.custom_answers = JSON.stringify(customAnswers);
      try {
        const res = await fetch('${apiBase}/api/pages/${slug}/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        });
        if (res.ok) {
          document.getElementById('form-section').style.display = 'none';
          document.getElementById('success-section').style.display = 'block';
        } else { btn.textContent = 'Error — Try Again'; btn.disabled = false; }
      } catch { btn.textContent = 'Error — Try Again'; btn.disabled = false; }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

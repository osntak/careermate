// =============================================================================
// CareerMate marketing-site analytics — careermate.life ONLY.
//
// SCOPE: this file loads on the PUBLIC marketing/demo site (site/) that
// Vercel serves. It must NEVER be loaded by the local dashboard (apps/web, bound
// to 127.0.0.1) — that would break the core promise in AGENTS.md:
//   "절대 사용자 데이터를 외부로 업로드하지 마라."
// There is no user career data on this site; only anonymous page/traffic signals.
//
// What runs here:
//   1) Vercel Web Analytics   — cookieless, no PII, no consent banner required.
//   2) Vercel Speed Insights  — Core Web Vitals, also cookieless.
//   3) Google Analytics 4     — OPTIONAL. Off until GA_MEASUREMENT_ID is filled in.
//      Runs under Google Consent Mode v2 with analytics_storage DENIED by default,
//      i.e. cookieless pings, so it needs no consent banner and stays consistent
//      with the local-first / privacy-first brand. (Flip consent to 'granted'
//      later only if you add a real consent UI.)
//
// The marketing pages (index.html, start.html) are classic multi-page navigations,
// so a single pageview on load is enough. The demo (/demo/) is a hash-router SPA,
// so we emit a virtual pageview on every hashchange — otherwise every sub-route
// (#/jobs, #/applications, …) would collapse into one "/demo" view.
// =============================================================================
(function () {
  'use strict';

  // ── 1. Vercel Web Analytics (cookieless) ───────────────────────────────────
  // Queue shim per Vercel's HTML snippet; the injected script drains window.vaq.
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  loadScript('/_vercel/insights/script.js');

  // ── 2. Vercel Speed Insights (cookieless) — OFF by default ──────────────────
  // Vercel's Hobby plan allows Speed Insights on only ONE project at a time, and it's
  // more valuable on the real app than on this rarely-changing static site (use the free
  // PageSpeed Insights for ad-hoc checks here). Flip to true to load it (needs Enable in
  // the Vercel dashboard too); leaving it false avoids a dead 404 script request.
  var ENABLE_SPEED_INSIGHTS = false;
  if (ENABLE_SPEED_INSIGHTS) {
    window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
    loadScript('/_vercel/speed-insights/script.js');
  }

  // ── 3. Google Analytics 4 (optional, cookieless via Consent Mode v2) ────────
  // CareerMate's GA4 measurement ID — a public, client-side identifier (not a secret).
  // Set to '' to disable GA entirely; the Vercel analytics above still runs.
  var GA_MEASUREMENT_ID = 'G-HK9KWTYCBD';
  if (/^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)) initGoogleAnalytics(GA_MEASUREMENT_ID);

  // ── Demo SPA: report hash route changes to Vercel as a custom event ─────────
  // Vercel's script auto-tracks History API navigations but not hashchange.
  if (location.pathname.indexOf('/demo') === 0) {
    window.addEventListener('hashchange', function () {
      window.va('event', { name: 'demo_route', data: { route: currentRoute() } });
    });
  }

  // ── helpers ─────────────────────────────────────────────────────────────────
  function loadScript(src) {
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    document.head.appendChild(s);
  }

  function currentRoute() {
    return (location.hash || '').replace(/^#\/?/, '').split('/')[0] || 'home';
  }

  function initGoogleAnalytics(id) {
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    // Deny storage by default → GA runs cookieless. No banner required.
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
    gtag('js', new Date());
    // send_page_view:false so we control pageviews (incl. the demo's hash routes).
    gtag('config', id, { send_page_view: false, anonymize_ip: true });
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + id);

    sendGaPageview();
    window.addEventListener('hashchange', sendGaPageview);
  }

  function sendGaPageview() {
    if (!window.gtag) return;
    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search + location.hash,
      page_location: location.href,
      page_title: document.title,
    });
  }
})();

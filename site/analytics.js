// =============================================================================
// CareerMate marketing-site analytics - careermate.life ONLY.
//
// This file is for the public static marketing/demo site under site/.
// It must not be loaded by the local dashboard in apps/web, which is bound to
// 127.0.0.1 and can contain private career data.
//
// Signals collected here:
//   1. Vercel Web Analytics: cookieless traffic analytics.
//   2. Vercel Speed Insights: optional Core Web Vitals collection.
//   3. Google Analytics 4: first-party analytics only; ad signals stay disabled.
//
// GA4 uses send_page_view:false so pageviews are controlled explicitly. That
// lets the demo hash router report virtual pageviews for routes like #/jobs.
// =============================================================================
(function () {
  'use strict';

  var ALLOWED_HOSTS = ['careermate.life', 'www.careermate.life'];
  if (ALLOWED_HOSTS.indexOf(location.hostname) === -1) return;

  // 1. Vercel Web Analytics.
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  loadScript('/_vercel/insights/script.js');

  // 2. Vercel Speed Insights. Enable only after the Vercel project is configured.
  var ENABLE_SPEED_INSIGHTS = false;
  if (ENABLE_SPEED_INSIGHTS) {
    window.si = window.si || function () {
      (window.siq = window.siq || []).push(arguments);
    };
    loadScript('/_vercel/speed-insights/script.js');
  }

  // 3. Google Analytics 4.
  // This public measurement ID is not a secret. Set to '' to disable GA4.
  var GA_MEASUREMENT_ID = 'G-DTXRZ5P776';
  if (/^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)) {
    initGoogleAnalytics(GA_MEASUREMENT_ID);
  }

  // Vercel auto-tracks full page loads, but not hash-only demo route changes.
  if (location.pathname.indexOf('/demo') === 0) {
    window.addEventListener('hashchange', function () {
      window.va('event', { name: 'demo_route', data: { route: currentRoute() } });
    });
  }

  function loadScript(src) {
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  function currentRoute() {
    return (location.hash || '').replace(/^#\/?/, '').split('/')[0] || 'home';
  }

  function initGoogleAnalytics(id) {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });
    gtag('js', new Date());
    gtag('config', id, {
      send_page_view: false,
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + id);

    sendGaPageview();
    window.addEventListener('hashchange', sendGaPageview);
  }

  function sendGaPageview() {
    if (!window.gtag) return;
    var params = {
      page_path: location.pathname + location.search + location.hash,
      page_location: location.href,
      page_title: document.title,
    };
    if (/[?&]ga_debug=1(?:&|$)/.test(location.search)) params.debug_mode = true;
    window.gtag('event', 'page_view', params);
  }
})();

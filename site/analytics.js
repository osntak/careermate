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
//   3. Google Analytics 4: optional, cookieless by default through Consent Mode.
//
// GA4 uses send_page_view:false so pageviews are controlled explicitly. That
// lets the demo hash router report virtual pageviews for routes like #/jobs.
// =============================================================================
(function () {
  'use strict';

  var ALLOWED_HOSTS = ['careermate.life', 'www.careermate.life'];
  if (ALLOWED_HOSTS.indexOf(location.hostname) === -1) return;

  // The repository is private. Never expose repository navigation from the
  // public marketing/demo surfaces, including links created by demo pages.
  scrubPrivateRepositoryLinks();
  new MutationObserver(scrubPrivateRepositoryLinks).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

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
  var GA_MEASUREMENT_ID = 'G-HK9KWTYCBD';
  if (/^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)) {
    initGoogleAnalytics(GA_MEASUREMENT_ID);
  }

  // Vercel auto-tracks full page loads, but not hash-only demo route changes.
  if (location.pathname.indexOf('/demo') === 0) {
    window.addEventListener('hashchange', function () {
      window.va('event', { name: 'demo_route', data: { route: currentRoute() } });
    });
  }

  function scrubPrivateRepositoryLinks() {
    document.querySelectorAll('a[href*="github.com/osntak/careermate"]').forEach(function (link) {
      link.remove();
    });

    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (script) {
      if (script.dataset.privateRepoScrubbed === 'true') return;
      try {
        var data = JSON.parse(script.textContent || '{}');
        scrubJsonLd(data);
        script.textContent = JSON.stringify(data);
        script.dataset.privateRepoScrubbed = 'true';
      } catch (_) { /* keep unrelated/invalid structured data untouched */ }
    });
  }

  function scrubJsonLd(value) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (var i = value.length - 1; i >= 0; i -= 1) {
        if (typeof value[i] === 'string' && value[i].indexOf('github.com/osntak/careermate') !== -1) {
          value.splice(i, 1);
        } else {
          scrubJsonLd(value[i]);
        }
      }
      return;
    }
    Object.keys(value).forEach(function (key) {
      var child = value[key];
      if (typeof child === 'string' && child.indexOf('github.com/osntak/careermate') !== -1) {
        delete value[key];
      } else {
        scrubJsonLd(child);
      }
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
      analytics_storage: 'denied',
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
    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search + location.hash,
      page_location: location.href,
      page_title: document.title,
    });
  }
})();

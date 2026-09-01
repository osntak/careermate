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
//   3. Google Analytics 4: page views plus privacy-safe marketing interactions.
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

  // 2. Vercel Speed Insights. The public site is served by Vercel, so collect
  // anonymous Core Web Vitals alongside traffic data.
  var ENABLE_SPEED_INSIGHTS = true;
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
    bindMarketingEvents();
    bindEngagementEvents();
    window.addEventListener('hashchange', sendGaPageview);
  }

  function sendGaEvent(name, params) {
    if (!window.gtag) return;
    window.gtag('event', name, params || {});
  }

  function normalizedPagePath() {
    return location.pathname + location.hash;
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

  function bindMarketingEvents() {
    var lastInstallPath = '';

    document.addEventListener('change', function (event) {
      var input = event.target;
      if (!input || input.tagName !== 'INPUT' || input.type !== 'radio') return;

      if (input.name === 'sub') {
        sendGaEvent('select_ai_client', {
          ai_client: input.value || 'unknown',
          page_path: normalizedPagePath(),
        });
      } else if (input.name === 'os') {
        sendGaEvent('select_os', {
          operating_system: input.value || 'unknown',
          page_path: normalizedPagePath(),
        });
      } else {
        return;
      }

      var client = document.querySelector('input[name="sub"]:checked');
      var os = document.querySelector('input[name="os"]:checked');
      if (client && os) {
        var installPath = client.value + ':' + os.value;
        if (installPath !== lastInstallPath) {
          lastInstallPath = installPath;
          sendGaEvent('view_install_path', {
            ai_client: client.value,
            operating_system: os.value,
            page_path: normalizedPagePath(),
          });
        }
      }
    }, true);

    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || !target.closest) return;

      var demoStep = target.closest('[data-demo-step]');
      if (demoStep) {
        sendGaEvent('demo_step', {
          step: demoStep.getAttribute('data-demo-step') || '',
          label: safeText(demoStep.textContent),
          page_path: normalizedPagePath(),
        });
        return;
      }

      var copyButton = target.closest('.copy-btn');
      if (copyButton) {
        sendGaEvent('copy_install_command', {
          target: copyButton.getAttribute('data-copy-target') || 'unknown',
          page_path: normalizedPagePath(),
        });
        return;
      }

      var detailsSummary = target.closest('summary');
      if (detailsSummary && detailsSummary.parentElement && detailsSummary.parentElement.tagName === 'DETAILS') {
        var nextState = detailsSummary.parentElement.open ? 'close' : 'open';
        sendGaEvent('details_toggle', {
          label: safeText(detailsSummary.textContent),
          state: nextState,
          page_path: normalizedPagePath(),
        });
        if (nextState === 'open' && detailsSummary.closest('.path')) {
          var path = detailsSummary.closest('.path');
          sendGaEvent('open_install_method', {
            ai_client: path.getAttribute('data-sub') || 'unknown',
            method: safeText(detailsSummary.textContent),
            page_path: normalizedPagePath(),
          });
        }
      }

      var link = target.closest('a[href]');
      if (!link) return;

      var url;
      try { url = new URL(link.getAttribute('href'), location.href); } catch (e) { return; }

      var path = url.pathname.replace(/\.html$/, '') || '/';
      var text = safeText(link.textContent);
      var ctaLocation = elementLocation(link);

      if (url.protocol === 'mailto:') {
        sendGaEvent('contact_click', {
          method: 'email',
          link_text: text,
          cta_location: ctaLocation,
          page_path: normalizedPagePath(),
        });
        return;
      }

      if (url.hostname !== location.hostname) {
        sendGaEvent('outbound_click', {
          link_domain: url.hostname,
          link_path: path,
          link_text: text,
          cta_location: ctaLocation,
          page_path: normalizedPagePath(),
        });
        return;
      }

      if (path === '/en' || path.indexOf('/en/') === 0 || (location.pathname.indexOf('/en') === 0 && path === '/')) {
        sendGaEvent('language_switch', {
          destination: path,
          page_path: normalizedPagePath(),
        });
      }

      if (path === '/start' || path === '/en/start') {
        sendGaEvent('begin_install', {
          destination: path,
          link_text: text,
          cta_location: ctaLocation,
          page_path: normalizedPagePath(),
        });
      }

      if (path === '/demo/' || path === '/demo') {
        sendGaEvent('view_demo', {
          destination: path,
          link_text: text,
          cta_location: ctaLocation,
          page_path: normalizedPagePath(),
        });
      }

      if (path === '/guides' || path === '/guides/') {
        sendGaEvent('view_guides', {
          link_text: text,
          cta_location: ctaLocation,
          page_path: normalizedPagePath(),
        });
      } else if (path.indexOf('/guides/') === 0) {
        sendGaEvent('guide_click', {
          destination: path,
          link_text: text,
          cta_location: ctaLocation,
          page_path: normalizedPagePath(),
        });
      }

      if (url.hash && url.pathname === location.pathname) {
        sendGaEvent('anchor_click', {
          anchor: url.hash.slice(1),
          link_text: text,
          page_path: normalizedPagePath(),
        });
      }
    }, true);
  }

  function bindEngagementEvents() {
    var sentDepth = {};
    var sentTime = {};
    var depthMarks = [25, 50, 75, 90];
    var timeMarks = [30, 60, 120];

    function onScroll() {
      var doc = document.documentElement;
      var body = document.body;
      var scrollTop = window.pageYOffset || doc.scrollTop || body.scrollTop || 0;
      var viewport = window.innerHeight || doc.clientHeight || 0;
      var height = Math.max(body.scrollHeight, doc.scrollHeight, body.offsetHeight, doc.offsetHeight, doc.clientHeight);
      if (!height) return;
      var percent = Math.min(100, Math.round(((scrollTop + viewport) / height) * 100));
      depthMarks.forEach(function (mark) {
        if (percent >= mark && !sentDepth[mark]) {
          sentDepth[mark] = true;
          sendGaEvent('scroll_depth', { percent: mark, page_path: normalizedPagePath() });
        }
      });
    }

    window.addEventListener('scroll', throttle(onScroll, 300), { passive: true });
    window.addEventListener('load', onScroll);

    timeMarks.forEach(function (seconds) {
      window.setTimeout(function () {
        if (document.visibilityState === 'visible' && !sentTime[seconds]) {
          sentTime[seconds] = true;
          sendGaEvent('engaged_time', { seconds: seconds, page_path: normalizedPagePath() });
        }
      }, seconds * 1000);
    });
  }

  function throttle(fn, wait) {
    var last = 0;
    var timer = null;
    return function () {
      var now = Date.now();
      var remaining = wait - (now - last);
      var args = arguments;
      var ctx = this;
      if (remaining <= 0) {
        if (timer) { window.clearTimeout(timer); timer = null; }
        last = now;
        fn.apply(ctx, args);
      } else if (!timer) {
        timer = window.setTimeout(function () {
          last = Date.now();
          timer = null;
          fn.apply(ctx, args);
        }, remaining);
      }
    };
  }

  function safeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function elementLocation(element) {
    if (element.closest('nav')) return 'navigation';
    if (element.closest('footer')) return 'footer';
    if (element.closest('.hero')) return 'hero';
    var section = element.closest('section[id]');
    return section ? section.id : 'body';
  }
})();

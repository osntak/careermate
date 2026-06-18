// Shared behavior for the CareerMate landing pages (index.html, start.html).
// Loaded after the DOM is parsed; wires the clipboard "copy" buttons and the theme toggle.
// NOTE: the pre-paint theme resolution stays INLINE in each page's <head> to avoid a flash (FOUC) --
// do not move that into this file.
(function () {
  'use strict';
  var status = document.getElementById('copy-status');

  // --- clipboard ---------------------------------------------------
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'absolute'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function copyText(text, onok) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onok, function () { if (legacyCopy(text)) onok(); });
    } else if (legacyCopy(text)) { onok(); }
  }
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = document.getElementById(btn.getAttribute('data-copy-target'));
      if (!src) return;
      copyText(src.textContent || '', function () {
        var original = btn.textContent;
        btn.textContent = '복사됨'; btn.classList.add('copied');
        if (status) status.textContent = '클립보드에 복사되었습니다.';
        window.setTimeout(function () { btn.textContent = original; btn.classList.remove('copied'); }, 1600);
      });
    });
  });

  // --- theme toggle (persist) --------------------------------------
  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { window.localStorage.setItem('careermate-theme', next); window.localStorage.removeItem('cf-theme'); } catch (e) {}
    });
  }
})();

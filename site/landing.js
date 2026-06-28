// Shared behavior for the CareerMate landing pages (index.html, start.html).
// Loaded after the DOM is parsed; wires the clipboard "copy" buttons and the theme toggle.
// NOTE: the pre-paint theme resolution stays INLINE in each page's <head> to avoid a flash (FOUC) --
// do not move that into this file.
(function () {
  'use strict';

  // 정적 랜딩은 <html lang>을 파일별로 고정한다. 여기선 그 lang을 읽기만 하고
  // 절대 document.documentElement.lang을 바꾸지 않는다(렌더 lang ↔ hreflang 불일치 방지).
  var LANG = document.documentElement.lang === 'en' ? 'en' : 'ko';
  var STR = {
    ko: { copied: '복사됨', copiedStatus: '클립보드에 복사되었습니다.' },
    en: { copied: 'Copied', copiedStatus: 'Copied to clipboard.' }
  };
  // 히어로 명령 데모 씬 — 로케일별. en은 직역이 아니라 한국어 의도를 살린 자연스러운 영어.
  var SCENES = {
    ko: [
      { status: '문서 등록', file: '자기소개서.pdf', fileState: '업로드됨', command: '이 자기소개서 읽고 CareerMate에 등록해줘.', result: '문서를 읽고 자기소개서 버전으로 저장했어요. 핵심 경험 4개도 함께 정리했습니다.' },
      { status: '경력기술서', file: '이력서.pdf', fileState: '근거 자료', command: '내 이력서 기반으로 경력기술서 작성해줘.', result: '경력과 프로젝트를 성과 중심으로 정리해 경력기술서로 저장했어요. 확인이 필요한 수치는 따로 표시했습니다.' },
      { status: '대시보드', file: '127.0.0.1:4319', fileState: '열림', command: '대시보드 열어줘. 지금 지원 현황 보고 싶어.', result: '대시보드를 열었어요. 작성 중 2건, 지원 완료 3건, 면접 준비 1건이 있습니다.' },
      { status: '공고 검색', file: '"백엔드 신입"', fileState: '검색어', command: '백엔드 신입 공고 찾아줘.', result: '원티드·점핏에서 공고를 모아왔어요. 마음에 드는 걸 고르면 저장하고 바로 분석·자소서로 이어갈게요.' },
      { status: '공고 분석', file: 'recruit.example.com/product-designer', fileState: '링크', command: '이 공고 분석해서 내 경력에 맞춰줘.', result: '요구 역량과 내 경험을 비교했어요. 강조하면 좋은 키워드는 협업, 실험, 정량 개선입니다.' },
      { status: '자소서 초안', file: 'Product Designer · A사', fileState: '공고', command: '이 공고용 자기소개서 초안 써줘. 너무 딱딱하지 않게.', result: '공고에 맞춘 초안을 만들고 v1로 저장했어요. 첫 문단은 지원 동기가 바로 보이게 다듬었습니다.' },
      { status: '면접 준비', file: 'A사 · 서류 합격', fileState: '상태 변경', command: '서류 합격했어. 이 공고 기준으로 면접 준비해줘.', result: '예상 질문 12개, STAR 답변 뼈대, 1분 자기소개 초안을 준비해 저장했습니다.' }
    ],
    en: [
      { status: 'Add document', file: 'cover-letter.pdf', fileState: 'Uploaded', command: 'Read this cover letter and save it to CareerMate.', result: 'Saved it as a cover-letter version and pulled out 4 key experiences.' },
      { status: 'Career doc', file: 'resume.pdf', fileState: 'Source', command: 'Draft a career description from my resume.', result: 'Organized your experience and projects into a results-focused career doc. Flagged the numbers that need a source.' },
      { status: 'Dashboard', file: '127.0.0.1:4319', fileState: 'Open', command: 'Open the dashboard — I want to see my applications.', result: 'Opened it. You have 2 drafts, 3 submitted, and 1 in interview prep.' },
      { status: 'Job search', file: '"backend, junior"', fileState: 'Keyword', command: 'Find junior backend roles for me.', result: 'Gathered postings from public boards. Pick the ones you like and I’ll save them and move straight to fit analysis and a cover letter.' },
      { status: 'Job analysis', file: 'recruit.example.com/product-designer', fileState: 'Link', command: 'Analyze this posting against my background.', result: 'Compared the requirements with your experience. Keywords worth emphasizing: collaboration, experimentation, measurable impact.' },
      { status: 'Cover draft', file: 'Product Designer · Acme', fileState: 'Posting', command: 'Draft a cover letter for this role — keep it warm, not stiff.', result: 'Wrote a tailored draft and saved it as v1. The opener leads with why you want the role.' },
      { status: 'Interview prep', file: 'Acme · Passed screening', fileState: 'Status change', command: 'I passed the screening. Prep me for this interview.', result: 'Prepared 12 likely questions, STAR answer outlines, and a 1-minute intro draft.' }
    ]
  };

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
        btn.textContent = STR[LANG].copied; btn.classList.add('copied');
        if (status) status.textContent = STR[LANG].copiedStatus;
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

  // --- hero command demo ------------------------------------------
  var demo = document.querySelector('[data-command-demo]');
  if (demo) {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var scenes = SCENES[LANG];
    var statusEl = demo.querySelector('[data-demo-status]');
    var fileEl = demo.querySelector('[data-demo-file]');
    var fileStateEl = demo.querySelector('[data-demo-file-state]');
    var commandEl = demo.querySelector('[data-demo-command]');
    var resultEl = demo.querySelector('[data-demo-result]');
    var stepEls = Array.prototype.slice.call(demo.querySelectorAll('[data-demo-step]'));
    var progressEl = demo.querySelector('.command-card__progress span');
    var sceneIndex = 0;
    var rotateTimer = null;
    var transitionTimer = null;
    var settleTimer = null;

    function paintScene(index) {
      var scene = scenes[index];
      if (!scene) return;
      if (statusEl) statusEl.textContent = scene.status;
      if (fileEl) fileEl.textContent = scene.file;
      if (fileStateEl) fileStateEl.textContent = scene.fileState;
      if (commandEl) commandEl.textContent = scene.command;
      if (resultEl) resultEl.textContent = scene.result;
      sceneIndex = index;
      stepEls.forEach(function (step, n) {
        var active = n === index;
        step.classList.toggle('is-active', active);
        if (active) step.setAttribute('aria-current', 'true');
        else step.removeAttribute('aria-current');
      });
      if (progressEl && !reduceMotion) {
        progressEl.style.animation = 'none';
        progressEl.offsetHeight;
        progressEl.style.animation = '';
      }
    }

    function scheduleNextScene() {
      if (reduceMotion) return;
      window.clearTimeout(rotateTimer);
      rotateTimer = window.setTimeout(function () {
        showScene((sceneIndex + 1) % scenes.length, true);
      }, 4500);
    }

    function showScene(index, animate) {
      if (index < 0 || index >= scenes.length) return;
      window.clearTimeout(rotateTimer);
      window.clearTimeout(transitionTimer);
      window.clearTimeout(settleTimer);
      if (!animate || index === sceneIndex) {
        demo.classList.remove('is-changing');
        paintScene(index);
        scheduleNextScene();
        return;
      }
      demo.classList.add('is-changing');
      transitionTimer = window.setTimeout(function () {
        paintScene(index);
        settleTimer = window.setTimeout(function () { demo.classList.remove('is-changing'); }, 40);
        scheduleNextScene();
      }, 180);
    }

    stepEls.forEach(function (step, n) {
      step.addEventListener('click', function () { showScene(n, true); });
    });
    paintScene(0);
    scheduleNextScene();
  }

  // --- one-time English suggestion banner (Korean page only) -------
  // 하드 리다이렉트는 색인을 깨뜨린다(구글). 저장된 선택 없음 ∧ 브라우저가 영어 선호
  // ∧ 현재 한국어 페이지일 때만 1회성 비강제 배너를 띄운다. 닫으면 세션 내 재노출 안 함.
  (function () {
    if (LANG !== 'ko') return;
    var saved; try { saved = window.localStorage.getItem('careermate-lang'); } catch (e) {}
    if (saved) return;
    if ((navigator.language || '').toLowerCase().indexOf('ko') === 0) return;
    try { if (window.sessionStorage.getItem('cm-en-banner-dismissed')) return; } catch (e) {}

    var bar = document.createElement('div');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Language');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;gap:.85rem;justify-content:center;align-items:center;flex-wrap:wrap;padding:.65rem 1rem;background:var(--surface,#1b1a16);color:var(--text,#eee);border-top:1px solid var(--border,#333);font-size:.95rem;box-shadow:0 -4px 16px rgba(0,0,0,.18)';

    var msg = document.createElement('span');
    msg.textContent = 'This site is also available in English.';

    var go = document.createElement('a');
    go.href = '/en';
    go.textContent = 'View in English →';
    go.style.cssText = 'font-weight:650;color:var(--accent,#0f7256)';
    go.addEventListener('click', function () {
      try { window.localStorage.setItem('careermate-lang', 'en'); } catch (e) {}
    });

    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = '✕';
    dismiss.setAttribute('aria-label', 'Dismiss');
    dismiss.style.cssText = 'background:none;border:0;cursor:pointer;color:inherit;font-size:1.05rem;line-height:1;padding:.2rem .4rem';
    dismiss.addEventListener('click', function () {
      try { window.sessionStorage.setItem('cm-en-banner-dismissed', '1'); } catch (e) {}
      bar.remove();
    });

    bar.appendChild(msg);
    bar.appendChild(go);
    bar.appendChild(dismiss);
    document.body.appendChild(bar);
  })();
})();

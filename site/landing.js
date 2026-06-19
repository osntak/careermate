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

  // --- hero command demo ------------------------------------------
  var demo = document.querySelector('[data-command-demo]');
  if (demo) {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var scenes = [
      {
        status: '문서 등록',
        file: '자기소개서.pdf',
        fileState: '업로드됨',
        command: '이 자기소개서 읽고 CareerMate에 등록해줘.',
        result: '문서를 읽고 자기소개서 버전으로 저장했어요. 핵심 경험 4개도 함께 정리했습니다.'
      },
      {
        status: '경력기술서',
        file: '이력서.pdf',
        fileState: '근거 자료',
        command: '내 이력서 기반으로 경력기술서 작성해줘.',
        result: '경력과 프로젝트를 성과 중심으로 정리해 경력기술서로 저장했어요. 확인이 필요한 수치는 따로 표시했습니다.'
      },
      {
        status: '대시보드',
        file: '127.0.0.1:4319',
        fileState: '열림',
        command: '대시보드 열어줘. 지금 지원 현황 보고 싶어.',
        result: '대시보드를 열었어요. 작성 중 2건, 지원 완료 3건, 면접 준비 1건이 있습니다.'
      },
      {
        status: '공고 분석',
        file: 'recruit.example.com/product-designer',
        fileState: '링크',
        command: '이 공고 분석해서 내 경력에 맞춰줘.',
        result: '요구 역량과 내 경험을 비교했어요. 강조하면 좋은 키워드는 협업, 실험, 정량 개선입니다.'
      },
      {
        status: '자소서 초안',
        file: 'Product Designer · A사',
        fileState: '공고',
        command: '이 공고용 자기소개서 초안 써줘. 너무 딱딱하지 않게.',
        result: '공고에 맞춘 초안을 만들고 v1로 저장했어요. 첫 문단은 지원 동기가 바로 보이게 다듬었습니다.'
      },
      {
        status: '면접 준비',
        file: 'A사 · 서류 합격',
        fileState: '상태 변경',
        command: '서류 합격했어. 이 공고 기준으로 면접 준비해줘.',
        result: '예상 질문 12개, STAR 답변 뼈대, 1분 자기소개 초안을 준비해 저장했습니다.'
      }
    ];
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
})();

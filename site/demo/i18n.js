// apps/web/public/i18n.js
// 로케일 리졸버 + t(). lib.js에 의존하지 않는다(순환 방지: lib.js가 i18n.js를 import).
// 기존 테마 설정과 동일한 계약: localStorage['careermate-lang'], navigator.language 감지.
import ko from '/demo/i18n/ko.js';
import en from '/demo/i18n/en.js';

const CATALOGS = { ko, en };
const FALLBACK = 'ko';
export const LOCALES = Object.keys(CATALOGS); // ['ko','en'] — 3번째 = import 1줄 + 맵 1줄

function detect() {
  try {
    const s = localStorage.getItem('careermate-lang');
    if (s && CATALOGS[s]) return s;
  } catch (e) {
    /* private mode / storage 비활성 */
  }
  return (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

let lang = detect();
// Reflect the active locale on <html lang> at module init. This lives in an
// external module (not an inline <script>) so it satisfies the dashboard CSP
// (script-src 'self'). The lang attribute has no visual FOUC, so setting it as
// the module graph boots (before the app renders) is soon enough.
try { document.documentElement.lang = lang; } catch (e) { /* SSR/no-DOM */ }
const subs = new Set();

export const getLang = () => lang;

export function setLang(next) {
  if (!CATALOGS[next] || next === lang) return;
  lang = next;
  try {
    localStorage.setItem('careermate-lang', next);
  } catch (e) {
    /* best-effort */
  }
  document.documentElement.lang = next;
  subs.forEach((fn) => fn(lang)); // 라우터가 현재 뷰를 재렌더
}

export function onLangChange(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

const _pr = {};
const pr = (l) => (_pr[l] ||= new Intl.PluralRules(l));

export function t(key, vars) {
  let m = CATALOGS[lang]?.[key] ?? CATALOGS[FALLBACK]?.[key] ?? key; // 절대 빈 문자열 아님
  if (vars && typeof m === 'object') m = m[pr(lang).select(vars.count)] ?? m.other ?? key;
  return vars ? String(m).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? `{{${k}}}`)) : m;
}

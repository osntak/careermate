// =============================================================================
// CareerMate dashboard shell — hash router, sidebar, and page orchestration.
// Page modules live in /pages/*.js and export `render(ctx)`. They receive a ctx
// with { view, params, setTitle, setActions, refreshNav } and fill the view.
// =============================================================================
import { el, icon, get, navigate, toastError, Spinner, clear } from '/demo/lib.js';
import { t, onLangChange } from '/demo/i18n.js';

const ROUTES = [
  { id: 'home', icon: 'home', module: '/demo/pages/home.js' },
  { id: 'profile', icon: 'user', module: '/demo/pages/profile.js' },
  { id: 'jobs', icon: 'briefcase', module: '/demo/pages/jobs.js', countKey: 'jobs' },
  { id: 'applications', icon: 'layers', module: '/demo/pages/applications.js', countKey: 'active_applications' },
  { id: 'documents', icon: 'file', module: '/demo/pages/documents.js', countKey: 'cover_letters' },
  { id: 'interview', icon: 'mic', module: '/demo/pages/interview.js', countKey: 'interview_pending' },
  { id: 'insights', icon: 'target', module: '/demo/pages/insights.js' },
  { id: 'settings', icon: 'settings', module: '/demo/pages/settings.js' },
];

const view = document.getElementById('view');
const navEl = document.getElementById('nav');
const titleEl = document.getElementById('topbar-title');
const actionsEl = document.getElementById('topbar-actions');
const routeStatusEl = document.getElementById('route-status');
const moduleCache = new Map();

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const segments = raw.split('/').filter(Boolean);
  return { page: segments[0] || 'home', params: segments.slice(1) };
}

function renderNav(counts = {}) {
  clear(navEl);
  navEl.append(el('div', { class: 'nav__label' }, t('nav.section.workspace')));
  const { page } = parseHash();
  for (const r of ROUTES) {
    if (r.id === 'insights') navEl.append(el('div', { class: 'nav__label' }, t('nav.section.system')));
    const count = r.countKey ? counts[r.countKey] : null;
    navEl.append(el('a', {
      class: `nav__item${page === r.id ? ' is-active' : ''}`,
      href: `#/${r.id}`,
    }, icon(r.icon), el('span', {}, t('nav.' + r.id)),
      count ? el('span', { class: 'nav__badge tnum' }, String(count)) : null));
  }
}

async function refreshNav() {
  try {
    const summary = await get('/api/summary');
    renderNav(summary.counts);
  } catch {
    renderNav();
  }
}

async function loadModule(path) {
  if (moduleCache.has(path)) return moduleCache.get(path);
  const mod = await import(path);
  moduleCache.set(path, mod);
  return mod;
}

let renderToken = 0;
async function route() {
  const token = ++renderToken;
  const { page, params } = parseHash();
  const def = ROUTES.find((r) => r.id === page) || ROUTES[0];

  navEl.querySelectorAll('.nav__item').forEach((n) => n.classList.toggle('is-active', n.getAttribute('href') === `#/${def.id}`));
  const pageTitle = t('nav.' + def.id);
  titleEl.textContent = pageTitle;
  document.title = `${pageTitle} · CareerMate`;
  clear(actionsEl);
  view.scrollTop = 0;
  window.scrollTo(0, 0);

  const ctx = {
    view,
    params,
    setTitle: (title) => { titleEl.textContent = title; document.title = `${title} · CareerMate`; },
    setActions: (nodes) => { clear(actionsEl); [].concat(nodes).filter(Boolean).forEach((n) => actionsEl.append(n)); },
    navigate,
    refreshNav,
  };

  clear(view);
  view.append(Spinner());
  try {
    const mod = await loadModule(def.module);
    if (token !== renderToken) return;
    clear(view);
    await mod.render(ctx);
    if (routeStatusEl) routeStatusEl.textContent = titleEl.textContent || t('nav.' + def.id);
  } catch (err) {
    if (token !== renderToken) return;
    clear(view);
    view.append(el('div', { class: 'card' }, el('div', { class: 'card__body' },
      el('h3', { style: { marginBottom: '8px' } }, t('err.page.load')),
      el('p', { class: 'text-secondary', style: { marginBottom: '14px' } }, err instanceof Error ? err.message : String(err)),
      el('button', { class: 'btn btn--primary', type: 'button', onClick: () => route() }, t('common.retry')))));
    toastError(err);
  }
}

function setupMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const scrim = document.getElementById('nav-scrim');
  const app = document.querySelector('.app');
  if (!toggle || !app) return;
  const setOpen = (open) => {
    app.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? t('nav.menu.close') : t('nav.menu.open'));
  };
  toggle.addEventListener('click', () => setOpen(!app.classList.contains('nav-open')));
  scrim?.addEventListener('click', () => setOpen(false));
  navEl.addEventListener('click', (e) => { if (e.target.closest('.nav__item')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && app.classList.contains('nav-open')) setOpen(false); });
}

function initTheme() {
  const saved = localStorage.getItem('careermate-theme') || localStorage.getItem('cf-theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
}

function localizeShell() {
  const sub = document.querySelector('.sidebar__subtitle');
  if (sub) sub.textContent = t('nav.subtitle');
  const skip = document.getElementById('skip-link');
  if (skip) skip.textContent = t('nav.skip');
  const foot = document.getElementById('foot-status');
  if (foot && !window.__CAREERMATE_DEMO__) foot.textContent = t('nav.footStatus');
  const faq = document.getElementById('foot-faq');
  if (faq) {
    const en = document.documentElement.lang === 'en';
    faq.href = en ? 'https://careermate.life/en/faq' : 'https://careermate.life/faq';
    faq.title = en ? 'FAQ' : '자주 묻는 질문';
  }
}

async function boot() {
  initTheme();
  setupMobileNav();
  localizeShell();
  document.getElementById('skip-link')?.addEventListener('click', () => {
    view.setAttribute('tabindex', '-1');
    view.focus();
  });
  try {
    const h = await get('/api/health');
    document.getElementById('foot-path').textContent = h.data_dir;
    document.getElementById('foot-path').title = h.data_dir;
  } catch { /* ignore */ }
  await refreshNav();
  onLangChange(() => { localizeShell(); refreshNav(); route(); });
  window.addEventListener('hashchange', route);
  await route();
}

boot();

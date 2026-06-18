// =============================================================================
// CareerMate dashboard shell — hash router, sidebar, and page orchestration.
// Page modules live in /pages/*.js and export `render(ctx)`. They receive a ctx
// with { view, params, setTitle, setActions, refreshNav } and fill the view.
// =============================================================================
import { el, icon, get, navigate, toastError, Spinner, clear } from '/lib.js';

const ROUTES = [
  { id: 'home', label: '홈', icon: 'home', module: '/pages/home.js' },
  { id: 'profile', label: '프로필', icon: 'user', module: '/pages/profile.js' },
  { id: 'jobs', label: '채용공고', icon: 'briefcase', module: '/pages/jobs.js', countKey: 'jobs' },
  { id: 'applications', label: '지원 현황', icon: 'layers', module: '/pages/applications.js', countKey: 'active_applications' },
  { id: 'documents', label: '문서', icon: 'file', module: '/pages/documents.js', countKey: 'cover_letters' },
  { id: 'interview', label: '면접 준비', icon: 'mic', module: '/pages/interview.js', countKey: 'interview_pending' },
  { id: 'settings', label: '설정', icon: 'settings', module: '/pages/settings.js' },
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
  navEl.append(el('div', { class: 'nav__label' }, '워크스페이스'));
  const { page } = parseHash();
  for (const r of ROUTES) {
    if (r.id === 'settings') navEl.append(el('div', { class: 'nav__label' }, '시스템'));
    const count = r.countKey ? counts[r.countKey] : null;
    navEl.append(el('a', {
      class: `nav__item${page === r.id ? ' is-active' : ''}`,
      href: `#/${r.id}`,
    }, icon(r.icon), el('span', {}, r.label),
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

  // active nav state
  navEl.querySelectorAll('.nav__item').forEach((n) => n.classList.toggle('is-active', n.getAttribute('href') === `#/${def.id}`));
  titleEl.textContent = def.label;
  clear(actionsEl);
  view.scrollTop = 0;
  window.scrollTo(0, 0);

  const ctx = {
    view,
    params,
    setTitle: (t) => { titleEl.textContent = t; },
    setActions: (nodes) => { clear(actionsEl); [].concat(nodes).filter(Boolean).forEach((n) => actionsEl.append(n)); },
    navigate,
    refreshNav,
  };

  clear(view);
  view.append(Spinner());
  try {
    const mod = await loadModule(def.module);
    if (token !== renderToken) return; // a newer navigation superseded this one
    clear(view);
    await mod.render(ctx);
    // Announce just the new page name to screen readers (titleEl reflects any
    // detail-page ctx.setTitle override).
    if (routeStatusEl) routeStatusEl.textContent = titleEl.textContent || def.label;
  } catch (err) {
    if (token !== renderToken) return;
    clear(view);
    view.append(el('div', { class: 'card' }, el('div', { class: 'card__body' },
      el('h3', { style: { marginBottom: '8px' } }, '페이지를 불러오지 못했습니다'),
      el('p', { class: 'text-secondary', style: { marginBottom: '14px' } }, err instanceof Error ? err.message : String(err)),
      el('button', { class: 'btn btn--primary', type: 'button', onClick: () => route() }, '다시 시도'))));
    toastError(err);
  }
}

// Mobile/narrow-window nav: the sidebar is the only navigation, so below 900px it
// becomes an off-canvas drawer toggled from the topbar. Without this a phone/narrow
// window is stranded on whatever page loaded first.
function setupMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const scrim = document.getElementById('nav-scrim');
  const app = document.querySelector('.app');
  if (!toggle || !app) return;
  const setOpen = (open) => {
    app.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  };
  toggle.addEventListener('click', () => setOpen(!app.classList.contains('nav-open')));
  scrim?.addEventListener('click', () => setOpen(false));
  navEl.addEventListener('click', (e) => { if (e.target.closest('.nav__item')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && app.classList.contains('nav-open')) setOpen(false); });
}

function initTheme() {
  // Read new key, falling back to the legacy 'cf-theme' so existing users keep their choice.
  const saved = localStorage.getItem('careermate-theme') || localStorage.getItem('cf-theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
}

async function boot() {
  initTheme();
  setupMobileNav();
  // Skip link: jump keyboard focus past the sidebar to the page content. A hash
  // anchor would collide with the router, so move focus directly instead.
  document.getElementById('skip-link')?.addEventListener('click', () => {
    view.setAttribute('tabindex', '-1');
    view.focus();
  });
  // Show data location in the footer (privacy: user can always see where data lives).
  try {
    const h = await get('/api/health');
    document.getElementById('foot-path').textContent = h.data_dir;
    document.getElementById('foot-path').title = h.data_dir;
  } catch { /* ignore */ }
  await refreshNav();
  window.addEventListener('hashchange', route);
  await route();
}

boot();

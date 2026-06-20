// =============================================================================
// CareerMate front-end library — DOM helpers, API client, and UI components.
// Every page module imports from here so the dashboard stays visually and
// behaviourally consistent. No framework, no build, no CDN.
//
// XSS safety: el() puts strings into textContent (never innerHTML). User content
// (résumé/cover-letter text) is always rendered as text. Only our own trusted
// icon SVG strings use innerHTML.
// =============================================================================
import { t, getLang } from '/i18n.js';

/* --------------------------------------------------------------- DOM helper */

/**
 * Neutralize script-capable URL schemes before they reach an href/src. Career
 * data (profile links, job URLs) is user-controlled and can arrive via the MCP
 * path with no CSRF gate, so a stored `javascript:…` link would execute when
 * clicked. http(s)/mailto and scheme-less/relative URLs pass through unchanged;
 * any other explicit scheme is replaced with a harmless '#'.
 */
export function safeUrl(v) {
  const s = String(v).trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return /^(https?:|mailto:)/i.test(s) ? s : '#';
  return s;
}

/**
 * Create an element. `props` may include: class, id, type, value, placeholder,
 * href, title, disabled, dataset:{}, style:{}, attrs:{}, and on* event handlers
 * (onClick, onInput, onChange, onSubmit, onKeydown). `children` are appended:
 * strings/numbers become safe text nodes; nodes are appended as-is; null/false
 * are ignored; arrays are flattened.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v; // trusted callers only
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style') Object.assign(node.style, v);
    else if (k === 'attrs') for (const [a, val] of Object.entries(v)) node.setAttribute(a, val);
    else if (k === 'href' || k === 'src') node.setAttribute(k, safeUrl(v)); // block javascript:/data: URLs
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'activate' && typeof v === 'function') {
      // Make a non-native element behave like a button for keyboard + AT users:
      // role, focusability, and Enter/Space activation. Use this instead of a bare
      // onClick on clickable <div>/<span> so they aren't mouse-only dead zones.
      if (!node.getAttribute('role')) node.setAttribute('role', 'button');
      if (node.getAttribute('tabindex') == null) node.setAttribute('tabindex', '0');
      node.addEventListener('click', v);
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); v(e); }
      });
    }
    else if (k in node) { try { node[k] = v; } catch { node.setAttribute(k, v); } }
    else node.setAttribute(k, v);
  }
  appendChildren(node, children);
  return node;
}
function appendChildren(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === true) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
export function mount(node, ...children) { clear(node); appendChildren(node, children); return node; }

/* ------------------------------------------------------------------- icons */
// Minimal, consistent 1.6px stroke icon set (Lucide-style). Trusted strings.
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  briefcase: '<rect x="3" y="8" width="18" height="11" rx="2.5"/><path d="M8.5 8V6.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V8"/><path d="M3 13h18"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 2.6h.1A2 2 0 1 1 13 2.6V3a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.4Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  download: '<path d="M12 3v12"/><path d="m7 11 5 4 5-4"/><path d="M5 21h14"/>',
  upload: '<path d="M12 21V9"/><path d="m7 13 5-4 5 4"/><path d="M5 3h14"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link: '<path d="M9 15 15 9"/><path d="M11 6.5 13 4.5a3.5 3.5 0 0 1 5 5l-2 2"/><path d="M13 17.5 11 19.5a3.5 3.5 0 0 1-5-5l2-2"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>',
  inbox: '<path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 6h14l2 6v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
};
/** Returns an <svg> element for the given icon name. */
export function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  // Default intrinsic size so bare icons never balloon to fill their flex parent.
  // CSS rules (.nav__item svg, .btn svg, .empty__icon svg, …) override this freely.
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (cls) svg.setAttribute('class', cls);
  svg.innerHTML = ICONS[name] || ICONS.info;
  return svg;
}

/* -------------------------------------------------------------- API client */
const TOKEN = document.querySelector('meta[name="careermate-token"]')?.content || '';

/** Call the JSON API. Throws Error(message) on non-2xx. */
export async function api(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(method !== 'GET' ? { 'x-careermate-token': TOKEN } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Connection failure (server stopped, machine asleep) — never surface "Failed to fetch".
    throw new Error(t('err.connect'));
  }
  const text = await res.text();
  let data = {};
  if (text) { try { data = JSON.parse(text); } catch { /* non-JSON error page */ } }
  if (!res.ok) {
    const e = new Error(data.error || friendlyStatus(res.status));
    e.status = res.status; // lets callers self-heal (e.g. drop a stale row on 404)
    throw e;
  }
  return data;
}
// Friendly fallback when the server didn't supply a message — never show a raw status code.
function friendlyStatus(status) {
  if (status === 404) return t('err.404');
  if (status === 403) return t('err.403');
  if (status >= 500) return t('err.500');
  return t('err.generic');
}
export const get = (p) => api('GET', p);
export const post = (p, b) => api('POST', p, b);
export const put = (p, b) => api('PUT', p, b);
export const del = (p) => api('DELETE', p);

/* ------------------------------------------------------------- formatters */
// Locale-aware date/relative-time via Intl, cached per active locale.
const _dtf = {};
const _rtf = {};
const dateFmt = () => (_dtf[getLang()] ||= new Intl.DateTimeFormat(getLang(), { year: 'numeric', month: 'short', day: 'numeric' }));
const relFmt = () => (_rtf[getLang()] ||= new Intl.RelativeTimeFormat(getLang(), { numeric: 'auto' }));
export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return dateFmt().format(d);
}
export function fmtRelative(iso) {
  if (!iso) return '';
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return t('common.justNow');
  if (sec < 3600) return relFmt().format(-Math.floor(sec / 60), 'minute');
  if (sec < 86400) return relFmt().format(-Math.floor(sec / 3600), 'hour');
  if (sec < 604800) return relFmt().format(-Math.floor(sec / 86400), 'day');
  return fmtDate(iso);
}
export function scoreClass(score) {
  if (score == null) return 'muted';
  if (score >= 75) return 'score-strong';
  if (score >= 50) return 'score-mid';
  return 'score-weak';
}
/** Textarea (newline-separated) → trimmed array, empties dropped. */
export function linesToArray(str) { return String(str || '').split('\n').map((s) => s.trim()).filter(Boolean); }
/** CSV ("a, b, c") → trimmed array, empties dropped. */
export function csvToArray(str) { return String(str || '').split(',').map((s) => s.trim()).filter(Boolean); }

/**
 * Application status code → saturated theme colour. Single source of truth so a
 * colour means the same pipeline stage everywhere (home pipeline bar/dots,
 * applications board dots, badges). MUST track the badge--{status} hues in CSS.
 */
export const STATUS_COLOR = {
  draft: 'var(--slate)', planned: 'var(--blue)', applied: 'var(--violet)',
  document_passed: 'var(--teal)', interview: 'var(--amber)',
  final_passed: 'var(--green)', on_hold: 'var(--slate)', rejected: 'var(--red)',
};
export const statusColor = (code) => STATUS_COLOR[code] || 'var(--text-tertiary)';

/* ---------------------------------------------------------------- routing */
export function navigate(hash) { location.hash = hash.startsWith('#') ? hash : '#' + hash; }

/* ------------------------------------------------------------- components */
export function Badge(status, label) {
  return el('span', { class: `badge badge--${status}` }, el('span', { class: 'dot' }), label);
}
export function Btn(label, { icon: ic, variant = '', sm, onClick, type, disabled, title } = {}) {
  const cls = ['btn', variant && `btn--${variant}`, sm && 'btn--sm'].filter(Boolean).join(' ');
  return el('button', { class: cls, onClick, type: type || 'button', disabled, title }, ic && icon(ic), label && el('span', {}, label));
}
export function IconBtn(name, { onClick, title, variant = 'ghost' } = {}) {
  return el('button', { class: `btn btn--${variant} icon-btn`, onClick, title, attrs: { 'aria-label': title || name } }, icon(name));
}
/**
 * A footer button for async saves. While `action()` runs the button is disabled
 * (so a slow local round-trip can't be double-clicked into duplicate records),
 * and if it throws the message is shown in the modal's persistent `.modal__error`
 * slot (not a transient toast) so the user sees why the save failed and can fix
 * and retry. `action` should THROW on failure (validation or API) and is expected
 * to call close()/reload() itself on success.
 */
export function SubmitBtn(label, action, { variant = 'primary', icon: ic } = {}) {
  let busy = false;
  const btn = Btn(label, {
    variant,
    icon: ic,
    onClick: async () => {
      if (busy) return;
      busy = true;
      btn.disabled = true;
      const slot = btn.closest('.modal')?.querySelector('.modal__error');
      if (slot) { slot.hidden = true; slot.textContent = ''; }
      try {
        await action();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (slot) { slot.textContent = msg; slot.hidden = false; slot.scrollIntoView?.({ block: 'nearest' }); }
        else toastError(e);
      } finally {
        busy = false;
        btn.disabled = false;
      }
    },
  });
  return btn;
}
export function Card({ title, sub, actions, body, clickable, onClick } = {}) {
  const head = (title || actions) && el('div', { class: 'card__head' },
    title && el('h3', {}, title),
    sub && el('span', { class: 'sub' }, sub),
    actions && el('div', { class: 'right' }, ...[].concat(actions)),
  );
  return el('div', { class: `card${clickable ? ' is-clickable' : ''}`, activate: onClick },
    head, el('div', { class: 'card__body' }, ...[].concat(body || [])));
}
export function Stat({ label, value, hint, iconName, onClick }) {
  return el('div', { class: 'stat', activate: onClick },
    el('div', { class: 'stat__label' }, iconName && icon(iconName), label),
    el('div', { class: 'stat__value tnum' }, value),
    hint && el('div', { class: 'stat__hint' }, hint),
  );
}
export function EmptyState({ iconName = 'inbox', title, body, action }) {
  return el('div', { class: 'empty' },
    el('div', { class: 'empty__icon' }, icon(iconName)),
    el('h3', {}, title),
    body && el('p', {}, body),
    action,
  );
}
export function Chips(items, { accent } = {}) {
  return el('div', { class: 'chips' }, ...(items || []).map((t) => el('span', { class: `chip${accent ? ' chip--accent' : ''}` }, t)));
}
/** Dense list row: leading slot → title + muted sub → right-aligned trailing. */
export function ListRow({ leading, title, sub, trailing, onClick } = {}) {
  return el('div', { class: `list-row${onClick ? ' is-clickable' : ''}`, activate: onClick },
    leading && el('div', { class: 'list-row__lead' }, leading),
    el('div', { class: 'list-row__main' },
      el('div', { class: 'list-row__title' }, title),
      sub && el('div', { class: 'list-row__sub' }, sub)),
    trailing && el('div', { class: 'list-row__trail' }, ...[].concat(trailing)));
}
/** Onboarding checklist row: hollow dot (todo, links via onClick) or green check (done, struck through). */
export function CheckRow({ done, label, onClick } = {}) {
  // Whole row is the activation target (bigger hit area + keyboard) when it's a todo.
  const interactive = !done && typeof onClick === 'function';
  return el('div', { class: `check-row${done ? ' is-done' : ''}`, activate: interactive ? onClick : undefined },
    done ? icon('check', 'check-row__icon') : el('span', { class: 'check-row__dot' }),
    el('span', { class: `check-row__label${interactive ? ' is-link' : ''}` }, label));
}
export function Field(label, control, hint) {
  return el('div', { class: 'field' }, label && el('label', {}, label), control, hint && el('div', { class: 'hint' }, hint));
}
export function Input(props = {}) { return el('input', { class: 'input', ...props }); }
export function Textarea(props = {}) { return el('textarea', { class: 'textarea', ...props }); }
export function Select(options, props = {}) {
  return el('select', { class: 'select', ...props }, ...options.map((o) => el('option', { value: o.value, selected: o.selected }, o.label)));
}
export function PageHead({ title, desc, actions }) {
  return el('div', { class: 'page-head' },
    el('div', { class: 'page-head__text' }, el('h1', {}, title), desc && el('p', {}, desc)),
    actions && el('div', { class: 'page-head__actions' }, ...[].concat(actions)),
  );
}
export function Spinner() { return el('div', { class: 'view' }, el('div', { class: 'card' }, el('div', { class: 'card__body' }, el('div', { class: 'skeleton', style: { height: '120px' } })))); }

/* ------------------------------------------------------------------ toast */
let toastRoot;
export function toast(message, { title, type = 'default', timeout = 3800 } = {}) {
  if (!toastRoot) { toastRoot = el('div', { class: 'toasts' }); document.body.append(toastRoot); }
  const t = el('div', { class: `toast toast--${type}` },
    title && el('div', { class: 'toast__title' }, title),
    el('div', { class: 'toast__body' }, message));
  toastRoot.append(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .25s'; setTimeout(() => t.remove(), 260); }, timeout);
}
export function toastError(e) { toast(e instanceof Error ? e.message : String(e), { title: t('toast.errorTitle'), type: 'error' }); }
export function toastOk(msg) { toast(msg, { type: 'success' }); }

/* ------------------------------------------------------------------ modal */
let modalRoot;
let modalReturnFocus = null;
const MODAL_FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
function ensureModalRoot() {
  if (!modalRoot) {
    modalRoot = el('div', { class: 'modal-root' });
    document.body.append(modalRoot);
    modalRoot.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  }
  return modalRoot;
}
export function closeModal() {
  if (modalRoot) { modalRoot.classList.remove('is-open'); clear(modalRoot); }
  // Return focus to whatever opened the modal so keyboard users aren't dumped at the page top.
  if (modalReturnFocus) { try { modalReturnFocus.focus(); } catch { /* element gone */ } modalReturnFocus = null; }
}
/**
 * Open a modal. `render(close)` returns the modal body content. Provide title,
 * optional footer buttons via `footer(close)`. Returns nothing; call closeModal().
 */
export function openModal({ title, body, footer, size }) {
  const root = ensureModalRoot();
  const close = closeModal;
  modalReturnFocus = document.activeElement; // restored by closeModal
  const closeBtn = IconBtn('plus', { title: t('common.close'), onClick: close }); // rotated to look like ×
  closeBtn.style.transform = 'rotate(45deg)';
  const modal = el('div', {
    class: `modal${size === 'lg' ? ' modal--lg' : ''}`,
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' },
  },
    el('div', { class: 'modal__head' }, el('h3', { id: 'modal-title' }, title), el('div', { class: 'topbar__spacer' }), closeBtn),
  );
  // Focus trap: keep Tab / Shift+Tab inside the dialog instead of leaking to the page behind.
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...modal.querySelectorAll(MODAL_FOCUSABLE)].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  const bodyNode = el('div', { class: 'modal__body' });
  appendChildren(bodyNode, [typeof body === 'function' ? body(close) : body]);
  modal.append(bodyNode);
  // Persistent inline error slot so a failed save shows a clear reason instead of
  // relying on a 3.8s toast. Placed between body and footer (always visible). Any
  // SubmitBtn inside the modal writes here — including inline editors in bodies
  // that have no footer; see SubmitBtn.
  modal.append(el('div', { class: 'modal__error', hidden: true, attrs: { role: 'alert', 'aria-live': 'assertive' } }));
  if (footer) modal.append(el('div', { class: 'modal__foot' }, ...[].concat(footer(close))));
  mount(root, el('div', { class: 'modal__scrim', onClick: close }), modal);
  root.classList.add('is-open');
  setTimeout(() => (bodyNode.querySelector('input,textarea,select') || modal.querySelector(MODAL_FOCUSABLE))?.focus(), 30);
}
/** Confirmation dialog. Returns a Promise<boolean>. */
export function confirmDialog({ title = t('common.confirm'), message, confirmLabel = t('common.confirm'), danger } = {}) {
  return new Promise((resolve) => {
    openModal({
      title,
      body: el('p', { class: 'text-secondary', style: { margin: 0, lineHeight: '1.6' } }, message),
      footer: (close) => [
        Btn(t('common.cancel'), { onClick: () => { close(); resolve(false); } }),
        Btn(confirmLabel, { variant: danger ? 'danger' : 'primary', onClick: () => { close(); resolve(true); } }),
      ],
    });
  });
}

/* ---------------------------------------------------------------- utility */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toastOk(t('toast.copied')); }
  catch { toast(t('toast.copyFailed'), { type: 'error' }); }
}
/** Trigger a file download via a GET endpoint (no token needed; read-only). */
export function downloadUrl(url) {
  const a = el('a', { href: url, download: '' });
  document.body.append(a); a.click(); a.remove();
}

/** Shared meta (statuses, document kinds) loaded once. */
let _meta = null;
export async function meta() { if (!_meta) _meta = await get('/api/meta'); return _meta; }

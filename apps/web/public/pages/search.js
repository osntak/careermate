// Find jobs (#/search): the same board search as the search_jobs MCP tool. One
// input is the keyword for all four boards; Remember/Saramin categories are an
// optional narrowing step (AND with the keyword) offered from that keyword and
// dropped when the keyword changes. Optional years and "today only", saved
// conditions, and one-click save into the jobs list.
import { el, get, post, put, Card, Btn, Field, Input, EmptyState, Spinner, icon, mount, clear, toastOk, toastError } from '/lib.js';
import { t } from '/i18n.js';

const site = (s) => t('search.site.' + s);
// Stored job "source" stays one fixed label whatever the UI language (the schema lists 사람인/원티드...).
const SOURCE_LABEL = { wanted: '원티드', jumpit: '점핏', remember: '리멤버', saramin: '사람인' };

export async function render(ctx) {
  ctx.setTitle(t('nav.search'));

  const state = { remember: [], saramin: [], names: new Map() };
  try {
    const { preferences: p, saramin_names } = await get('/api/job-search/preferences');
    state.remember = [...p.remember_categories];
    state.saramin = [...p.saramin_categories];
    state.keyword = p.keyword;
    for (const [c, n] of Object.entries(saramin_names || {})) state.names.set(c, n);
  } catch { /* first run: nothing saved */ }
  // Chips belong to the keyword they were picked for (saved ones to the saved keyword).
  state.chipKeyword = state.keyword || '';

  const keyword = Input({ id: 'search-keyword', placeholder: t('search.keyword.ph'), value: state.keyword || '' });
  const years = Input({ id: 'search-years', type: 'number', min: '0', max: '40', inputMode: 'numeric', placeholder: t('search.years.ph') });
  const today = el('input', { id: 'search-today', type: 'checkbox' });
  const suggestBox = el('div', { class: 'stack-2' });
  const selectedBox = el('div', { class: 'chips' });
  const catField = Field(t('search.cat'), el('div', { class: 'stack-2' }, suggestBox, selectedBox), t('search.cat.hint'));
  const results = el('div', {}, el('p', { class: 'muted', style: { margin: 0 } }, t('search.results.idle')));

  const label = (kind, v) => (kind === 'saramin' ? state.names.get(v) || v : v.replace('>', ' > '));

  function toggle(kind, v) {
    const list = state[kind];
    const i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1); else list.push(v);
    paintSelected();
    suggestBox.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('is-selected', state[b.dataset.kind].includes(b.dataset.cat)));
  }

  function catButton(kind, value, text) {
    const b = el('button', {
      type: 'button',
      class: `btn btn--sm${state[kind].includes(value) ? ' is-selected' : ''}`,
      dataset: { cat: value, kind },
      onClick: () => toggle(kind, value),
    }, text);
    return b;
  }

  function paintSelected() {
    const items = [
      ...state.remember.map((v) => ['remember', v]),
      ...state.saramin.map((v) => ['saramin', v]),
    ];
    mount(selectedBox, ...items.map(([kind, v]) =>
      el('button', { type: 'button', class: 'chip chip--accent', title: t('common.delete'), onClick: () => toggle(kind, v) },
        `${site(kind)} · ${label(kind, v)} ×`)));
    selectedBox.hidden = !items.length;
    catField.hidden = !items.length && !suggestBox.childElementCount;
  }

  // Leftover chips from another keyword were silently ANDed into the next search
  // (백엔드 chips + "재무" left Remember with 1 posting), so a new keyword drops them.
  function dropStaleChips(kw) {
    if (!kw || kw === state.chipKeyword) return;
    state.remember = [];
    state.saramin = [];
    state.chipKeyword = kw;
    clear(suggestBox);
    paintSelected();
  }

  // Offer categories for the keyword just searched; picking one is optional narrowing.
  async function offerCategories(kw) {
    try {
      const r = await get(`/api/job-search/categories?q=${encodeURIComponent(kw)}`);
      for (const s of r.saramin) state.names.set(s.code, s.name);
      mount(suggestBox,
        r.remember.length ? el('div', { class: 'flex wrap gap-2' },
          el('span', { class: 'muted text-sm' }, t('search.cat.remember')),
          ...r.remember.slice(0, 8).map((v) => catButton('remember', v, v.replace('>', ' > ')))) : null,
        r.saramin.length ? el('div', { class: 'flex wrap gap-2' },
          el('span', { class: 'muted text-sm' }, t('search.cat.saramin')),
          ...r.saramin.slice(0, 8).map((s) => catButton('saramin', s.code, s.name))) : null);
    } catch { clear(suggestBox); } // suggestions are optional; the search itself still ran
    paintSelected();
  }

  async function savePrefs() {
    dropStaleChips(keyword.value.trim());
    try {
      await put('/api/job-search/preferences', {
        keyword: keyword.value.trim(),
        remember_categories: state.remember,
        saramin_categories: state.saramin,
      });
      toastOk(t('search.saved.prefs'));
    } catch (e) { toastError(e); }
  }

  async function saveJob(r, cell) {
    if (cell.dataset.busy) return; // double-click would log the save twice
    cell.dataset.busy = '1';
    try {
      const { job } = await post('/api/jobs', {
        company: r.company,
        position: r.position,
        url: r.url,
        ...(r.location ? { location: r.location } : {}),
        ...(r.deadline ? { deadline: r.deadline } : {}),
        ...(r.keywords?.length ? { keywords: r.keywords.slice(0, 30) } : {}),
        source: SOURCE_LABEL[r.source] || r.source,
      });
      r.saved_job_id = job.id;
      mount(cell, savedBadge(job.id));
      toastOk(t('search.savedToast'));
      ctx.refreshNav();
    } catch (e) {
      delete cell.dataset.busy;
      toastError(e);
    }
  }

  const savedBadge = (id) => el('a', { class: 'badge badge--final_passed', href: `#/jobs/${id}` }, icon('check'), t('search.savedBadge'));

  function row(r) {
    const trail = el('div', { class: 'flex gap-2' });
    if (r.saved_job_id) trail.append(savedBadge(r.saved_job_id));
    else trail.append(Btn(t('search.save'), { icon: 'plus', sm: true, onClick: () => saveJob(r, trail) }));
    const meta = [
      r.company,
      r.experience,
      r.location,
      r.posted_at && t('search.posted', { d: r.posted_at }),
      r.deadline && t('search.deadline', { d: r.deadline }),
    ].filter(Boolean).join(' · ');
    return el('div', { class: 'list-row' },
      el('div', { class: 'list-row__lead' }, el('span', { class: 'badge' }, site(r.source))),
      el('div', { class: 'list-row__main' },
        el('div', { class: 'list-row__title' },
          el('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer', title: r.position }, r.position)),
        el('div', { class: 'list-row__sub', title: meta }, meta),
        r.also_on?.length ? el('div', { class: 'list-row__sub' }, `${t('search.alsoOn')}: `,
          ...r.also_on.flatMap((a, i) => [i ? ', ' : '', el('a', { href: a.url, target: '_blank', rel: 'noopener noreferrer' }, site(a.source))])) : null),
      el('div', { class: 'list-row__trail' }, trail));
  }

  let busy = false;
  async function run() {
    if (busy) return;
    const kw = keyword.value.trim();
    dropStaleChips(kw);
    if (!kw && !state.remember.length && !state.saramin.length) { toastError(new Error(t('search.need'))); return; }
    const y = years.value.trim();
    if (y !== '' && !(Number.isInteger(Number(y)) && Number(y) >= 0 && Number(y) <= 40)) { toastError(new Error(t('search.years.hint'))); years.focus(); return; }
    busy = true;
    runBtn.disabled = true;
    mount(results, Spinner());
    if (kw) offerCategories(kw); // runs alongside the search; renders when it returns
    try {
      const res = await post('/api/job-search', {
        keyword: kw,
        remember_categories: state.remember,
        saramin_categories: state.saramin,
        // A date filter drops most of a page, so ask for more then (matches the core default of 50).
        limit: today.checked ? 50 : 30,
        ...(y !== '' ? { years: Number(y) } : {}),
        ...(today.checked ? { posted_since: 'today' } : {}),
      });
      // Dated postings newest first; boards without a date keep their order after them.
      const list = res.results.map((r, i) => ({ ...r, i }))
        .sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? '') || a.i - b.i);
      // A count per board makes a category that shrank one board to 1 posting visible.
      const head = el('div', { class: 'flex wrap gap-2 mb-3' },
        el('span', { class: 'badge badge--accent tnum' }, t('search.results.count', { n: list.length })),
        ...res.providers.map((p) => p.ok
          ? el('span', { class: 'badge tnum' }, t('search.results.site', { site: site(p.source), n: list.filter((r) => r.source === p.source).length }))
          : el('span', { class: 'badge badge--rejected', title: p.error || '' }, t('search.provider.fail', { site: site(p.source) }))),
        res.filtered_out ? el('span', { class: 'badge tnum' }, t('search.results.filtered', { n: res.filtered_out })) : null);
      mount(results,
        head,
        list.length
          ? el('div', {}, el('p', { class: 'muted text-sm', style: { margin: '0 0 4px' } }, t('search.sort.note')), ...list.map(row))
          : EmptyState({ iconName: 'search', title: t('search.results.empty'), body: t('search.results.emptyBody') }));
    } catch (e) {
      clear(results);
      results.append(el('p', { class: 'muted', style: { margin: 0 } }, e instanceof Error ? e.message : String(e)));
      toastError(e);
    } finally {
      busy = false;
      runBtn.disabled = false;
    }
  }

  const runBtn = Btn(t('search.run'), { icon: 'search', variant: 'primary', onClick: run });
  // The Enter that commits a Korean IME syllable must not also run the search.
  const onEnter = (e) => { if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return; e.preventDefault(); run(); };
  keyword.addEventListener('keydown', onEnter);
  years.addEventListener('keydown', onEnter);

  paintSelected();

  const form = Card({
    title: t('search.cond.title'),
    body: el('div', {},
      Field(t('search.keyword'), keyword, t('search.keyword.hint')),
      catField,
      el('div', { class: 'grid grid--2' },
        Field(t('search.years'), years, t('search.years.hint')),
        Field(t('search.date'), el('label', { class: 'flex gap-2', for: 'search-today', style: { cursor: 'pointer', minHeight: '36px' } }, today, t('search.today')), t('search.today.hint'))),
      el('div', { class: 'flex wrap gap-2' }, runBtn, Btn(t('search.save.prefs'), { icon: 'check', variant: 'ghost', onClick: savePrefs }))),
  });

  mount(ctx.view, el('div', { class: 'stack-4' },
    el('p', { class: 'muted', style: { marginTop: 0 } }, t('search.desc')),
    form,
    Card({ title: t('search.results.title'), body: results })));
}

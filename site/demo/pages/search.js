// Find jobs (#/search): the same board search as the search_jobs MCP tool. One
// keyword for all four boards (no category picker: on Remember/Saramin a category
// replaces the keyword and matched fewer real postings), optional years and
// "today only", saved conditions, and one-click save into the jobs list.
import { el, get, post, put, Card, Btn, Field, Input, EmptyState, Spinner, icon, mount, clear, toastOk, toastError, GradePill } from '/demo/lib.js';
import { t } from '/demo/i18n.js';

const site = (s) => t('search.site.' + s);
// Stored job "source" stays one fixed label whatever the UI language (the schema lists 사람인/원티드...).
const SOURCE_LABEL = { wanted: '원티드', jumpit: '점핏', remember: '리멤버', saramin: '사람인' };

export async function render(ctx) {
  ctx.setTitle(t('nav.search'));

  let saved = '';
  try { saved = (await get('/api/job-search/preferences')).preferences.keyword || ''; } catch { /* first run: nothing saved */ }

  const keyword = Input({ id: 'search-keyword', placeholder: t('search.keyword.ph'), value: saved });
  const years = Input({ id: 'search-years', inputMode: 'numeric', placeholder: t('search.years.ph') });
  const today = el('input', { id: 'search-today', type: 'checkbox', class: 'switch', attrs: { role: 'switch' } });
  const results = el('div', {});
  const resultsCard = Card({ title: t('search.results.title'), body: results });
  resultsCard.hidden = true; // shown on the first search

  async function savePrefs() {
    try {
      // Empty categories clear any saved earlier, so the AI's saved search also goes by keyword.
      await put('/api/job-search/preferences', { keyword: keyword.value.trim(), remember_categories: [], saramin_categories: [] });
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
    // Company researched earlier (from a saved posting): show its health right in the results.
    if (r.company_grade && r.company_grade !== 'U') trail.append(GradePill(r.company_grade, t('company.grade.' + r.company_grade), t('company.gradeTitle')));
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
    if (!kw) { toastError(new Error(t('search.need'))); return; }
    const y = years.value.trim();
    if (y !== '' && !(Number.isInteger(Number(y)) && Number(y) >= 0 && Number(y) <= 40)) { toastError(new Error(t('search.years.bad'))); years.focus(); return; }
    busy = true;
    runBtn.disabled = true;
    resultsCard.hidden = false;
    mount(results, Spinner());
    try {
      const res = await post('/api/job-search', {
        keyword: kw,
        // A date filter drops most of a page, so ask for more then (matches the core default of 50).
        limit: today.checked ? 50 : 30,
        ...(y !== '' ? { years: Number(y) } : {}),
        ...(today.checked ? { posted_since: 'today' } : {}),
      });
      // Dated postings newest first; boards without a date keep their order after them.
      const list = res.results.map((r, i) => ({ ...r, i }))
        .sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? '') || a.i - b.i);
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

  const form = Card({
    title: t('search.cond.title'),
    body: el('div', {},
      Field(t('search.keyword'), keyword),
      el('div', { class: 'grid grid--2' }, Field(t('search.years'), years, t('search.years.hint'))),
      el('div', { class: 'flex wrap gap-2 center' }, runBtn, Btn(t('search.save.prefs'), { icon: 'check', variant: 'ghost', onClick: savePrefs }),
        el('label', { class: 'flex gap-2 center', for: 'search-today', title: t('search.today.hint'), style: { cursor: 'pointer', marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' } }, t('search.today'), today))),
  });

  mount(ctx.view, el('div', { class: 'stack-4' },
    el('p', { class: 'muted', style: { marginTop: 0 } }, t('search.desc')),
    form,
    resultsCard));
}

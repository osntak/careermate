// Jobs — list of saved postings (#/jobs) and the rich per-job detail (#/jobs/:id).
// Detail is the densest screen in the app: posting info, fit analysis, linked
// cover letters, interview prep, and related history, all driven by the AI's
// saved data with manual fallbacks throughout.
import {
  el, get, post, put, del, icon, navigate, Card, Badge, Btn, SubmitBtn,
  EmptyState, Chips, Field, Input, Textarea, Select,
  openModal, closeModal, confirmDialog, toastOk, toastError,
  fmtDate, scoreClass, mount, meta, linesToArray, csvToArray,
} from '/demo/lib.js';
import { t } from '/demo/i18n.js';

export async function render(ctx) {
  if (ctx.params[0]) return renderDetail(ctx, ctx.params[0]);
  return renderList(ctx);
}

/* =============================================================== List mode */

async function renderList(ctx) {
  const { jobs } = await get('/api/jobs');
  const wrap = el('div', { class: 'stack-4' });

  if (!jobs.length) {
    ctx.setActions([]); // 단일 1차 액션은 빈 상태에만 둔다
    wrap.append(EmptyState({
      iconName: 'briefcase',
      title: t('jobs.list.empty.title'),
      body: t('jobs.list.empty.body'),
      action: Btn(t('jobs.list.addJob'), { icon: 'plus', variant: 'primary', onClick: () => openJobModal(ctx) }),
    }));
    mount(ctx.view, wrap);
    return;
  }

  const addBtn = Btn(t('jobs.list.addJob'), { icon: 'plus', variant: 'primary', sm: true, onClick: () => openJobModal(ctx) });
  const search = Input({ type: 'search', placeholder: t('jobs.list.searchPlaceholder'), attrs: { 'aria-label': t('jobs.list.searchAria') } });
  search.classList.add('input--inline');
  ctx.setActions([search, addBtn]);

  const rowData = jobs.map((j) => ({
    tr: el('tr', { class: 'is-clickable', onClick: () => navigate(`/jobs/${j.id}`) },
      el('td', {},
        // Real link in the lead cell so keyboard/AT users can reach the row (a
        // role=button on <tr> would be invalid ARIA); the whole row stays mouse-clickable.
        el('a', { class: 'cell-link strong', href: `#/jobs/${j.id}` }, j.company),
        el('div', { class: 'muted text-sm' }, j.position)),
      el('td', {},
        el('div', {}, j.location || el('span', { class: 'muted' }, t('jobs.list.locationUnset'))),
        el('div', { class: 'muted text-sm' }, j.deadline ? t('jobs.list.deadline', { date: fmtDate(j.deadline) }) : t('jobs.list.noDeadline'))),
      el('td', { style: { textAlign: 'right' } },
        j.fit_score != null
          ? el('span', { class: `strong tnum ${scoreClass(j.fit_score)}` }, t('jobs.list.score', { score: j.fit_score }))
          : el('span', { class: 'muted' }, '—')),
      el('td', {}, Badge(j.status, t('status.' + j.status)))),
    text: `${j.company} ${j.position} ${j.location || ''} ${(j.keywords || []).join(' ')}`.toLowerCase(),
  }));

  const tbody = el('tbody', {}, ...rowData.map((r) => r.tr));
  const noResult = el('tr', { class: 'hide' },
    el('td', { attrs: { colspan: '4' }, class: 'muted', style: { textAlign: 'center', padding: '24px 16px' } }, t('jobs.list.noResult')));
  tbody.append(noResult);

  wrap.append(Card({
    title: t('jobs.list.cardTitle'),
    sub: t('jobs.list.cardSub', { count: jobs.length }),
    body: el('div', { class: 'table-scroll' }, el('table', { class: 'table table--jobs' },
      el('thead', {}, el('tr', {},
        el('th', {}, t('jobs.list.col.companyRole')),
        el('th', {}, t('jobs.list.col.locationDeadline')),
        el('th', { style: { textAlign: 'right' } }, t('jobs.list.col.fit')),
        el('th', {}, t('jobs.list.col.status')))),
      tbody)),
  }));

  mount(ctx.view, wrap);

  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    for (const r of rowData) { const m = !q || r.text.includes(q); r.tr.classList.toggle('hide', !m); if (m) shown += 1; }
    noResult.classList.toggle('hide', shown !== 0);
  });
}

/* ---------------------------------------------------------- add/edit modal */

/**
 * Build a job form (used for both create and edit). `job` is the existing
 * record when editing, or null when creating. `onSaved(result)` receives the
 * API response so callers can navigate/re-render appropriately.
 */
function jobForm(ctx, { job, onSaved }) {
  const v = job || {};
  const company = Input({ value: v.company || '', placeholder: t('jobs.form.companyPlaceholder'), attrs: { required: 'required' } });
  const position = Input({ value: v.position || '', placeholder: t('jobs.form.positionPlaceholder'), attrs: { required: 'required' } });
  const url = Input({ value: v.url || '', placeholder: t('jobs.form.urlPlaceholder'), type: 'url' });
  const location = Input({ value: v.location || '', placeholder: t('jobs.form.locationPlaceholder') });
  const employment = Input({ value: v.employment_type || '', placeholder: t('jobs.form.employmentPlaceholder') });
  const deadline = Input({ value: v.deadline || '', placeholder: t('jobs.form.deadlinePlaceholder') });
  const source = Input({ value: v.source || '', placeholder: t('jobs.form.sourcePlaceholder') });
  const description = Textarea({
    value: v.description || '', placeholder: t('jobs.form.descriptionPlaceholder'),
    style: { minHeight: '160px' },
  });
  const keywords = Input({ value: (v.keywords || []).join(', '), placeholder: t('jobs.form.keywordsPlaceholder') });
  const requirements = Textarea({
    value: (v.requirements || []).join('\n'), placeholder: t('jobs.form.requirementsPlaceholder'),
    style: { minHeight: '90px' },
  });

  // "붙여넣은 텍스트 정리" — server-side clean + best-effort field extraction.
  // Deterministic text parsing — NOT AI (CareerMate has no LLM). Use a neutral icon and
  // show "정리 중…" so a slow parse of a long posting doesn't look frozen.
  const tidyBtn = Btn(t('jobs.form.tidy'), {
    icon: 'edit', sm: true, variant: 'ghost',
    onClick: async () => {
      const raw = description.value.trim();
      if (!raw) { toastError(t('jobs.form.tidyNeedsText')); return; }
      const labelEl = tidyBtn.querySelector('span');
      const origLabel = labelEl ? labelEl.textContent : '';
      tidyBtn.disabled = true;
      if (labelEl) labelEl.textContent = t('jobs.form.tidyBusy');
      try {
        const r = await post('/api/parse/job', { raw });
        if (r.text) description.value = r.text;
        if (r.company && !company.value.trim()) company.value = r.company;
        if (r.position && !position.value.trim()) position.value = r.position;
        if (r.deadline && !deadline.value.trim()) deadline.value = r.deadline;
        if (r.keywords && r.keywords.length) {
          const existing = csvToArray(keywords.value);
          const merged = [...new Set([...existing, ...r.keywords])];
          keywords.value = merged.join(', ');
        }
        toastOk(t('jobs.form.tidyDone'));
      } catch (e) { toastError(e); }
      finally { tidyBtn.disabled = false; if (labelEl) labelEl.textContent = origLabel; }
    },
  });

  const form = el('form', { class: 'stack-3' },
    el('div', { class: 'grid grid--2' },
      Field(t('jobs.form.field.company'), company),
      Field(t('jobs.form.field.position'), position)),
    Field(t('jobs.form.field.url'), url),
    el('div', { class: 'grid grid--3' },
      Field(t('jobs.form.field.location'), location),
      Field(t('jobs.form.field.employment'), employment),
      Field(t('jobs.form.field.deadline'), deadline, t('jobs.form.field.deadlineHint'))),
    Field(t('jobs.form.field.source'), source),
    Field(
      el('div', { class: 'flex between center' }, el('span', {}, t('jobs.form.field.description')), tidyBtn),
      description,
      t('jobs.form.field.descriptionHint')),
    Field(t('jobs.form.field.keywords'), keywords, t('jobs.form.field.keywordsHint')),
    Field(t('jobs.form.field.requirements'), requirements, t('jobs.form.field.requirementsHint')),
  );

  // Throws on validation/API failure so the SubmitBtn shows it inline.
  async function submit() {
    const body = {
      company: company.value.trim(),
      position: position.value.trim(),
      url: url.value.trim() || undefined,
      location: location.value.trim() || undefined,
      employment_type: employment.value.trim() || undefined,
      deadline: deadline.value.trim() || undefined,
      source: source.value.trim() || undefined,
      description: description.value.trim() || undefined,
      keywords: csvToArray(keywords.value),
      requirements: linesToArray(requirements.value),
    };
    if (!body.company || !body.position) throw new Error(t('jobs.form.validationRequired'));
    const res = job
      ? await put(`/api/jobs/${job.id}`, body)
      : await post('/api/jobs', body);
    toastOk(job ? t('jobs.form.savedEdit') : t('jobs.form.savedNew'));
    closeModal();
    await onSaved(res);
  }

  // Route the form's Enter-to-submit through the footer SubmitBtn so it shares the
  // same in-flight disable + inline error handling.
  const bindSubmit = (btn) => form.addEventListener('submit', (e) => { e.preventDefault(); btn.click(); });

  return { form, submit, bindSubmit };
}

function openJobModal(ctx) {
  const built = jobForm(ctx, {
    job: null,
    onSaved: async (res) => {
      await ctx.refreshNav();
      navigate(`/jobs/${res.job.id}`);
    },
  });
  const saveBtn = SubmitBtn(t('jobs.form.save'), built.submit);
  built.bindSubmit(saveBtn);
  openModal({
    title: t('jobs.modal.addTitle'),
    size: 'lg',
    body: built.form,
    footer: (close) => [
      Btn(t('jobs.form.cancel'), { onClick: close }),
      saveBtn,
    ],
  });
}

function openEditModal(ctx, job, remount) {
  const built = jobForm(ctx, {
    job,
    onSaved: async () => { await ctx.refreshNav(); await remount(); },
  });
  const saveBtn = SubmitBtn(t('jobs.form.save'), built.submit);
  built.bindSubmit(saveBtn);
  openModal({
    title: t('jobs.modal.editTitle'),
    size: 'lg',
    body: built.form,
    footer: (close) => [
      Btn(t('jobs.form.cancel'), { onClick: close }),
      saveBtn,
    ],
  });
}

/* ============================================================= Detail mode */

async function renderDetail(ctx, jobId) {
  let job;
  try {
    ({ job } = await get(`/api/jobs/${jobId}`));
  } catch (err) {
    ctx.setTitle(t('jobs.detail.notFoundTitle'));
    const notFound = el('div', { class: 'stack-4' },
      EmptyState({
        iconName: 'briefcase',
        title: t('jobs.detail.notFoundCardTitle'),
        body: err instanceof Error ? err.message : t('jobs.detail.notFoundBody'),
        action: Btn(t('jobs.detail.backToList'), { icon: 'chevronRight', variant: 'primary', onClick: () => navigate('/jobs') }),
      }));
    mount(ctx.view, notFound);
    ctx.setActions(null);
    return;
  }

  const remount = () => renderDetail(ctx, jobId);
  const m = await meta();

  ctx.setTitle(t('jobs.detail.title', { company: job.company, position: job.position }));

  // --- Header actions (also mirrored into the topbar) -----------------------
  async function changeStatus(status, extra = {}) {
    const res = await put(`/api/applications/${jobId}/status`, { status, ...extra });
    toastOk(t('jobs.detail.statusChanged'));
    if (res && res.hint) toastOk(res.hint);
    await ctx.refreshNav();
    await remount();
  }

  const statusSelect = Select(
    m.statuses.map((s) => ({ value: s.value, label: t('status.' + s.value), selected: s.value === job.status })),
    {
      attrs: { 'aria-label': t('jobs.detail.statusLabel') },
      onChange: async (e) => {
        const status = e.target.value;
        if (status === job.status) return;
        if (status === 'applied') {
          e.target.value = job.status;
          try {
            await openAppliedModal({ job, metaInfo: m, changeStatus });
          } catch (err) {
            toastError(err);
          }
          return;
        }
        try {
          await changeStatus(status);
        } catch (err) {
          toastError(err);
          // Stale tab: the job was removed since this page loaded. Re-render so the
          // detail reflects reality (shows "not found") instead of looping the error.
          if (err && err.status === 404) { await ctx.refreshNav(); await remount(); return; }
          e.target.value = job.status;
        }
      },
    },
  );
  statusSelect.classList.add('select--sm');

  const editBtn = Btn(t('jobs.detail.edit'), { icon: 'edit', sm: true, variant: 'ghost', onClick: () => openEditModal(ctx, job, remount) });
  const delBtn = Btn(t('jobs.detail.delete'), {
    icon: 'trash', sm: true, variant: 'danger',
    onClick: async () => {
      const ok = await confirmDialog({
        title: t('jobs.detail.deleteTitle'),
        message: t('jobs.detail.deleteMessage', { company: job.company, position: job.position }),
        confirmLabel: t('jobs.detail.deleteConfirm'), danger: true,
      });
      if (!ok) return;
      try {
        await del(`/api/jobs/${jobId}`);
        toastOk(t('jobs.detail.deleted'));
        await ctx.refreshNav();
        navigate('/jobs');
      } catch (err) { toastError(err); }
    },
  });

  ctx.setActions([
    Btn(t('jobs.detail.list'), { icon: 'chevronRight', sm: true, variant: 'ghost', onClick: () => navigate('/jobs') }),
    editBtn,
  ]);

  // --- Page head ------------------------------------------------------------
  // 수정은 상단바(ctx.setActions)에만 둔다 — 여기엔 상태 변경·원문·삭제만.
  const headActions = el('div', { class: 'flex gap-2 center wrap' },
    statusSelect,
    job.url ? el('a', { class: 'btn btn--ghost btn--sm', href: job.url, attrs: { target: '_blank', rel: 'noopener noreferrer' } }, icon('external'), el('span', {}, t('jobs.detail.openPosting'))) : null,
    delBtn,
  );

  const head = el('div', { class: 'page-head' },
    el('div', { class: 'page-head__text' },
      el('div', { class: 'flex gap-3 center wrap' },
        el('h1', {}, job.company),
        Badge(job.status, t('status.' + job.status))),
      el('p', {}, job.position)),
    el('div', { class: 'page-head__actions' }, headActions),
  );

  // --- Layout ---------------------------------------------------------------
  // 자기소개서·면접을 맨 위 2열로(둘 다 짧음), 그 아래 공고 정보(원문은 접힘)와
  // 적합도를 전체폭으로 쌓는다. 한쪽 칼럼만 길어 빈 공간이 도드라지던 50/50
  // 그리드를 대체한다. 관련 기록은 있을 때만 맨 아래.
  const wrap = el('div', { class: 'stack-4' },
    head,
    el('div', { class: 'grid grid--2' },
      CoverLettersCard(job.cover_letters),
      InterviewCard(job)),
    PostingCard(job),
    FitCard(job.fit),
    TimelineCard(job.timeline),
    RelatedCard(job.related),
  );
  mount(ctx.view, wrap);
}

/* ----------------------------------------------------------- detail cards */

function PostingCard(job) {
  const body = [];

  body.push(el('dl', { class: 'kv' },
    el('dt', {}, t('jobs.posting.location')), el('dd', {}, job.location || el('span', { class: 'muted' }, t('jobs.posting.unset'))),
    el('dt', {}, t('jobs.posting.employment')), el('dd', {}, job.employment_type || el('span', { class: 'muted' }, t('jobs.posting.unset'))),
    el('dt', {}, t('jobs.posting.deadline')), el('dd', {}, job.deadline ? fmtDate(job.deadline) : el('span', { class: 'muted' }, t('jobs.posting.none'))),
    el('dt', {}, t('jobs.posting.source')), el('dd', {}, job.source || el('span', { class: 'muted' }, t('jobs.posting.sourceManual'))),
  ));

  if (job.keywords && job.keywords.length) {
    body.push(el('div', { class: 'mt-3' },
      el('div', { class: 'muted text-sm mb-2' }, t('jobs.posting.keywords')),
      Chips(job.keywords, { accent: true })));
  }

  if (job.requirements && job.requirements.length) {
    body.push(el('div', { class: 'mt-3' },
      el('div', { class: 'muted text-sm mb-2' }, t('jobs.posting.requirements')),
      el('ul', { class: 'stack-2', style: { margin: 0, paddingLeft: '18px' } },
        ...job.requirements.map((r) => el('li', {}, r)))));
  }

  if (job.description) {
    // 원문은 가장 길어 칼럼을 늘리는 주범 — 기본 접힘(아코디언)으로 둔다.
    body.push(el('details', { class: 'disclosure mt-3' },
      el('summary', { class: 'disclosure__summary' },
        icon('chevronRight', 'disclosure__chevron'),
        el('span', {}, t('jobs.posting.rawText'))),
      el('div', { class: 'doc-preview mt-2' }, job.description)));
  }

  return Card({ title: t('jobs.posting.title'), body });
}

function FitCard(fit) {
  if (!fit) {
    return Card({
      title: t('jobs.fit.title'),
      body: el('p', { class: 'muted', style: { margin: 0 } }, t('jobs.fit.emptyBody')),
    });
  }

  const body = [];

  body.push(el('div', { class: 'flex gap-4 center' },
    fit.score != null
      ? el('div', { class: `tnum ${scoreClass(fit.score)}`, style: { fontSize: '40px', fontWeight: '700', lineHeight: '1' } }, String(fit.score))
      : el('div', { class: 'muted', style: { fontSize: '28px' } }, '—'),
    el('div', { class: 'muted text-sm' }, fit.score != null ? t('jobs.fit.overall') : t('jobs.fit.notScored')),
  ));

  if (fit.summary) {
    body.push(el('p', { class: 'text-secondary', style: { lineHeight: '1.6' } }, fit.summary));
  }

  if (fit.strengths && fit.strengths.length) {
    body.push(el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, t('jobs.fit.strengths')),
      el('div', { class: 'stack-2' },
        ...fit.strengths.map((s) => el('div', { class: 'flex gap-2', style: { alignItems: 'flex-start' } },
          icon('check', 'score-strong'),
          el('span', { class: 'text-secondary' }, s))))));
  }

  if (fit.gaps && fit.gaps.length) {
    body.push(el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, t('jobs.fit.gaps')),
      el('ul', { class: 'stack-2', style: { margin: 0, paddingLeft: '18px' } },
        ...fit.gaps.map((g) => el('li', { class: 'text-secondary' }, g)))));
  }

  if (fit.matched_keywords && fit.matched_keywords.length) {
    body.push(el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, t('jobs.fit.matchedKeywords')),
      Chips(fit.matched_keywords, { accent: true })));
  }
  if (fit.missing_keywords && fit.missing_keywords.length) {
    body.push(el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, t('jobs.fit.missingKeywords')),
      Chips(fit.missing_keywords)));
  }

  if (fit.recommendations && fit.recommendations.length) {
    body.push(el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, t('jobs.fit.recommendations')),
      el('ul', { class: 'stack-2', style: { margin: 0, paddingLeft: '18px' } },
        ...fit.recommendations.map((r) => el('li', { class: 'text-secondary' }, r)))));
  }

  return Card({ title: t('jobs.fit.title'), body: el('div', { class: 'stack-3' }, ...body) });
}

function CoverLettersCard(coverLetters) {
  const list = coverLetters || [];
  if (!list.length) {
    return Card({
      title: t('jobs.cover.title'),
      body: el('p', { class: 'muted', style: { margin: 0, lineHeight: '1.6' } },
        t('jobs.cover.empty')),
    });
  }
  return Card({
    title: t('jobs.cover.title'),
    sub: t('jobs.cover.cardSub', { count: list.length }),
    body: el('div', { class: 'stack-2' },
      ...list.map((cl) => el('div', {
        class: 'flex between center is-clickable',
        style: { padding: '8px 0', cursor: 'pointer' },
        activate: () => navigate(`/documents/cover/${cl.id}`),
      },
        el('div', { class: 'flex gap-2 center' },
          icon('file', 'muted'),
          el('div', {},
            el('div', { class: 'strong' }, cl.title),
            el('div', { class: 'muted text-sm' }, t('jobs.cover.versions', { count: cl.version_count ?? 1 })))),
        icon('chevronRight', 'muted')))),
  });
}

function InterviewCard(job) {
  const interview = job.interview;
  if (interview) {
    const count = (interview.questions || []).length;
    return Card({
      title: t('jobs.interview.title'),
      actions: Btn(t('jobs.interview.viewPrep'), { sm: true, variant: 'ghost', onClick: () => navigate('/interview') }),
      body: el('div', { class: 'stack-2' },
        el('div', { class: 'flex gap-2 center' },
          icon('mic', 'muted'),
          el('span', { class: 'text-secondary' }, count ? t('jobs.interview.questions', { count }) : t('jobs.interview.saved'))),
        interview.self_introduction
          ? el('div', { class: 'muted text-sm' }, t('jobs.interview.introSaved'))
          : null),
    });
  }

  return Card({
    title: t('jobs.interview.title'),
    body: el('p', { class: 'muted', style: { margin: 0, lineHeight: '1.6' } },
      t('jobs.interview.empty')),
  });
}

async function openAppliedModal({ job, metaInfo, changeStatus }) {
  const [{ cover_letters: allCoverLetters }, { documents }] = await Promise.all([
    get('/api/cover-letters'),
    get('/api/documents'),
  ]);
  const jobCoverIds = new Set((job.cover_letters || []).map((cl) => cl.id));
  const today = new Date().toISOString().slice(0, 10);
  const submittedAt = Input({ type: 'date', value: job.application?.applied_at?.slice(0, 10) || today });
  const channel = Input({ placeholder: t('jobs.applied.channelPlaceholder') });
  const note = Textarea({ placeholder: t('jobs.applied.notePlaceholder'), style: { minHeight: '76px' } });
  const coverList = el('div', {});
  const docList = el('div', { class: 'pick-list' });
  const selectedDocIds = new Set(job.application?.resume_id ? [job.application.resume_id] : []);
  let showAllCovers = false;
  let selectedCoverId =
    job.application?.cover_letter_id ||
    (job.cover_letters || [])[0]?.id ||
    '';

  function pickRow({ input, title, sub }) {
    return el('label', { class: 'pick-row' },
      input,
      el('span', { class: 'pick-row__main' },
        el('span', { class: 'pick-row__title' }, title),
        sub ? el('span', { class: 'pick-row__sub' }, sub) : null));
  }

  function drawCoverList() {
    const scoped = (allCoverLetters || []).filter((cl) => jobCoverIds.has(cl.id));
    const list = showAllCovers ? (allCoverLetters || []) : scoped;
    const rows = [
      pickRow({
        input: el('input', {
          type: 'radio',
          name: 'submission-cover',
          checked: !selectedCoverId,
          onChange: () => { selectedCoverId = ''; drawCoverList(); },
        }),
        title: t('jobs.applied.coverNone'),
        sub: t('jobs.applied.coverNoneSub'),
      }),
      ...list.map((cl) => pickRow({
        input: el('input', {
          type: 'radio',
          name: 'submission-cover',
          checked: selectedCoverId === cl.id,
          onChange: () => { selectedCoverId = cl.id; drawCoverList(); },
        }),
        title: cl.title,
        sub: [
          t('jobs.applied.versions', { count: cl.version_count ?? 1 }),
          cl.job_id && cl.job_id !== job.id ? t('jobs.applied.otherJob') : null,
          cl.is_primary ? t('jobs.applied.primary') : null,
        ].filter(Boolean).join(' · '),
      })),
    ];
    if (!showAllCovers && !scoped.length) {
      rows.push(el('p', { class: 'muted text-sm', style: { margin: '2px 0 0' } }, t('jobs.applied.noCovers')));
    }
    mount(coverList, ...rows);
  }

  function drawDocuments() {
    const docs = documents || [];
    if (!docs.length) {
      mount(docList, el('p', { class: 'muted text-sm', style: { margin: 0 } }, t('jobs.applied.noDocs')));
      return;
    }
    mount(docList, ...docs.map((doc) => pickRow({
      input: el('input', {
        type: 'checkbox',
        checked: selectedDocIds.has(doc.id),
        onChange: (e) => {
          if (e.target.checked) selectedDocIds.add(doc.id);
          else selectedDocIds.delete(doc.id);
        },
      }),
      title: doc.title,
      sub: [
        t('kind.' + doc.kind),
        doc.is_primary ? t('jobs.applied.primary') : null,
      ].filter(Boolean).join(' · '),
    })));
  }

  const toggleCovers = Btn(t('jobs.applied.toggleOther'), {
    sm: true,
    variant: 'ghost',
    onClick: () => {
      showAllCovers = !showAllCovers;
      toggleCovers.querySelector('span').textContent = showAllCovers ? t('jobs.applied.toggleScoped') : t('jobs.applied.toggleOther');
      drawCoverList();
    },
  });

  drawCoverList();
  drawDocuments();

  openModal({
    title: t('jobs.applied.title'),
    size: 'lg',
    body: el('div', { class: 'stack-3' },
      el('div', { class: 'grid grid--2' },
        Field(t('jobs.applied.fieldSubmittedAt'), submittedAt),
        Field(t('jobs.applied.fieldChannel'), channel)),
      Field(el('div', { class: 'flex between center' }, el('span', {}, t('jobs.applied.fieldCover')), toggleCovers), coverList),
      Field(t('jobs.applied.fieldDocs'), docList),
      Field(t('jobs.applied.fieldNote'), note),
    ),
    footer: (close) => [
      Btn(t('jobs.applied.cancel'), { onClick: close }),
      SubmitBtn(t('jobs.applied.statusOnly'), async () => {
        await changeStatus('applied');
        close();
      }, { variant: 'ghost' }),
      SubmitBtn(t('jobs.applied.recordAndDone'), async () => {
        const submission = {
          submitted_at: submittedAt.value || undefined,
          channel: channel.value.trim() || undefined,
          cover_letter_id: selectedCoverId || undefined,
          document_ids: [...selectedDocIds],
        };
        await changeStatus('applied', {
          note: note.value.trim() || undefined,
          submission,
        });
        close();
      }),
    ],
  });
}

function TimelineCard(timeline) {
  const list = timeline || [];
  if (!list.length) return null;
  return Card({
    title: t('jobs.timeline.title'),
    sub: t('jobs.timeline.cardSub', { count: list.length }),
    body: el('div', { class: 'timeline timeline--job' },
      ...list.map((event, idx) => TimelineItem(event, idx === list.length - 1))),
  });
}

// Timeline title is enum-derivable from event.type, so render it client-side
// (like status badges) instead of the server-provided event.title — keeps the
// timeline localized in both the real app and the demo. Unknown types fall back
// to the server title.
function timelineTitle(event) {
  if (event.type === 'application_status_changed') {
    const st = event.payload?.status;
    return st ? t('status.' + st) : event.title;
  }
  const key = 'jobs.timeline.type.' + event.type;
  const label = t(key);
  return label === key ? event.title : label;
}
// Summaries are mostly free-form user data (company·position, cover-letter title,
// notes) → keep as-is; only the count/score ones are derivable from the payload.
function timelineSummary(event) {
  const p = event.payload || {};
  if (event.type === 'fit_analysis_saved' && p.score != null) return t('jobs.timeline.fitScore', { score: p.score });
  if (event.type === 'interview_prep_saved' && typeof p.question_count === 'number' && p.question_count > 0)
    return t('jobs.timeline.questionCount', { count: p.question_count });
  return event.summary;
}
function TimelineItem(event, isCurrent) {
  const summary = timelineSummary(event);
  return el('div', { class: `tl-item${isCurrent ? ' is-current' : ''}` },
    el('div', { class: 'tl-item__rail' },
      el('div', { class: 'tl-item__dot' }),
      el('div', { class: 'tl-item__line' })),
    el('div', { class: 'tl-item__body timeline-event' },
      el('div', { class: 'timeline-event__head' },
        el('div', { class: 'timeline-event__title' }, timelineTitle(event)),
        el('time', { class: 'muted text-sm', attrs: { datetime: event.occurred_at || '' } }, fmtDate(event.occurred_at))),
      summary ? el('div', { class: 'timeline-event__summary' }, summary) : null,
      TimelinePayload(event)));
}

function TimelinePayload(event) {
  const payload = event.payload || {};
  const rows = [];
  if (payload.cover_letter) rows.push(TimelineRef(t('jobs.timeline.coverLetter'), payload.cover_letter));
  if (payload.submission) {
    const s = payload.submission;
    const submittedMeta = [s.submitted_at ? fmtDate(s.submitted_at) : null, s.channel].filter(Boolean).join(' · ');
    if (submittedMeta) rows.push(el('div', { class: 'timeline-event__meta' }, submittedMeta));
    if (s.cover_letter) rows.push(TimelineRef(t('jobs.timeline.coverLetter'), s.cover_letter));
    if (Array.isArray(s.documents) && s.documents.length) {
      rows.push(el('div', { class: 'timeline-docs' },
        ...s.documents.map((doc) => TimelineRef(t('kind.' + (doc.document_kind || 'other')), doc))));
    }
  }
  if (!rows.length) return null;
  return el('div', { class: 'timeline-event__extra' }, ...rows);
}

function TimelineRef(label, ref) {
  const version = ref.version_no ? ` v${ref.version_no}` : '';
  const title = `${ref.title || t('jobs.timeline.deletedDoc')}${version}`;
  if (ref.exists && ref.route) {
    return el('div', { class: 'timeline-ref' },
      el('span', { class: 'timeline-ref__label' }, label),
      el('button', { class: 'timeline-ref__link', onClick: () => navigate(ref.route) }, title));
  }
  return el('div', { class: 'timeline-ref timeline-ref--missing' },
    el('span', { class: 'timeline-ref__label' }, label),
    el('span', { class: 'timeline-ref__missing' }, title),
    el('span', { class: 'timeline-ref__deleted' }, t('jobs.timeline.deleted')));
}

function RelatedCard(related) {
  const list = related || [];
  if (!list.length) return null;
  return Card({
    title: t('jobs.related.title'),
    sub: t('jobs.related.sub'),
    body: el('div', { class: 'stack-2' },
      ...list.map((r) => el('div', {
        class: 'flex between center is-clickable',
        style: { padding: '8px 0', cursor: 'pointer' },
        activate: () => navigate(`/jobs/${r.id}`),
      },
        el('div', {},
          el('div', { class: 'strong' }, r.position),
          el('div', { class: 'muted text-sm' }, [r.company, r.deadline ? t('jobs.related.deadline', { date: fmtDate(r.deadline) }) : null].filter(Boolean).join(' · '))),
        Badge(r.status, t('status.' + r.status))))),
  });
}

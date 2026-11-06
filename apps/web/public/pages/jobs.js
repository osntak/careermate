// Jobs — list of saved postings (#/jobs) and the rich per-job detail (#/jobs/:id).
// Detail is the densest screen in the app: posting info, fit analysis, linked
// cover letters, interview prep, and related history, all driven by the AI's
// saved data with manual fallbacks throughout.
import {
  el, get, post, put, del, icon, navigate, Card, Badge, Btn, IconBtn, SubmitBtn,
  EmptyState, Chips, Field, Input, Textarea, Select, ViewSwitch,
  openModal, closeModal, confirmDialog, toastOk, toastError,
  fmtDate, scoreClass, mount, meta, linesToArray, csvToArray, daysUntil, scheduleDdayBadge,
} from '/lib.js';
import { t } from '/i18n.js';
import { openDocument, createDocument } from '/pages/documents.js';

export async function render(ctx) {
  if (ctx.params[0]) return renderDetail(ctx, ctx.params[0]);
  return renderList(ctx);
}

/* =============================================================== List mode */

// 지원 관리 has two views of the same postings; both list pages start with this switch.
export function applicationsViewSwitch(activeHref) {
  return ViewSwitch([
    { href: '#/jobs', label: t('jobs.view.list') },
    { href: '#/applications', label: t('jobs.view.byStage') },
  ], activeHref);
}

async function renderList(ctx) {
  const { jobs } = await get('/api/jobs');
  const wrap = el('div', { class: 'stack-4' }, applicationsViewSwitch('#/jobs'));

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
          : el('span', { class: 'muted' }, '-')),
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

export function openJobModal(ctx) {
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
  // 수정은 상단바(ctx.setActions)에만 둔다 — 여기엔 상태 변경·원문만.
  // 삭제는 위험 액션이라 페이지 최하단 '위험 구역'으로 강등한다(아래 DangerZone).
  const headActions = el('div', { class: 'flex gap-2 center wrap' },
    statusSelect,
    job.url ? el('a', { class: 'btn btn--ghost btn--sm', href: job.url, attrs: { target: '_blank', rel: 'noopener noreferrer' } }, icon('external'), el('span', {}, t('jobs.detail.openPosting'))) : null,
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
      DocumentsCard(job, remount),
      InterviewCard(job)),
    PostingCard(job),
    CompanyResearchCard(job),
    FitCard(job.fit),
    TimelineCard(job.timeline),
    RelatedCard(job.related),
    DangerZone(delBtn),
  );
  mount(ctx.view, wrap);
}

// Delete is destructive, so it sits at the very bottom in a quiet 위험 구역 row
// (not a card, per the design guide) instead of competing in the top-right header.
function DangerZone(delBtn) {
  return el('div', { class: 'stack-2', style: { marginTop: '8px' } },
    el('div', { class: 'divider' }),
    el('div', { class: 'flex between center wrap gap-3' },
      el('div', { style: { maxWidth: '440px' } },
        el('div', { class: 'strong text-sm' }, t('jobs.detail.dangerZone')),
        el('div', { class: 'muted text-sm', style: { lineHeight: '1.6' } }, t('jobs.detail.dangerZoneHint'))),
      delBtn));
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

  if (job.questions && job.questions.length) {
    // 한국 문항형 자소서: 회사 지정 문항·글자수 한도. AI가 문항별 답변을 쓰고 한도를
    // 점검할 원본이자, 사용자가 대시보드에서 요구 문항을 그대로 볼 수 있게 한다.
    body.push(el('div', { class: 'mt-3' },
      el('div', { class: 'muted text-sm mb-2' }, t('jobs.questions.title')),
      el('ol', { class: 'stack-2', style: { margin: 0, paddingLeft: '18px' } },
        ...job.questions.map((q) => {
          const label = questionLimitLabel(q);
          return el('li', {},
            el('span', {}, q.question),
            label ? el('span', { class: 'muted text-sm', style: { marginLeft: '8px' } }, label) : null);
        }))));
  }

  if (job.schedule && job.schedule.length) {
    // 전형 일정: 면접·인적성·발표 등 단계별 날짜. 날짜순으로 D-day 라벨과 함께 보여주고,
    // 이미 지난 일정은 흐리게 처리한다(v9 문항 블록과 같은 위치·스타일 패턴).
    const sorted = job.schedule.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.time || '99:99').localeCompare(b.time || '99:99');
    });
    body.push(el('div', { class: 'mt-3' },
      el('div', { class: 'muted text-sm mb-2' }, t('jobs.schedule.title')),
      el('ul', { class: 'stack-2', style: { margin: 0, padding: 0, listStyle: 'none' } },
        ...sorted.map((s) => {
          const dDay = daysUntil(s.date);
          const when = s.time ? `${fmtDate(s.date)} ${s.time}` : fmtDate(s.date);
          return el('li', { class: `flex gap-2 center${dDay != null && dDay < 0 ? ' muted' : ''}` },
            scheduleDdayBadge(dDay),
            el('span', { class: 'strong' }, s.label),
            el('span', { class: 'text-sm' }, when),
            s.note ? el('span', { class: 'muted text-sm' }, s.note) : null);
        }))));
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

// 문항 글자수 한도 라벨(예: "최대 700자(공백포함)"). 한도가 없으면 null.
// count_mode: with_space=공백포함 · no_space=공백제외 · byte=UTF-8 바이트(공백 구분 없음).
function questionLimitLabel(q) {
  const hasMin = typeof q.min_chars === 'number';
  const hasMax = typeof q.max_chars === 'number';
  if (!hasMin && !hasMax) return null;
  const unit = q.count_mode === 'byte' ? t('jobs.questions.unitByte') : t('jobs.questions.unitChar');
  const suffix = q.count_mode === 'no_space' ? t('jobs.questions.modeNoSpace')
    : q.count_mode === 'with_space' ? t('jobs.questions.modeWithSpace')
    : '';
  const parts = [];
  if (hasMin) parts.push(t('jobs.questions.min', { n: q.min_chars, unit }));
  if (hasMax) parts.push(t('jobs.questions.max', { n: q.max_chars, unit }));
  return `${parts.join(' · ')}${suffix}`;
}

// Company research the AI saved (overview·인재상·핵심가치·평판) — rendered so the
// user can actually SEE it in the dashboard, not just have the AI use it.
function CompanyResearchCard(job) {
  const hasValues = job.core_values && job.core_values.length;
  if (!job.company_overview && !job.talent_profile && !hasValues && !job.reputation) return null;
  const field = (labelKey, value) => el('div', { class: 'mt-3' },
    el('div', { class: 'muted text-sm mb-2' }, t(labelKey)),
    el('p', { style: { margin: 0, whiteSpace: 'pre-wrap' } }, value));
  const body = [];
  if (job.company_overview) body.push(field('jobs.company.overview', job.company_overview));
  if (job.talent_profile) body.push(field('jobs.company.talent', job.talent_profile));
  if (hasValues) body.push(el('div', { class: 'mt-3' },
    el('div', { class: 'muted text-sm mb-2' }, t('jobs.company.values')),
    Chips(job.core_values, { accent: true })));
  if (job.reputation) body.push(field('jobs.company.reputation', job.reputation));
  return Card({ title: t('jobs.company.title'), body });
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
      : el('div', { class: 'muted', style: { fontSize: '28px' } }, '-'),
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

// Everything this posting would go out with, in one list: its cover letters, documents linked
// to it, then the general main resume/career description/portfolio for kinds with nothing
// linked. What was recorded as sent at 지원 완료 is tagged (and added if not in the list yet).
// A row opens the same detail dialog 서류함 uses, in place.
function DocumentsCard(job, remount) {
  const s = [...(job.timeline || [])].reverse().find((e) => e.payload?.submission)?.payload.submission;
  const sentIds = new Set([s?.cover_letter?.id, ...(s?.documents || []).map((d) => d.id)].filter(Boolean));
  const opener = (kind, id) => () => openDocument(kind, id, remount);
  const rows = [
    ...(job.cover_letters || []).map((cl) => ({
      id: cl.id, kind: t('jobs.timeline.coverLetter'), title: cl.title, open: opener('cover', cl.id),
      meta: [t('jobs.cover.versions', { count: cl.version_count ?? 1 }), cl.updated_at && fmtDate(cl.updated_at)],
      unlink: async () => {
        try { await del(`/api/cover-letters/${cl.id}/job`); remount(); } catch (err) { toastError(err); }
      },
    })),
    ...(job.documents || []).map((d) => ({
      id: d.id, kind: t('kind.' + d.kind), title: d.title, open: opener(d.kind, d.id), meta: [d.updated_at && fmtDate(d.updated_at)],
      unlink: async () => {
        try { await del(`/api/jobs/${job.id}/documents/${d.id}`); remount(); } catch (err) { toastError(err); }
      },
    })),
    ...(job.general_documents || []).map((d) => ({
      id: d.id, kind: t('kind.' + d.kind), title: d.title, open: opener(d.kind, d.id), meta: [d.updated_at && fmtDate(d.updated_at)], general: true,
    })),
  ];
  const seen = new Set(rows.map((r) => r.id));
  for (const ref of [s?.cover_letter, ...(s?.documents || [])].filter((r) => r && !seen.has(r.id))) {
    const isCover = ref === s.cover_letter;
    rows.push({
      id: ref.id, kind: isCover ? t('jobs.timeline.coverLetter') : t('kind.' + (ref.document_kind || 'other')),
      title: ref.title, open: ref.exists ? opener(isCover ? 'cover' : ref.document_kind, ref.id) : null,
      meta: [ref.exists ? null : t('jobs.timeline.deleted')],
    });
  }
  const when = s ? [s.submitted_at ? fmtDate(s.submitted_at) : null, s.channel].filter(Boolean).join(' · ') : '';
  return Card({
    title: t('jobs.docs.title'),
    sub: sentIds.size ? [t('jobs.docs.sent'), when].filter(Boolean).join(' · ') : null,
    actions: Btn(t('jobs.docs.add'), { sm: true, variant: 'ghost', icon: 'plus', onClick: () => openAddDocument(job, remount) }),
    body: rows.length
      ? el('div', { class: 'job-docs' }, ...rows.map((r) => DocRow(r, sentIds.has(r.id))))
      : el('p', { class: 'muted', style: { margin: 0, lineHeight: '1.6' } }, t('jobs.docs.empty')),
  });
}

function DocRow(r, sent) {
  return el('div', { class: `job-doc${r.open ? ' is-clickable' : ''}`, activate: r.open || null },
    el('div', { class: 'job-doc__main' },
      el('div', { class: 'strong truncate' }, r.title),
      el('div', { class: 'muted text-sm truncate' }, [r.kind, ...r.meta].filter(Boolean).join(' · '))),
    sent ? el('span', { class: 'chip chip--accent' }, t('jobs.docs.sentTag')) : null,
    r.general ? el('span', { class: 'chip', title: t('jobs.docs.generalHint') }, t('jobs.docs.generalTag')) : null,
    r.unlink ? el('button', {
      class: 'job-doc__remove', type: 'button', title: t('jobs.docs.unlink'), attrs: { 'aria-label': t('jobs.docs.unlink') },
      onClick: (e) => { e.stopPropagation(); r.unlink(); },
      onKeydown: (e) => e.stopPropagation(),
    }, icon('x')) : null);
}

// Add documents from 서류함: the same tabs plus 전체, search behind the magnifier, several at
// once. Already-added ones stay visible but locked. A cover letter written for another posting
// is shown locked too: attaching it here would take it away from that posting.
const ADD_TABS = ['all', 'cover', 'resume', 'career_description', 'portfolio', 'other'];

async function openAddDocument(job, remount, startTab = 'all') {
  let docs, covers, jobs;
  try {
    [{ documents: docs }, { cover_letters: covers }, { jobs }] = await Promise.all([
      get('/api/documents'), get('/api/cover-letters'), get('/api/jobs'),
    ]);
  } catch (err) { toastError(err); return; }
  const jobName = new Map(jobs.map((j) => [j.id, `${j.company} · ${j.position}`]));
  const linkedDocs = new Set((job.documents || []).map((d) => d.id));
  const items = [
    ...covers.map((cl) => ({
      id: cl.id, kind: 'cover', title: cl.title, updated_at: cl.updated_at, primary: cl.is_primary,
      added: cl.job_id === job.id,
      locked: cl.job_id && cl.job_id !== job.id ? t('jobs.docs.otherJob', { job: jobName.get(cl.job_id) || '' }) : null,
    })),
    ...docs.map((d) => ({
      id: d.id, kind: d.kind, title: d.title, updated_at: d.updated_at, primary: d.is_primary,
      added: linkedDocs.has(d.id),
      note: d.jobs?.length ? t('jobs.docs.usedIn', { count: d.jobs.length }) : null,
    })),
  ];
  const kindLabel = (k) => (k === 'cover' ? t('jobs.timeline.coverLetter') : t('kind.' + k));
  const picked = new Set();
  let tab = startTab;
  let query = '';

  const list = el('div', { class: 'add-doc__list' });
  const tabs = el('div', { class: 'tabs add-doc__tabs' });
  const search = el('input', {
    class: 'input add-doc__search', type: 'search', placeholder: t('jobs.docs.searchPlaceholder'), hidden: true,
    onInput: (e) => { query = e.target.value.trim().toLowerCase(); draw(); },
  });
  const searchBtn = IconBtn('search', {
    title: t('jobs.docs.search'),
    onClick: () => { search.hidden = !search.hidden; if (search.hidden) { search.value = ''; query = ''; draw(); } else search.focus(); },
  });
  const addBtn = el('button', { class: 'btn btn--primary', type: 'button', disabled: true, onClick: submit });

  function draw() {
    tabs.replaceChildren(...ADD_TABS.map((k) => el('button', {
      type: 'button', class: `tab${k === tab ? ' is-active' : ''}`, onClick: () => { tab = k; draw(); },
    }, k === 'all' ? t('jobs.docs.tabAll') : kindLabel(k))));
    // Pickable first; already added or locked ones sink to the bottom.
    const shown = items
      .filter((it) => (tab === 'all' || it.kind === tab) && (!query || it.title.toLowerCase().includes(query)))
      .sort((a, b) => Number(a.added || !!a.locked) - Number(b.added || !!b.locked));
    if (!shown.length) {
      const kind = tab === 'all' ? 'resume' : tab;
      list.replaceChildren(query
        ? el('p', { class: 'muted', style: { margin: '16px 0', textAlign: 'center' } }, t('jobs.docs.noMatch'))
        : EmptyState({
          iconName: 'file',
          title: tab === 'all' ? t('jobs.docs.emptyAll') : t('jobs.docs.emptyKind', { kind: kindLabel(tab) }),
          action: Btn(t('jobs.docs.createKind', { kind: kindLabel(kind) }), {
            icon: 'plus', variant: 'primary', onClick: () => createDocument(kind, () => openAddDocument(job, remount, tab)),
          }),
        }));
    } else {
      list.replaceChildren(...shown.map((it) => {
        const disabled = it.added || !!it.locked;
        const on = picked.has(it.id);
        return el('button', {
          type: 'button', disabled,
          class: `add-doc__row${on ? ' is-selected' : ''}`, attrs: { 'aria-pressed': String(on) },
          onClick: (e) => {
            const now = !picked.has(it.id);
            now ? picked.add(it.id) : picked.delete(it.id);
            e.currentTarget.classList.toggle('is-selected', now);
            e.currentTarget.setAttribute('aria-pressed', String(now));
            syncAdd();
          },
        },
          el('div', { style: { minWidth: 0, flex: 1 } },
            el('div', { class: 'strong truncate' }, it.title),
            el('div', { class: 'muted text-sm truncate' },
              [kindLabel(it.kind), it.primary ? t('documents.cover.primary') : null, it.locked || it.note, fmtDate(it.updated_at)]
                .filter(Boolean).join(' · '))),
          it.added ? el('span', { class: 'chip' }, t('jobs.docs.added'))
            : el('span', { class: 'add-doc__mark' }, icon('check')));
      }));
    }
  }
  function syncAdd() {
    addBtn.disabled = !picked.size;
    addBtn.textContent = picked.size ? t('jobs.docs.addCount', { count: picked.size }) : t('jobs.docs.add');
  }
  async function submit() {
    addBtn.disabled = true;
    try {
      for (const it of items.filter((x) => picked.has(x.id))) {
        if (it.kind === 'cover') await put(`/api/cover-letters/${it.id}/job`, { job_id: job.id });
        else await post(`/api/jobs/${job.id}/documents`, { document_id: it.id });
      }
      closeModal();
      remount();
    } catch (err) { toastError(err); syncAdd(); }
  }

  draw();
  syncAdd();
  openModal({
    title: t('jobs.docs.addTitle'),
    body: el('div', { class: 'stack-2' },
      el('div', { class: 'add-doc__bar' }, tabs, searchBtn),
      search,
      list),
    footer: (close) => [Btn(t('common.cancel'), { variant: 'ghost', onClick: close }), addBtn],
  });
}

function InterviewCard(job) {
  const interview = job.interview;
  if (interview) {
    const count = (interview.questions || []).length;
    return Card({
      title: t('jobs.interview.title'),
      actions: Btn(t('jobs.interview.viewPrep'), { sm: true, variant: 'ghost', onClick: () => navigate(`/interview/${job.id}`) }),
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

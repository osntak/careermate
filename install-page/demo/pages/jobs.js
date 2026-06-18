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
      title: '저장된 공고가 없어요',
      body: '관심 있는 채용공고를 추가해 적합도와 진행 상태를 관리해 보세요.',
      action: Btn('공고 추가', { icon: 'plus', variant: 'primary', onClick: () => openJobModal(ctx) }),
    }));
    mount(ctx.view, wrap);
    return;
  }

  const addBtn = Btn('공고 추가', { icon: 'plus', variant: 'primary', sm: true, onClick: () => openJobModal(ctx) });
  const search = Input({ type: 'search', placeholder: '회사·직무 검색', attrs: { 'aria-label': '공고 검색' } });
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
        el('div', {}, j.location || el('span', { class: 'muted' }, '위치 미정')),
        el('div', { class: 'muted text-sm' }, j.deadline ? `마감 ${fmtDate(j.deadline)}` : '마감일 없음')),
      el('td', { style: { textAlign: 'right' } },
        j.fit_score != null
          ? el('span', { class: `strong tnum ${scoreClass(j.fit_score)}` }, `${j.fit_score}점`)
          : el('span', { class: 'muted' }, '—')),
      el('td', {}, Badge(j.status, j.status_label))),
    text: `${j.company} ${j.position} ${j.location || ''} ${(j.keywords || []).join(' ')}`.toLowerCase(),
  }));

  const tbody = el('tbody', {}, ...rowData.map((r) => r.tr));
  const noResult = el('tr', { class: 'hide' },
    el('td', { attrs: { colspan: '4' }, class: 'muted', style: { textAlign: 'center', padding: '24px 16px' } }, '검색 결과가 없어요.'));
  tbody.append(noResult);

  wrap.append(Card({
    title: '저장된 공고',
    sub: `${jobs.length}개`,
    body: el('div', { class: 'table-scroll' }, el('table', { class: 'table table--jobs' },
      el('thead', {}, el('tr', {},
        el('th', {}, '회사 · 직무'),
        el('th', {}, '위치 · 마감일'),
        el('th', { style: { textAlign: 'right' } }, '적합도'),
        el('th', {}, '상태'))),
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
  const company = Input({ value: v.company || '', placeholder: '회사명', attrs: { required: 'required' } });
  const position = Input({ value: v.position || '', placeholder: '직무 / 포지션명', attrs: { required: 'required' } });
  const url = Input({ value: v.url || '', placeholder: 'https://…', type: 'url' });
  const location = Input({ value: v.location || '', placeholder: '서울 / 재택 등' });
  const employment = Input({ value: v.employment_type || '', placeholder: '정규직 / 계약직 / 인턴 등' });
  const deadline = Input({ value: v.deadline || '', placeholder: 'YYYY-MM-DD' });
  const source = Input({ value: v.source || '', placeholder: '사람인 / 원티드 / 직접 입력 등' });
  const description = Textarea({
    value: v.description || '', placeholder: '공고 원문 또는 정리된 내용을 붙여넣으세요.',
    style: { minHeight: '160px' },
  });
  const keywords = Input({ value: (v.keywords || []).join(', '), placeholder: '핵심 키워드 (쉼표로 구분)' });
  const requirements = Textarea({
    value: (v.requirements || []).join('\n'), placeholder: '자격요건/우대사항을 한 줄에 하나씩',
    style: { minHeight: '90px' },
  });

  // "붙여넣은 텍스트 정리" — server-side clean + best-effort field extraction.
  // Deterministic text parsing — NOT AI (CareerMate has no LLM). Use a neutral icon and
  // show "정리 중…" so a slow parse of a long posting doesn't look frozen.
  const tidyBtn = Btn('붙여넣은 텍스트 정리', {
    icon: 'edit', sm: true, variant: 'ghost',
    onClick: async () => {
      const raw = description.value.trim();
      if (!raw) { toastError('먼저 공고 원문을 붙여넣어 주세요.'); return; }
      const labelEl = tidyBtn.querySelector('span');
      const origLabel = labelEl ? labelEl.textContent : '';
      tidyBtn.disabled = true;
      if (labelEl) labelEl.textContent = '정리 중…';
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
        toastOk('붙여넣은 텍스트를 정리하고 일부 항목을 채웠어요.');
      } catch (e) { toastError(e); }
      finally { tidyBtn.disabled = false; if (labelEl) labelEl.textContent = origLabel; }
    },
  });

  const form = el('form', { class: 'stack-3' },
    el('div', { class: 'grid grid--2' },
      Field('회사 *', company),
      Field('직무 *', position)),
    Field('공고 URL', url),
    el('div', { class: 'grid grid--3' },
      Field('위치', location),
      Field('고용형태', employment),
      Field('마감일', deadline, 'YYYY-MM-DD')),
    Field('출처', source),
    Field(
      el('div', { class: 'flex between center' }, el('span', {}, '공고 원문'), tidyBtn),
      description,
      '원문을 붙여넣고 "정리"를 누르면 회사·직무·키워드·마감일을 자동으로 채워봅니다.'),
    Field('핵심 키워드', keywords, '쉼표로 구분'),
    Field('자격요건 · 우대사항', requirements, '한 줄에 하나씩'),
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
    if (!body.company || !body.position) throw new Error('회사와 직무는 필수입니다.');
    const res = job
      ? await put(`/api/jobs/${job.id}`, body)
      : await post('/api/jobs', body);
    toastOk(job ? '공고를 수정했어요.' : '공고를 저장했어요.');
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
  const saveBtn = SubmitBtn('공고 저장', built.submit);
  built.bindSubmit(saveBtn);
  openModal({
    title: '공고 추가',
    size: 'lg',
    body: built.form,
    footer: (close) => [
      Btn('취소', { onClick: close }),
      saveBtn,
    ],
  });
}

function openEditModal(ctx, job, remount) {
  const built = jobForm(ctx, {
    job,
    onSaved: async () => { await ctx.refreshNav(); await remount(); },
  });
  const saveBtn = SubmitBtn('공고 저장', built.submit);
  built.bindSubmit(saveBtn);
  openModal({
    title: '공고 수정',
    size: 'lg',
    body: built.form,
    footer: (close) => [
      Btn('취소', { onClick: close }),
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
    ctx.setTitle('공고를 찾을 수 없음');
    const notFound = el('div', { class: 'stack-4' },
      EmptyState({
        iconName: 'briefcase',
        title: '공고를 찾을 수 없어요',
        body: err instanceof Error ? err.message : '요청한 공고가 삭제되었거나 존재하지 않습니다.',
        action: Btn('공고 목록으로', { icon: 'chevronRight', variant: 'primary', onClick: () => navigate('/jobs') }),
      }));
    mount(ctx.view, notFound);
    ctx.setActions(null);
    return;
  }

  const remount = () => renderDetail(ctx, jobId);
  const m = await meta();

  ctx.setTitle(`${job.company} · ${job.position}`);

  // --- Header actions (also mirrored into the topbar) -----------------------
  const statusSelect = Select(
    m.statuses.map((s) => ({ value: s.value, label: s.label, selected: s.value === job.status })),
    {
      onChange: async (e) => {
        const status = e.target.value;
        if (status === job.status) return;
        try {
          const res = await put(`/api/applications/${jobId}/status`, { status });
          toastOk('상태를 변경했어요.');
          if (res && res.hint) toastOk(res.hint);
          await ctx.refreshNav();
          await remount();
        } catch (err) { toastError(err); e.target.value = job.status; }
      },
    },
  );
  statusSelect.classList.add('select--sm');

  const editBtn = Btn('수정', { icon: 'edit', sm: true, variant: 'ghost', onClick: () => openEditModal(ctx, job, remount) });
  const delBtn = Btn('삭제', {
    icon: 'trash', sm: true, variant: 'danger',
    onClick: async () => {
      const ok = await confirmDialog({
        title: '공고 삭제',
        message: `'${job.company} · ${job.position}' 공고를 삭제할까요? 연결된 지원 기록도 함께 사라집니다.`,
        confirmLabel: '삭제', danger: true,
      });
      if (!ok) return;
      try {
        await del(`/api/jobs/${jobId}`);
        toastOk('공고를 삭제했어요.');
        await ctx.refreshNav();
        navigate('/jobs');
      } catch (err) { toastError(err); }
    },
  });

  ctx.setActions([
    Btn('목록', { icon: 'chevronRight', sm: true, variant: 'ghost', onClick: () => navigate('/jobs') }),
    editBtn,
  ]);

  // --- Page head ------------------------------------------------------------
  // 수정은 상단바(ctx.setActions)에만 둔다 — 여기엔 상태 변경·원문·삭제만.
  const headActions = el('div', { class: 'flex gap-2 center wrap' },
    Field('상태', statusSelect),
    job.url ? el('a', { class: 'btn btn--ghost btn--sm', href: job.url, attrs: { target: '_blank', rel: 'noopener noreferrer' } }, icon('external'), el('span', {}, '공고 원문 열기')) : null,
    delBtn,
  );

  const head = el('div', { class: 'page-head' },
    el('div', { class: 'page-head__text' },
      el('div', { class: 'flex gap-3 center wrap' },
        el('h1', {}, job.company),
        Badge(job.status, job.status_label)),
      el('p', {}, job.position)),
    el('div', { class: 'page-head__actions' }, headActions),
  );

  // --- Layout: two columns (info+fit left, side cards right) ----------------
  const left = el('div', { class: 'stack-4' },
    PostingCard(job),
    FitCard(job.fit),
  );
  const right = el('div', { class: 'stack-4' },
    CoverLettersCard(job.cover_letters),
    InterviewCard(job),
    RelatedCard(job.related),
  );

  const wrap = el('div', { class: 'stack-4' },
    head,
    el('div', { class: 'grid grid--2' }, left, right),
  );
  mount(ctx.view, wrap);
}

/* ----------------------------------------------------------- detail cards */

function PostingCard(job) {
  const body = [];

  body.push(el('dl', { class: 'kv' },
    el('dt', {}, '위치'), el('dd', {}, job.location || el('span', { class: 'muted' }, '미정')),
    el('dt', {}, '고용형태'), el('dd', {}, job.employment_type || el('span', { class: 'muted' }, '미정')),
    el('dt', {}, '마감일'), el('dd', {}, job.deadline ? fmtDate(job.deadline) : el('span', { class: 'muted' }, '없음')),
    el('dt', {}, '출처'), el('dd', {}, job.source || el('span', { class: 'muted' }, '직접 입력')),
  ));

  if (job.keywords && job.keywords.length) {
    body.push(el('div', { class: 'mt-3' },
      el('div', { class: 'muted text-sm mb-2' }, '핵심 키워드'),
      Chips(job.keywords, { accent: true })));
  }

  if (job.requirements && job.requirements.length) {
    body.push(el('div', { class: 'mt-3' },
      el('div', { class: 'muted text-sm mb-2' }, '자격요건 · 우대사항'),
      el('ul', { class: 'stack-2', style: { margin: 0, paddingLeft: '18px' } },
        ...job.requirements.map((r) => el('li', {}, r)))));
  }

  if (job.description) {
    body.push(el('div', { class: 'mt-3' },
      el('div', { class: 'muted text-sm mb-2' }, '공고 원문'),
      el('div', { class: 'doc-preview' }, job.description)));
  }

  return Card({ title: '공고 정보', body });
}

function FitCard(fit) {
  if (!fit) {
    return Card({
      title: '적합도 분석',
      body: EmptyState({
        iconName: 'target',
        title: '적합도 분석 전이에요',
        body: '이 공고와 내 프로필을 비교한 분석 결과가 여기에 표시됩니다.',
      }),
    });
  }

  const body = [];

  body.push(el('div', { class: 'flex gap-4 center' },
    fit.score != null
      ? el('div', { class: `tnum ${scoreClass(fit.score)}`, style: { fontSize: '40px', fontWeight: '700', lineHeight: '1' } }, String(fit.score))
      : el('div', { class: 'muted', style: { fontSize: '28px' } }, '—'),
    el('div', { class: 'muted text-sm' }, fit.score != null ? '종합 적합도 (100점 만점)' : '점수 미산정'),
  ));

  if (fit.summary) {
    body.push(el('p', { class: 'text-secondary', style: { lineHeight: '1.6' } }, fit.summary));
  }

  if (fit.strengths && fit.strengths.length) {
    body.push(el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, '강점'),
      el('div', { class: 'stack-2' },
        ...fit.strengths.map((s) => el('div', { class: 'flex gap-2', style: { alignItems: 'flex-start' } },
          icon('check', 'score-strong'),
          el('span', { class: 'text-secondary' }, s))))));
  }

  if (fit.gaps && fit.gaps.length) {
    body.push(el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, '보완할 부분'),
      el('ul', { class: 'stack-2', style: { margin: 0, paddingLeft: '18px' } },
        ...fit.gaps.map((g) => el('li', { class: 'text-secondary' }, g)))));
  }

  if (fit.matched_keywords && fit.matched_keywords.length) {
    body.push(el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, '일치하는 키워드'),
      Chips(fit.matched_keywords, { accent: true })));
  }
  if (fit.missing_keywords && fit.missing_keywords.length) {
    body.push(el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, '부족한 키워드'),
      Chips(fit.missing_keywords)));
  }

  if (fit.recommendations && fit.recommendations.length) {
    body.push(el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, '추천 전략'),
      el('ul', { class: 'stack-2', style: { margin: 0, paddingLeft: '18px' } },
        ...fit.recommendations.map((r) => el('li', { class: 'text-secondary' }, r)))));
  }

  return Card({ title: '적합도 분석', body: el('div', { class: 'stack-3' }, ...body) });
}

function CoverLettersCard(coverLetters) {
  const list = coverLetters || [];
  if (!list.length) {
    return Card({
      title: '연결된 자기소개서',
      body: el('p', { class: 'muted', style: { margin: 0, lineHeight: '1.6' } },
        '아직 연결된 자기소개서가 없어요. 문서 탭에서 작성하거나 붙여넣어 보관하세요.'),
    });
  }
  return Card({
    title: '연결된 자기소개서',
    sub: `${list.length}개`,
    body: el('div', { class: 'stack-2' },
      ...list.map((cl) => el('div', {
        class: 'flex between center is-clickable',
        style: { padding: '8px 0', cursor: 'pointer' },
        activate: () => navigate('/documents'),
      },
        el('div', { class: 'flex gap-2 center' },
          icon('file', 'muted'),
          el('div', {},
            el('div', { class: 'strong' }, cl.title),
            el('div', { class: 'muted text-sm' }, `버전 ${cl.version_count ?? 1}개`))),
        icon('chevronRight', 'muted')))),
  });
}

function InterviewCard(job) {
  const interview = job.interview;
  if (interview) {
    const count = (interview.questions || []).length;
    return Card({
      title: '면접 준비',
      actions: Btn('면접 준비 보기', { sm: true, variant: 'ghost', onClick: () => navigate('/interview') }),
      body: el('div', { class: 'stack-2' },
        el('div', { class: 'flex gap-2 center' },
          icon('mic', 'muted'),
          el('span', { class: 'text-secondary' }, count ? `예상 질문 ${count}개가 준비되어 있어요.` : '면접 준비 자료가 저장되어 있어요.')),
        interview.self_introduction
          ? el('div', { class: 'muted text-sm' }, '1분 자기소개 초안도 함께 저장되어 있습니다.')
          : null),
    });
  }

  const eligible = ['document_passed', 'interview', 'final_passed'].includes(job.status);
  return Card({
    title: '면접 준비',
    body: el('p', { class: 'muted', style: { margin: 0, lineHeight: '1.6' } },
      eligible
        ? '서류 단계를 통과했어요. 면접 준비 탭에서 예상 질문과 1분 자기소개를 정리할 수 있어요.'
        : '서류 합격 이후 단계가 되면 이 공고 기준으로 면접 준비를 안내해 드려요.'),
  });
}

function RelatedCard(related) {
  const list = related || [];
  if (!list.length) return null;
  return Card({
    title: '관련 기록',
    sub: '같은 회사 · 직무',
    body: el('div', { class: 'stack-2' },
      ...list.map((r) => el('div', {
        class: 'flex between center is-clickable',
        style: { padding: '8px 0', cursor: 'pointer' },
        activate: () => navigate(`/jobs/${r.id}`),
      },
        el('div', {},
          el('div', { class: 'strong' }, r.position),
          el('div', { class: 'muted text-sm' }, [r.company, r.deadline ? `마감 ${fmtDate(r.deadline)}` : null].filter(Boolean).join(' · '))),
        Badge(r.status, r.status_label)))),
  });
}

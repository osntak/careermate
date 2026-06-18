// Profile — the user's career identity, fully editable. Feeds AI writing/analysis.
import {
  el, get, post, put, del, icon, Card, Badge, Btn, IconBtn, SubmitBtn, EmptyState, Chips,
  Field, Input, Textarea, openModal, closeModal, confirmDialog,
  toastOk, toastError, fmtDate, mount, linesToArray, csvToArray,
} from '/lib.js';

/* ----------------------------------------------------------- small helpers */

function val(node) { return node ? node.value : ''; }

// Render a "YYYY-MM ~ YYYY-MM / 재직중" period label from a record.
function periodLabel(r) {
  const start = r.start_date || '';
  if (r.is_current) return start ? `${start} ~ 재직중` : '재직중';
  const end = r.end_date || '';
  if (start && end) return `${start} ~ ${end}`;
  return start || end || '';
}

// A small grouped definition-list block for read-only display.
function kv(rows) {
  const dl = el('dl', { class: 'kv' });
  for (const [label, value] of rows) {
    if (value == null || value === '') continue;
    dl.append(el('dt', {}, label), el('dd', {}, value));
  }
  return dl;
}

/* ------------------------------------------------------------------ render */

export async function render(ctx) {
  ctx.setTitle?.('프로필');
  const [{ profile }, { experiences }, { projects }, { skills }, onboarding] = await Promise.all([
    get('/api/profile'),
    get('/api/experiences'),
    get('/api/projects'),
    get('/api/skills'),
    get('/api/onboarding'),
  ]);
  const p = profile || {};

  // Re-run the whole render (refetch) after any mutation, then refresh nav.
  const reload = async () => { await render(ctx); await ctx.refreshNav(); };

  const wrap = el('div', { class: 'stack-4' });

  wrap.append(CompletenessCard(onboarding));
  wrap.append(BasicInfoCard(p, reload));
  wrap.append(DesiredCard(p, reload));
  wrap.append(WritingCard(p, reload));
  wrap.append(ExperiencesCard(experiences || [], reload));
  wrap.append(ProjectsCard(projects || [], reload));
  wrap.append(SkillsCard(skills || [], reload));

  mount(ctx.view, wrap);
}

/* ----------------------------------------------------- completeness header */

function CompletenessCard(o) {
  const pct = o?.profile_completeness ?? 0;
  const steps = (o?.next_steps || []).slice(0, 3);
  return Card({
    title: '프로필 완성도',
    sub: `${pct}%`,
    body: [
      el('div', { class: 'progress', style: { marginBottom: steps.length ? '12px' : '0' } },
        el('div', { class: 'progress__bar', style: { width: `${pct}%` } })),
      steps.length
        ? el('div', { class: 'stack-2' }, ...steps.map((t) =>
            el('div', { class: 'flex gap-2', style: { alignItems: 'flex-start' } },
              icon('chevronRight', 'muted'),
              el('span', { class: 'text-secondary text-sm' }, t))))
        : null,
    ],
  });
}

/* --------------------------------------------------------- 1. 기본 정보 */

function BasicInfoCard(p, reload) {
  const hasAny = p.name || p.email || p.phone || p.location || p.headline || p.summary || (p.links || []).length;

  const body = hasAny ? [
    kv([
      ['이름', p.name],
      ['이메일', p.email],
      ['연락처', p.phone],
      ['지역', p.location],
      ['한 줄 소개', p.headline],
    ]),
    p.summary ? el('div', { class: 'mt-3' },
      el('div', { class: 'muted text-sm mb-2' }, '자기소개 요약'),
      el('div', { class: 'doc-preview' }, p.summary)) : null,
    (p.links || []).length ? el('div', { class: 'mt-3 flex wrap gap-2' },
      ...p.links.map((l) => el('a', {
        class: 'chip', href: l.url, attrs: { target: '_blank', rel: 'noopener' },
      }, icon('link'), l.label || l.url))) : null,
  ] : EmptyState({
    iconName: 'user',
    title: '기본 정보가 비어 있어요',
    body: '이름·연락처·한 줄 소개를 채워 두면 모든 문서의 기본 정보로 쓰입니다.',
    action: Btn('정보 입력', { icon: 'edit', variant: 'primary', onClick: () => editBasic(p, reload) }),
  });

  return Card({
    title: '기본 정보',
    actions: hasAny ? Btn('수정', { icon: 'edit', sm: true, variant: 'ghost', onClick: () => editBasic(p, reload) }) : null,
    body,
  });
}

function editBasic(p, reload) {
  const name = Input({ value: p.name || '', placeholder: '홍길동' });
  const email = Input({ value: p.email || '', type: 'email', placeholder: 'you@example.com' });
  const phone = Input({ value: p.phone || '', placeholder: '010-0000-0000' });
  const location = Input({ value: p.location || '', placeholder: '서울' });
  const headline = Input({ value: p.headline || '', placeholder: '예: 5년차 백엔드 엔지니어' });
  const summary = Textarea({ value: p.summary || '', attrs: { rows: '5' }, placeholder: '자기소개 요약' });
  // links as one "라벨 | URL" per line
  const linksTa = Textarea({
    value: (p.links || []).map((l) => `${l.label} | ${l.url}`).join('\n'),
    attrs: { rows: '3' }, placeholder: 'GitHub | https://github.com/...\n포트폴리오 | https://...',
  });

  openModal({
    title: '기본 정보 수정',
    size: 'lg',
    body: el('div', {},
      Field('이름', name),
      el('div', { class: 'grid grid--2' }, Field('이메일', email), Field('연락처', phone)),
      Field('지역', location),
      Field('한 줄 소개', headline, '직무 타이틀이나 강점을 한 문장으로'),
      Field('자기소개 요약', summary),
      Field('링크', linksTa, '한 줄에 하나씩 "라벨 | URL" 형식으로 입력하세요.'),
    ),
    footer: (close) => [
      Btn('취소', { onClick: close }),
      SubmitBtn('기본 정보 저장', async () => {
        const links = linesToArray(linksTa.value).map((line) => {
          const i = line.indexOf('|');
          const label = (i >= 0 ? line.slice(0, i) : line).trim();
          const url = (i >= 0 ? line.slice(i + 1) : line).trim();
          return { label: label || url, url };
        }).filter((l) => l.url);
        await put('/api/profile', {
          name: val(name).trim(), email: val(email).trim(), phone: val(phone).trim(),
          location: val(location).trim(), headline: val(headline).trim(),
          summary: val(summary).trim(), links,
        });
        toastOk('기본 정보를 저장했어요.');
        close();
        await reload();
      }),
    ],
  });
}

/* --------------------------------------------------------- 2. 희망 조건 */

function DesiredCard(p, reload) {
  const roles = p.desired_roles || [];
  const hasAny = roles.length || p.desired_conditions;

  const body = hasAny ? [
    roles.length ? el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, '희망 직무'),
      Chips(roles, { accent: true })) : null,
    p.desired_conditions ? el('div', { class: roles.length ? 'mt-3' : '' },
      el('div', { class: 'muted text-sm mb-2' }, '희망 조건'),
      el('div', { class: 'doc-preview' }, p.desired_conditions)) : null,
  ] : EmptyState({
    iconName: 'target',
    title: '희망 조건이 비어 있어요',
    body: '희망 직무와 근무 조건을 적어 두면 공고 매칭이 정확해집니다.',
    action: Btn('희망 조건 입력', { icon: 'edit', variant: 'primary', onClick: () => editDesired(p, reload) }),
  });

  return Card({
    title: '희망 조건',
    actions: hasAny ? Btn('수정', { icon: 'edit', sm: true, variant: 'ghost', onClick: () => editDesired(p, reload) }) : null,
    body,
  });
}

function editDesired(p, reload) {
  const roles = Input({ value: (p.desired_roles || []).join(', '), placeholder: '백엔드 엔지니어, 플랫폼 엔지니어' });
  const conditions = Textarea({ value: p.desired_conditions || '', attrs: { rows: '4' }, placeholder: '예: 연봉 6,000 이상 / 서울·재택 / 정규직' });
  openModal({
    title: '희망 조건 수정',
    body: el('div', {},
      Field('희망 직무', roles, '쉼표(,)로 구분해 여러 개 입력할 수 있어요.'),
      Field('희망 조건', conditions, '연봉·지역·근무형태 등 자유롭게'),
    ),
    footer: (close) => [
      Btn('취소', { onClick: close }),
      SubmitBtn('희망 조건 저장', async () => {
        await put('/api/profile', {
          desired_roles: csvToArray(roles.value),
          desired_conditions: val(conditions).trim(),
        });
        toastOk('희망 조건을 저장했어요.');
        close();
        await reload();
      }),
    ],
  });
}

/* ----------------------------------------------- 3. 자기소개서 설정 */

function WritingCard(p, reload) {
  const emphasis = p.emphasis_points || [];
  const hasAny = p.preferred_tone || emphasis.length;

  const body = [
    !hasAny ? el('div', { class: 'callout', style: { marginBottom: '12px' } },
      icon('sparkle'),
      el('div', {},
        el('div', { class: 'callout__title' }, 'AI 글쓰기 품질에 직접 반영돼요'),
        el('div', { class: 'callout__body' }, '선호 문체와 강조 포인트를 적어 두면 자기소개서·면접 답변의 톤이 일관되게 맞춰집니다.'))) : null,
    hasAny ? kv([
      ['선호 문체', p.preferred_tone],
    ]) : null,
    emphasis.length ? el('div', { class: p.preferred_tone ? 'mt-3' : '' },
      el('div', { class: 'muted text-sm mb-2' }, '강조 포인트'),
      Chips(emphasis, { accent: true })) : null,
    !hasAny ? el('p', { class: 'muted', style: { margin: '4px 0 0' } }, '아직 선호 문체·강조 포인트가 없어요.') : null,
  ];

  return Card({
    title: '자기소개서 설정',
    actions: Btn(hasAny ? '수정' : '설정', { icon: 'edit', sm: true, variant: 'ghost', onClick: () => editWriting(p, reload) }),
    body,
  });
}

function editWriting(p, reload) {
  const tone = Input({ value: p.preferred_tone || '', placeholder: '예: 담백하고 구체적' });
  const emphasis = Textarea({ value: (p.emphasis_points || []).join('\n'), attrs: { rows: '5' }, placeholder: '문제 해결 능력\n주도적인 협업\n정량 성과' });
  openModal({
    title: '자기소개서 설정',
    body: el('div', {},
      Field('선호 문체', tone, '예: 담백하고 구체적 / 자신감 있게 / 진솔하게'),
      Field('강조 포인트', emphasis, '한 줄에 하나씩. AI가 글을 쓸 때 이 포인트를 우선 반영해요.'),
    ),
    footer: (close) => [
      Btn('취소', { onClick: close }),
      SubmitBtn('설정 저장', async () => {
        await put('/api/profile', {
          preferred_tone: val(tone).trim(),
          emphasis_points: linesToArray(emphasis.value),
        });
        toastOk('자기소개서 설정을 저장했어요.');
        close();
        await reload();
      }),
    ],
  });
}

/* ---------------------------------------------------- 4. 경력 (Experiences) */

function ExperiencesCard(items, reload) {
  const add = Btn('경력 추가', { icon: 'plus', sm: true, variant: 'ghost', onClick: () => editExperience(null, reload) });

  if (!items.length) {
    return Card({
      title: '경력',
      actions: add,
      body: EmptyState({
        iconName: 'briefcase',
        title: '등록된 경력이 없어요',
        body: '주요 경력을 추가하면 적합도 분석과 자기소개서 품질이 올라갑니다.',
        action: Btn('경력 추가', { icon: 'plus', variant: 'primary', onClick: () => editExperience(null, reload) }),
      }),
    });
  }

  const rows = items.map((x) => el('div', { class: 'tl-item' + (x.is_current ? ' is-current' : '') },
    el('div', { class: 'tl-item__rail' }, el('div', { class: 'tl-item__dot' }), el('div', { class: 'tl-item__line' })),
    el('div', { class: 'tl-item__body' },
      el('div', { class: 'flex between wrap gap-2' },
        el('div', {},
          el('div', { class: 'flex gap-2 wrap', style: { alignItems: 'baseline' } },
            el('span', { class: 'strong' }, x.company),
            x.role ? el('span', { class: 'text-secondary' }, x.role) : null,
            x.employment_type ? el('span', { class: 'muted text-sm' }, x.employment_type) : null),
          periodLabel(x) ? el('div', { class: 'muted text-sm' }, periodLabel(x)) : null),
        el('div', { class: 'flex gap-2' },
          IconBtn('edit', { title: '수정', onClick: () => editExperience(x, reload) }),
          IconBtn('trash', { title: '삭제', variant: 'danger', onClick: () => removeExperience(x, reload) }))),
      x.description ? el('div', { class: 'doc-preview mt-2' }, x.description) : null,
      (x.achievements || []).length ? el('ul', { class: 'mt-2', style: { margin: '8px 0 0', paddingLeft: '18px' } },
        ...x.achievements.map((a) => el('li', { class: 'text-secondary text-sm', style: { marginBottom: '3px' } }, a))) : null,
      (x.tech || []).length ? el('div', { class: 'mt-2' }, Chips(x.tech)) : null,
    )));

  return Card({
    title: '경력',
    sub: `${items.length}건`,
    actions: add,
    body: el('div', { class: 'timeline' }, ...rows),
  });
}

async function removeExperience(x, reload) {
  const ok = await confirmDialog({ title: '경력 삭제', message: `"${x.company}" 경력을 삭제할까요?`, confirmLabel: '삭제', danger: true });
  if (!ok) return;
  try { await del(`/api/experiences/${x.id}`); toastOk('경력을 삭제했어요.'); await reload(); }
  catch (e) { toastError(e); }
}

function editExperience(x, reload) {
  const r = x || {};
  const company = Input({ value: r.company || '', placeholder: '회사명 (필수)' });
  const role = Input({ value: r.role || '', placeholder: '직무 / 직책' });
  const empType = Input({ value: r.employment_type || '', placeholder: '정규직 / 계약직 / 인턴 / 프리랜서' });
  const start = Input({ value: r.start_date || '', placeholder: 'YYYY-MM' });
  const end = Input({ value: r.end_date || '', placeholder: 'YYYY-MM' });
  const isCurrent = el('input', { type: 'checkbox', checked: !!r.is_current });
  const sync = () => { end.disabled = isCurrent.checked; if (isCurrent.checked) end.value = ''; };
  isCurrent.addEventListener('change', sync);
  const desc = Textarea({ value: r.description || '', attrs: { rows: '3' }, placeholder: '담당 업무 / 역할' });
  const achievements = Textarea({ value: (r.achievements || []).join('\n'), attrs: { rows: '4' }, placeholder: '결제 전환율 12% 개선\n월 배포 횟수 3배 증가' });
  const tech = Input({ value: (r.tech || []).join(', '), placeholder: 'TypeScript, Node.js, PostgreSQL' });
  sync();

  openModal({
    title: x ? '경력 수정' : '경력 추가',
    size: 'lg',
    body: el('div', {},
      Field('회사', company),
      el('div', { class: 'grid grid--2' }, Field('직무', role), Field('고용형태', empType)),
      el('div', { class: 'grid grid--2' }, Field('시작 (YYYY-MM)', start), Field('종료 (YYYY-MM)', end)),
      Field(null, el('label', { class: 'flex gap-2', style: { alignItems: 'center', fontWeight: '500' } }, isCurrent, el('span', {}, '현재 재직 중'))),
      Field('업무 설명', desc),
      Field('주요 성과', achievements, '한 줄에 하나씩. 정량 지표를 함께 적으면 좋아요.'),
      Field('사용 기술', tech, '쉼표(,)로 구분'),
    ),
    footer: (close) => [
      Btn('취소', { onClick: close }),
      SubmitBtn(x ? '경력 저장' : '경력 추가', async () => {
        if (!val(company).trim()) throw new Error('회사명을 입력해 주세요.');
        const payload = {
          company: val(company).trim(),
          role: val(role).trim(),
          employment_type: val(empType).trim(),
          start_date: val(start).trim(),
          end_date: isCurrent.checked ? '' : val(end).trim(),
          is_current: isCurrent.checked,
          description: val(desc).trim(),
          achievements: linesToArray(achievements.value),
          tech: csvToArray(tech.value),
        };
        if (x) await put(`/api/experiences/${x.id}`, payload);
        else await post('/api/experiences', payload);
        toastOk(x ? '경력을 수정했어요.' : '경력을 추가했어요.');
        close();
        await reload();
      }),
    ],
  });
}

/* ----------------------------------------------------- 5. 프로젝트 (Projects) */

function ProjectsCard(items, reload) {
  const add = Btn('프로젝트 추가', { icon: 'plus', sm: true, variant: 'ghost', onClick: () => editProject(null, reload) });

  if (!items.length) {
    return Card({
      title: '프로젝트',
      actions: add,
      body: EmptyState({
        iconName: 'layers',
        title: '등록된 프로젝트가 없어요',
        body: '대표 프로젝트를 정리해 두면 자기소개서·면접에서 구체적인 근거로 활용돼요.',
        action: Btn('프로젝트 추가', { icon: 'plus', variant: 'primary', onClick: () => editProject(null, reload) }),
      }),
    });
  }

  const cards = items.map((x) => el('div', { class: 'subcard' },
    el('div', { class: 'flex between wrap gap-2' },
      el('div', {},
        el('div', { class: 'flex gap-2 wrap', style: { alignItems: 'baseline' } },
          el('span', { class: 'strong' }, x.name),
          x.role ? el('span', { class: 'text-secondary text-sm' }, x.role) : null),
        periodProject(x) ? el('div', { class: 'muted text-sm' }, periodProject(x)) : null),
      el('div', { class: 'flex gap-2' },
        x.url ? el('a', { class: 'btn btn--ghost icon-btn', href: x.url, title: '링크 열기', attrs: { target: '_blank', rel: 'noopener', 'aria-label': '링크 열기' } }, icon('external')) : null,
        IconBtn('edit', { title: '수정', onClick: () => editProject(x, reload) }),
        IconBtn('trash', { title: '삭제', variant: 'danger', onClick: () => removeProject(x, reload) }))),
    x.description ? el('div', { class: 'doc-preview mt-2' }, x.description) : null,
    (x.highlights || []).length ? el('ul', { style: { margin: '8px 0 0', paddingLeft: '18px' } },
      ...x.highlights.map((h) => el('li', { class: 'text-secondary text-sm', style: { marginBottom: '3px' } }, h))) : null,
    (x.tech || []).length ? el('div', { class: 'mt-2' }, Chips(x.tech)) : null,
  ));

  return Card({
    title: '프로젝트',
    sub: `${items.length}건`,
    actions: add,
    body: el('div', { class: 'stack-3' }, ...cards),
  });
}

function periodProject(x) {
  if (x.start_date && x.end_date) return `${x.start_date} ~ ${x.end_date}`;
  return x.start_date || x.end_date || '';
}

async function removeProject(x, reload) {
  const ok = await confirmDialog({ title: '프로젝트 삭제', message: `"${x.name}" 프로젝트를 삭제할까요?`, confirmLabel: '삭제', danger: true });
  if (!ok) return;
  try { await del(`/api/projects/${x.id}`); toastOk('프로젝트를 삭제했어요.'); await reload(); }
  catch (e) { toastError(e); }
}

function editProject(x, reload) {
  const r = x || {};
  const name = Input({ value: r.name || '', placeholder: '프로젝트명 (필수)' });
  const role = Input({ value: r.role || '', placeholder: '맡은 역할' });
  const start = Input({ value: r.start_date || '', placeholder: 'YYYY-MM' });
  const end = Input({ value: r.end_date || '', placeholder: 'YYYY-MM' });
  const url = Input({ value: r.url || '', placeholder: 'https://...' });
  const desc = Textarea({ value: r.description || '', attrs: { rows: '3' }, placeholder: '프로젝트 개요 / 목적' });
  const highlights = Textarea({ value: (r.highlights || []).join('\n'), attrs: { rows: '4' }, placeholder: '핵심 성과를 한 줄에 하나씩' });
  const tech = Input({ value: (r.tech || []).join(', '), placeholder: 'React, AWS, GraphQL' });

  openModal({
    title: x ? '프로젝트 수정' : '프로젝트 추가',
    size: 'lg',
    body: el('div', {},
      Field('프로젝트명', name),
      el('div', { class: 'grid grid--2' }, Field('역할', role), Field('링크', url)),
      el('div', { class: 'grid grid--2' }, Field('시작 (YYYY-MM)', start), Field('종료 (YYYY-MM)', end)),
      Field('설명', desc),
      Field('주요 내용', highlights, '한 줄에 하나씩'),
      Field('사용 기술', tech, '쉼표(,)로 구분'),
    ),
    footer: (close) => [
      Btn('취소', { onClick: close }),
      SubmitBtn(x ? '프로젝트 저장' : '프로젝트 추가', async () => {
        if (!val(name).trim()) throw new Error('프로젝트명을 입력해 주세요.');
        const payload = {
          name: val(name).trim(),
          role: val(role).trim(),
          description: val(desc).trim(),
          highlights: linesToArray(highlights.value),
          tech: csvToArray(tech.value),
          url: val(url).trim(),
          start_date: val(start).trim(),
          end_date: val(end).trim(),
        };
        if (x) await put(`/api/projects/${x.id}`, payload);
        else await post('/api/projects', payload);
        toastOk(x ? '프로젝트를 수정했어요.' : '프로젝트를 추가했어요.');
        close();
        await reload();
      }),
    ],
  });
}

/* -------------------------------------------------------- 6. 기술 (Skills) */

function SkillsCard(items, reload) {
  const add = Btn('기술 추가', { icon: 'plus', sm: true, variant: 'ghost', onClick: () => editSkill(null, reload) });

  if (!items.length) {
    return Card({
      title: '기술',
      actions: add,
      body: EmptyState({
        iconName: 'sparkle',
        title: '등록된 기술이 없어요',
        body: '보유 기술을 정리해 두면 공고 키워드 매칭이 정확해집니다.',
        action: Btn('기술 추가', { icon: 'plus', variant: 'primary', onClick: () => editSkill(null, reload) }),
      }),
    });
  }

  // Group by category (uncategorized last).
  const groups = new Map();
  for (const s of items) {
    const key = s.category || '기타';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  const blocks = [...groups.entries()].map(([cat, list]) =>
    el('div', {},
      el('div', { class: 'muted text-sm mb-2' }, cat),
      el('div', { class: 'stack-2' }, ...list.map((s) =>
        el('div', { class: 'flex between gap-2', style: { padding: '4px 0' } },
          el('div', { class: 'flex gap-2 wrap', style: { alignItems: 'baseline' } },
            el('span', { class: 'strong' }, s.name),
            s.level ? el('span', { class: 'badge badge--applied' }, el('span', { class: 'dot' }), s.level) : null,
            s.years != null ? el('span', { class: 'muted text-sm' }, `${s.years}년`) : null),
          el('div', { class: 'flex gap-2' },
            IconBtn('edit', { title: '수정', onClick: () => editSkill(s, reload) }),
            IconBtn('trash', { title: '삭제', variant: 'danger', onClick: () => removeSkill(s, reload) })))))));

  return Card({
    title: '기술',
    sub: `${items.length}개`,
    actions: add,
    body: el('div', { class: 'stack-3' }, ...blocks),
  });
}

async function removeSkill(s, reload) {
  const ok = await confirmDialog({ title: '기술 삭제', message: `"${s.name}"을(를) 삭제할까요?`, confirmLabel: '삭제', danger: true });
  if (!ok) return;
  try { await del(`/api/skills/${s.id}`); toastOk('기술을 삭제했어요.'); await reload(); }
  catch (e) { toastError(e); }
}

function editSkill(s, reload) {
  const r = s || {};
  const name = Input({ value: r.name || '', placeholder: '기술명 (필수)' });
  const category = Input({ value: r.category || '', placeholder: '언어 / 프레임워크 / 툴 / 소프트스킬' });
  const level = Input({ value: r.level || '', placeholder: '상 / 중 / 하 또는 자유 서술' });
  const years = Input({ value: r.years != null ? String(r.years) : '', type: 'number', attrs: { min: '0', step: '0.5' }, placeholder: '연차' });

  openModal({
    title: s ? '기술 수정' : '기술 추가',
    body: el('div', {},
      Field('기술명', name),
      Field('분류', category),
      el('div', { class: 'grid grid--2' }, Field('숙련도', level), Field('연차', years)),
    ),
    footer: (close) => [
      Btn('취소', { onClick: close }),
      SubmitBtn(s ? '기술 저장' : '기술 추가', async () => {
        if (!val(name).trim()) throw new Error('기술명을 입력해 주세요.');
        const yrs = val(years).trim();
        const payload = {
          name: val(name).trim(),
          category: val(category).trim(),
          level: val(level).trim(),
        };
        if (yrs !== '' && !Number.isNaN(Number(yrs))) payload.years = Number(yrs);
        if (s) await put(`/api/skills/${s.id}`, payload);
        else await post('/api/skills', payload);
        toastOk(s ? '기술을 수정했어요.' : '기술을 추가했어요.');
        close();
        await reload();
      }),
    ],
  });
}

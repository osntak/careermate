// Home — a calm "career command center": where do I stand, and what should I do next?
//
// Copy rule (avoid the old repetition): setup guidance lives in EXACTLY one place —
// the 시작하기 card. Every empty state is ONE screen-specific sentence; never repeat
// the same "AI에게 보내면 저장됩니다" instruction across surfaces.
import {
  el, get, icon, navigate, Card, Badge, Btn, ListRow, CheckRow,
  Stat, PageHead, fmtDate, fmtRelative, scoreClass, STATUS_COLOR, statusColor, mount,
} from '/demo/lib.js';

const PIPE_ORDER = ['draft', 'planned', 'applied', 'document_passed', 'interview', 'final_passed', 'on_hold', 'rejected'];

// activity type → icon + theme hue (soft tinted chip + coloured stroke)
const ACTIVITY_META = {
  profile_updated: { icon: 'user', hue: 'slate' },
  resume_added: { icon: 'file', hue: 'slate' },
  cover_letter_added: { icon: 'file', hue: 'teal' },
  cover_letter_version_saved: { icon: 'file', hue: 'teal' },
  job_saved: { icon: 'briefcase', hue: 'blue' },
  fit_analysis_saved: { icon: 'target', hue: 'violet' },
  application_status_changed: { icon: 'layers', hue: 'blue' },
  interview_prep_saved: { icon: 'mic', hue: 'amber' },
  document_exported: { icon: 'download', hue: 'slate' },
};

export async function render(ctx) {
  const [s, profileRes] = await Promise.all([get('/api/summary'), get('/api/profile')]);
  const name = profileRes.profile?.name;

  // exactly one primary action per screen, pinned to the topbar
  ctx.setActions([Btn('공고 추가', { icon: 'plus', variant: 'primary', onClick: () => navigate('/jobs') })]);

  // day one: nothing saved yet → just greeting + the single getting-started card
  // (skip the pipeline + a wall of empty cards).
  const firstRun = !s.onboarding.completed
    && s.counts.jobs === 0 && s.counts.active_applications === 0 && s.counts.cover_letters === 0;

  const wrap = el('div', { class: 'stack-4' });
  wrap.append(Greeting(name, s, firstRun));

  if (firstRun) {
    wrap.append(el('div', { class: 'firstrun-hero' }, GettingStarted(s.onboarding)));
    return mount(ctx.view, wrap);
  }

  if (!s.onboarding.completed) wrap.append(GettingStarted(s.onboarding));
  wrap.append(StatRow(s.counts));
  wrap.append(Pipeline(s.status_breakdown));
  wrap.append(el('div', { class: 'grid grid--2' },
    el('div', { class: 'stack-4' }, ActionLane(s.interview_todo, s.in_progress), RecentJobs(s.recent_jobs)),
    el('div', { class: 'stack-4' }, Activity(s.recent_activity)),
  ));

  mount(ctx.view, wrap);
}

/* ----------------------------------------------------------------- greeting band */
function Greeting(name, s, firstRun) {
  let focus;
  if (firstRun) focus = '시작해 볼까요 — 먼저 기본 정보를 채워 주세요.';
  else if (s.interview_todo.length) focus = `면접 준비가 필요한 지원 ${s.interview_todo.length}건이 있어요.`;
  else if (s.in_progress.length) focus = `진행 중인 지원 ${s.in_progress.length}건이 있어요.`;
  else if (s.counts.jobs) focus = `저장된 공고 ${s.counts.jobs}건 · 새 적합도 분석을 받아보세요.`;
  else focus = '오늘도 한 걸음 나아가 볼까요.';
  return PageHead({ title: name ? `${name}님, 안녕하세요` : '환영합니다', desc: focus });
}

/* ----------------------------------------------- getting started (the one guidance surface) */
function GettingStarted(o) {
  const steps = [
    { done: o.has_profile, label: '기본 프로필 작성', to: '/profile' },
    { done: o.has_resume || o.has_experience, label: '이력서 또는 경력 추가', to: '/profile' },
    { done: o.has_cover_letter, label: '기존 자기소개서 등록', to: '/documents' },
    { done: o.has_job, label: '관심 공고 저장', to: '/jobs' },
  ];
  return Card({
    title: '시작하기',
    sub: `프로필 완성도 ${o.profile_completeness}%`,
    body: [
      // The one place (per DESIGN_GUIDE rule 4) that teaches the core mental model:
      // CareerMate stores; your own AI does the thinking. Without this, first-run users
      // read the empty dashboard as a manual CRUD form and never find the real workflow.
      el('div', { class: 'callout mb-3' },
        icon('info'),
        el('div', {},
          el('div', { class: 'callout__title' }, '두뇌는 당신의 AI, 보관은 CareerMate'),
          el('div', { class: 'callout__body' },
            '공고 분석·자기소개서·면접 준비는 평소 쓰던 AI에게 말로 시키면, 결과가 이 대시보드에 쌓여요.'))),
      el('div', { class: 'progress' }, el('div', { class: 'progress__bar', style: { width: `${o.profile_completeness}%` } })),
      el('p', { class: 'text-secondary text-sm mt-3 mb-2' },
        '완성할수록 AI의 적합도 분석과 자기소개서 품질이 좋아져요.'),
      el('div', {}, ...steps.map((it) => CheckRow({ done: it.done, label: it.label, onClick: () => navigate(it.to) }))),
    ],
  });
}

/* ----------------------------------------------- KPI summary tiles (at-a-glance) */
function StatTile(label, value, iconName, to) {
  const tile = Stat({ label, value, iconName, onClick: () => navigate(to) });
  tile.classList.add('is-clickable');
  return tile;
}
function StatRow(counts) {
  return el('div', { class: 'grid grid--4' },
    StatTile('저장 공고', counts.jobs, 'briefcase', '/jobs'),
    StatTile('진행 중 지원', counts.active_applications, 'layers', '/applications'),
    StatTile('자기소개서', counts.cover_letters, 'file', '/documents'),
    StatTile('면접 준비', counts.interview_pending, 'mic', '/interview'),
  );
}

/* ----------------------------------------------- pipeline hero (status_breakdown) */
function Pipeline(breakdown) {
  const byStatus = Object.fromEntries(breakdown.map((b) => [b.status, b.count]));
  const c = (st) => byStatus[st] || 0;
  const total = breakdown.reduce((n, b) => n + b.count, 0);
  const open = () => navigate('/applications');

  let body;
  if (total === 0) {
    body = el('p', { class: 'muted', style: { margin: 0 } },
      '아직 지원 단계가 없어요. 공고에 지원 상태를 표시하면 여기에 파이프라인이 채워져요.');
  } else {
    const segs = PIPE_ORDER.filter((st) => c(st) > 0).map((st) =>
      el('div', {
        class: 'pipebar__seg',
        style: { flexGrow: String(c(st)), background: STATUS_COLOR[st] },
        title: `${breakdown.find((b) => b.status === st).label} ${c(st)}`,
        onClick: open,
      }));

    const reached = c('applied') + c('document_passed') + c('interview') + c('final_passed');
    const docPass = c('document_passed') + c('interview') + c('final_passed');
    const intv = c('interview') + c('final_passed');
    const fin = c('final_passed');
    const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : null);
    const conv = (num, den, label) => (pct(num, den) != null ? `${label} ${pct(num, den)}%` : null);

    const tiles = [
      { st: 'applied', label: '지원', value: reached, conv: total ? `전체 ${total}건` : null },
      { st: 'document_passed', label: '서류 합격', value: docPass, conv: conv(docPass, reached, '지원 대비') },
      { st: 'interview', label: '면접', value: intv, conv: conv(intv, reached, '지원 대비') },
      { st: 'final_passed', label: '최종 합격', value: fin, conv: conv(fin, intv, '면접 대비') || conv(fin, reached, '지원 대비') },
    ];

    body = [
      el('div', { class: 'pipebar' }, ...segs),
      el('div', { class: 'pipefunnel' }, ...tiles.map((t) =>
        el('div', { class: 'pipefunnel__tile', onClick: open },
          el('div', { class: 'pipefunnel__label' },
            el('span', { class: 'pipefunnel__dot', style: { background: STATUS_COLOR[t.st] } }), t.label),
          el('div', { class: 'pipefunnel__value tnum' }, String(t.value)),
          t.conv && el('div', { class: 'pipefunnel__conv' }, t.conv)))),
    ];
  }

  return Card({
    title: '지원 파이프라인',
    actions: Btn('보드 열기', { sm: true, variant: 'ghost', onClick: open }),
    body,
  });
}

/* ----------------------------------------------- action lane (what to do next) */
function statusDot(status) {
  return el('span', { class: 'list-row__dot', style: { background: statusColor(status) } });
}

function ActionLane(interviewTodo, inProgress) {
  const rows = [];
  for (const it of interviewTodo) {
    rows.push(ListRow({
      leading: statusDot('document_passed'),
      title: it.job.company,
      sub: it.job.position,
      trailing: el('span', { class: 'badge badge--accent' }, el('span', { class: 'dot' }), '면접 준비'),
      onClick: () => navigate(`/jobs/${it.job.id}`),
    }));
  }
  for (const it of inProgress) {
    if (rows.length >= 6) break;
    rows.push(ListRow({
      leading: statusDot(it.application.status),
      title: it.job?.company || '—',
      sub: it.job?.position || '',
      trailing: Badge(it.application.status, it.status_label),
      onClick: it.job ? () => navigate(`/jobs/${it.job.id}`) : null,
    }));
  }
  return Card({
    title: '이번에 할 일',
    actions: rows.length ? Btn('전체 보기', { sm: true, variant: 'ghost', onClick: () => navigate('/applications') }) : null,
    body: rows.length
      ? el('div', {}, ...rows)
      : el('p', { class: 'muted', style: { margin: 0 } }, '지금 처리할 일이 없어요. 새 공고를 분석해 보세요.'),
  });
}

/* ----------------------------------------------- recent jobs */
function RecentJobs(jobs) {
  if (!jobs.length) {
    return Card({
      title: '최근 공고',
      body: el('p', { class: 'muted', style: { margin: 0 } }, '저장된 공고가 아직 없어요. 새 공고를 추가해 보세요.'),
    });
  }
  const rows = jobs.map((j) => ListRow({
    title: j.company,
    sub: j.position,
    trailing: [
      j.fit_score != null
        ? el('span', { class: `strong tnum ${scoreClass(j.fit_score)}` }, `${j.fit_score}점`)
        : el('span', { class: 'muted text-sm' }, '—'),
      Badge(j.status, j.status_label),
    ],
    onClick: () => navigate(`/jobs/${j.id}`),
  }));
  return Card({
    title: '최근 공고',
    actions: Btn('전체 보기', { sm: true, variant: 'ghost', onClick: () => navigate('/jobs') }),
    body: el('div', {}, ...rows),
  });
}

/* ----------------------------------------------- activity feed (day-bucketed) */
function Activity(acts) {
  if (!acts.length) {
    return Card({
      title: '최근 활동',
      body: el('p', { class: 'muted', style: { margin: 0 } }, '아직 활동 내역이 없어요. 공고를 저장하거나 분석하면 여기에 기록돼요.'),
    });
  }
  const body = [];
  for (const g of groupByDay(acts)) {
    body.push(el('div', { class: 'feed-group' }, g.label));
    for (const a of g.items) {
      const m = ACTIVITY_META[a.type] || { icon: 'info', hue: 'slate' };
      body.push(el('div', { class: 'feed-item' },
        el('div', { class: 'feed-item__icon', style: { background: `var(--${m.hue}-soft)`, color: `var(--${m.hue})` } }, icon(m.icon)),
        el('div', { class: 'feed-item__body' },
          el('div', { class: 'feed-item__text' }, a.summary),
          el('time', { class: 'feed-item__time', title: fmtDate(a.created_at), attrs: { datetime: a.created_at } }, fmtRelative(a.created_at)))));
    }
  }
  return Card({ title: '최근 활동', body: el('div', {}, ...body) });
}

function groupByDay(acts) {
  const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const today = midnight(new Date());
  const yesterday = today - 86400000;
  const order = [];
  const buckets = new Map();
  for (const a of acts) {
    const day = midnight(a.created_at);
    const label = day === today ? '오늘' : day === yesterday ? '어제' : fmtDate(a.created_at);
    if (!buckets.has(label)) { buckets.set(label, []); order.push(label); }
    buckets.get(label).push(a);
  }
  return order.map((label) => ({ label, items: buckets.get(label) }));
}

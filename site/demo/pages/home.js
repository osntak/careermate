// Home — a calm "career command center": where do I stand, and what should I do next?
//
// Copy rule (avoid the old repetition): setup guidance lives in EXACTLY one place —
// the 시작하기 card. Every empty state is ONE screen-specific sentence; never repeat
// the same "AI에게 보내면 저장됩니다" instruction across surfaces.
import {
  el, get, icon, navigate, Card, Badge, Btn, ListRow, CheckRow,
  Stat, PageHead, fmtDate, fmtRelative, scoreClass, STATUS_COLOR, statusColor, mount,
} from '/demo/lib.js';
import { t } from '/demo/i18n.js';

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
  ctx.setActions([Btn(t('home.action.addJob'), { icon: 'plus', variant: 'primary', onClick: () => navigate('/jobs') })]);

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
  if (firstRun) focus = t('home.greeting.firstRun');
  else if (s.interview_todo.length) focus = t('home.greeting.interviewTodo', { count: s.interview_todo.length });
  else if (s.in_progress.length) focus = t('home.greeting.inProgress', { count: s.in_progress.length });
  else if (s.counts.jobs) focus = t('home.greeting.jobsSaved', { count: s.counts.jobs });
  else focus = t('home.greeting.idle');
  return PageHead({ title: name ? t('home.greeting.title', { name }) : t('home.greeting.welcome'), desc: focus });
}

/* ----------------------------------------------- getting started (the one guidance surface) */
function GettingStarted(o) {
  const steps = [
    { done: o.has_profile, label: t('home.start.step.profile'), to: '/profile' },
    { done: o.has_resume, label: t('home.start.step.resume'), to: '/documents/career' },
    { done: o.has_cover_letter, label: t('home.start.step.coverLetter'), to: '/documents' },
    { done: o.has_job, label: t('home.start.step.job'), to: '/jobs' },
  ];
  return Card({
    title: t('home.start.title'),
    sub: t('home.start.completeness', { pct: o.profile_completeness }),
    body: [
      // The one place (per DESIGN_GUIDE rule 4) that teaches the core mental model:
      // CareerMate stores; your own AI does the thinking. Without this, first-run users
      // read the empty dashboard as a manual CRUD form and never find the real workflow.
      el('div', { class: 'callout mb-3' },
        icon('info'),
        el('div', {},
          el('div', { class: 'callout__title' }, t('home.start.calloutTitle')),
          el('div', { class: 'callout__body' },
            t('home.start.calloutBody')))),
      el('div', { class: 'progress' }, el('div', { class: 'progress__bar', style: { width: `${o.profile_completeness}%` } })),
      el('p', { class: 'text-secondary text-sm mt-3 mb-2' },
        t('home.start.note')),
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
    StatTile(t('home.stat.jobs'), counts.jobs, 'briefcase', '/jobs'),
    StatTile(t('home.stat.activeApplications'), counts.active_applications, 'layers', '/applications'),
    StatTile(t('home.stat.coverLetters'), counts.cover_letters, 'file', '/documents'),
    StatTile(t('home.stat.interviewPending'), counts.interview_pending, 'mic', '/interview'),
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
      t('home.pipeline.empty'));
  } else {
    const segs = PIPE_ORDER.filter((st) => c(st) > 0).map((st) =>
      el('div', {
        class: 'pipebar__seg',
        style: { flexGrow: String(c(st)), background: STATUS_COLOR[st] },
        title: `${t('status.' + st)} ${c(st)}`,
        onClick: open,
      }));

    const reached = c('applied') + c('document_passed') + c('interview') + c('final_passed');
    const docPass = c('document_passed') + c('interview') + c('final_passed');
    const intv = c('interview') + c('final_passed');
    const fin = c('final_passed');
    const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : null);
    const conv = (num, den, key) => (pct(num, den) != null ? t(key, { pct: pct(num, den) }) : null);

    const tiles = [
      { st: 'applied', label: t('home.pipeline.stage.applied'), value: reached, conv: total ? t('home.pipeline.conv.total', { count: total }) : null },
      { st: 'document_passed', label: t('home.pipeline.stage.documentPassed'), value: docPass, conv: conv(docPass, reached, 'home.pipeline.conv.vsApplied') },
      { st: 'interview', label: t('home.pipeline.stage.interview'), value: intv, conv: conv(intv, reached, 'home.pipeline.conv.vsApplied') },
      { st: 'final_passed', label: t('home.pipeline.stage.finalPassed'), value: fin, conv: conv(fin, intv, 'home.pipeline.conv.vsInterview') || conv(fin, reached, 'home.pipeline.conv.vsApplied') },
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
    title: t('home.pipeline.title'),
    actions: Btn(t('home.pipeline.openBoard'), { sm: true, variant: 'ghost', onClick: open }),
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
      trailing: el('span', { class: 'badge badge--accent' }, el('span', { class: 'dot' }), t('home.actionLane.interviewPrep')),
      onClick: () => navigate(`/jobs/${it.job.id}`),
    }));
  }
  for (const it of inProgress) {
    if (rows.length >= 6) break;
    rows.push(ListRow({
      leading: statusDot(it.application.status),
      title: it.job?.company || t('home.placeholder.dash'),
      sub: it.job?.position || '',
      trailing: Badge(it.application.status, t('status.' + it.application.status)),
      onClick: it.job ? () => navigate(`/jobs/${it.job.id}`) : null,
    }));
  }
  return Card({
    title: t('home.actionLane.title'),
    actions: rows.length ? Btn(t('home.actionLane.viewAll'), { sm: true, variant: 'ghost', onClick: () => navigate('/applications') }) : null,
    body: rows.length
      ? el('div', {}, ...rows)
      : el('p', { class: 'muted', style: { margin: 0 } }, t('home.actionLane.empty')),
  });
}

/* ----------------------------------------------- recent jobs */
function RecentJobs(jobs) {
  if (!jobs.length) {
    return Card({
      title: t('home.recentJobs.title'),
      body: el('p', { class: 'muted', style: { margin: 0 } }, t('home.recentJobs.empty')),
    });
  }
  const rows = jobs.map((j) => ListRow({
    title: j.company,
    sub: j.position,
    trailing: [
      j.fit_score != null
        ? el('span', { class: `strong tnum ${scoreClass(j.fit_score)}` }, t('home.recentJobs.score', { score: j.fit_score }))
        : el('span', { class: 'muted text-sm' }, t('home.placeholder.dash')),
      Badge(j.status, t('status.' + j.status)),
    ],
    onClick: () => navigate(`/jobs/${j.id}`),
  }));
  return Card({
    title: t('home.recentJobs.title'),
    actions: Btn(t('home.recentJobs.viewAll'), { sm: true, variant: 'ghost', onClick: () => navigate('/jobs') }),
    body: el('div', {}, ...rows),
  });
}

/* ----------------------------------------------- activity feed (day-bucketed) */
function Activity(acts) {
  if (!acts.length) {
    return Card({
      title: t('home.activity.title'),
      body: el('p', { class: 'muted', style: { margin: 0 } }, t('home.activity.empty')),
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
  return Card({ title: t('home.activity.title'), body: el('div', {}, ...body) });
}

function groupByDay(acts) {
  const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const today = midnight(new Date());
  const yesterday = today - 86400000;
  const order = [];
  const buckets = new Map();
  for (const a of acts) {
    const day = midnight(a.created_at);
    const label = day === today ? t('home.activity.today') : day === yesterday ? t('home.activity.yesterday') : fmtDate(a.created_at);
    if (!buckets.has(label)) { buckets.set(label, []); order.push(label); }
    buckets.get(label).push(a);
  }
  return order.map((label) => ({ label, items: buckets.get(label) }));
}

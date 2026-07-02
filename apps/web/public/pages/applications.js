// Applications — every application grouped by status in a calm VERTICAL list
// (no horizontal scroll). Change a status inline to move an item between groups.
import {
  el, get, put, navigate, EmptyState, Btn, ListRow, Badge, Card,
  Select, scoreClass, statusColor, mount, toast, toastOk, toastError,
} from '/lib.js';
import { t } from '/i18n.js';

// deadline(YYYY-MM-DD) → "Due in 7d" / "Due today" / "Overdue" (null if absent/invalid)
function ddayLabel(deadline) {
  if (!deadline) return null;
  const d = new Date(`${deadline}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (days > 0) return t('applications.dday.future', { n: days });
  if (days === 0) return t('applications.dday.today');
  return t('applications.dday.past');
}

export async function render(ctx) {
  ctx.setActions([]);
  const [data, offersRes] = await Promise.all([get('/api/applications'), get('/api/offers')]);
  const applications = data.applications || [];
  const boardOrder = data.board_order || [];
  const offers = (offersRes && offersRes.offers) || [];

  if (!applications.length) {
    mount(ctx.view, el('div', { class: 'stack-4' }, EmptyState({
      iconName: 'layers',
      title: t('applications.empty.title'),
      body: t('applications.empty.body'),
      action: Btn(t('applications.empty.action'), { icon: 'briefcase', variant: 'primary', onClick: () => navigate('/jobs') }),
    })));
    return;
  }

  // Status labels are localized client-side from the status CODE (board_order is the code list).
  const statusOptions = boardOrder.map((code) => ({ value: code, label: t('status.' + code) }));

  // Group by status.
  const byStatus = {};
  for (const app of applications) (byStatus[app.status] || (byStatus[app.status] = [])).push(app);

  const wrap = el('div', { class: 'stack-4' });
  if (offers.length) wrap.append(OffersSection(offers));
  for (const code of boardOrder) {
    const apps = byStatus[code];
    if (apps && apps.length) wrap.append(StatusGroup(code, apps));
  }
  mount(ctx.view, wrap);

  function StatusGroup(code, apps) {
    return el('div', {},
      el('div', { class: 'app-group__head' },
        el('span', { class: 'app-group__dot', style: { background: statusColor(code) } }),
        el('span', { class: 'app-group__title' }, t('status.' + code)),
        el('span', { class: 'app-group__count tnum' }, t('applications.group.count', { count: apps.length }))),
      el('div', {}, ...apps.map(AppRow)));
  }

  function AppRow(app) {
    const job = app.job || {};
    const subBits = [job.position, job.location].filter(Boolean);
    const dday = ddayLabel(job.deadline);
    if (dday) subBits.push(dday);
    // 탈락 회고: 불합격이고 단계가 기록돼 있으면 어느 단계에서 떨어졌는지 sub에 가볍게 병기.
    if (app.status === 'rejected' && app.rejected_stage) {
      subBits.push(`${t('applications.rejectedStage.label')} ${t('applications.rejectedStage.' + app.rejected_stage)}`);
    }
    const sel = Select(
      statusOptions.map((o) => ({ ...o, selected: o.value === app.status })),
      {
        class: 'select select--sm',
        title: t('applications.statusSelect.title'),
        onClick: (e) => e.stopPropagation(),
        onChange: (e) => { e.stopPropagation(); changeStatus(app, e.target.value, e.target); },
      },
    );
    // Keep the right edge informative on every row: a right-aligned score column
    // (a muted dash when not yet scored, so scores line up and "no score" reads
    // clearly), then the status — a calm badge that swaps to the change-select on hover.
    const score = app.fit_score != null
      ? el('span', { class: `app-score strong tnum ${scoreClass(app.fit_score)}` }, t('applications.row.score', { score: app.fit_score }))
      : el('span', { class: 'app-score muted tnum' }, '—');
    return ListRow({
      title: job.company || '—',
      sub: subBits.join(' · '),
      trailing: [
        score,
        el('span', { class: 'app-status' }, Badge(app.status, t('status.' + app.status)), sel),
      ],
      onClick: () => navigate(`/jobs/${app.job_id}`),
    });
  }

  async function changeStatus(app, newValue, selectEl) {
    if (!newValue || newValue === app.status) return;
    selectEl.disabled = true;
    try {
      const res = await put(`/api/applications/${app.job_id}/status`, { status: newValue });
      toastOk(t('applications.toast.statusChanged'));
      if (res && res.hint) toast(res.hint, { title: t('applications.hint.title'), type: 'default' });
      await ctx.refreshNav();
      await render(ctx); // refetch + re-render so the item moves to its new group
    } catch (err) {
      toastError(err);
      if (err && err.status === 404) {
        // The job/application no longer exists (e.g. a stale tab after a reset).
        // Refresh so the phantom row disappears instead of erroring on every retry.
        await ctx.refreshNav();
        await render(ctx);
        return;
      }
      selectEl.value = app.status; // revert on failure
      selectEl.disabled = false;
    }
  }
}

// Offers — sorted by the AI's score (server pre-sorts). The score + verdict were
// written by the connected AI at save time, so this renders without any LLM. The
// precise head-to-head comparison happens in the AI chat via compare_offers.
//
// Lifecycle-aware: only OPEN offers deserve the top of the pipeline (they carry
// accept deadlines — the most time-sensitive decision in the whole search).
// Accepted/declined offers are kept as career records (terms history feeds the
// next negotiation) but demoted to a collapsed "past offers" line.
function OffersSection(offers) {
  const status = (o) => o.offer_status || 'open';
  const active = offers.filter((o) => status(o) === 'open');
  const past = offers.filter((o) => status(o) !== 'open');
  const children = [];
  if (active.length) {
    children.push(
      el('div', { class: 'app-group__head' },
        el('span', { class: 'app-group__title' }, t('applications.offers.title')),
        el('span', { class: 'app-group__count tnum' }, t('applications.group.count', { count: active.length }))),
      ...active.map(OfferCard),
    );
  }
  if (past.length) children.push(PastOffers(past));
  return el('div', { class: 'stack-3' }, ...children);
}

function OfferCard(o) {
  const meta = [];
  if (o.total_comp_annual_est != null)
    meta.push(`${t('applications.offers.est')} ${o.total_comp_annual_est.toLocaleString()}${t('applications.offers.unit')}`);
  if (o.work_arrangement) meta.push(o.work_arrangement);
  if (o.accept_deadline) meta.push(t('applications.offers.acceptBy', { date: o.accept_deadline }));
  const score = o.ai_score != null
    ? el('span', { class: `strong tnum ${scoreClass(o.ai_score)}` }, String(o.ai_score))
    : el('span', { class: 'muted' }, t('applications.offers.noScore'));
  // Deadline passed on a still-open offer: flag it, never auto-hide — deadlines
  // get extended in negotiation, so the call is the user's (or the AI's), not ours.
  const expired = !!o.accept_deadline && o.accept_deadline < new Date().toISOString().slice(0, 10);
  const actions = expired
    ? el('span', { class: 'flex gap-2', style: { alignItems: 'center' } },
        Badge('on_hold', t('applications.offers.expired')), score)
    : score;
  return Card({
    title: o.company,
    sub: meta.join(' · '),
    actions,
    body: o.verdict ? el('p', { class: 'muted', style: { marginTop: '6px' } }, o.verdict) : null,
    clickable: true,
    onClick: () => navigate(`/jobs/${o.job_id}`),
  });
}

// Accepted/declined offers, one compact row each inside a collapsed disclosure.
function PastOffers(past) {
  const rows = past.map((o) =>
    el('div', { class: 'flex gap-2', style: { alignItems: 'center', padding: '6px 0' } },
      Badge(o.offer_status === 'accepted' ? 'final_passed' : 'rejected',
        t(`applications.offers.status.${o.offer_status}`)),
      el('span', {
        class: 'strong',
        style: { cursor: 'pointer' },
        activate: () => navigate(`/jobs/${o.job_id}`),
      }, o.company),
      o.total_comp_annual_est != null
        ? el('span', { class: 'muted text-sm' },
            `${t('applications.offers.est')} ${o.total_comp_annual_est.toLocaleString()}${t('applications.offers.unit')}`)
        : null,
    ));
  return el('details', {},
    el('summary', { class: 'muted text-sm', style: { cursor: 'pointer' } },
      t('applications.offers.past', { count: past.length })),
    ...rows);
}

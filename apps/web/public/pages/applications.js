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
function OffersSection(offers) {
  return el('div', { class: 'stack-3' },
    el('div', { class: 'app-group__head' },
      el('span', { class: 'app-group__title' }, t('applications.offers.title')),
      el('span', { class: 'app-group__count tnum' }, t('applications.group.count', { count: offers.length }))),
    ...offers.map(OfferCard));
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
  return Card({
    title: o.company,
    sub: meta.join(' · '),
    actions: score,
    body: o.verdict ? el('p', { class: 'muted', style: { marginTop: '6px' } }, o.verdict) : null,
    clickable: true,
    onClick: () => navigate(`/jobs/${o.job_id}`),
  });
}

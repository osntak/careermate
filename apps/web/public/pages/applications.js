// Applications — every application grouped by status in a calm VERTICAL list
// (no horizontal scroll). Change a status inline to move an item between groups.
import {
  el, get, put, navigate, EmptyState, Btn, ListRow,
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
  const data = await get('/api/applications');
  const applications = data.applications || [];
  const boardOrder = data.board_order || [];

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
        class: 'select select--sm row-action',
        title: t('applications.statusSelect.title'),
        onClick: (e) => e.stopPropagation(),
        onChange: (e) => { e.stopPropagation(); changeStatus(app, e.target.value, e.target); },
      },
    );
    return ListRow({
      title: job.company || '—',
      sub: subBits.join(' · '),
      trailing: [
        app.fit_score != null
          ? el('span', { class: `strong tnum ${scoreClass(app.fit_score)}` }, t('applications.row.score', { score: app.fit_score }))
          : null,
        sel,
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

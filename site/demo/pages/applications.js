// Applications — every application grouped by status in a calm VERTICAL list
// (no horizontal scroll). Change a status inline to move an item between groups.
import {
  el, get, put, navigate, EmptyState, Btn, ListRow,
  Select, scoreClass, statusColor, mount, toast, toastOk, toastError, meta,
} from '/demo/lib.js';

// deadline(YYYY-MM-DD) → "마감 D-7" / "마감 D-day" / "마감 지남" (null if absent/invalid)
function ddayLabel(deadline) {
  if (!deadline) return null;
  const d = new Date(`${deadline}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (days > 0) return `마감 D-${days}`;
  if (days === 0) return '마감 D-day';
  return '마감 지남';
}

export async function render(ctx) {
  ctx.setActions([]);
  const data = await get('/api/applications');
  const applications = data.applications || [];
  const boardOrder = data.board_order || [];

  if (!applications.length) {
    mount(ctx.view, el('div', { class: 'stack-4' }, EmptyState({
      iconName: 'layers',
      title: '아직 지원 내역이 없어요',
      body: '공고를 추가하면 지원이 상태별로 정리됩니다.',
      action: Btn('공고 보러 가기', { icon: 'briefcase', variant: 'primary', onClick: () => navigate('/jobs') }),
    })));
    return;
  }

  // Status labels: board_order is authoritative for ordering; fall back to meta() labels.
  const labelByCode = {};
  for (const a of applications) if (a.status && a.status_label) labelByCode[a.status] = a.status_label;
  let metaStatuses = [];
  try { metaStatuses = (await meta()).statuses || []; } catch { /* labels fall back to codes */ }
  for (const s of metaStatuses) if (!labelByCode[s.value]) labelByCode[s.value] = s.label;
  const statusOptions = boardOrder.map((code) => ({ value: code, label: labelByCode[code] || code }));

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
        el('span', { class: 'app-group__title' }, labelByCode[code] || code),
        el('span', { class: 'app-group__count tnum' }, `${apps.length}건`)),
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
        title: '상태 변경',
        onClick: (e) => e.stopPropagation(),
        onChange: (e) => { e.stopPropagation(); changeStatus(app, e.target.value, e.target); },
      },
    );
    return ListRow({
      title: job.company || '—',
      sub: subBits.join(' · '),
      trailing: [
        app.fit_score != null
          ? el('span', { class: `strong tnum ${scoreClass(app.fit_score)}` }, `${app.fit_score}점`)
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
      toastOk('지원 상태를 변경했어요.');
      if (res && res.hint) toast(res.hint, { title: '면접 준비', type: 'default' });
      await ctx.refreshNav();
      await render(ctx); // refetch + re-render so the item moves to its new group
    } catch (err) {
      toastError(err);
      selectEl.value = app.status; // revert on failure
      selectEl.disabled = false;
    }
  }
}

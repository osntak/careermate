// Profile — the user's career identity, fully editable. Feeds AI writing/analysis.
import {
  el, get, post, put, del, icon, Card, Badge, Btn, IconBtn, SubmitBtn, EmptyState, Chips,
  Field, Input, Textarea, openModal, closeModal, confirmDialog,
  toastOk, toastError, fmtDate, mount, linesToArray, csvToArray, ExportMenu,
} from '/lib.js';
import { t } from '/i18n.js';

/* ----------------------------------------------------------- small helpers */

function val(node) { return node ? node.value : ''; }

// Render a "YYYY-MM ~ YYYY-MM / 재직중" period label from a record.
function periodLabel(r) {
  const start = r.start_date || '';
  if (r.is_current) return start ? t('profile.period.startToPresent', { start }) : t('profile.period.present');
  const end = r.end_date || '';
  if (start && end) return t('profile.period.startToEnd', { start, end });
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
  ctx.setTitle?.(t('profile.title'));
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
    title: t('profile.completeness.title'),
    sub: t('profile.completeness.percent', { pct }),
    actions: [
      ExportMenu('/api/export/profile'),
    ],
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
      [t('profile.basic.kv.name'), p.name],
      [t('profile.basic.kv.email'), p.email],
      [t('profile.basic.kv.phone'), p.phone],
      [t('profile.basic.kv.location'), p.location],
      [t('profile.basic.kv.headline'), p.headline],
    ]),
    p.summary ? el('div', { class: 'mt-3' },
      el('div', { class: 'muted text-sm mb-2' }, t('profile.basic.summaryLabel')),
      el('div', { class: 'doc-preview' }, p.summary)) : null,
    (p.links || []).length ? el('div', { class: 'mt-3 flex wrap gap-2' },
      ...p.links.map((l) => el('a', {
        class: 'chip', href: l.url, attrs: { target: '_blank', rel: 'noopener' },
      }, icon('link'), l.label || l.url))) : null,
  ] : EmptyState({
    iconName: 'user',
    title: t('profile.basic.empty.title'),
    body: t('profile.basic.empty.body'),
    action: Btn(t('profile.basic.empty.action'), { icon: 'edit', variant: 'primary', onClick: () => editBasic(p, reload) }),
  });

  return Card({
    title: t('profile.basic.title'),
    actions: hasAny ? Btn(t('profile.basic.edit'), { icon: 'edit', sm: true, variant: 'ghost', onClick: () => editBasic(p, reload) }) : null,
    body,
  });
}

function editBasic(p, reload) {
  const name = Input({ value: p.name || '', placeholder: t('profile.basic.ph.name') });
  const email = Input({ value: p.email || '', type: 'email', placeholder: t('profile.basic.ph.email') });
  const phone = Input({ value: p.phone || '', placeholder: t('profile.basic.ph.phone') });
  const location = Input({ value: p.location || '', placeholder: t('profile.basic.ph.location') });
  const headline = Input({ value: p.headline || '', placeholder: t('profile.basic.ph.headline') });
  const summary = Textarea({ value: p.summary || '', attrs: { rows: '5' }, placeholder: t('profile.basic.ph.summary') });
  // links as one "label | URL" per line
  const linksTa = Textarea({
    value: (p.links || []).map((l) => `${l.label} | ${l.url}`).join('\n'),
    attrs: { rows: '3' }, placeholder: t('profile.basic.ph.links'),
  });

  openModal({
    title: t('profile.basic.modal.title'),
    size: 'lg',
    body: el('div', {},
      Field(t('profile.basic.field.name'), name),
      el('div', { class: 'grid grid--2' }, Field(t('profile.basic.field.email'), email), Field(t('profile.basic.field.phone'), phone)),
      Field(t('profile.basic.field.location'), location),
      Field(t('profile.basic.field.headline'), headline, t('profile.basic.field.headlineHint')),
      Field(t('profile.basic.field.summary'), summary),
      Field(t('profile.basic.field.links'), linksTa, t('profile.basic.field.linksHint')),
    ),
    footer: (close) => [
      Btn(t('profile.basic.cancel'), { onClick: close }),
      SubmitBtn(t('profile.basic.save'), async () => {
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
        toastOk(t('profile.basic.saved'));
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
      el('div', { class: 'muted text-sm mb-2' }, t('profile.desired.rolesLabel')),
      Chips(roles, { accent: true })) : null,
    p.desired_conditions ? el('div', { class: roles.length ? 'mt-3' : '' },
      el('div', { class: 'muted text-sm mb-2' }, t('profile.desired.conditionsLabel')),
      el('div', { class: 'doc-preview' }, p.desired_conditions)) : null,
  ] : EmptyState({
    iconName: 'target',
    title: t('profile.desired.empty.title'),
    body: t('profile.desired.empty.body'),
    action: Btn(t('profile.desired.empty.action'), { icon: 'edit', variant: 'primary', onClick: () => editDesired(p, reload) }),
  });

  return Card({
    title: t('profile.desired.title'),
    actions: hasAny ? Btn(t('profile.desired.edit'), { icon: 'edit', sm: true, variant: 'ghost', onClick: () => editDesired(p, reload) }) : null,
    body,
  });
}

function editDesired(p, reload) {
  const roles = Input({ value: (p.desired_roles || []).join(', '), placeholder: t('profile.desired.ph.roles') });
  const conditions = Textarea({ value: p.desired_conditions || '', attrs: { rows: '4' }, placeholder: t('profile.desired.ph.conditions') });
  openModal({
    title: t('profile.desired.modal.title'),
    body: el('div', {},
      Field(t('profile.desired.field.roles'), roles, t('profile.desired.field.rolesHint')),
      Field(t('profile.desired.field.conditions'), conditions, t('profile.desired.field.conditionsHint')),
    ),
    footer: (close) => [
      Btn(t('profile.desired.cancel'), { onClick: close }),
      SubmitBtn(t('profile.desired.save'), async () => {
        await put('/api/profile', {
          desired_roles: csvToArray(roles.value),
          desired_conditions: val(conditions).trim(),
        });
        toastOk(t('profile.desired.saved'));
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
        el('div', { class: 'callout__title' }, t('profile.writing.callout.title')),
        el('div', { class: 'callout__body' }, t('profile.writing.callout.body')))) : null,
    hasAny ? kv([
      [t('profile.writing.toneLabel'), p.preferred_tone],
    ]) : null,
    emphasis.length ? el('div', { class: p.preferred_tone ? 'mt-3' : '' },
      el('div', { class: 'muted text-sm mb-2' }, t('profile.writing.emphasisLabel')),
      Chips(emphasis, { accent: true })) : null,
    !hasAny ? el('p', { class: 'muted', style: { margin: '4px 0 0' } }, t('profile.writing.emptyHint')) : null,
  ];

  return Card({
    title: t('profile.writing.title'),
    actions: Btn(hasAny ? t('profile.writing.edit') : t('profile.writing.setup'), { icon: 'edit', sm: true, variant: 'ghost', onClick: () => editWriting(p, reload) }),
    body,
  });
}

function editWriting(p, reload) {
  const tone = Input({ value: p.preferred_tone || '', placeholder: t('profile.writing.ph.tone') });
  const emphasis = Textarea({ value: (p.emphasis_points || []).join('\n'), attrs: { rows: '5' }, placeholder: t('profile.writing.ph.emphasis') });
  openModal({
    title: t('profile.writing.modal.title'),
    body: el('div', {},
      Field(t('profile.writing.field.tone'), tone, t('profile.writing.field.toneHint')),
      Field(t('profile.writing.field.emphasis'), emphasis, t('profile.writing.field.emphasisHint')),
    ),
    footer: (close) => [
      Btn(t('profile.writing.cancel'), { onClick: close }),
      SubmitBtn(t('profile.writing.save'), async () => {
        await put('/api/profile', {
          preferred_tone: val(tone).trim(),
          emphasis_points: linesToArray(emphasis.value),
        });
        toastOk(t('profile.writing.saved'));
        close();
        await reload();
      }),
    ],
  });
}

/* ---------------------------------------------------- 4. 경력 (Experiences) */

function ExperiencesCard(items, reload) {
  const add = Btn(t('profile.exp.add'), { icon: 'plus', sm: true, variant: 'ghost', onClick: () => editExperience(null, reload) });

  if (!items.length) {
    return Card({
      title: t('profile.exp.title'),
      actions: add,
      body: EmptyState({
        iconName: 'briefcase',
        title: t('profile.exp.empty.title'),
        body: t('profile.exp.empty.body'),
        action: Btn(t('profile.exp.add'), { icon: 'plus', variant: 'primary', onClick: () => editExperience(null, reload) }),
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
          IconBtn('edit', { title: t('profile.exp.editTitle'), onClick: () => editExperience(x, reload) }),
          IconBtn('trash', { title: t('profile.exp.deleteTitle'), variant: 'danger', onClick: () => removeExperience(x, reload) }))),
      x.description ? el('div', { class: 'doc-preview mt-2' }, x.description) : null,
      (x.achievements || []).length ? el('ul', { class: 'mt-2', style: { margin: '8px 0 0', paddingLeft: '18px' } },
        ...x.achievements.map((a) => el('li', { class: 'text-secondary text-sm', style: { marginBottom: '3px' } }, a))) : null,
      (x.tech || []).length ? el('div', { class: 'mt-2' }, Chips(x.tech)) : null,
    )));

  return Card({
    title: t('profile.exp.title'),
    sub: t('profile.exp.count', { count: items.length }),
    actions: add,
    body: el('div', { class: 'timeline' }, ...rows),
  });
}

async function removeExperience(x, reload) {
  const ok = await confirmDialog({ title: t('profile.exp.delete.title'), message: t('profile.exp.delete.message', { company: x.company }), confirmLabel: t('profile.exp.delete.confirm'), danger: true });
  if (!ok) return;
  try { await del(`/api/experiences/${x.id}`); toastOk(t('profile.exp.deleted')); await reload(); }
  catch (e) { toastError(e); }
}

function editExperience(x, reload) {
  const r = x || {};
  const company = Input({ value: r.company || '', placeholder: t('profile.exp.ph.company') });
  const role = Input({ value: r.role || '', placeholder: t('profile.exp.ph.role') });
  const empType = Input({ value: r.employment_type || '', placeholder: t('profile.exp.ph.empType') });
  const start = Input({ value: r.start_date || '', placeholder: t('profile.exp.ph.month') });
  const end = Input({ value: r.end_date || '', placeholder: t('profile.exp.ph.month') });
  const isCurrent = el('input', { type: 'checkbox', checked: !!r.is_current });
  const sync = () => { end.disabled = isCurrent.checked; if (isCurrent.checked) end.value = ''; };
  isCurrent.addEventListener('change', sync);
  const desc = Textarea({ value: r.description || '', attrs: { rows: '3' }, placeholder: t('profile.exp.ph.desc') });
  const achievements = Textarea({ value: (r.achievements || []).join('\n'), attrs: { rows: '4' }, placeholder: t('profile.exp.ph.achievements') });
  const tech = Input({ value: (r.tech || []).join(', '), placeholder: t('profile.exp.ph.tech') });
  sync();

  openModal({
    title: x ? t('profile.exp.modal.editTitle') : t('profile.exp.modal.addTitle'),
    size: 'lg',
    body: el('div', {},
      Field(t('profile.exp.field.company'), company),
      el('div', { class: 'grid grid--2' }, Field(t('profile.exp.field.role'), role), Field(t('profile.exp.field.empType'), empType)),
      el('div', { class: 'grid grid--2' }, Field(t('profile.exp.field.start'), start), Field(t('profile.exp.field.end'), end)),
      Field(null, el('label', { class: 'flex gap-2', style: { alignItems: 'center', fontWeight: '500' } }, isCurrent, el('span', {}, t('profile.exp.field.isCurrent')))),
      Field(t('profile.exp.field.desc'), desc),
      Field(t('profile.exp.field.achievements'), achievements, t('profile.exp.field.achievementsHint')),
      Field(t('profile.exp.field.tech'), tech, t('profile.exp.field.techHint')),
    ),
    footer: (close) => [
      Btn(t('profile.exp.cancel'), { onClick: close }),
      SubmitBtn(x ? t('profile.exp.saveEdit') : t('profile.exp.saveNew'), async () => {
        if (!val(company).trim()) throw new Error(t('profile.exp.validation.company'));
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
        toastOk(x ? t('profile.exp.updated') : t('profile.exp.added'));
        close();
        await reload();
      }),
    ],
  });
}

/* ----------------------------------------------------- 5. 프로젝트 (Projects) */

function ProjectsCard(items, reload) {
  const add = Btn(t('profile.proj.add'), { icon: 'plus', sm: true, variant: 'ghost', onClick: () => editProject(null, reload) });

  if (!items.length) {
    return Card({
      title: t('profile.proj.title'),
      actions: add,
      body: EmptyState({
        iconName: 'layers',
        title: t('profile.proj.empty.title'),
        body: t('profile.proj.empty.body'),
        action: Btn(t('profile.proj.add'), { icon: 'plus', variant: 'primary', onClick: () => editProject(null, reload) }),
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
        x.url ? el('a', { class: 'btn btn--ghost icon-btn', href: x.url, title: t('profile.proj.openLink'), attrs: { target: '_blank', rel: 'noopener', 'aria-label': t('profile.proj.openLink') } }, icon('external')) : null,
        IconBtn('edit', { title: t('profile.proj.editTitle'), onClick: () => editProject(x, reload) }),
        IconBtn('trash', { title: t('profile.proj.deleteTitle'), variant: 'danger', onClick: () => removeProject(x, reload) }))),
    x.description ? el('div', { class: 'doc-preview mt-2' }, x.description) : null,
    (x.highlights || []).length ? el('ul', { style: { margin: '8px 0 0', paddingLeft: '18px' } },
      ...x.highlights.map((h) => el('li', { class: 'text-secondary text-sm', style: { marginBottom: '3px' } }, h))) : null,
    (x.tech || []).length ? el('div', { class: 'mt-2' }, Chips(x.tech)) : null,
  ));

  return Card({
    title: t('profile.proj.title'),
    sub: t('profile.proj.count', { count: items.length }),
    actions: add,
    body: el('div', { class: 'stack-3' }, ...cards),
  });
}

function periodProject(x) {
  if (x.start_date && x.end_date) return `${x.start_date} ~ ${x.end_date}`;
  return x.start_date || x.end_date || '';
}

async function removeProject(x, reload) {
  const ok = await confirmDialog({ title: t('profile.proj.delete.title'), message: t('profile.proj.delete.message', { name: x.name }), confirmLabel: t('profile.proj.delete.confirm'), danger: true });
  if (!ok) return;
  try { await del(`/api/projects/${x.id}`); toastOk(t('profile.proj.deleted')); await reload(); }
  catch (e) { toastError(e); }
}

function editProject(x, reload) {
  const r = x || {};
  const name = Input({ value: r.name || '', placeholder: t('profile.proj.ph.name') });
  const role = Input({ value: r.role || '', placeholder: t('profile.proj.ph.role') });
  const start = Input({ value: r.start_date || '', placeholder: t('profile.proj.ph.month') });
  const end = Input({ value: r.end_date || '', placeholder: t('profile.proj.ph.month') });
  const url = Input({ value: r.url || '', placeholder: t('profile.proj.ph.url') });
  const desc = Textarea({ value: r.description || '', attrs: { rows: '3' }, placeholder: t('profile.proj.ph.desc') });
  const highlights = Textarea({ value: (r.highlights || []).join('\n'), attrs: { rows: '4' }, placeholder: t('profile.proj.ph.highlights') });
  const tech = Input({ value: (r.tech || []).join(', '), placeholder: t('profile.proj.ph.tech') });

  openModal({
    title: x ? t('profile.proj.modal.editTitle') : t('profile.proj.modal.addTitle'),
    size: 'lg',
    body: el('div', {},
      Field(t('profile.proj.field.name'), name),
      el('div', { class: 'grid grid--2' }, Field(t('profile.proj.field.role'), role), Field(t('profile.proj.field.url'), url)),
      el('div', { class: 'grid grid--2' }, Field(t('profile.proj.field.start'), start), Field(t('profile.proj.field.end'), end)),
      Field(t('profile.proj.field.desc'), desc),
      Field(t('profile.proj.field.highlights'), highlights, t('profile.proj.field.highlightsHint')),
      Field(t('profile.proj.field.tech'), tech, t('profile.proj.field.techHint')),
    ),
    footer: (close) => [
      Btn(t('profile.proj.cancel'), { onClick: close }),
      SubmitBtn(x ? t('profile.proj.saveEdit') : t('profile.proj.saveNew'), async () => {
        if (!val(name).trim()) throw new Error(t('profile.proj.validation.name'));
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
        toastOk(x ? t('profile.proj.updated') : t('profile.proj.added'));
        close();
        await reload();
      }),
    ],
  });
}

/* -------------------------------------------------------- 6. 기술 (Skills) */

function SkillsCard(items, reload) {
  const add = Btn(t('profile.skill.add'), { icon: 'plus', sm: true, variant: 'ghost', onClick: () => editSkill(null, reload) });

  if (!items.length) {
    return Card({
      title: t('profile.skill.title'),
      actions: add,
      body: EmptyState({
        iconName: 'sparkle',
        title: t('profile.skill.empty.title'),
        body: t('profile.skill.empty.body'),
        action: Btn(t('profile.skill.add'), { icon: 'plus', variant: 'primary', onClick: () => editSkill(null, reload) }),
      }),
    });
  }

  // Group by category (uncategorized last).
  const groups = new Map();
  for (const s of items) {
    const key = s.category || t('profile.skill.uncategorized');
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
            s.years != null ? el('span', { class: 'muted text-sm' }, t('profile.skill.years', { count: s.years })) : null),
          el('div', { class: 'flex gap-2' },
            IconBtn('edit', { title: t('profile.skill.editTitle'), onClick: () => editSkill(s, reload) }),
            IconBtn('trash', { title: t('profile.skill.deleteTitle'), variant: 'danger', onClick: () => removeSkill(s, reload) })))))));

  return Card({
    title: t('profile.skill.title'),
    sub: t('profile.skill.count', { count: items.length }),
    actions: add,
    body: el('div', { class: 'stack-3' }, ...blocks),
  });
}

async function removeSkill(s, reload) {
  const ok = await confirmDialog({ title: t('profile.skill.delete.title'), message: t('profile.skill.delete.message', { name: s.name }), confirmLabel: t('profile.skill.delete.confirm'), danger: true });
  if (!ok) return;
  try { await del(`/api/skills/${s.id}`); toastOk(t('profile.skill.deleted')); await reload(); }
  catch (e) { toastError(e); }
}

function editSkill(s, reload) {
  const r = s || {};
  const name = Input({ value: r.name || '', placeholder: t('profile.skill.ph.name') });
  const category = Input({ value: r.category || '', placeholder: t('profile.skill.ph.category') });
  const level = Input({ value: r.level || '', placeholder: t('profile.skill.ph.level') });
  const years = Input({ value: r.years != null ? String(r.years) : '', type: 'number', attrs: { min: '0', step: '0.5' }, placeholder: t('profile.skill.ph.years') });

  openModal({
    title: s ? t('profile.skill.modal.editTitle') : t('profile.skill.modal.addTitle'),
    body: el('div', {},
      Field(t('profile.skill.field.name'), name),
      Field(t('profile.skill.field.category'), category),
      el('div', { class: 'grid grid--2' }, Field(t('profile.skill.field.level'), level), Field(t('profile.skill.field.years'), years)),
    ),
    footer: (close) => [
      Btn(t('profile.skill.cancel'), { onClick: close }),
      SubmitBtn(s ? t('profile.skill.saveEdit') : t('profile.skill.saveNew'), async () => {
        if (!val(name).trim()) throw new Error(t('profile.skill.validation.name'));
        const yrs = val(years).trim();
        const payload = {
          name: val(name).trim(),
          category: val(category).trim(),
          level: val(level).trim(),
        };
        if (yrs !== '' && !Number.isNaN(Number(yrs))) payload.years = Number(yrs);
        if (s) await put(`/api/skills/${s.id}`, payload);
        else await post('/api/skills', payload);
        toastOk(s ? t('profile.skill.updated') : t('profile.skill.added'));
        close();
        await reload();
      }),
    ],
  });
}

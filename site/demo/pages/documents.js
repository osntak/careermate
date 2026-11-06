// 서류함: every document the user submits, one tab per kind. #/documents/cover(/:id) is
// cover letters with version history; #/documents/<resume|career|portfolio|other>(/:id)
// are the documents table filtered by kind. #/documents alone is cover letters.
// XSS-safe: all DB/user text rendered via el() textContent / .doc-preview (never innerHTML).
import {
  el, get, post, put, del, Card, Badge, Btn, SubmitBtn, EmptyState, ViewSwitch,
  Field, Input, Textarea, Select, openModal, closeModal, confirmDialog,
  toastOk, toastError, copyText, fmtRelative, mount, meta, ExportMenu, Menu, Markdown,
} from '/demo/lib.js';
import { t } from '/demo/i18n.js';

// URL tab -> documents.kind. 'docs' is the old resume+portfolio tab; its links land on 이력서.
const TAB_KIND = { resume: 'resume', career: 'career_description', portfolio: 'portfolio', other: 'other' };
const TABS = ['cover', 'resume', 'career', 'portfolio', 'other'];

// Each view has its own URL, so the tab comes from the URL alone and #/documents is always
// cover letters. The search query is not persisted either (it resets per visit).
let openedDeepLink = '';

export async function render(ctx) {
  const raw = ctx.params?.[0] === 'docs' ? 'resume' : ctx.params?.[0];
  const requestedTab = TABS.includes(raw) ? raw : null;
  const requestedId = ctx.params?.[1] || '';
  const tab = requestedTab || 'cover';
  const kind = TAB_KIND[tab];
  const kindName = kind ? t('kind.' + kind) : t('documents.tab.cover');

  const root = el('div', { class: 'stack-4' });

  const panel = el('div', {});
  let activeHasItems = true;
  root.append(ViewSwitch(TABS.map((id) => ({
    href: `#/documents/${id}`,
    label: id === 'cover' ? t('documents.tab.cover') : t('kind.' + TAB_KIND[id]),
  })), `#/documents/${tab}`));
  root.append(panel);

  let query = '';
  let searchInput = null;

  // Client-side filter over the rendered cards; survives panel re-renders.
  function applyFilter() {
    const q = query.trim().toLowerCase();
    const cards = [...panel.querySelectorAll('.card')];
    let shown = 0;
    for (const c of cards) {
      const hide = !!q && !c.textContent.toLowerCase().includes(q);
      c.classList.toggle('hide', hide);
      if (!hide) shown += 1;
    }
    const existing = panel.querySelector('.search-empty');
    if (existing) existing.remove();
    if (q && cards.length && shown === 0) {
      panel.append(el('div', { class: 'search-empty empty' },
        el('p', { class: 'muted', style: { margin: '0 0 12px' } }, t('documents.search.empty', { query: query.trim() })),
        Btn(t('documents.search.clear'), { sm: true, variant: 'ghost', onClick: () => { query = ''; if (searchInput) searchInput.value = ''; applyFilter(); } })));
    }
  }

  async function reload() {
    await renderPanel();
    await ctx.refreshNav();
  }

  async function renderPanel() {
    mount(panel, el('div', { class: 'muted text-sm' }, t('documents.loading')));
    try {
      const content = tab === 'cover' ? await CoverLettersTab(reload) : await KindTab(kind, reload);
      activeHasItems = content.dataset.hasItems === 'true';
      mount(panel, content);
      setActions();
      applyFilter();
      await openRequestedDocument();
    } catch (err) {
      toastError(err);
      mount(panel, el('div', { class: 'card' }, el('div', { class: 'card__body' },
        el('p', { class: 'text-secondary' }, err instanceof Error ? err.message : String(err)))));
    }
  }

  async function openRequestedDocument() {
    if (!requestedId || requestedTab !== tab) return;
    const key = `${requestedTab}:${requestedId}`;
    if (openedDeepLink === key) return;
    openedDeepLink = key;
    if (tab === 'cover') {
      await openCoverDetail(requestedId, reload);
      return;
    }
    const m = await meta();
    const kindLabels = Object.fromEntries((m.document_kinds || []).map((k) => [k.value, t('kind.' + k.value)]));
    await openDocDetail(requestedId, kindLabels, m, reload);
  }

  // topbar: search (filters the active tab) + the tab's create action
  function setActions() {
    if (!activeHasItems) {
      ctx.setActions([]);
      return;
    }
    const search = Input({ type: 'search', placeholder: t('documents.search.placeholder', { kind: kindName }), value: query, attrs: { 'aria-label': t('documents.search.aria') } });
    search.classList.add('input--inline');
    searchInput = search;
    search.addEventListener('input', () => { query = search.value; applyFilter(); });
    const createBtn = Btn(tab === 'cover' ? t('documents.action.coverCreate') : t('documents.action.create', { kind: kindName }), {
      icon: 'plus', variant: 'primary',
      onClick: () => (tab === 'cover' ? openCoverCreate(reload) : openDocCreate(reload, kind)),
    });
    ctx.setActions([search, createBtn]);
  }

  mount(ctx.view, root);
  ctx.setActions([]);
  await renderPanel();
}

/* ============================================================ 자기소개서 */

async function CoverLettersTab(reload) {
  const [{ cover_letters: list }, jobsRes] = await Promise.all([
    get('/api/cover-letters'),
    get('/api/jobs').catch(() => ({ jobs: [] })),
  ]);
  const jobs = new Map((jobsRes.jobs || []).map((j) => [j.id, j]));
  const wrap = el('div', { class: 'stack-3' });
  wrap.dataset.hasItems = list.length ? 'true' : 'false';

  if (!list.length) {
    return mountInto(wrap, EmptyState({
      iconName: 'file',
      title: t('documents.cover.empty.title'),
      body: t('documents.cover.empty.body'),
      action: Btn(t('documents.action.coverCreate'), { icon: 'plus', variant: 'primary', onClick: () => openCoverCreate(reload) }),
    }));
  }

  for (const cl of list) wrap.append(CoverRow(cl, jobs.get(cl.job_id), reload));
  return wrap;
}

// Which posting a cover letter was written for: a link back to that job, or a quiet
// "공고 미연결" so the list says plainly that a letter is per-posting.
function JobLink(job) {
  if (!job) return el('span', { class: 'chip' }, t('documents.cover.noJob'));
  return el('a', {
    class: 'chip chip--accent', href: `#/jobs/${job.id}`,
    onClick: (e) => { e.stopPropagation(); closeModal(); },
  }, `${job.company} · ${job.position}`);
}

function CoverRow(cl, job, reload) {
  const metaRow = el('div', { class: 'flex gap-2 wrap', style: { marginTop: '4px' } },
    JobLink(job),
    el('span', { class: 'chip' }, t('documents.cover.versionCount', { count: cl.version_count })),
    cl.is_primary ? Badge('accent', t('documents.cover.primary')) : null,
  );

  // Two primary actions stay visible (열기·내보내기); the rest fold into an
  // overflow menu so the row reads calmly instead of a wall of five buttons.
  const actions = el('div', { class: 'flex gap-2 wrap' },
    Btn(t('documents.cover.open'), { sm: true, icon: 'external', onClick: () => openCoverDetail(cl.id, reload) }),
    ExportMenu(`/api/export/cover-letter/${cl.id}`),
    Menu(t('documents.cover.more'), [
      cl.current_content ? { label: t('documents.cover.copy'), icon: 'copy', onClick: () => copyText(cl.current_content || '') } : null,
      cl.is_primary ? null : { label: t('documents.cover.setPrimary'), icon: 'check', onClick: () => setPrimaryCover(cl.id, reload) },
      { label: t('documents.cover.delete'), icon: 'trash', danger: true, onClick: () => removeCover(cl, reload) },
    ], { sm: true, icon: null }),
  );

  return Card({
    title: cl.title,
    body: [
      metaRow,
      cl.current_content
        ? el('p', { class: 'text-secondary text-sm truncate', style: { margin: '8px 0 0', maxWidth: '100%' } }, firstLine(cl.current_content))
        : el('p', { class: 'muted text-sm', style: { margin: '8px 0 0' } }, t('documents.cover.noContent')),
      el('div', { class: 'divider' }),
      actions,
    ],
  });
}

async function setPrimaryCover(id, reload) {
  try {
    await put(`/api/cover-letters/${id}/primary`, {});
    toastOk(t('documents.cover.setPrimaryToast'));
    await reload();
  } catch (err) { toastError(err); }
}

async function removeCover(cl, reload) {
  const ok = await confirmDialog({
    title: t('documents.cover.deleteTitle'),
    message: t('documents.cover.deleteConfirm', { title: cl.title }),
    confirmLabel: t('documents.cover.deleteConfirmLabel'), danger: true,
  });
  if (!ok) return;
  try {
    await del(`/api/cover-letters/${cl.id}`);
    toastOk(t('documents.cover.deleteToast'));
    await reload();
  } catch (err) { toastError(err); }
}

async function openCoverCreate(reload) {
  // Let the user PICK the job to link instead of typing an internal ID they've never seen.
  let jobs = [];
  try { ({ jobs } = await get('/api/jobs')); } catch { /* dropdown falls back to "연결 안 함" */ }
  const title = Input({ placeholder: t('documents.coverCreate.titlePlaceholder'), attrs: { maxlength: '200' } });
  const content = Textarea({ placeholder: t('documents.coverCreate.contentPlaceholder'), style: { minHeight: '200px' } });
  const jobPick = Select([
    { value: '', label: t('documents.coverCreate.jobNone'), selected: true },
    ...jobs.map((j) => ({ value: j.id, label: `${j.company} · ${j.position}` })),
  ]);

  openModal({
    title: t('documents.coverCreate.title'),
    size: 'lg',
    body: el('div', { class: 'stack-3' },
      Field(t('documents.coverCreate.fieldTitle'), title),
      Field(t('documents.coverCreate.fieldContent'), content, t('documents.coverCreate.fieldContentHint')),
      Field(t('documents.coverCreate.fieldJob'), jobPick,
        jobs.length ? t('documents.coverCreate.fieldJobHint') : t('documents.coverCreate.fieldJobHintEmpty')),
    ),
    footer: (close) => [
      Btn(t('documents.coverCreate.cancel'), { onClick: close }),
      SubmitBtn(t('documents.coverCreate.submit'), async () => {
        const tv = title.value.trim();
        if (!tv) { title.focus(); throw new Error(t('documents.coverCreate.titleRequired')); }
        const body = { title: tv, source: 'manual' };
        if (content.value.trim()) body.content = content.value;
        if (jobPick.value) body.job_id = jobPick.value;
        await post('/api/cover-letters', body);
        toastOk(t('documents.coverCreate.toast'));
        close();
        await reload();
      }),
    ],
  });
}

async function openCoverDetail(id, reload) {
  let data;
  try {
    data = (await get(`/api/cover-letters/${id}`)).cover_letter;
  } catch (err) {
    toastError(err);
    return;
  }
  const job = data.job_id ? (await get(`/api/jobs/${data.job_id}`).catch(() => null))?.job : null;

  openModal({
    title: data.title,
    size: 'lg',
    body: (close) => {
      const container = el('div', {});
      const draw = (cl) => mount(container, CoverDetailBody(cl, job, {
        refresh: async () => {
          data = (await get(`/api/cover-letters/${id}`)).cover_letter;
          draw(data);
          await reload();
        },
        onClose: close,
      }));
      draw(data);
      return container;
    },
  });
}

function CoverDetailBody(cl, job, { refresh }) {
  const versions = (cl.versions || []).slice().sort((a, b) => b.version_no - a.version_no);
  const wrap = el('div', { class: 'stack-4' });

  // header meta + export
  wrap.append(el('div', { class: 'flex between wrap gap-2' },
    el('div', { class: 'flex gap-2 wrap' },
      JobLink(job),
      el('span', { class: 'chip' }, t('documents.cover.versionCount', { count: cl.version_count })),
      cl.is_primary ? Badge('accent', t('documents.cover.primary')) : null,
    ),
    el('div', { class: 'flex gap-2 wrap' },
      ExportMenu(`/api/export/cover-letter/${cl.id}`),
    ),
  ));

  // preview — defaults to current content; can be swapped per-version
  const previewLabel = el('div', { class: 'flex between center' },
    el('h3', { style: { fontSize: '14px', margin: 0 } }, t('documents.coverDetail.currentVersion')),
    Btn(t('documents.coverDetail.copy'), { sm: true, variant: 'ghost', icon: 'copy', onClick: () => copyText(previewText) }),
  );
  let previewText = cl.current_content || '';
  const preview = el('div', { class: 'doc-preview doc-preview--md' }, previewText ? Markdown(previewText) : t('documents.coverDetail.noContent'));

  const setPreview = (label, text) => {
    previewLabel.firstChild.textContent = label;
    previewText = text || '';
    mount(preview, text ? Markdown(text) : t('documents.coverDetail.noContent'));
  };

  wrap.append(el('div', { class: 'stack-2' }, previewLabel, preview));

  // edit -> new version
  wrap.append(EditNewVersion(cl, refresh));

  // version history timeline
  wrap.append(el('div', { class: 'stack-2' },
    el('h3', { style: { fontSize: '14px', margin: 0 } }, t('documents.coverDetail.history')),
    versions.length
      ? el('div', { class: 'timeline' }, ...versions.map((v) =>
          VersionItem(cl, v, { isCurrent: v.id === cl.current_version_id, setPreview, refresh })))
      : el('p', { class: 'muted', style: { margin: 0 } }, t('documents.coverDetail.historyEmpty')),
  ));

  return wrap;
}

function VersionItem(cl, v, { isCurrent, setPreview, refresh }) {
  const head = el('div', { class: 'flex between wrap gap-2 center' },
    el('div', { class: 'flex gap-2 center wrap' },
      el('span', { class: 'strong' }, t('documents.version.label', { n: v.version_no })),
      isCurrent ? Badge('applied', t('documents.version.current')) : null,
      el('span', { class: 'chip' }, t('source.' + v.source)),
    ),
    el('span', { class: 'muted text-sm' }, fmtRelative(v.created_at)),
  );

  const note = v.note ? el('div', { class: 'text-secondary text-sm', style: { marginTop: '4px' } }, v.note) : null;

  const actions = el('div', { class: 'flex gap-2 wrap', style: { marginTop: '8px' } },
    Btn(t('documents.version.view'), { sm: true, variant: 'ghost', icon: 'external', onClick: () => setPreview(t('documents.version.viewLabel', { n: v.version_no }), v.content) }),
    isCurrent ? null : Btn(t('documents.version.makeCurrent'), { sm: true, variant: 'ghost', icon: 'check', onClick: () => makeCurrent(cl.id, v.id, refresh) }),
    Btn(t('documents.version.copy'), { sm: true, variant: 'ghost', icon: 'copy', onClick: () => copyText(v.content || '') }),
  );

  return el('div', { class: `tl-item${isCurrent ? ' is-current' : ''}` },
    el('div', { class: 'tl-item__rail' },
      el('div', { class: 'tl-item__dot' }),
      el('div', { class: 'tl-item__line' }),
    ),
    el('div', { class: 'tl-item__body' }, head, note, actions),
  );
}

async function makeCurrent(id, versionId, refresh) {
  try {
    await put(`/api/cover-letters/${id}/current-version`, { version_id: versionId });
    toastOk(t('documents.version.makeCurrentToast'));
    await refresh();
  } catch (err) { toastError(err); }
}

function EditNewVersion(cl, refresh) {
  const editor = el('div', { class: 'stack-3', style: { display: 'none' } });
  const content = Textarea({ style: { minHeight: '220px' } });
  content.value = cl.current_content || '';
  const note = Input({ placeholder: t('documents.editVersion.notePlaceholder') });

  editor.append(
    Field(t('documents.editVersion.fieldContent'), content),
    Field(t('documents.editVersion.fieldNote'), note),
    el('div', { class: 'flex gap-2' },
      SubmitBtn(t('documents.editVersion.submit'), async () => {
        if (!content.value.trim()) { content.focus(); throw new Error(t('documents.editVersion.contentRequired')); }
        await post(`/api/cover-letters/${cl.id}/versions`, {
          content: content.value, note: note.value.trim() || undefined, source: 'edit',
        });
        toastOk(t('documents.editVersion.toast'));
        await refresh();
      }, { icon: 'check' }),
      Btn(t('documents.editVersion.cancel'), { variant: 'ghost', onClick: () => { editor.style.display = 'none'; toggle.style.display = ''; } }),
    ),
  );

  const toggle = Btn(t('documents.editVersion.toggle'), {
    variant: 'primary', icon: 'edit',
    onClick: () => {
      content.value = cl.current_content || '';
      editor.style.display = '';
      toggle.style.display = 'none';
      content.focus();
    },
  });

  return el('div', { class: 'stack-2' }, toggle, editor);
}

/* ============================================== Kind tabs (이력서·경력기술서·포트폴리오·기타) */

async function KindTab(kind, reload) {
  const [{ documents: list }, m] = await Promise.all([get(`/api/documents?kind=${kind}`), meta()]);
  const kindLabels = Object.fromEntries((m.document_kinds || []).map((k) => [k.value, t('kind.' + k.value)]));
  const wrap = el('div', { class: 'stack-3' });
  wrap.dataset.hasItems = list.length ? 'true' : 'false';

  if (!list.length) {
    return mountInto(wrap, EmptyState({
      iconName: 'file',
      title: t('documents.kind.empty.title.' + kind),
      body: t('documents.kind.empty.body.' + kind),
      action: Btn(t('documents.kind.empty.action'), { icon: 'plus', variant: 'primary', onClick: () => openDocCreate(reload, kind) }),
    }));
  }

  for (const doc of list) wrap.append(DocRow(doc, kindLabels, m, reload));
  return wrap;
}

function DocRow(doc, kindLabels, m, reload) {
  const head = el('div', { class: 'flex between wrap gap-2 center' },
    el('div', { class: 'flex gap-2 wrap center' },
      el('span', { class: 'strong' }, doc.title),
      el('span', { class: 'chip' }, kindLabels[doc.kind] || doc.kind),
      doc.is_primary ? Badge('accent', t('documents.cover.primary')) : null,
    ),
    el('span', { class: 'muted text-sm' }, fmtRelative(doc.updated_at)),
  );

  return Card({
    clickable: true,
    onClick: () => openDocDetail(doc.id, kindLabels, m, reload),
    body: [
      head,
      el('p', { class: 'text-secondary text-sm truncate', style: { margin: '8px 0 0', maxWidth: '100%' } }, firstLine(doc.content)),
      (doc.tags && doc.tags.length)
        ? el('div', { class: 'chips', style: { marginTop: '8px' } }, ...doc.tags.map((t) => el('span', { class: 'chip chip--accent' }, t)))
        : null,
    ],
  });
}

async function openDocDetail(id, kindLabels, m, reload) {
  let doc;
  try {
    doc = (await get(`/api/documents/${id}`)).document;
  } catch (err) {
    toastError(err);
    return;
  }

  openModal({
    title: doc.title,
    size: 'lg',
    body: el('div', { class: 'stack-3' },
      el('div', { class: 'flex gap-2 wrap center' },
        el('span', { class: 'chip' }, kindLabels[doc.kind] || doc.kind),
        doc.is_primary ? Badge('accent', t('documents.cover.primary')) : null,
        el('span', { class: 'chip' }, t('source.' + doc.source)),
        el('span', { class: 'muted text-sm' }, t('documents.docDetail.updated', { when: fmtRelative(doc.updated_at) })),
      ),
      el('div', { class: 'doc-preview doc-preview--md' }, doc.content ? Markdown(doc.content) : t('documents.docDetail.noContent')),
    ),
    footer: (close) => [
      Btn(t('documents.docDetail.copy'), { variant: 'ghost', icon: 'copy', onClick: () => copyText(doc.content || '') }),
      ExportMenu(`/api/export/document/${doc.id}`, { sm: false, photo: doc.kind === 'resume' || doc.kind === 'career_description' }),
      Btn(t('documents.docDetail.delete'), { variant: 'danger', icon: 'trash', onClick: async () => {
        const ok = await confirmDialog({ title: t('documents.docDetail.deleteTitle'), message: t('documents.docDetail.deleteConfirm', { title: doc.title }), confirmLabel: t('documents.docDetail.deleteConfirmLabel'), danger: true });
        if (!ok) return;
        try { await del(`/api/documents/${doc.id}`); toastOk(t('documents.docDetail.deleteToast')); close(); await reload(); }
        catch (err) { toastError(err); }
      } }),
      Btn(t('documents.docDetail.edit'), { variant: 'primary', icon: 'edit', onClick: () => { close(); openDocEdit(doc, m, reload); } }),
    ],
  });
}

function openDocCreate(reload, defaultKind = 'resume') {
  meta().then((m) => docForm(null, m, reload, defaultKind)).catch(toastError);
}

function openDocEdit(doc, m, reload) {
  docForm(doc, m, reload, doc?.kind || 'resume');
}

function docForm(doc, m, reload, defaultKind = 'resume') {
  const kindLabel = (m.document_kinds || []).some((k) => k.value === defaultKind) ? t('kind.' + defaultKind) : t('documents.docForm.defaultKind');
  const kinds = (m.document_kinds || []).map((k) => ({ value: k.value, label: t('kind.' + k.value), selected: doc ? doc.kind === k.value : k.value === defaultKind }));
  const kind = Select(kinds);
  const title = Input({ value: doc?.title || '', placeholder: defaultKind === 'career_description' ? t('documents.docForm.titlePlaceholderCareer') : t('documents.docForm.titlePlaceholderDefault'), attrs: { maxlength: '200' } });
  const content = Textarea({ placeholder: defaultKind === 'career_description' ? t('documents.docForm.contentPlaceholderCareer') : t('documents.docForm.contentPlaceholderDefault'), style: { minHeight: '300px' } });
  content.value = doc?.content || '';
  const primary = el('input', { type: 'checkbox', checked: !!doc?.is_primary });

  openModal({
    title: doc ? t('documents.docForm.editTitle') : t('documents.docForm.createTitle', { kind: kindLabel }),
    size: 'lg',
    body: el('div', { class: 'stack-3' },
      Field(t('documents.docForm.fieldKind'), kind),
      Field(t('documents.docForm.fieldTitle'), title),
      Field(t('documents.docForm.fieldContent'), content),
      Field(null, el('label', { class: 'flex gap-2 center', style: { cursor: 'pointer' } }, primary, el('span', {}, t('documents.docForm.markPrimary')))),
    ),
    footer: (close) => [
      Btn(t('documents.docForm.cancel'), { onClick: close }),
      SubmitBtn(t('documents.docForm.submit'), async () => {
        const tv = title.value.trim();
        if (!tv) { title.focus(); throw new Error(t('documents.docForm.titleRequired')); }
        if (!content.value.trim()) { content.focus(); throw new Error(t('documents.docForm.contentRequired')); }
        const body = { kind: kind.value, title: tv, content: content.value, is_primary: primary.checked };
        if (doc) await put(`/api/documents/${doc.id}`, body);
        else await post('/api/documents', { ...body, source: 'manual' });
        toastOk(doc ? t('documents.docForm.editToast') : t('documents.docForm.createToast'));
        close();
        await reload();
      }),
    ],
  });
}

/* ------------------------------------------------------------------ helpers */

function firstLine(text) {
  if (!text) return '';
  const line = (String(text).split('\n').find((l) => l.trim()) || '').trim().replace(/^(#{1,6}|[-*+]|\d+\.)\s+/, '').replace(/\*\*/g, '');
  return line.length > 140 ? line.slice(0, 140) + '…' : line;
}

function mountInto(wrap, node) { wrap.append(node); return wrap; }

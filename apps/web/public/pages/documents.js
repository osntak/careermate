// Documents — cover letters (with version history), career descriptions, and résumés/other documents.
// XSS-safe: all DB/user text rendered via el() textContent / .doc-preview (never innerHTML).
import {
  el, get, post, put, del, Card, Badge, Btn, IconBtn, SubmitBtn, EmptyState,
  Field, Input, Textarea, Select, openModal, confirmDialog,
  toastOk, toastError, copyText, downloadUrl, fmtRelative, mount, meta,
} from '/lib.js';
import { t } from '/i18n.js';

// Module-scoped on purpose: remember the last-viewed tab ('cover' | 'career' | 'docs') across
// navigations so returning to Documents reopens where the user left off. The search
// query is intentionally NOT persisted (it resets per visit).
let tab = 'cover';
let openedDeepLink = '';

export async function render(ctx) {
  const requestedTab = ['cover', 'career', 'docs'].includes(ctx.params?.[0]) ? ctx.params[0] : null;
  const requestedId = ctx.params?.[1] || '';
  if (requestedTab) tab = requestedTab;

  const root = el('div', { class: 'stack-4' });

  const panel = el('div', {});
  const tabCover = el('div', { class: `tab${tab === 'cover' ? ' is-active' : ''}`, onClick: () => selectTab('cover') }, t('documents.tab.cover'));
  const tabCareer = el('div', { class: `tab${tab === 'career' ? ' is-active' : ''}`, onClick: () => selectTab('career') }, t('documents.tab.career'));
  const tabDocs = el('div', { class: `tab${tab === 'docs' ? ' is-active' : ''}`, onClick: () => selectTab('docs') }, t('documents.tab.docs'));
  root.append(el('div', { class: 'tabs' }, tabCover, tabCareer, tabDocs), panel);

  let query = '';
  let searchInput = null;
  function selectTab(next) {
    tab = next;
    query = '';
    tabCover.classList.toggle('is-active', tab === 'cover');
    tabCareer.classList.toggle('is-active', tab === 'career');
    tabDocs.classList.toggle('is-active', tab === 'docs');
    setActions();
    renderPanel();
  }

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
      if (tab === 'cover') mount(panel, await CoverLettersTab(reload));
      else if (tab === 'career') mount(panel, await CareerDescriptionsTab(reload));
      else mount(panel, await DocumentsTab(reload));
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
    const placeholder = tab === 'cover' ? t('documents.search.cover') : tab === 'career' ? t('documents.search.career') : t('documents.search.docs');
    const search = Input({ type: 'search', placeholder, value: query, attrs: { 'aria-label': t('documents.search.aria') } });
    search.classList.add('input--inline');
    searchInput = search;
    search.addEventListener('input', () => { query = search.value; applyFilter(); });
    let createBtn;
    if (tab === 'cover') createBtn = Btn(t('documents.action.coverCreate'), { icon: 'plus', variant: 'primary', onClick: () => openCoverCreate(reload) });
    else if (tab === 'career') createBtn = Btn(t('documents.action.careerCreate'), { icon: 'plus', variant: 'primary', onClick: () => openDocCreate(reload, 'career_description') });
    else createBtn = Btn(t('documents.action.docCreate'), { icon: 'plus', variant: 'primary', onClick: () => openDocCreate(reload) });
    ctx.setActions([search, createBtn]);
  }

  mount(ctx.view, root);
  setActions();
  await renderPanel();
}

/* ============================================================ Tab A — 자기소개서 */

async function CoverLettersTab(reload) {
  const { cover_letters: list } = await get('/api/cover-letters');
  const wrap = el('div', { class: 'stack-3' });

  if (!list.length) {
    return mountInto(wrap, EmptyState({
      iconName: 'file',
      title: t('documents.cover.empty.title'),
      body: t('documents.cover.empty.body'),
      action: Btn(t('documents.action.coverCreate'), { icon: 'plus', variant: 'primary', onClick: () => openCoverCreate(reload) }),
    }));
  }

  for (const cl of list) wrap.append(CoverRow(cl, reload));
  return wrap;
}

function CoverRow(cl, reload) {
  const metaRow = el('div', { class: 'flex gap-2 wrap', style: { marginTop: '4px' } },
    el('span', { class: 'chip' }, t('documents.cover.versionCount', { count: cl.version_count })),
    cl.is_primary ? Badge('accent', t('documents.cover.primary')) : null,
  );

  const actions = el('div', { class: 'flex gap-2 wrap' },
    Btn(t('documents.cover.open'), { sm: true, icon: 'external', onClick: () => openCoverDetail(cl.id, reload) }),
    Btn(t('documents.cover.copy'), { sm: true, variant: 'ghost', icon: 'copy', onClick: () => copyText(cl.current_content || ''), disabled: !cl.current_content }),
    Btn(t('documents.cover.exportDocx'), { sm: true, variant: 'ghost', icon: 'download', title: t('documents.cover.exportDocxTitle'), onClick: () => downloadUrl(`/api/export/cover-letter/${cl.id}?format=docx`) }),
    Btn(t('documents.cover.exportMd'), { sm: true, variant: 'ghost', icon: 'download', title: t('documents.cover.exportMdTitle'), onClick: () => downloadUrl(`/api/export/cover-letter/${cl.id}?format=md`) }),
    Btn(t('documents.cover.exportHtml'), { sm: true, variant: 'ghost', icon: 'download', title: t('documents.cover.exportHtmlTitle'), onClick: () => downloadUrl(`/api/export/cover-letter/${cl.id}?format=html`) }),
    cl.is_primary ? null : Btn(t('documents.cover.setPrimary'), { sm: true, variant: 'ghost', icon: 'check', onClick: () => setPrimaryCover(cl.id, reload) }),
    IconBtn('trash', { variant: 'danger', title: t('documents.cover.delete'), onClick: () => removeCover(cl, reload) }),
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

  openModal({
    title: data.title,
    size: 'lg',
    body: (close) => {
      const container = el('div', {});
      const draw = (cl) => mount(container, CoverDetailBody(cl, {
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

function CoverDetailBody(cl, { refresh }) {
  const versions = (cl.versions || []).slice().sort((a, b) => b.version_no - a.version_no);
  const wrap = el('div', { class: 'stack-4' });

  // header meta + export
  wrap.append(el('div', { class: 'flex between wrap gap-2' },
    el('div', { class: 'flex gap-2 wrap' },
      el('span', { class: 'chip' }, t('documents.cover.versionCount', { count: cl.version_count })),
      cl.is_primary ? Badge('accent', t('documents.cover.primary')) : null,
    ),
    el('div', { class: 'flex gap-2 wrap' },
      Btn(t('documents.coverDetail.exportDocx'), { sm: true, variant: 'ghost', icon: 'download', onClick: () => downloadUrl(`/api/export/cover-letter/${cl.id}?format=docx`) }),
      Btn(t('documents.coverDetail.exportMd'), { sm: true, variant: 'ghost', icon: 'download', onClick: () => downloadUrl(`/api/export/cover-letter/${cl.id}?format=md`) }),
      Btn(t('documents.coverDetail.exportHtml'), { sm: true, variant: 'ghost', icon: 'download', onClick: () => downloadUrl(`/api/export/cover-letter/${cl.id}?format=html`) }),
    ),
  ));

  // preview — defaults to current content; can be swapped per-version
  const previewLabel = el('div', { class: 'flex between center' },
    el('h3', { style: { fontSize: '14px', margin: 0 } }, t('documents.coverDetail.currentVersion')),
    Btn(t('documents.coverDetail.copy'), { sm: true, variant: 'ghost', icon: 'copy', onClick: () => copyText(preview.textContent || '') }),
  );
  const preview = el('div', { class: 'doc-preview' }, cl.current_content || t('documents.coverDetail.noContent'));

  const setPreview = (label, text) => {
    previewLabel.firstChild.textContent = label;
    mount(preview, text || t('documents.coverDetail.noContent'));
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

/* ============================================================ Tab B — 경력기술서 */

async function CareerDescriptionsTab(reload) {
  const [{ documents: list }, m] = await Promise.all([get('/api/documents?kind=career_description'), meta()]);
  const kindLabels = Object.fromEntries((m.document_kinds || []).map((k) => [k.value, t('kind.' + k.value)]));
  const wrap = el('div', { class: 'stack-3' });

  if (!list.length) {
    return mountInto(wrap, EmptyState({
      iconName: 'file',
      title: t('documents.career.empty.title'),
      body: t('documents.career.empty.body'),
      action: Btn(t('documents.career.empty.action'), { icon: 'plus', variant: 'primary', onClick: () => openDocCreate(reload, 'career_description') }),
    }));
  }

  for (const doc of list) wrap.append(DocRow(doc, kindLabels, m, reload));
  return wrap;
}

/* ============================================================ Tab C — 이력서·포트폴리오 */

async function DocumentsTab(reload) {
  const [{ documents }, m] = await Promise.all([get('/api/documents'), meta()]);
  const list = (documents || []).filter((doc) => doc.kind !== 'career_description');
  const kindLabels = Object.fromEntries((m.document_kinds || []).map((k) => [k.value, t('kind.' + k.value)]));
  const wrap = el('div', { class: 'stack-3' });

  if (!list.length) {
    return mountInto(wrap, EmptyState({
      iconName: 'file',
      title: t('documents.docs.empty.title'),
      body: t('documents.docs.empty.body'),
      action: Btn(t('documents.docs.empty.action'), { icon: 'plus', variant: 'primary', onClick: () => openDocCreate(reload) }),
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
      el('div', { class: 'doc-preview' }, doc.content || t('documents.docDetail.noContent')),
    ),
    footer: (close) => [
      Btn(t('documents.docDetail.copy'), { variant: 'ghost', icon: 'copy', onClick: () => copyText(doc.content || '') }),
      Btn(t('documents.docDetail.exportDocx'), { variant: 'ghost', icon: 'download', title: t('documents.docDetail.exportDocxTitle'), onClick: () => downloadUrl(`/api/export/document/${doc.id}?format=docx`) }),
      Btn(t('documents.docDetail.export'), { variant: 'ghost', icon: 'download', title: t('documents.docDetail.exportTitle'), onClick: () => downloadUrl(`/api/export/document/${doc.id}?format=md`) }),
      Btn(t('documents.docDetail.exportHtml'), { variant: 'ghost', icon: 'download', title: t('documents.docDetail.exportHtmlTitle'), onClick: () => downloadUrl(`/api/export/document/${doc.id}?format=html`) }),
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
  const line = String(text).split('\n').find((l) => l.trim()) || '';
  return line.length > 140 ? line.slice(0, 140) + '…' : line;
}

function mountInto(wrap, node) { wrap.append(node); return wrap; }

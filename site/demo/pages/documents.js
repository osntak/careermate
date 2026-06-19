// Documents — cover letters (with version history), career descriptions, and résumés/other documents.
// XSS-safe: all DB/user text rendered via el() textContent / .doc-preview (never innerHTML).
import {
  el, get, post, put, del, Card, Badge, Btn, IconBtn, SubmitBtn, EmptyState,
  Field, Input, Textarea, Select, openModal, confirmDialog,
  toastOk, toastError, copyText, downloadUrl, fmtRelative, mount, meta,
} from '/demo/lib.js';

const SOURCE_LABELS = { manual: '직접 입력', upload: '파일 업로드', ai: 'AI 생성', edit: '직접 수정' };
const sourceLabel = (s) => SOURCE_LABELS[s] || s || '';

// Module-scoped on purpose: remember the last-viewed tab ('cover' | 'career' | 'docs') across
// navigations so returning to Documents reopens where the user left off. The search
// query is intentionally NOT persisted (it resets per visit).
let tab = 'cover';

export async function render(ctx) {
  if (['cover', 'career', 'docs'].includes(ctx.params?.[0])) tab = ctx.params[0];

  const root = el('div', { class: 'stack-4' });

  const panel = el('div', {});
  const tabCover = el('div', { class: `tab${tab === 'cover' ? ' is-active' : ''}`, onClick: () => selectTab('cover') }, '자기소개서');
  const tabCareer = el('div', { class: `tab${tab === 'career' ? ' is-active' : ''}`, onClick: () => selectTab('career') }, '경력기술서');
  const tabDocs = el('div', { class: `tab${tab === 'docs' ? ' is-active' : ''}`, onClick: () => selectTab('docs') }, '이력서·포트폴리오');
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
        el('p', { class: 'muted', style: { margin: '0 0 12px' } }, `‘${query.trim()}’에 맞는 항목이 없어요.`),
        Btn('필터 초기화', { sm: true, variant: 'ghost', onClick: () => { query = ''; if (searchInput) searchInput.value = ''; applyFilter(); } })));
    }
  }

  async function reload() {
    await renderPanel();
    await ctx.refreshNav();
  }

  async function renderPanel() {
    mount(panel, el('div', { class: 'muted text-sm' }, '불러오는 중…'));
    try {
      if (tab === 'cover') mount(panel, await CoverLettersTab(reload));
      else if (tab === 'career') mount(panel, await CareerDescriptionsTab(reload));
      else mount(panel, await DocumentsTab(reload));
      applyFilter();
    } catch (err) {
      toastError(err);
      mount(panel, el('div', { class: 'card' }, el('div', { class: 'card__body' },
        el('p', { class: 'text-secondary' }, err instanceof Error ? err.message : String(err)))));
    }
  }

  // topbar: search (filters the active tab) + the tab's create action
  function setActions() {
    const placeholder = tab === 'cover' ? '자기소개서 검색' : tab === 'career' ? '경력기술서 검색' : '이력서·포트폴리오 검색';
    const search = Input({ type: 'search', placeholder, value: query, attrs: { 'aria-label': '검색' } });
    search.classList.add('input--inline');
    searchInput = search;
    search.addEventListener('input', () => { query = search.value; applyFilter(); });
    let createBtn;
    if (tab === 'cover') createBtn = Btn('새 자기소개서', { icon: 'plus', variant: 'primary', onClick: () => openCoverCreate(reload) });
    else if (tab === 'career') createBtn = Btn('경력기술서 추가', { icon: 'plus', variant: 'primary', onClick: () => openDocCreate(reload, 'career_description') });
    else createBtn = Btn('문서 추가', { icon: 'plus', variant: 'primary', onClick: () => openDocCreate(reload) });
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
      title: '아직 자기소개서가 없어요',
      body: '작성하거나 붙여넣어 버전과 함께 보관하세요.',
      action: Btn('새 자기소개서', { icon: 'plus', variant: 'primary', onClick: () => openCoverCreate(reload) }),
    }));
  }

  for (const cl of list) wrap.append(CoverRow(cl, reload));
  return wrap;
}

function CoverRow(cl, reload) {
  const metaRow = el('div', { class: 'flex gap-2 wrap', style: { marginTop: '4px' } },
    el('span', { class: 'chip' }, `버전 ${cl.version_count}개`),
    cl.is_primary ? Badge('accent', '대표') : null,
  );

  const actions = el('div', { class: 'flex gap-2 wrap' },
    Btn('열기', { sm: true, icon: 'external', onClick: () => openCoverDetail(cl.id, reload) }),
    Btn('복사', { sm: true, variant: 'ghost', icon: 'copy', onClick: () => copyText(cl.current_content || ''), disabled: !cl.current_content }),
    Btn('MD', { sm: true, variant: 'ghost', icon: 'download', title: 'Markdown 내보내기', onClick: () => downloadUrl(`/api/export/cover-letter/${cl.id}?format=md`) }),
    Btn('HTML', { sm: true, variant: 'ghost', icon: 'download', title: 'HTML 내보내기', onClick: () => downloadUrl(`/api/export/cover-letter/${cl.id}?format=html`) }),
    cl.is_primary ? null : Btn('대표 지정', { sm: true, variant: 'ghost', icon: 'check', onClick: () => setPrimaryCover(cl.id, reload) }),
    IconBtn('trash', { variant: 'danger', title: '삭제', onClick: () => removeCover(cl, reload) }),
  );

  return Card({
    title: cl.title,
    body: [
      metaRow,
      cl.current_content
        ? el('p', { class: 'text-secondary text-sm truncate', style: { margin: '8px 0 0', maxWidth: '100%' } }, firstLine(cl.current_content))
        : el('p', { class: 'muted text-sm', style: { margin: '8px 0 0' } }, '아직 내용이 없습니다.'),
      el('div', { class: 'divider' }),
      actions,
    ],
  });
}

async function setPrimaryCover(id, reload) {
  try {
    await put(`/api/cover-letters/${id}/primary`, {});
    toastOk('대표 자기소개서로 지정했어요.');
    await reload();
  } catch (err) { toastError(err); }
}

async function removeCover(cl, reload) {
  const ok = await confirmDialog({
    title: '자기소개서 삭제',
    message: `"${cl.title}"을(를) 삭제할까요? 모든 버전 기록이 함께 삭제됩니다.`,
    confirmLabel: '삭제', danger: true,
  });
  if (!ok) return;
  try {
    await del(`/api/cover-letters/${cl.id}`);
    toastOk('자기소개서를 삭제했어요.');
    await reload();
  } catch (err) { toastError(err); }
}

async function openCoverCreate(reload) {
  // Let the user PICK the job to link instead of typing an internal ID they've never seen.
  let jobs = [];
  try { ({ jobs } = await get('/api/jobs')); } catch { /* dropdown falls back to "연결 안 함" */ }
  const title = Input({ placeholder: '예: 백엔드 개발자 자기소개서', attrs: { maxlength: '200' } });
  const content = Textarea({ placeholder: '내용을 붙여넣으세요. 비워 두면 빈 자기소개서가 만들어집니다.', style: { minHeight: '200px' } });
  const jobPick = Select([
    { value: '', label: '연결 안 함', selected: true },
    ...jobs.map((j) => ({ value: j.id, label: `${j.company} · ${j.position}` })),
  ]);

  openModal({
    title: '새 자기소개서',
    size: 'lg',
    body: el('div', { class: 'stack-3' },
      Field('제목 (필수)', title),
      Field('내용 (선택)', content, '내용을 입력하면 첫 버전으로 저장됩니다.'),
      Field('연결할 공고 (선택)', jobPick,
        jobs.length ? '특정 공고에 연결하면 그 공고 화면에서 함께 보여요.' : '저장된 공고가 아직 없어요.'),
    ),
    footer: (close) => [
      Btn('취소', { onClick: close }),
      SubmitBtn('자기소개서 저장', async () => {
        const t = title.value.trim();
        if (!t) { title.focus(); throw new Error('제목을 입력해 주세요.'); }
        const body = { title: t, source: 'manual' };
        if (content.value.trim()) body.content = content.value;
        if (jobPick.value) body.job_id = jobPick.value;
        await post('/api/cover-letters', body);
        toastOk('자기소개서를 추가했어요.');
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
      el('span', { class: 'chip' }, `버전 ${cl.version_count}개`),
      cl.is_primary ? Badge('accent', '대표') : null,
    ),
    el('div', { class: 'flex gap-2 wrap' },
      Btn('MD 내보내기', { sm: true, variant: 'ghost', icon: 'download', onClick: () => downloadUrl(`/api/export/cover-letter/${cl.id}?format=md`) }),
      Btn('HTML 내보내기', { sm: true, variant: 'ghost', icon: 'download', onClick: () => downloadUrl(`/api/export/cover-letter/${cl.id}?format=html`) }),
    ),
  ));

  // preview — defaults to current content; can be swapped per-version
  const previewLabel = el('div', { class: 'flex between center' },
    el('h3', { style: { fontSize: '14px', margin: 0 } }, '현재 버전'),
    Btn('복사', { sm: true, variant: 'ghost', icon: 'copy', onClick: () => copyText(preview.textContent || '') }),
  );
  const preview = el('div', { class: 'doc-preview' }, cl.current_content || '내용이 없습니다.');

  const setPreview = (label, text) => {
    previewLabel.firstChild.textContent = label;
    mount(preview, text || '내용이 없습니다.');
  };

  wrap.append(el('div', { class: 'stack-2' }, previewLabel, preview));

  // edit -> new version
  wrap.append(EditNewVersion(cl, refresh));

  // version history timeline
  wrap.append(el('div', { class: 'stack-2' },
    el('h3', { style: { fontSize: '14px', margin: 0 } }, '버전 기록'),
    versions.length
      ? el('div', { class: 'timeline' }, ...versions.map((v) =>
          VersionItem(cl, v, { isCurrent: v.id === cl.current_version_id, setPreview, refresh })))
      : el('p', { class: 'muted', style: { margin: 0 } }, '아직 버전 기록이 없습니다.'),
  ));

  return wrap;
}

function VersionItem(cl, v, { isCurrent, setPreview, refresh }) {
  const head = el('div', { class: 'flex between wrap gap-2 center' },
    el('div', { class: 'flex gap-2 center wrap' },
      el('span', { class: 'strong' }, `v${v.version_no}`),
      isCurrent ? Badge('applied', '현재 버전') : null,
      el('span', { class: 'chip' }, sourceLabel(v.source)),
    ),
    el('span', { class: 'muted text-sm' }, fmtRelative(v.created_at)),
  );

  const note = v.note ? el('div', { class: 'text-secondary text-sm', style: { marginTop: '4px' } }, v.note) : null;

  const actions = el('div', { class: 'flex gap-2 wrap', style: { marginTop: '8px' } },
    Btn('이 버전 보기', { sm: true, variant: 'ghost', icon: 'external', onClick: () => setPreview(`v${v.version_no} 보기`, v.content) }),
    isCurrent ? null : Btn('현재 버전으로 지정', { sm: true, variant: 'ghost', icon: 'check', onClick: () => makeCurrent(cl.id, v.id, refresh) }),
    Btn('복사', { sm: true, variant: 'ghost', icon: 'copy', onClick: () => copyText(v.content || '') }),
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
    toastOk('현재 버전을 변경했어요.');
    await refresh();
  } catch (err) { toastError(err); }
}

function EditNewVersion(cl, refresh) {
  const editor = el('div', { class: 'stack-3', style: { display: 'none' } });
  const content = Textarea({ style: { minHeight: '220px' } });
  content.value = cl.current_content || '';
  const note = Input({ placeholder: '예: 지원동기 보강, 문장 다듬기' });

  editor.append(
    Field('내용', content),
    Field('변경 메모 (선택)', note),
    el('div', { class: 'flex gap-2' },
      SubmitBtn('새 버전으로 저장', async () => {
        if (!content.value.trim()) { content.focus(); throw new Error('내용을 입력해 주세요.'); }
        await post(`/api/cover-letters/${cl.id}/versions`, {
          content: content.value, note: note.value.trim() || undefined, source: 'edit',
        });
        toastOk('새 버전을 저장했어요.');
        await refresh();
      }, { icon: 'check' }),
      Btn('취소', { variant: 'ghost', onClick: () => { editor.style.display = 'none'; toggle.style.display = ''; } }),
    ),
  );

  const toggle = Btn('수정하여 새 버전 저장', {
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
  const kindLabels = Object.fromEntries((m.document_kinds || []).map((k) => [k.value, k.label]));
  const wrap = el('div', { class: 'stack-3' });

  if (!list.length) {
    return mountInto(wrap, EmptyState({
      iconName: 'file',
      title: '아직 경력기술서가 없어요',
      body: 'AI에게 경력기술서 작성을 요청하면 여기에 저장돼요.',
      action: Btn('직접 추가', { icon: 'plus', variant: 'primary', onClick: () => openDocCreate(reload, 'career_description') }),
    }));
  }

  for (const doc of list) wrap.append(DocRow(doc, kindLabels, m, reload));
  return wrap;
}

/* ============================================================ Tab C — 이력서·포트폴리오 */

async function DocumentsTab(reload) {
  const [{ documents }, m] = await Promise.all([get('/api/documents'), meta()]);
  const list = (documents || []).filter((doc) => doc.kind !== 'career_description');
  const kindLabels = Object.fromEntries((m.document_kinds || []).map((k) => [k.value, k.label]));
  const wrap = el('div', { class: 'stack-3' });

  if (!list.length) {
    return mountInto(wrap, EmptyState({
      iconName: 'file',
      title: '저장된 문서가 없어요',
      body: '이력서·포트폴리오·기타 문서를 보관하세요.',
      action: Btn('문서 추가', { icon: 'plus', variant: 'primary', onClick: () => openDocCreate(reload) }),
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
      doc.is_primary ? Badge('accent', '대표') : null,
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
        doc.is_primary ? Badge('accent', '대표') : null,
        el('span', { class: 'chip' }, sourceLabel(doc.source)),
        el('span', { class: 'muted text-sm' }, `수정 ${fmtRelative(doc.updated_at)}`),
      ),
      el('div', { class: 'doc-preview' }, doc.content || '내용이 없습니다.'),
    ),
    footer: (close) => [
      Btn('복사', { variant: 'ghost', icon: 'copy', onClick: () => copyText(doc.content || '') }),
      Btn('내보내기', { variant: 'ghost', icon: 'download', title: 'Markdown 내보내기', onClick: () => downloadUrl(`/api/export/document/${doc.id}?format=md`) }),
      Btn('삭제', { variant: 'danger', icon: 'trash', onClick: async () => {
        const ok = await confirmDialog({ title: '문서 삭제', message: `"${doc.title}"을(를) 삭제할까요?`, confirmLabel: '삭제', danger: true });
        if (!ok) return;
        try { await del(`/api/documents/${doc.id}`); toastOk('문서를 삭제했어요.'); close(); await reload(); }
        catch (err) { toastError(err); }
      } }),
      Btn('수정', { variant: 'primary', icon: 'edit', onClick: () => { close(); openDocEdit(doc, m, reload); } }),
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
  const kindLabel = (m.document_kinds || []).find((k) => k.value === defaultKind)?.label || '문서';
  const kinds = (m.document_kinds || []).map((k) => ({ value: k.value, label: k.label, selected: doc ? doc.kind === k.value : k.value === defaultKind }));
  const kind = Select(kinds);
  const title = Input({ value: doc?.title || '', placeholder: defaultKind === 'career_description' ? '예: 마스터 경력기술서' : '예: 2026 이력서', attrs: { maxlength: '200' } });
  const content = Textarea({ placeholder: defaultKind === 'career_description' ? '경력기술서 본문을 붙여넣으세요.' : '이력서·포트폴리오 본문을 붙여넣으세요.', style: { minHeight: '300px' } });
  content.value = doc?.content || '';
  const primary = el('input', { type: 'checkbox', checked: !!doc?.is_primary });

  openModal({
    title: doc ? '문서 수정' : `${kindLabel} 추가`,
    size: 'lg',
    body: el('div', { class: 'stack-3' },
      Field('종류', kind),
      Field('제목 (필수)', title),
      Field('내용 (필수)', content),
      Field(null, el('label', { class: 'flex gap-2 center', style: { cursor: 'pointer' } }, primary, el('span', {}, '대표 문서로 지정'))),
    ),
    footer: (close) => [
      Btn('취소', { onClick: close }),
      SubmitBtn('문서 저장', async () => {
        const t = title.value.trim();
        if (!t) { title.focus(); throw new Error('제목을 입력해 주세요.'); }
        if (!content.value.trim()) { content.focus(); throw new Error('내용을 입력해 주세요.'); }
        const body = { kind: kind.value, title: t, content: content.value, is_primary: primary.checked };
        if (doc) await put(`/api/documents/${doc.id}`, body);
        else await post('/api/documents', { ...body, source: 'manual' });
        toastOk(doc ? '문서를 수정했어요.' : '문서를 추가했어요.');
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

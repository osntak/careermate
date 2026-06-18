// Interview — preparation materials for jobs that reached 서류 합격 or beyond.
import {
  el, get, put, icon, navigate, Card, Badge, Btn, SubmitBtn, EmptyState, Field, Input,
  Textarea, openModal, closeModal, toastOk, copyText,
  downloadUrl, mount,
} from '/lib.js';

export async function render(ctx) {
  const data = await get('/api/interview');
  const preps = data.preps || [];
  const eligible = data.eligible || [];
  const prepByJob = {};
  for (const p of preps) prepByJob[p.job_id] = p;

  const wrap = el('div', { class: 'stack-4' });

  if (!eligible.length) {
    wrap.append(EmptyState({
      iconName: 'mic',
      title: '아직 면접 준비할 공고가 없어요',
      body: '서류 합격 이상 상태가 되면 그 공고의 면접 준비를 여기서 할 수 있어요.',
      action: Btn('지원 현황으로 가기', { icon: 'layers', variant: 'primary', onClick: () => navigate('/applications') }),
    }));
    mount(ctx.view, wrap);
    ctx.setActions([]);
    return;
  }

  const list = el('div', { class: 'stack-4' },
    ...eligible.map((e) => JobCard(e, prepByJob[e.job.id])));
  wrap.append(list);

  mount(ctx.view, wrap);
  ctx.setActions([]);

  function JobCard(entry, prep) {
    const job = entry.job || {};
    const hasPrep = !!entry.has_prep && !!prep;

    const body = [];
    if (hasPrep) {
      const qCount = (prep.questions || []).length;
      const sCount = (prep.star_guides || []).length;
      const hasIntro = !!(prep.self_introduction && prep.self_introduction.trim());
      body.push(el('p', { class: 'text-secondary', style: { margin: 0 } },
        `예상 질문 ${qCount}개 · STAR 가이드 ${sCount}개 · 1분 자기소개 ${hasIntro ? '있음' : '없음'}`));
    } else {
      body.push(el('p', { class: 'text-secondary', style: { margin: 0, lineHeight: '1.6' } },
        '예상 질문과 1분 자기소개를 정리해 두면 한곳에서 연습할 수 있어요.'));
    }

    const actions = [];
    if (hasPrep) {
      actions.push(Btn('자세히 보기', { icon: 'external', sm: true, onClick: () => openPrepModal(entry, prep) }));
    } else {
      actions.push(Btn('직접 작성', { icon: 'edit', sm: true, onClick: () => openEditModal(entry, null) }));
    }

    return Card({
      title: `${job.company || '—'} · ${job.position || ''}`,
      sub: undefined,
      actions: [Badge(entry.status, entry.status_label), ...actions],
      body,
    });
  }

  // -------------------------------------------------------- view full prep
  function openPrepModal(entry, prep) {
    const job = entry.job || {};
    const jobId = prep.job_id;
    const sections = el('div', { class: 'stack-4' });

    // 예상 질문 & 꼬리 질문
    const questions = prep.questions || [];
    sections.append(Card({
      title: '예상 질문 & 꼬리 질문',
      body: questions.length
        ? el('div', { class: 'stack-3' }, ...questions.map(QuestionBlock))
        : el('p', { class: 'muted', style: { margin: 0 } }, '등록된 예상 질문이 없습니다.'),
    }));

    // STAR 답변 가이드
    const stars = prep.star_guides || [];
    sections.append(Card({
      title: 'STAR 답변 가이드',
      body: stars.length
        ? el('div', { class: 'stack-3' }, ...stars.map(StarBlock))
        : el('p', { class: 'muted', style: { margin: 0 } }, '등록된 STAR 가이드가 없습니다.'),
    }));

    // 1분 자기소개
    const intro = prep.self_introduction || '';
    sections.append(Card({
      title: '1분 자기소개',
      actions: intro.trim() && Btn('복사', { icon: 'copy', sm: true, onClick: () => copyText(intro) }),
      body: intro.trim()
        ? el('div', { class: 'doc-preview' }, intro)
        : el('p', { class: 'muted', style: { margin: 0 } }, '작성된 자기소개가 없습니다.'),
    }));

    // 메모
    if (prep.notes && prep.notes.trim()) {
      sections.append(Card({
        title: '메모',
        body: el('div', { class: 'doc-preview' }, prep.notes),
      }));
    }

    openModal({
      title: `${job.company || ''} 면접 준비`,
      size: 'lg',
      body: sections,
      footer: (close) => [
        Btn('MD 내보내기', { icon: 'download', onClick: () => downloadUrl(`/api/export/interview/${jobId}?format=md`) }),
        Btn('HTML 내보내기', { icon: 'download', onClick: () => downloadUrl(`/api/export/interview/${jobId}?format=html`) }),
        Btn('수정', { icon: 'edit', variant: 'primary', onClick: () => { close(); openEditModal(entry, prep); } }),
      ],
    });
  }

  function QuestionBlock(q) {
    const node = el('div', { class: 'stack-2', style: { paddingBottom: '6px' } });
    node.append(el('div', { class: 'strong' }, q.question || ''));
    if (q.intent) node.append(el('div', { class: 'muted text-sm' }, `의도: ${q.intent}`));
    const followups = (q.followups || []).filter((f) => f && String(f).trim());
    if (followups.length) {
      node.append(el('div', { class: 'text-sm text-secondary', style: { marginTop: '2px' } }, '꼬리 질문'));
      node.append(el('ul', { class: 'stack-2', style: { margin: '2px 0 0', paddingLeft: '18px' } },
        ...followups.map((f) => el('li', { class: 'text-sm text-secondary' }, f))));
    }
    if (q.answer_outline && String(q.answer_outline).trim()) {
      node.append(el('div', { class: 'muted text-sm', style: { marginTop: '4px' } }, '답변 가이드'));
      node.append(el('div', { class: 'doc-preview', style: { marginTop: '2px' } }, q.answer_outline));
    }
    return node;
  }

  function StarBlock(g) {
    const rows = [];
    const add = (label, val) => { if (val && String(val).trim()) { rows.push(el('dt', {}, label)); rows.push(el('dd', {}, val)); } };
    add('상황', g.situation);
    add('과제', g.task);
    add('행동', g.action);
    add('결과', g.result);
    return el('div', { class: 'stack-2', style: { paddingBottom: '6px' } },
      el('div', { class: 'strong' }, g.question || ''),
      rows.length
        ? el('dl', { class: 'kv' }, ...rows)
        : el('div', { class: 'muted text-sm' }, 'S/T/A/R 내용이 비어 있습니다.'));
  }

  // -------------------------------------------------- manual edit / create
  function openEditModal(entry, prep) {
    const job = entry.job || {};
    const jobId = job.id;
    prep = prep || {};

    const introInput = Textarea({
      value: prep.self_introduction || '',
      rows: 5,
      placeholder: '1분 분량(약 300~400자)의 자기소개를 작성하세요.',
    });
    const notesInput = Textarea({
      value: prep.notes || '',
      rows: 3,
      placeholder: '면접 준비 메모를 자유롭게 적어두세요.',
    });

    // Repeatable question list: question + answer_outline.
    const qList = el('div', { class: 'stack-3' });
    const qRows = [];
    function addQuestionRow(q) {
      q = q || {};
      const qInput = Input({ value: q.question || '', placeholder: '예상 질문' });
      const aInput = Textarea({ value: q.answer_outline || '', rows: 2, placeholder: '답변 가이드 (선택)' });
      const row = el('div', { class: 'subcard stack-2' },
        el('div', { class: 'flex between center' },
          el('span', { class: 'text-sm muted' }, `질문 ${qRows.length + 1}`),
          Btn('삭제', { icon: 'trash', sm: true, variant: 'ghost', onClick: () => { entryRef.removed = true; row.remove(); } })),
        Field('질문', qInput),
        Field('답변 가이드', aInput));
      const entryRef = { qInput, aInput, removed: false };
      qRows.push(entryRef);
      qList.append(row);
    }
    (prep.questions || []).forEach(addQuestionRow);

    const formBody = el('div', { class: 'stack-4' },
      Field('1분 자기소개', introInput),
      Field('메모', notesInput),
      el('div', { class: 'stack-2' },
        el('div', { class: 'flex between center' },
          el('label', {}, '예상 질문'),
          Btn('질문 추가', { icon: 'plus', sm: true, onClick: () => addQuestionRow(null) })),
        qList));

    openModal({
      title: `${job.company || ''} 면접 준비 ${Object.keys(prep).length ? '수정' : '작성'}`,
      size: 'lg',
      body: formBody,
      footer: (close) => [
        Btn('취소', { onClick: close }),
        SubmitBtn('면접 준비 저장', () => save(jobId)),
      ],
    });

    async function save(id) {
      const questions = qRows
        .filter((r) => !r.removed)
        .map((r) => ({ question: r.qInput.value.trim(), answer_outline: r.aInput.value.trim() }))
        .filter((q) => q.question);
      // Preserve any richer star_guides authored elsewhere (AI/MCP).
      const payload = {
        questions,
        star_guides: prep.star_guides || [],
        self_introduction: introInput.value,
        notes: notesInput.value,
      };
      // Throws on failure so the SubmitBtn surfaces it inline.
      await put(`/api/jobs/${id}/interview`, payload);
      closeModal();
      toastOk('면접 준비를 저장했어요.');
      await ctx.refreshNav();
      await render(ctx);
    }
  }
}

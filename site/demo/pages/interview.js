// Interview — preparation materials saved for jobs, plus timely interview-stage to-dos.
import {
  el, get, put, icon, navigate, Card, Badge, Btn, SubmitBtn, EmptyState, Field, Input,
  Textarea, openModal, closeModal, toastOk, copyText,
  downloadUrl, mount,
} from '/demo/lib.js';
import { t } from '/demo/i18n.js';

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
      title: t('interview.empty.title'),
      body: t('interview.empty.body'),
      action: Btn(t('interview.empty.cta'), { icon: 'briefcase', variant: 'primary', onClick: () => navigate('/jobs') }),
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
        t('interview.card.summary', {
          q: t('interview.card.questionsCount', { count: qCount }),
          s: t('interview.card.starCount', { count: sCount }),
          intro: hasIntro ? t('interview.card.introYes') : t('interview.card.introNo'),
        })));
    } else {
      body.push(el('p', { class: 'text-secondary', style: { margin: 0, lineHeight: '1.6' } },
        t('interview.card.hint')));
    }

    const actions = [];
    if (hasPrep) {
      actions.push(Btn(t('interview.card.view'), { icon: 'external', sm: true, onClick: () => openPrepModal(entry, prep) }));
    } else {
      actions.push(Btn(t('interview.card.create'), { icon: 'edit', sm: true, onClick: () => openEditModal(entry, null) }));
    }

    return Card({
      title: `${job.company || '—'} · ${job.position || ''}`,
      sub: undefined,
      actions: [Badge(entry.status, t('status.' + entry.status)), ...actions],
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
      title: t('interview.modal.questionsTitle'),
      body: questions.length
        ? el('div', { class: 'stack-3' }, ...questions.map(QuestionBlock))
        : el('p', { class: 'muted', style: { margin: 0 } }, t('interview.modal.questionsEmpty')),
    }));

    // STAR 답변 가이드
    const stars = prep.star_guides || [];
    sections.append(Card({
      title: t('interview.modal.starTitle'),
      body: stars.length
        ? el('div', { class: 'stack-3' }, ...stars.map(StarBlock))
        : el('p', { class: 'muted', style: { margin: 0 } }, t('interview.modal.starEmpty')),
    }));

    // 1분 자기소개
    const intro = prep.self_introduction || '';
    sections.append(Card({
      title: t('interview.modal.introTitle'),
      actions: intro.trim() && Btn(t('interview.modal.introCopy'), { icon: 'copy', sm: true, onClick: () => copyText(intro) }),
      body: intro.trim()
        ? el('div', { class: 'doc-preview' }, intro)
        : el('p', { class: 'muted', style: { margin: 0 } }, t('interview.modal.introEmpty')),
    }));

    // 메모
    if (prep.notes && prep.notes.trim()) {
      sections.append(Card({
        title: t('interview.modal.notesTitle'),
        body: el('div', { class: 'doc-preview' }, prep.notes),
      }));
    }

    openModal({
      title: t('interview.modal.title', { company: job.company || '' }),
      size: 'lg',
      body: sections,
      footer: (close) => [
        Btn(t('interview.modal.exportMd'), { icon: 'download', onClick: () => downloadUrl(`/api/export/interview/${jobId}?format=md`) }),
        Btn(t('interview.modal.exportHtml'), { icon: 'download', onClick: () => downloadUrl(`/api/export/interview/${jobId}?format=html`) }),
        Btn(t('interview.modal.edit'), { icon: 'edit', variant: 'primary', onClick: () => { close(); openEditModal(entry, prep); } }),
      ],
    });
  }

  function QuestionBlock(q) {
    const node = el('div', { class: 'stack-2', style: { paddingBottom: '6px' } });
    node.append(el('div', { class: 'strong' }, q.question || ''));
    if (q.intent) node.append(el('div', { class: 'muted text-sm' }, t('interview.question.intent', { intent: q.intent })));
    const followups = (q.followups || []).filter((f) => f && String(f).trim());
    if (followups.length) {
      node.append(el('div', { class: 'text-sm text-secondary', style: { marginTop: '2px' } }, t('interview.question.followups')));
      node.append(el('ul', { class: 'stack-2', style: { margin: '2px 0 0', paddingLeft: '18px' } },
        ...followups.map((f) => el('li', { class: 'text-sm text-secondary' }, f))));
    }
    if (q.answer_outline && String(q.answer_outline).trim()) {
      node.append(el('div', { class: 'muted text-sm', style: { marginTop: '4px' } }, t('interview.question.answerGuide')));
      node.append(el('div', { class: 'doc-preview', style: { marginTop: '2px' } }, q.answer_outline));
    }
    return node;
  }

  function StarBlock(g) {
    const rows = [];
    const add = (label, val) => { if (val && String(val).trim()) { rows.push(el('dt', {}, label)); rows.push(el('dd', {}, val)); } };
    add(t('interview.star.situation'), g.situation);
    add(t('interview.star.task'), g.task);
    add(t('interview.star.action'), g.action);
    add(t('interview.star.result'), g.result);
    return el('div', { class: 'stack-2', style: { paddingBottom: '6px' } },
      el('div', { class: 'strong' }, g.question || ''),
      rows.length
        ? el('dl', { class: 'kv' }, ...rows)
        : el('div', { class: 'muted text-sm' }, t('interview.star.empty')));
  }

  // -------------------------------------------------- manual edit / create
  function openEditModal(entry, prep) {
    const job = entry.job || {};
    const jobId = job.id;
    prep = prep || {};

    const introInput = Textarea({
      value: prep.self_introduction || '',
      rows: 5,
      placeholder: t('interview.edit.introPlaceholder'),
    });
    const notesInput = Textarea({
      value: prep.notes || '',
      rows: 3,
      placeholder: t('interview.edit.notesPlaceholder'),
    });

    // Repeatable question list: question + answer_outline.
    const qList = el('div', { class: 'stack-3' });
    const qRows = [];
    function addQuestionRow(q) {
      q = q || {};
      const qInput = Input({ value: q.question || '', placeholder: t('interview.edit.questionPlaceholder') });
      const aInput = Textarea({ value: q.answer_outline || '', rows: 2, placeholder: t('interview.edit.answerPlaceholder') });
      const row = el('div', { class: 'subcard stack-2' },
        el('div', { class: 'flex between center' },
          el('span', { class: 'text-sm muted' }, t('interview.edit.questionNum', { n: qRows.length + 1 })),
          Btn(t('interview.edit.delete'), { icon: 'trash', sm: true, variant: 'ghost', onClick: () => { entryRef.removed = true; row.remove(); } })),
        Field(t('interview.edit.fieldQuestion'), qInput),
        Field(t('interview.edit.fieldAnswer'), aInput));
      const entryRef = { qInput, aInput, removed: false };
      qRows.push(entryRef);
      qList.append(row);
    }
    (prep.questions || []).forEach(addQuestionRow);

    const formBody = el('div', { class: 'stack-4' },
      Field(t('interview.edit.introLabel'), introInput),
      Field(t('interview.edit.notesLabel'), notesInput),
      el('div', { class: 'stack-2' },
        el('div', { class: 'flex between center' },
          el('label', {}, t('interview.edit.questionsLabel')),
          Btn(t('interview.edit.addQuestion'), { icon: 'plus', sm: true, onClick: () => addQuestionRow(null) })),
        qList));

    openModal({
      title: Object.keys(prep).length
        ? t('interview.edit.titleEdit', { company: job.company || '' })
        : t('interview.edit.titleCreate', { company: job.company || '' }),
      size: 'lg',
      body: formBody,
      footer: (close) => [
        Btn(t('interview.edit.cancel'), { onClick: close }),
        SubmitBtn(t('interview.edit.save'), () => save(jobId)),
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
      toastOk(t('interview.edit.saved'));
      await ctx.refreshNav();
      await render(ctx);
    }
  }
}

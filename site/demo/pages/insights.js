import { el, get, post, Card, Btn, icon, mount, toastOk, toastError } from '/demo/lib.js';
import { getLang } from '/demo/i18n.js';

const copy = {
  ko: {
    title: '진단·데이터 건강도',
    subtitle: '로컬 데이터 상태, 모순, 출처 확인 대상과 경험 재사용 현황을 한곳에서 점검합니다.',
    runtime: '실행 환경',
    health: '데이터 건강도',
    provenance: '사람 확인이 필요한 정보',
    reuse: '경험·프로젝트 재사용 지도',
    healthy: '정상',
    failed: '확인 필요',
    verify: '사람이 확인함',
    empty: '확인할 문제가 없습니다.',
    score: '건강도 점수',
    times: '회 사용',
    local: 'DB와 커리어 데이터는 이 컴퓨터에 저장됩니다.',
    network: '업데이트 확인·설치 문서·채용 검색은 선택적으로 인터넷을 사용할 수 있습니다.',
  },
  en: {
    title: 'Diagnostics & data health',
    subtitle: 'Review local storage, contradictions, provenance, and experience reuse.',
    runtime: 'Runtime checks',
    health: 'Data health',
    provenance: 'Needs human verification',
    reuse: 'Experience & project reuse map',
    healthy: 'Healthy',
    failed: 'Needs attention',
    verify: 'Mark human verified',
    empty: 'No issues found.',
    score: 'Health score',
    times: 'uses',
    local: 'Your database and career records are stored on this computer.',
    network: 'Update checks, install docs, and job search may optionally use the internet.',
  },
};

function text() {
  return copy[getLang()] || copy.ko;
}

function severityBadge(severity) {
  const label = severity === 'error' ? 'ERROR' : severity === 'warning' ? 'WARN' : 'INFO';
  return el('span', { class: `badge badge--${severity === 'error' ? 'rejected' : severity === 'warning' ? 'planned' : 'draft'}` }, label);
}

export async function render(ctx) {
  const c = text();
  ctx.setTitle(c.title);
  ctx.setActions([Btn(c.title, { icon: 'check', sm: true, variant: 'ghost', onClick: () => render(ctx) })]);

  try {
    const diagnostics = await get('/api/diagnostics');
    const checks = diagnostics.checks || [];
    const report = diagnostics.data_health || { score: 0, issues: [], counts: {} };
    const unverified = diagnostics.unverified_entities || [];
    const reuseMap = diagnostics.reuse_map || [];

    const localFirst = Card({
      title: 'Local-first',
      body: el('div', { class: 'stack-2' },
        el('div', { class: 'callout callout--privacy' }, icon('lock'), el('div', {},
          el('div', { class: 'callout__title' }, c.local),
          el('div', { class: 'callout__body' }, c.network))),
      ),
    });

    const runtime = Card({
      title: c.runtime,
      body: el('div', { class: 'stack-2' }, ...checks.map((check) =>
        el('div', { class: 'flex between gap-3' },
          el('div', {},
            el('div', { class: 'strong' }, check.label),
            el('div', { class: 'muted text-sm tnum' }, check.detail || '—')),
          el('span', { class: `badge badge--${check.ok ? 'final_passed' : 'rejected'}` }, check.ok ? c.healthy : c.failed),
        ))),
    });

    const issueList = report.issues?.length
      ? el('div', { class: 'stack-2' }, ...report.issues.map((issue) =>
          el('div', { class: 'flex gap-3', style: { alignItems: 'flex-start' } },
            severityBadge(issue.severity),
            el('div', {},
              el('div', { class: 'strong' }, issue.message),
              el('div', { class: 'muted text-sm' }, `${issue.entity_type}${issue.entity_id ? ` · ${issue.entity_id}` : ''}`)),
          )))
      : el('p', { class: 'muted' }, c.empty);

    const health = Card({
      title: c.health,
      actions: [el('span', { class: 'badge badge--final_passed tnum' }, `${c.score} ${report.score}`)],
      body: issueList,
    });

    const reuse = Card({
      title: c.reuse,
      body: reuseMap.length
        ? el('div', { class: 'stack-2' }, ...reuseMap.map((item) =>
            el('div', { class: 'flex between gap-3', style: { alignItems: 'flex-start' } },
              el('div', {},
                el('div', { class: 'strong' }, item.label),
                el('div', { class: 'muted text-sm' },
                  item.cover_letters?.length
                    ? item.cover_letters.map((letter) => [letter.company, letter.position, letter.title].filter(Boolean).join(' · ')).join(' / ')
                    : c.empty)),
              el('span', { class: `badge badge--${item.reuse_count ? 'final_passed' : 'draft'} tnum` }, `${item.reuse_count} ${c.times}`),
            )))
        : el('p', { class: 'muted' }, c.empty),
    });

    async function verify(item, button) {
      try {
        button.disabled = true;
        await post('/api/provenance/verify', {
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          verified: true,
        });
        toastOk(c.verify);
        await render(ctx);
      } catch (error) {
        button.disabled = false;
        toastError(error);
      }
    }

    const provenance = Card({
      title: c.provenance,
      body: unverified.length
        ? el('div', { class: 'stack-2' }, ...unverified.map((item) => {
            const button = Btn(c.verify, { icon: 'check', sm: true, variant: 'ghost' });
            button.addEventListener('click', () => verify(item, button));
            return el('div', { class: 'flex between gap-3' },
              el('div', {},
                el('div', { class: 'strong' }, `${item.entity_type} · ${item.entity_id}`),
                el('div', { class: 'muted text-sm' }, item.source_excerpt || item.source)),
              button,
            );
          }))
        : el('p', { class: 'muted' }, c.empty),
    });

    mount(ctx.view, el('div', { class: 'stack-4' },
      el('p', { class: 'muted', style: { marginTop: 0 } }, c.subtitle),
      localFirst,
      runtime,
      health,
      reuse,
      provenance,
    ));
  } catch (error) {
    toastError(error);
    mount(ctx.view, el('div', { class: 'card' }, el('div', { class: 'card__body' }, String(error))));
  }
}

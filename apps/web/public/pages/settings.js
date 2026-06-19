// Settings — data location, connection, theme, backup/export, and danger zone.
// Everything stays local; this page surfaces where data lives and how to manage it.
import {
  el, get, post, icon, navigate, Card, Btn, IconBtn, Input,
  openModal, copyText, downloadUrl, fmtRelative, toastOk, toastError, mount,
} from '/lib.js';

const COUNT_LABELS = {
  profile: '프로필', experiences: '경력', projects: '프로젝트', skills: '기술',
  documents: '문서', cover_letters: '자기소개서', jobs: '채용공고',
  applications: '지원', interview_preps: '면접 준비',
};
const BACKUP_COUNT_LABELS = {
  ...COUNT_LABELS,
  cover_letter_versions: '자소서 버전',
  fit_analyses: '적합도 분석',
  activities: '활동',
};

export async function render(ctx) {
  ctx.setActions([]);
  const { info, backups } = await get('/api/settings');

  const wrap = el('div', { class: 'stack-4' },
    DataLocation(info),
    Connection(info),
    Theme(),
    VerifyMode(info),
    MyData(info.counts),
    Backup(backups, async () => { await ctx.refreshNav(); await render(ctx); }),
    DangerZone(ctx),
  );

  mount(ctx.view, wrap);
}

/* ----------------------------------------------------- 데이터 저장 위치 */
function kvRow(label, value, copyable) {
  return [
    el('dt', {}, label),
    el('dd', {},
      el('div', { class: 'flex between gap-3' },
        el('span', { class: 'truncate tnum', style: { fontFamily: 'var(--mono, ui-monospace, monospace)' }, title: value }, value || '—'),
        copyable && value
          ? IconBtn('copy', { title: '복사', onClick: () => copyText(value) })
          : null)),
  ];
}

function DataLocation(info) {
  const kv = el('dl', { class: 'kv' },
    ...kvRow('데이터 폴더', info.data_dir, true),
    ...kvRow('데이터베이스', info.db_path, true),
    ...kvRow('앱 버전', info.version, false),
    ...kvRow('Node 버전', info.node_version, false),
  );

  const privacy = el('div', { class: 'callout callout--privacy' },
    icon('lock'),
    el('div', {},
      el('div', { class: 'callout__title' }, '내 컴퓨터에만 저장됩니다'),
      el('div', { class: 'callout__body' },
        '모든 데이터는 이 컴퓨터에만 저장됩니다. 외부로 전송되지 않습니다. AI에는 사용자가 직접 입력하거나 AI가 MCP로 조회한 정보만 전달됩니다.')));

  return Card({
    title: '데이터 저장 위치',
    body: el('div', { class: 'stack-3' }, kv, privacy),
  });
}

/* ---------------------------------------------------------- 연결 상태 */
function Connection(info) {
  async function createShortcut() {
    try {
      const { shortcut } = await post('/api/settings/dashboard-shortcut', { open: true });
      toastOk('대시보드 바로가기를 만들었어요.');
      openModal({
        title: '바로가기 생성',
        body: el('div', { class: 'stack-3' },
          el('div', { class: 'callout' },
            icon('info'),
            el('div', {},
              el('div', { class: 'callout__title' }, '폴더를 만들었습니다'),
              el('div', { class: 'callout__body' },
                '대시보드가 실행 중이면 브라우저만 열고, 꺼져 있으면 서버를 시작한 뒤 브라우저를 엽니다.'))),
          el('dl', { class: 'kv' },
            ...kvRow('폴더', shortcut.shortcut_dir, true),
            ...kvRow('바로가기', shortcut.launcher_path, true))),
        footer: (close) => [
          Btn('경로 복사', { icon: 'copy', onClick: () => copyText(shortcut.launcher_path) }),
          Btn('확인', { variant: 'primary', onClick: close }),
        ],
      });
    } catch (e) {
      toastError(e);
    }
  }

  const dashRow = el('div', { class: 'settings-action-row flex between gap-3', style: { padding: '4px 0' } },
    el('div', { class: 'settings-action-row__main flex gap-3', style: { alignItems: 'center' } },
      el('span', { class: 'badge badge--final_passed' }, el('span', { class: 'dot' }), '실행 중'),
      el('div', {},
        el('div', { class: 'strong' }, '대시보드'),
        el('div', { class: 'muted text-sm tnum' }, info.url || '—'))),
    Btn('바로가기 만들기', { icon: 'copy', sm: true, variant: 'ghost', onClick: createShortcut }));

  const mcpRow = el('div', { class: 'settings-action-row flex between gap-3', style: { padding: '4px 0', alignItems: 'flex-start' } },
    el('div', { class: 'settings-action-row__main flex gap-3', style: { alignItems: 'flex-start' } },
      el('div', { class: 'empty__icon', style: { width: '30px', height: '30px', margin: 0, borderRadius: '8px' } }, icon('link')),
      el('div', {},
        el('div', { class: 'strong' }, 'MCP 서버'),
        el('div', { class: 'muted text-sm', style: { maxWidth: '440px', lineHeight: '1.6' } },
          'MCP 서버는 사용하시는 AI 클라이언트(Claude·ChatGPT·Cursor)가 직접 실행하며, 이 대시보드와 같은 데이터베이스를 공유합니다.'))),
    Btn('설치·연결 안내 열기', { icon: 'external', sm: true, variant: 'ghost', onClick: () => window.open('/install', '_blank') }));

  return Card({
    title: '연결 상태',
    body: el('div', { class: 'stack-2' }, dashRow, el('div', { class: 'divider' }), mcpRow),
  });
}

/* ------------------------------------------------------------- 테마 */
function currentTheme() {
  // New key with legacy 'cf-theme' fallback so a saved theme survives the rename.
  const saved = localStorage.getItem('careermate-theme') || localStorage.getItem('cf-theme');
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

function Theme() {
  const options = [
    { value: 'light', label: '라이트' },
    { value: 'dark', label: '다크' },
    { value: 'system', label: '시스템' },
  ];

  const row = el('div', { class: 'flex gap-2 wrap' });

  function applyTheme(value) {
    if (value === 'system') {
      delete document.documentElement.dataset.theme;
      localStorage.removeItem('careermate-theme');
      localStorage.removeItem('cf-theme'); // also clear legacy key
    } else {
      document.documentElement.dataset.theme = value;
      localStorage.setItem('careermate-theme', value);
      localStorage.removeItem('cf-theme'); // migrate off legacy key
    }
    paint();
  }

  function paint() {
    const active = currentTheme();
    mount(row, ...options.map((o) => {
      const b = Btn(o.label, { variant: 'ghost', onClick: () => applyTheme(o.value) });
      b.setAttribute('aria-pressed', String(o.value === active));
      if (o.value === active) b.classList.add('is-selected');
      return b;
    }));
  }
  paint();

  return Card({
    title: '테마',
    sub: '시스템 설정을 따르거나 직접 고를 수 있어요',
    body: row,
  });
}

/* ------------------------------------------------- 자소서 수치 점검 모드 */
function VerifyMode(info) {
  const options = [
    { value: false, label: '기본', desc: '저장된 경력·이력서·프로젝트에 아예 근거가 없는 수치만 차단' },
    { value: true, label: '엄격', desc: '이력서 본문에 없고 구조화 경력/프로젝트 항목에만 있는 수치까지 차단' },
  ];
  let current = !!info.verify_strict;
  const row = el('div', { class: 'flex gap-2 wrap' });

  async function set(value) {
    if (value === current) return;
    try {
      const res = await post('/api/settings/verify-mode', { strict: value });
      current = !!res.verify_strict;
      toastOk(current ? '엄격 모드를 켰어요.' : '엄격 모드를 껐어요.');
      paint();
    } catch (e) {
      toastError(e);
    }
  }

  function paint() {
    mount(row, ...options.map((o) => {
      const b = Btn(o.label, { variant: 'ghost', onClick: () => set(o.value) });
      b.setAttribute('aria-pressed', String(o.value === current));
      if (o.value === current) b.classList.add('is-selected');
      return b;
    }));
  }
  paint();

  const note = el('div', { class: 'muted text-sm', style: { lineHeight: '1.7', marginTop: '10px' } },
    el('div', {}, el('span', { class: 'strong' }, '기본'), ' — ', options[0].desc),
    el('div', {}, el('span', { class: 'strong' }, '엄격'), ' — ', options[1].desc),
    el('div', { style: { marginTop: '6px' } },
      '엄격 모드에선 올린 이력서에 없는 수치가 막힐 수 있어요. 막히면 이력서를 올리거나 모드를 끄세요. AI에게 "엄격하게 봐줘"라고 해도 켤 수 있습니다.'));

  return Card({
    title: '자소서 수치 점검',
    sub: 'AI가 쓴 수치가 내 실제 데이터에 근거가 있는지 저장 전에 자동으로 확인합니다',
    body: el('div', { class: 'stack-2' }, row, note),
  });
}

/* ---------------------------------------------------------- 내 데이터 */
function MyData(counts = {}) {
  const items = Object.entries(COUNT_LABELS).map(([key, label]) =>
    el('div', { class: 'countstrip__item' },
      el('div', { class: 'countstrip__num tnum' }, String(counts[key] ?? 0)),
      el('div', { class: 'countstrip__label' }, label)));
  return Card({
    title: '내 데이터',
    sub: '이 컴퓨터에 저장된 항목 수',
    body: el('div', { class: 'countstrip' }, ...items),
  });
}

/* ------------------------------------------------- 내보내기 / 가져오기 */
function Backup(backups = [], rerender) {
  const fileInput = el('input', {
    type: 'file',
    accept: '.json,application/json',
    style: { display: 'none' },
    onChange: async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const backup = await readBackupFile(file);
        const { preview } = await post('/api/settings/import-preview', { backup });
        openImportModal({ fileName: file.name, backup, preview, rerender });
      } catch (err) {
        toastError(err);
      }
    },
  });

  async function createBackup() {
    try {
      const res = await post('/api/settings/backup');
      toastOk('백업을 생성했어요.');
      await rerender();
    } catch (e) {
      toastError(e);
    }
  }

  const list = backups.length
    ? el('table', { class: 'table' },
        el('thead', {}, el('tr', {},
          el('th', {}, '파일'), el('th', {}, '생성'), el('th', { style: { textAlign: 'right' } }, '크기'))),
        el('tbody', {}, ...backups.map((b) => el('tr', {},
          el('td', {}, el('span', { class: 'truncate', title: b.path || b.filename }, b.filename)),
          el('td', { class: 'muted text-sm' }, fmtRelative(b.created_at)),
          el('td', { class: 'muted text-sm tnum', style: { textAlign: 'right' } }, `${Math.round((b.size || 0) / 1024)} KB`)))))
    : el('p', { class: 'muted', style: { margin: 0 } }, '아직 로컬 백업이 없습니다. "현재 상태 백업"으로 지금 데이터를 보관하세요.');

  return Card({
    title: '내보내기 / 가져오기',
    actions: [
      Btn('내보내기(JSON)', { icon: 'download', sm: true, variant: 'primary', onClick: () => downloadUrl('/api/settings/export-all') }),
      Btn('가져오기(JSON)', { icon: 'upload', sm: true, variant: 'ghost', onClick: () => fileInput.click() }),
      Btn('현재 상태 백업', { icon: 'copy', sm: true, variant: 'ghost', onClick: createBackup }),
    ],
    body: el('div', { class: 'stack-3' }, fileInput, list),
  });
}

function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('백업 파일을 읽지 못했어요.'));
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || '')));
      } catch {
        reject(new Error('JSON 백업 파일만 복원할 수 있어요.'));
      }
    };
    reader.readAsText(file);
  });
}

function fmtBackupDate(iso) {
  if (!iso) return '알 수 없음';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function previewRows(counts = {}) {
  const entries = Object.entries(counts)
    .filter(([, count]) => Number(count) > 0)
    .sort(([a], [b]) => (BACKUP_COUNT_LABELS[a] || a).localeCompare(BACKUP_COUNT_LABELS[b] || b, 'ko'));

  if (!entries.length) {
    return el('p', { class: 'muted', style: { margin: 0 } }, '복원할 항목이 없습니다.');
  }

  return el('table', { class: 'table' },
    el('thead', {}, el('tr', {}, el('th', {}, '데이터'), el('th', { style: { textAlign: 'right' } }, '항목'))),
    el('tbody', {}, ...entries.map(([key, count]) => el('tr', {},
      el('td', {}, BACKUP_COUNT_LABELS[key] || key),
      el('td', { class: 'tnum', style: { textAlign: 'right' } }, String(count))))));
}

function openImportModal({ fileName, backup, preview, rerender }) {
  let confirmBtn;
  const input = Input({
    placeholder: '가져오기',
    onInput: (e) => { if (confirmBtn) confirmBtn.disabled = e.target.value.trim() !== '가져오기'; },
    onKeydown: (e) => {
      if (e.key === 'Enter' && e.target.value.trim() === '가져오기' && confirmBtn && !confirmBtn.disabled) confirmBtn.click();
    },
  });

  openModal({
    title: '데이터 가져오기',
    size: 'lg',
    body: el('div', { class: 'stack-3' },
      el('div', { class: 'callout' },
        icon('info'),
        el('div', {},
          el('div', { class: 'callout__title' }, '현재 데이터는 먼저 백업됩니다'),
          el('div', { class: 'callout__body' },
            '가져오면 이 컴퓨터의 CareerMate 데이터가 선택한 JSON 내용으로 전체 교체됩니다.'))),
      el('dl', { class: 'kv' },
        ...kvRow('파일', fileName, false),
        ...kvRow('백업 시각', fmtBackupDate(preview.exported_at), false),
        ...kvRow('스키마', `${preview.version} / 현재 ${preview.current_version}`, false),
        ...kvRow('전체 항목', String(preview.total_rows || 0), false)),
      previewRows(preview.counts),
      preview.warnings?.length
        ? el('div', { class: 'callout' },
            icon('info'),
            el('div', {},
              el('div', { class: 'callout__title' }, '확인 필요'),
              el('div', { class: 'callout__body' }, preview.warnings.join(' '))))
        : null,
      el('p', { class: 'text-secondary', style: { margin: 0, lineHeight: '1.6' } },
        '계속하려면 아래 입력란에 ', el('span', { class: 'strong' }, '가져오기'), ' 를 입력하세요.'),
      input),
    footer: (close) => {
      confirmBtn = Btn('가져오기', {
        icon: 'upload',
        variant: 'danger',
        disabled: true,
        onClick: async () => {
          confirmBtn.disabled = true;
          try {
            await post('/api/settings/restore', { backup, confirm: 'RESTORE' });
            close();
            toastOk('데이터를 가져왔어요.');
            await rerender();
          } catch (e) {
            toastError(e);
            confirmBtn.disabled = input.value.trim() !== '가져오기';
          }
        },
      });
      return [Btn('취소', { onClick: close }), confirmBtn];
    },
  });
}

/* -------------------------------------------------- 위험 구역 (Danger zone) */
function DangerZone(ctx) {
  function openResetModal() {
    let confirmBtn;
    // Gate on the Korean word so there's no IME switch and it matches the '초기화' button.
    // (The API still expects the fixed 'DELETE' token; we send that on the wire below.)
    const input = Input({
      placeholder: '초기화',
      onInput: (e) => { if (confirmBtn) confirmBtn.disabled = e.target.value.trim() !== '초기화'; },
      onKeydown: (e) => { if (e.key === 'Enter' && e.target.value.trim() === '초기화' && confirmBtn && !confirmBtn.disabled) confirmBtn.click(); },
    });

    openModal({
      title: '모든 데이터 초기화',
      body: el('div', { class: 'stack-3' },
        el('div', { class: 'callout' },
          icon('info'),
          el('div', {},
            el('div', { class: 'callout__title' }, '되돌릴 수 없습니다'),
            el('div', { class: 'callout__body' },
              '프로필·공고·지원·문서·면접 준비를 포함한 모든 데이터가 영구적으로 삭제됩니다. 안전을 위해 초기화 직전에 자동으로 백업이 한 번 생성됩니다.'))),
        el('p', { class: 'text-secondary', style: { margin: 0, lineHeight: '1.6' } },
          '계속하려면 아래 입력란에 ', el('span', { class: 'strong' }, '초기화'), ' 를 입력하세요.'),
        input),
      footer: (close) => {
        confirmBtn = Btn('모든 데이터 초기화', {
          variant: 'danger',
          disabled: true,
          onClick: async () => {
            confirmBtn.disabled = true;
            try {
              await post('/api/settings/reset', { confirm: 'DELETE' });
              close();
              toastOk('모든 데이터를 초기화했어요.');
              navigate('/');
              await ctx.refreshNav();
            } catch (e) {
              toastError(e);
              confirmBtn.disabled = input.value.trim() !== 'DELETE';
            }
          },
        });
        return [Btn('취소', { onClick: close }), confirmBtn];
      },
    });
  }

  return Card({
    title: '위험 구역',
    sub: '이 작업은 되돌릴 수 없습니다',
    body: el('div', { class: 'flex between gap-3 wrap' },
      el('div', { style: { maxWidth: '440px' } },
        el('div', { class: 'strong' }, '모든 데이터 초기화'),
        el('div', { class: 'muted text-sm', style: { lineHeight: '1.6' } },
          '이 컴퓨터에 저장된 모든 CareerMate 데이터를 삭제합니다. 초기화 전에 자동으로 백업이 생성됩니다.')),
      Btn('모든 데이터 초기화', { icon: 'trash', variant: 'danger', onClick: openResetModal })),
  });
}

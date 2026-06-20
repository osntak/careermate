// Settings — data location, connection, theme, backup/export, and danger zone.
// Everything stays local; this page surfaces where data lives and how to manage it.
import {
  el, get, post, icon, navigate, Card, Btn, IconBtn, Input,
  openModal, copyText, downloadUrl, fmtRelative, toastOk, toastError, mount,
} from '/demo/lib.js';
import { t, getLang, setLang, onLangChange } from '/demo/i18n.js';

// Data keys whose human labels come from t('settings.count.<key>').
const COUNT_KEYS = ['profile', 'experiences', 'projects', 'skills', 'documents', 'cover_letters', 'jobs', 'applications', 'interview_preps'];
const countLabel = (key) => t('settings.count.' + key);

export async function render(ctx) {
  ctx.setActions([]);
  const { info, backups } = await get('/api/settings');

  const wrap = el('div', { class: 'stack-4' },
    DataLocation(info),
    Connection(info),
    Theme(),
    LanguageSwitcher(),
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
          ? IconBtn('copy', { title: t('settings.copy'), onClick: () => copyText(value) })
          : null)),
  ];
}

function DataLocation(info) {
  const kv = el('dl', { class: 'kv' },
    ...kvRow(t('settings.dataLocation.dataDir'), info.data_dir, true),
    ...kvRow(t('settings.dataLocation.database'), info.db_path, true),
    ...kvRow(t('settings.dataLocation.appVersion'), info.version, false),
    ...kvRow(t('settings.dataLocation.nodeVersion'), info.node_version, false),
  );

  const privacy = el('div', { class: 'callout callout--privacy' },
    icon('lock'),
    el('div', {},
      el('div', { class: 'callout__title' }, t('settings.dataLocation.privacyTitle')),
      el('div', { class: 'callout__body' },
        t('settings.dataLocation.privacyBody'))));

  return Card({
    title: t('settings.dataLocation.title'),
    body: el('div', { class: 'stack-3' }, kv, privacy),
  });
}

/* ---------------------------------------------------------- 연결 상태 */
function Connection(info) {
  const isDemo = !!info.demo;

  async function createShortcut() {
    try {
      const { shortcut } = await post('/api/settings/dashboard-shortcut', { open: true });
      toastOk(isDemo ? t('settings.connection.shortcutDemoToast') : t('settings.connection.shortcutToast'));
      openModal({
        title: isDemo ? t('settings.connection.shortcutDemoTitle') : t('settings.connection.shortcutTitle'),
        body: el('div', { class: 'stack-3' },
          el('div', { class: 'callout' },
            icon('info'),
            el('div', {},
              el('div', { class: 'callout__title' }, isDemo ? t('settings.connection.shortcutDemoCalloutTitle') : t('settings.connection.shortcutCalloutTitle')),
              el('div', { class: 'callout__body' },
                isDemo
                  ? t('settings.connection.shortcutDemoCalloutBody')
                  : t('settings.connection.shortcutCalloutBody')))),
          el('dl', { class: 'kv' },
            ...kvRow(t('settings.connection.shortcutFolder'), shortcut.shortcut_dir, true),
            ...kvRow(t('settings.connection.shortcutLauncher'), shortcut.launcher_path, true))),
        footer: (close) => [
          Btn(t('settings.copyPath'), { icon: 'copy', onClick: () => copyText(shortcut.launcher_path) }),
          Btn(t('settings.confirm'), { variant: 'primary', onClick: close }),
        ],
      });
    } catch (e) {
      toastError(e);
    }
  }

  const dashRow = el('div', { class: 'settings-action-row flex between gap-3', style: { padding: '4px 0' } },
    el('div', { class: 'settings-action-row__main flex gap-3', style: { alignItems: 'center' } },
      el('span', { class: 'badge badge--final_passed' }, el('span', { class: 'dot' }), t('settings.connection.running')),
      el('div', {},
        el('div', { class: 'strong' }, t('settings.connection.dashboard')),
        el('div', { class: 'muted text-sm tnum' }, info.url || '—'))),
    Btn(t('settings.connection.createShortcut'), { icon: 'copy', sm: true, variant: 'ghost', onClick: createShortcut }));

  const mcpRow = el('div', { class: 'settings-action-row flex between gap-3', style: { padding: '4px 0', alignItems: 'flex-start' } },
    el('div', { class: 'settings-action-row__main flex gap-3', style: { alignItems: 'flex-start' } },
      el('div', { class: 'empty__icon', style: { width: '30px', height: '30px', margin: 0, borderRadius: '8px' } }, icon('link')),
      el('div', {},
        el('div', { class: 'strong' }, t('settings.connection.mcpServer')),
        el('div', { class: 'muted text-sm', style: { maxWidth: '440px', lineHeight: '1.6' } },
          t('settings.connection.mcpBody')))),
    Btn(t('settings.connection.openInstall'), { icon: 'external', sm: true, variant: 'ghost', onClick: () => window.open(isDemo ? '/start.html' : '/install', '_blank') }));

  return Card({
    title: t('settings.connection.title'),
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
    { value: 'light', key: 'settings.theme.light' },
    { value: 'dark', key: 'settings.theme.dark' },
    { value: 'system', key: 'settings.theme.system' },
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
      const b = Btn(t(o.key), { variant: 'ghost', onClick: () => applyTheme(o.value) });
      b.setAttribute('aria-pressed', String(o.value === active));
      if (o.value === active) b.classList.add('is-selected');
      return b;
    }));
  }
  paint();

  return Card({
    title: t('settings.theme.title'),
    sub: t('settings.theme.sub'),
    body: row,
  });
}

/* ------------------------------------------------------------- 언어 / Language */
function LanguageSwitcher() {
  // 테마 컴포넌트와 동일 패턴: localStorage 영속 + paint() + 변경 시 재페인트.
  // 카탈로그가 채워지는 Phase 2부터 페이지 텍스트가 실제로 전환된다.
  const options = [
    { value: 'ko', label: '한국어' },
    { value: 'en', label: 'English' },
  ];
  const row = el('div', { class: 'flex gap-2 wrap' });

  function paint() {
    const active = getLang();
    mount(row, ...options.map((o) => {
      const b = Btn(o.label, { variant: 'ghost', onClick: () => setLang(o.value) });
      b.setAttribute('aria-pressed', String(o.value === active));
      if (o.value === active) b.classList.add('is-selected');
      return b;
    }));
  }
  paint();
  onLangChange(paint);

  return Card({
    title: '언어 / Language',
    sub: '대시보드 표시 언어',
    body: row,
  });
}

/* ------------------------------------------------- 자소서 수치 점검 모드 */
function VerifyMode(info) {
  const options = [
    { value: false, labelKey: 'settings.verify.basic', descKey: 'settings.verify.basicDesc' },
    { value: true, labelKey: 'settings.verify.strict', descKey: 'settings.verify.strictDesc' },
  ];
  let current = !!info.verify_strict;
  const row = el('div', { class: 'flex gap-2 wrap' });

  async function set(value) {
    if (value === current) return;
    try {
      const res = await post('/api/settings/verify-mode', { strict: value });
      current = !!res.verify_strict;
      toastOk(current ? t('settings.verify.strictOnToast') : t('settings.verify.strictOffToast'));
      paint();
    } catch (e) {
      toastError(e);
    }
  }

  function paint() {
    mount(row, ...options.map((o) => {
      const b = Btn(t(o.labelKey), { variant: 'ghost', onClick: () => set(o.value) });
      b.setAttribute('aria-pressed', String(o.value === current));
      if (o.value === current) b.classList.add('is-selected');
      return b;
    }));
  }
  paint();

  const note = el('div', { class: 'muted text-sm', style: { lineHeight: '1.7', marginTop: '10px' } },
    el('div', {}, el('span', { class: 'strong' }, t('settings.verify.basic')), ' — ', t('settings.verify.basicDesc')),
    el('div', {}, el('span', { class: 'strong' }, t('settings.verify.strict')), ' — ', t('settings.verify.strictDesc')),
    el('div', { style: { marginTop: '6px' } },
      t('settings.verify.note')));

  return Card({
    title: t('settings.verify.title'),
    sub: t('settings.verify.sub'),
    body: el('div', { class: 'stack-2' }, row, note),
  });
}

/* ---------------------------------------------------------- 내 데이터 */
function MyData(counts = {}) {
  const items = COUNT_KEYS.map((key) =>
    el('div', { class: 'countstrip__item' },
      el('div', { class: 'countstrip__num tnum' }, String(counts[key] ?? 0)),
      el('div', { class: 'countstrip__label' }, countLabel(key))));
  return Card({
    title: t('settings.myData.title'),
    sub: t('settings.myData.sub'),
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
      toastOk(t('settings.backup.createToast'));
      await rerender();
    } catch (e) {
      toastError(e);
    }
  }

  const list = backups.length
    ? el('table', { class: 'table' },
        el('thead', {}, el('tr', {},
          el('th', {}, t('settings.backup.colFile')), el('th', {}, t('settings.backup.colCreated')), el('th', { style: { textAlign: 'right' } }, t('settings.backup.colSize')))),
        el('tbody', {}, ...backups.map((b) => el('tr', {},
          el('td', {}, el('span', { class: 'truncate', title: b.path || b.filename }, b.filename)),
          el('td', { class: 'muted text-sm' }, fmtRelative(b.created_at)),
          el('td', { class: 'muted text-sm tnum', style: { textAlign: 'right' } }, t('settings.backup.size', { kb: Math.round((b.size || 0) / 1024) }))))))
    : el('p', { class: 'muted', style: { margin: 0 } }, t('settings.backup.empty'));

  return Card({
    title: t('settings.backup.title'),
    actions: [
      Btn(t('settings.backup.export'), { icon: 'download', sm: true, variant: 'primary', onClick: () => downloadUrl('/api/settings/export-all') }),
      Btn(t('settings.backup.import'), { icon: 'upload', sm: true, variant: 'ghost', onClick: () => fileInput.click() }),
      Btn(t('settings.backup.create'), { icon: 'copy', sm: true, variant: 'ghost', onClick: createBackup }),
    ],
    body: el('div', { class: 'stack-3' }, fileInput, list),
  });
}

function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(t('settings.backup.readError')));
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || '')));
      } catch {
        reject(new Error(t('settings.backup.parseError')));
      }
    };
    reader.readAsText(file);
  });
}

function fmtBackupDate(iso) {
  if (!iso) return t('settings.backup.unknownDate');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(getLang(), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

// Resolve a backup-count data key to its human label (falls back to the raw key).
function backupCountLabel(key) {
  const label = t('settings.count.' + key);
  return label === 'settings.count.' + key ? key : label;
}

function previewRows(counts = {}) {
  const entries = Object.entries(counts)
    .filter(([, count]) => Number(count) > 0)
    .sort(([a], [b]) => backupCountLabel(a).localeCompare(backupCountLabel(b), getLang()));

  if (!entries.length) {
    return el('p', { class: 'muted', style: { margin: 0 } }, t('settings.preview.empty'));
  }

  return el('table', { class: 'table' },
    el('thead', {}, el('tr', {}, el('th', {}, t('settings.preview.colData')), el('th', { style: { textAlign: 'right' } }, t('settings.preview.colCount')))),
    el('tbody', {}, ...entries.map(([key, count]) => el('tr', {},
      el('td', {}, backupCountLabel(key)),
      el('td', { class: 'tnum', style: { textAlign: 'right' } }, String(count))))));
}

function openImportModal({ fileName, backup, preview, rerender }) {
  let confirmBtn;
  const gateWord = t('settings.import.gateWord');
  const input = Input({
    placeholder: gateWord,
    onInput: (e) => { if (confirmBtn) confirmBtn.disabled = e.target.value.trim() !== gateWord; },
    onKeydown: (e) => {
      if (e.key === 'Enter' && e.target.value.trim() === gateWord && confirmBtn && !confirmBtn.disabled) confirmBtn.click();
    },
  });

  openModal({
    title: t('settings.import.title'),
    size: 'lg',
    body: el('div', { class: 'stack-3' },
      el('div', { class: 'callout' },
        icon('info'),
        el('div', {},
          el('div', { class: 'callout__title' }, t('settings.import.calloutTitle')),
          el('div', { class: 'callout__body' },
            t('settings.import.calloutBody')))),
      el('dl', { class: 'kv' },
        ...kvRow(t('settings.import.file'), fileName, false),
        ...kvRow(t('settings.import.exportedAt'), fmtBackupDate(preview.exported_at), false),
        ...kvRow(t('settings.import.schema'), t('settings.import.schemaValue', { version: preview.version, current: preview.current_version }), false),
        ...kvRow(t('settings.import.totalRows'), String(preview.total_rows || 0), false)),
      previewRows(preview.counts),
      preview.warnings?.length
        ? el('div', { class: 'callout' },
            icon('info'),
            el('div', {},
              el('div', { class: 'callout__title' }, t('settings.import.warningsTitle')),
              el('div', { class: 'callout__body' }, preview.warnings.join(' '))))
        : null,
      el('p', { class: 'text-secondary', style: { margin: 0, lineHeight: '1.6' } },
        t('settings.import.instruction', { word: gateWord })),
      input),
    footer: (close) => {
      confirmBtn = Btn(t('settings.import.confirm'), {
        icon: 'upload',
        variant: 'danger',
        disabled: true,
        onClick: async () => {
          confirmBtn.disabled = true;
          try {
            await post('/api/settings/restore', { backup, confirm: 'RESTORE' });
            close();
            toastOk(t('settings.import.doneToast'));
            await rerender();
          } catch (e) {
            toastError(e);
            confirmBtn.disabled = input.value.trim() !== gateWord;
          }
        },
      });
      return [Btn(t('settings.cancel'), { onClick: close }), confirmBtn];
    },
  });
}

/* -------------------------------------------------- 위험 구역 (Danger zone) */
function DangerZone(ctx) {
  function openResetModal() {
    let confirmBtn;
    // Gate on the locale-resolved word so there's no IME switch and it matches the button.
    // (The API still expects the fixed 'DELETE' token; we send that on the wire below.)
    const gateWord = t('settings.reset.gateWord');
    const input = Input({
      placeholder: gateWord,
      onInput: (e) => { if (confirmBtn) confirmBtn.disabled = e.target.value.trim() !== gateWord; },
      onKeydown: (e) => { if (e.key === 'Enter' && e.target.value.trim() === gateWord && confirmBtn && !confirmBtn.disabled) confirmBtn.click(); },
    });

    openModal({
      title: t('settings.reset.title'),
      body: el('div', { class: 'stack-3' },
        el('div', { class: 'callout' },
          icon('info'),
          el('div', {},
            el('div', { class: 'callout__title' }, t('settings.reset.calloutTitle')),
            el('div', { class: 'callout__body' },
              t('settings.reset.calloutBody')))),
        el('p', { class: 'text-secondary', style: { margin: 0, lineHeight: '1.6' } },
          t('settings.reset.instruction', { word: gateWord })),
        input),
      footer: (close) => {
        confirmBtn = Btn(t('settings.reset.confirm'), {
          variant: 'danger',
          disabled: true,
          onClick: async () => {
            confirmBtn.disabled = true;
            try {
              await post('/api/settings/reset', { confirm: 'DELETE' });
              close();
              toastOk(t('settings.reset.doneToast'));
              navigate('/');
              await ctx.refreshNav();
            } catch (e) {
              toastError(e);
              confirmBtn.disabled = input.value.trim() !== gateWord;
            }
          },
        });
        return [Btn(t('settings.cancel'), { onClick: close }), confirmBtn];
      },
    });
  }

  return Card({
    title: t('settings.danger.title'),
    sub: t('settings.danger.sub'),
    body: el('div', { class: 'flex between gap-3 wrap' },
      el('div', { style: { maxWidth: '440px' } },
        el('div', { class: 'strong' }, t('settings.danger.resetTitle')),
        el('div', { class: 'muted text-sm', style: { lineHeight: '1.6' } },
          t('settings.danger.resetBody'))),
      Btn(t('settings.danger.resetTitle'), { icon: 'trash', variant: 'danger', onClick: openResetModal })),
  });
}

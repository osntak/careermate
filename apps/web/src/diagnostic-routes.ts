import fs from 'node:fs';
import { getDataHealthReport } from '@careermate/core';
import { getDataDir, getDbPath, getBackupsDir } from '@careermate/db';
import { APP_VERSION } from '@careermate/shared';
import { Router } from './http.ts';

function writable(path: string): boolean {
  try {
    fs.accessSync(path, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function registerDiagnosticRoutes(router: Router): void {
  router.get('/api/diagnostics', () => {
    const dataDir = getDataDir();
    const dbPath = getDbPath();
    const backupsDir = getBackupsDir();
    const checks = [
      {
        id: 'database',
        ok: fs.existsSync(dbPath),
        label: '로컬 데이터베이스',
        detail: dbPath,
      },
      {
        id: 'data_dir',
        ok: fs.existsSync(dataDir) && writable(dataDir),
        label: '데이터 폴더 읽기·쓰기',
        detail: dataDir,
      },
      {
        id: 'backups_dir',
        ok: fs.existsSync(backupsDir) && writable(backupsDir),
        label: '백업 폴더 읽기·쓰기',
        detail: backupsDir,
      },
      {
        id: 'node',
        ok: Number(process.versions.node.split('.')[0]) >= 22,
        label: 'Node.js 호환성',
        detail: process.versions.node,
      },
    ];

    return {
      ok: checks.every((check) => check.ok),
      version: APP_VERSION,
      local_first: {
        database_local: true,
        stored_career_data_sent_externally: false,
        optional_network_features: ['update_check', 'install_docs', 'job_search'],
      },
      checks,
      data_health: getDataHealthReport(),
    };
  });

  router.get('/api/data-health', () => getDataHealthReport());
}

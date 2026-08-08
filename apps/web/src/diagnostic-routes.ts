import fs from 'node:fs';
import { z } from 'zod';
import { getDataHealthReport } from '@careermate/core';
import { getDataDir, getDbPath, getBackupsDir, provenanceRepo } from '@careermate/db';
import { APP_VERSION } from '@careermate/shared';
import { Router, readJsonBody } from './http.ts';

function writable(path: string): boolean {
  try {
    fs.accessSync(path, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

const ProvenanceInputSchema = z.object({
  entity_type: z.string().trim().min(1).max(100),
  entity_id: z.string().trim().min(1).max(200),
  source: z.enum(['human', 'ai', 'import', 'document']),
  source_document_id: z.string().max(200).nullable().optional(),
  source_excerpt: z.string().max(2_000).nullable().optional(),
  verified_by_human: z.boolean().optional(),
});

const VerifyInputSchema = z.object({
  entity_type: z.string().trim().min(1).max(100),
  entity_id: z.string().trim().min(1).max(200),
  verified: z.boolean(),
});

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
      unverified_entities: provenanceRepo.listUnverified(),
    };
  });

  router.get('/api/data-health', () => getDataHealthReport());
  router.get('/api/provenance/unverified', () => ({ items: provenanceRepo.listUnverified() }));
  router.get('/api/provenance/:type/:id', (ctx) => ({
    provenance: provenanceRepo.get(ctx.params.type!, ctx.params.id!),
  }));
  router.post('/api/provenance', async (ctx) => {
    const input = await readJsonBody(ctx.req, ProvenanceInputSchema);
    return { provenance: provenanceRepo.save(input) };
  });
  router.post('/api/provenance/verify', async (ctx) => {
    const input = await readJsonBody(ctx.req, VerifyInputSchema);
    return {
      provenance: provenanceRepo.setHumanVerified(input.entity_type, input.entity_id, input.verified),
    };
  });
}

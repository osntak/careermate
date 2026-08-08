import { getDb } from './connection.ts';

export type ProvenanceSource = 'human' | 'ai' | 'import' | 'document';

export interface EntityProvenance {
  entity_type: string;
  entity_id: string;
  source: ProvenanceSource;
  source_document_id: string | null;
  source_excerpt: string | null;
  verified_by_human: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

function ensureTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS entity_provenance (
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('human','ai','import','document')),
      source_document_id TEXT,
      source_excerpt TEXT,
      verified_by_human INTEGER NOT NULL DEFAULT 0,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(entity_type, entity_id)
    );
    CREATE INDEX IF NOT EXISTS idx_entity_provenance_verified
      ON entity_provenance(verified_by_human, updated_at DESC);
  `);
}

function map(row: any): EntityProvenance {
  return {
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    source: row.source,
    source_document_id: row.source_document_id,
    source_excerpt: row.source_excerpt,
    verified_by_human: Number(row.verified_by_human) === 1,
    verified_at: row.verified_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const provenanceRepo = {
  get(entityType: string, entityId: string): EntityProvenance | null {
    ensureTable();
    const row = getDb()
      .prepare(`SELECT * FROM entity_provenance WHERE entity_type = ? AND entity_id = ?`)
      .get(entityType, entityId);
    return row ? map(row) : null;
  },

  listUnverified(): EntityProvenance[] {
    ensureTable();
    return (
      getDb()
        .prepare(`SELECT * FROM entity_provenance WHERE verified_by_human = 0 ORDER BY updated_at DESC`)
        .all() as any[]
    ).map(map);
  },

  save(input: {
    entity_type: string;
    entity_id: string;
    source: ProvenanceSource;
    source_document_id?: string | null;
    source_excerpt?: string | null;
    verified_by_human?: boolean;
  }): EntityProvenance {
    ensureTable();
    const existing = this.get(input.entity_type, input.entity_id);
    const now = new Date().toISOString();
    const verified = input.verified_by_human ?? existing?.verified_by_human ?? input.source === 'human';
    const verifiedAt = verified ? existing?.verified_at ?? now : null;
    getDb()
      .prepare(`
        INSERT INTO entity_provenance (
          entity_type, entity_id, source, source_document_id, source_excerpt,
          verified_by_human, verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(entity_type, entity_id) DO UPDATE SET
          source = excluded.source,
          source_document_id = excluded.source_document_id,
          source_excerpt = excluded.source_excerpt,
          verified_by_human = excluded.verified_by_human,
          verified_at = excluded.verified_at,
          updated_at = excluded.updated_at
      `)
      .run(
        input.entity_type,
        input.entity_id,
        input.source,
        input.source_document_id ?? existing?.source_document_id ?? null,
        input.source_excerpt ?? existing?.source_excerpt ?? null,
        verified ? 1 : 0,
        verifiedAt,
        existing?.created_at ?? now,
        now,
      );
    return this.get(input.entity_type, input.entity_id)!;
  },

  setHumanVerified(entityType: string, entityId: string, verified: boolean): EntityProvenance {
    const existing = this.get(entityType, entityId);
    return this.save({
      entity_type: entityType,
      entity_id: entityId,
      source: existing?.source ?? 'human',
      source_document_id: existing?.source_document_id,
      source_excerpt: existing?.source_excerpt,
      verified_by_human: verified,
    });
  },
};

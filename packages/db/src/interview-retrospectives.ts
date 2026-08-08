import { getDb } from './connection.ts';

export interface InterviewRetrospective {
  id: string;
  job_id: string;
  interview_round: string | null;
  occurred_at: string | null;
  questions: string[];
  strong_answers: string[];
  weak_answers: string[];
  follow_up_actions: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function ensureTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS interview_retrospectives (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      interview_round TEXT,
      occurred_at TEXT,
      questions TEXT NOT NULL DEFAULT '[]',
      strong_answers TEXT NOT NULL DEFAULT '[]',
      weak_answers TEXT NOT NULL DEFAULT '[]',
      follow_up_actions TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_interview_retrospectives_job
      ON interview_retrospectives(job_id, occurred_at DESC, updated_at DESC);
  `);
}

function parseList(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function map(row: any): InterviewRetrospective {
  return {
    id: row.id,
    job_id: row.job_id,
    interview_round: row.interview_round,
    occurred_at: row.occurred_at,
    questions: parseList(row.questions),
    strong_answers: parseList(row.strong_answers),
    weak_answers: parseList(row.weak_answers),
    follow_up_actions: parseList(row.follow_up_actions),
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function id(): string {
  return `retro_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export const interviewRetrospectiveRepo = {
  listAll(limit = 100): InterviewRetrospective[] {
    ensureTable();
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    return (
      getDb()
        .prepare(`SELECT * FROM interview_retrospectives ORDER BY occurred_at DESC, updated_at DESC LIMIT ?`)
        .all(safeLimit) as any[]
    ).map(map);
  },

  listByJob(jobId: string): InterviewRetrospective[] {
    ensureTable();
    return (
      getDb()
        .prepare(`SELECT * FROM interview_retrospectives WHERE job_id = ? ORDER BY occurred_at DESC, updated_at DESC`)
        .all(jobId) as any[]
    ).map(map);
  },

  save(input: {
    id?: string;
    job_id: string;
    interview_round?: string | null;
    occurred_at?: string | null;
    questions?: string[];
    strong_answers?: string[];
    weak_answers?: string[];
    follow_up_actions?: string[];
    notes?: string | null;
  }): InterviewRetrospective {
    ensureTable();
    const now = new Date().toISOString();
    const recordId = input.id ?? id();
    const existing = getDb().prepare(`SELECT * FROM interview_retrospectives WHERE id = ?`).get(recordId) as any;
    getDb()
      .prepare(`
        INSERT INTO interview_retrospectives (
          id, job_id, interview_round, occurred_at, questions, strong_answers,
          weak_answers, follow_up_actions, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          job_id = excluded.job_id,
          interview_round = excluded.interview_round,
          occurred_at = excluded.occurred_at,
          questions = excluded.questions,
          strong_answers = excluded.strong_answers,
          weak_answers = excluded.weak_answers,
          follow_up_actions = excluded.follow_up_actions,
          notes = excluded.notes,
          updated_at = excluded.updated_at
      `)
      .run(
        recordId,
        input.job_id,
        input.interview_round ?? existing?.interview_round ?? null,
        input.occurred_at ?? existing?.occurred_at ?? null,
        JSON.stringify(input.questions ?? parseList(existing?.questions)),
        JSON.stringify(input.strong_answers ?? parseList(existing?.strong_answers)),
        JSON.stringify(input.weak_answers ?? parseList(existing?.weak_answers)),
        JSON.stringify(input.follow_up_actions ?? parseList(existing?.follow_up_actions)),
        input.notes ?? existing?.notes ?? null,
        existing?.created_at ?? now,
        now,
      );
    return map(getDb().prepare(`SELECT * FROM interview_retrospectives WHERE id = ?`).get(recordId));
  },

  remove(retrospectiveId: string): boolean {
    ensureTable();
    return getDb().prepare(`DELETE FROM interview_retrospectives WHERE id = ?`).run(retrospectiveId).changes > 0;
  },
};

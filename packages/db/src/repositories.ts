/**
 * Repositories — typed CRUD over the SQLite tables. Each function returns the
 * parsed domain record shape from @careermate/shared (JSON columns decoded,
 * bits turned into booleans). This is the only layer that touches raw SQL.
 */
import {
  newId,
  now,
  assertStatusTransition,
  type ProfileInput,
  type ProfileRecord,
  type ExperienceInput,
  type ExperienceRecord,
  type ProjectInput,
  type ProjectRecord,
  type SkillInput,
  type SkillRecord,
  type DocumentInput,
  type DocumentRecord,
  type CoverLetterRecord,
  type CoverLetterVersionRecord,
  type JobInput,
  type JobRecord,
  type OfferInput,
  type OfferRecord,
  type FitAnalysisInput,
  type FitAnalysisRecord,
  type ApplicationInput,
  type ApplicationRecord,
  type ApplicationStatus,
  type InterviewPrepInput,
  type InterviewPrepRecord,
  type ActivityRecord,
  type ActivityType,
  type ApplicationTimelineInput,
  type ApplicationTimelineRecord,
  type EntityType,
  type ContentSource,
  type DocumentKind,
} from '@careermate/shared';
import { getDb, tx, toJson, fromJson, toBit, fromBit } from './connection.ts';

const PROFILE_ID = 'profile-singleton';

/**
 * Normalize a free-text value for natural-key matching used by the batch
 * upserts (add_skill/experience/project accept many items and must not create
 * duplicate rows when the AI re-extracts the same data). Trim + ASCII case-fold
 * is enough here — Korean has no case, and we only need "Python" == "python".
 */
const norm = (s: string | null | undefined): string => (s ?? '').trim().toLowerCase();

/* ----------------------------------------------------------------- Profile */

function mapProfile(r: any): ProfileRecord {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    location: r.location,
    headline: r.headline,
    summary: r.summary,
    desired_roles: fromJson(r.desired_roles, []),
    desired_conditions: r.desired_conditions,
    preferred_tone: r.preferred_tone,
    emphasis_points: fromJson(r.emphasis_points, []),
    links: fromJson(r.links, []),
    education: fromJson(r.education, []),
    certifications: fromJson(r.certifications, []),
    language_scores: fromJson(r.language_scores, []),
    awards: fromJson(r.awards, []),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const profileRepo = {
  get(): ProfileRecord | null {
    const r = getDb().prepare(`SELECT * FROM profile WHERE id = ?`).get(PROFILE_ID);
    return r ? mapProfile(r) : null;
  },
  /** Upsert + merge: only provided fields overwrite; arrays replace when given. */
  save(input: ProfileInput): ProfileRecord {
    const db = getDb();
    const existing = this.get();
    const ts = now();
    const merged: ProfileRecord = {
      id: PROFILE_ID,
      name: input.name ?? existing?.name ?? null,
      email: input.email ?? existing?.email ?? null,
      phone: input.phone ?? existing?.phone ?? null,
      location: input.location ?? existing?.location ?? null,
      headline: input.headline ?? existing?.headline ?? null,
      summary: input.summary ?? existing?.summary ?? null,
      desired_roles: input.desired_roles ?? existing?.desired_roles ?? [],
      desired_conditions: input.desired_conditions ?? existing?.desired_conditions ?? null,
      preferred_tone: input.preferred_tone ?? existing?.preferred_tone ?? null,
      emphasis_points: input.emphasis_points ?? existing?.emphasis_points ?? [],
      links: input.links ?? existing?.links ?? [],
      education: input.education ?? existing?.education ?? [],
      certifications: input.certifications ?? existing?.certifications ?? [],
      language_scores: input.language_scores ?? existing?.language_scores ?? [],
      awards: input.awards ?? existing?.awards ?? [],
      created_at: existing?.created_at ?? ts,
      updated_at: ts,
    };
    db.prepare(
      `INSERT INTO profile (id,name,email,phone,location,headline,summary,desired_roles,desired_conditions,preferred_tone,emphasis_points,links,education,certifications,language_scores,awards,created_at,updated_at)
       VALUES (@id,@name,@email,@phone,@location,@headline,@summary,@desired_roles,@desired_conditions,@preferred_tone,@emphasis_points,@links,@education,@certifications,@language_scores,@awards,@created_at,@updated_at)
       ON CONFLICT(id) DO UPDATE SET
         name=@name,email=@email,phone=@phone,location=@location,headline=@headline,summary=@summary,
         desired_roles=@desired_roles,desired_conditions=@desired_conditions,preferred_tone=@preferred_tone,
         emphasis_points=@emphasis_points,links=@links,
         education=@education,certifications=@certifications,language_scores=@language_scores,awards=@awards,
         updated_at=@updated_at`,
    ).run({
      ...merged,
      desired_roles: toJson(merged.desired_roles),
      emphasis_points: toJson(merged.emphasis_points),
      links: toJson(merged.links),
      education: toJson(merged.education),
      certifications: toJson(merged.certifications),
      language_scores: toJson(merged.language_scores),
      awards: toJson(merged.awards),
    });
    return merged;
  },
};

/* -------------------------------------------------------------- Experiences */

function mapExperience(r: any): ExperienceRecord {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    employment_type: r.employment_type,
    start_date: r.start_date,
    end_date: r.end_date,
    is_current: fromBit(r.is_current),
    description: r.description,
    achievements: fromJson(r.achievements, []),
    tech: fromJson(r.tech, []),
    order_index: r.order_index,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/** Natural key for experience dedupe: company + role + start_date (case-insensitive). */
function expKey(company?: string | null, role?: string | null, start?: string | null): string {
  return [norm(company), norm(role), norm(start)].join('\u001f');
}

export const experienceRepo = {
  list(): ExperienceRecord[] {
    return (
      getDb()
        .prepare(`SELECT * FROM experiences ORDER BY order_index ASC, start_date DESC`)
        .all() as any[]
    ).map(mapExperience);
  },
  get(id: string): ExperienceRecord | null {
    const r = getDb().prepare(`SELECT * FROM experiences WHERE id = ?`).get(id);
    return r ? mapExperience(r) : null;
  },
  /** Existing experience with the same company+role+start_date, or null (for idempotent batch upserts). */
  findMatch(input: { company: string; role?: string | null; start_date?: string | null }): ExperienceRecord | null {
    const key = expKey(input.company, input.role ?? null, input.start_date ?? null);
    return this.list().find((e) => expKey(e.company, e.role, e.start_date) === key) ?? null;
  },
  /** Insert, or merge into the matching experience (omitted fields keep their stored value). */
  upsert(input: ExperienceInput): { record: ExperienceRecord; created: boolean } {
    const existing = this.findMatch(input);
    if (existing) return { record: this.update(existing.id, input)!, created: false };
    return { record: this.add(input), created: true };
  },
  /** Batch insert/merge in one transaction; within-batch duplicates collapse onto one row. */
  addMany(inputs: ExperienceInput[]): { records: ExperienceRecord[]; created: number; updated: number } {
    return tx(() => {
      const records: ExperienceRecord[] = [];
      let created = 0;
      let updated = 0;
      for (const input of inputs) {
        const { record, created: isNew } = this.upsert(input);
        records.push(record);
        if (isNew) created += 1;
        else updated += 1;
      }
      return { records, created, updated };
    });
  },
  add(input: ExperienceInput): ExperienceRecord {
    const ts = now();
    const id = newId('exp_');
    getDb()
      .prepare(
        `INSERT INTO experiences (id,company,role,employment_type,start_date,end_date,is_current,description,achievements,tech,order_index,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        input.company,
        input.role ?? null,
        input.employment_type ?? null,
        input.start_date ?? null,
        input.end_date ?? null,
        toBit(input.is_current),
        input.description ?? null,
        toJson(input.achievements ?? []),
        toJson(input.tech ?? []),
        input.order_index ?? 0,
        ts,
        ts,
      );
    return this.get(id)!;
  },
  update(id: string, input: Partial<ExperienceInput>): ExperienceRecord | null {
    const cur = this.get(id);
    if (!cur) return null;
    const m = { ...cur, ...input } as ExperienceRecord;
    getDb()
      .prepare(
        `UPDATE experiences SET company=?,role=?,employment_type=?,start_date=?,end_date=?,is_current=?,description=?,achievements=?,tech=?,order_index=?,updated_at=? WHERE id=?`,
      )
      .run(
        m.company,
        m.role,
        m.employment_type,
        m.start_date,
        m.end_date,
        toBit(m.is_current),
        m.description,
        toJson(m.achievements),
        toJson(m.tech),
        m.order_index,
        now(),
        id,
      );
    return this.get(id);
  },
  remove(id: string): boolean {
    return getDb().prepare(`DELETE FROM experiences WHERE id=?`).run(id).changes > 0;
  },
};

/* ----------------------------------------------------------------- Projects */

function mapProject(r: any): ProjectRecord {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    description: r.description,
    highlights: fromJson(r.highlights, []),
    tech: fromJson(r.tech, []),
    url: r.url,
    start_date: r.start_date,
    end_date: r.end_date,
    order_index: r.order_index,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const projectRepo = {
  list(): ProjectRecord[] {
    return (
      getDb().prepare(`SELECT * FROM projects ORDER BY order_index ASC, start_date DESC`).all() as any[]
    ).map(mapProject);
  },
  get(id: string): ProjectRecord | null {
    const r = getDb().prepare(`SELECT * FROM projects WHERE id = ?`).get(id);
    return r ? mapProject(r) : null;
  },
  /** Existing project with the same name (case-insensitive), or null (for idempotent batch upserts). */
  findByName(name: string): ProjectRecord | null {
    const key = norm(name);
    return this.list().find((p) => norm(p.name) === key) ?? null;
  },
  /** Insert, or merge into the same-named project (omitted fields keep their stored value). */
  upsert(input: ProjectInput): { record: ProjectRecord; created: boolean } {
    const existing = this.findByName(input.name);
    if (existing) return { record: this.update(existing.id, input)!, created: false };
    return { record: this.add(input), created: true };
  },
  /** Batch insert/merge in one transaction; within-batch duplicates collapse onto one row. */
  addMany(inputs: ProjectInput[]): { records: ProjectRecord[]; created: number; updated: number } {
    return tx(() => {
      const records: ProjectRecord[] = [];
      let created = 0;
      let updated = 0;
      for (const input of inputs) {
        const { record, created: isNew } = this.upsert(input);
        records.push(record);
        if (isNew) created += 1;
        else updated += 1;
      }
      return { records, created, updated };
    });
  },
  add(input: ProjectInput): ProjectRecord {
    const ts = now();
    const id = newId('prj_');
    getDb()
      .prepare(
        `INSERT INTO projects (id,name,role,description,highlights,tech,url,start_date,end_date,order_index,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        input.name,
        input.role ?? null,
        input.description ?? null,
        toJson(input.highlights ?? []),
        toJson(input.tech ?? []),
        input.url ?? null,
        input.start_date ?? null,
        input.end_date ?? null,
        input.order_index ?? 0,
        ts,
        ts,
      );
    return this.get(id)!;
  },
  update(id: string, input: Partial<ProjectInput>): ProjectRecord | null {
    const cur = this.get(id);
    if (!cur) return null;
    const m = { ...cur, ...input } as ProjectRecord;
    getDb()
      .prepare(
        `UPDATE projects SET name=?,role=?,description=?,highlights=?,tech=?,url=?,start_date=?,end_date=?,order_index=?,updated_at=? WHERE id=?`,
      )
      .run(
        m.name,
        m.role,
        m.description,
        toJson(m.highlights),
        toJson(m.tech),
        m.url,
        m.start_date,
        m.end_date,
        m.order_index,
        now(),
        id,
      );
    return this.get(id);
  },
  remove(id: string): boolean {
    return getDb().prepare(`DELETE FROM projects WHERE id=?`).run(id).changes > 0;
  },
};

/* ------------------------------------------------------------------- Skills */

function mapSkill(r: any): SkillRecord {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    level: r.level,
    years: r.years,
    order_index: r.order_index,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const skillRepo = {
  list(): SkillRecord[] {
    return (
      getDb().prepare(`SELECT * FROM skills ORDER BY order_index ASC, name ASC`).all() as any[]
    ).map(mapSkill);
  },
  get(id: string): SkillRecord | null {
    const r = getDb().prepare(`SELECT * FROM skills WHERE id = ?`).get(id);
    return r ? mapSkill(r) : null;
  },
  /** Existing skill with the same name (case-insensitive), or null (for idempotent batch upserts). */
  findByName(name: string): SkillRecord | null {
    const key = norm(name);
    return this.list().find((s) => norm(s.name) === key) ?? null;
  },
  /** Insert, or merge into the same-named skill (omitted fields keep their stored value). */
  upsert(input: SkillInput): { record: SkillRecord; created: boolean } {
    const existing = this.findByName(input.name);
    if (existing) return { record: this.update(existing.id, input)!, created: false };
    return { record: this.add(input), created: true };
  },
  /** Batch insert/merge in one transaction; within-batch duplicates collapse onto one row. */
  addMany(inputs: SkillInput[]): { records: SkillRecord[]; created: number; updated: number } {
    return tx(() => {
      const records: SkillRecord[] = [];
      let created = 0;
      let updated = 0;
      for (const input of inputs) {
        const { record, created: isNew } = this.upsert(input);
        records.push(record);
        if (isNew) created += 1;
        else updated += 1;
      }
      return { records, created, updated };
    });
  },
  add(input: SkillInput): SkillRecord {
    const ts = now();
    const id = newId('skl_');
    getDb()
      .prepare(
        `INSERT INTO skills (id,name,category,level,years,order_index,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        input.name,
        input.category ?? null,
        input.level ?? null,
        input.years ?? null,
        input.order_index ?? 0,
        ts,
        ts,
      );
    return this.get(id)!;
  },
  update(id: string, input: Partial<SkillInput>): SkillRecord | null {
    const cur = this.get(id);
    if (!cur) return null;
    const m = { ...cur, ...input } as SkillRecord;
    getDb()
      .prepare(`UPDATE skills SET name=?,category=?,level=?,years=?,order_index=?,updated_at=? WHERE id=?`)
      .run(m.name, m.category, m.level, m.years, m.order_index, now(), id);
    return this.get(id);
  },
  remove(id: string): boolean {
    return getDb().prepare(`DELETE FROM skills WHERE id=?`).run(id).changes > 0;
  },
};

/* ---------------------------------------------------------------- Documents */

function mapDocument(r: any): DocumentRecord {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    content: r.content,
    source: r.source,
    is_primary: fromBit(r.is_primary),
    tags: fromJson(r.tags, []),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const documentRepo = {
  list(kind?: DocumentKind): DocumentRecord[] {
    const db = getDb();
    const rows = kind
      ? db.prepare(`SELECT * FROM documents WHERE kind=? ORDER BY is_primary DESC, updated_at DESC`).all(kind)
      : db.prepare(`SELECT * FROM documents ORDER BY is_primary DESC, updated_at DESC`).all();
    return (rows as any[]).map(mapDocument);
  },
  get(id: string): DocumentRecord | null {
    const r = getDb().prepare(`SELECT * FROM documents WHERE id=?`).get(id);
    return r ? mapDocument(r) : null;
  },
  primary(kind: DocumentKind): DocumentRecord | null {
    const r = getDb()
      .prepare(`SELECT * FROM documents WHERE kind=? ORDER BY is_primary DESC, updated_at DESC LIMIT 1`)
      .get(kind);
    return r ? mapDocument(r) : null;
  },
  add(input: DocumentInput): DocumentRecord {
    const ts = now();
    const id = newId('doc_');
    const db = getDb();
    // Demoting the previous primary + inserting the new doc must be atomic.
    return tx(() => {
      if (input.is_primary) {
        db.prepare(`UPDATE documents SET is_primary=0 WHERE kind=?`).run(input.kind);
      }
      db.prepare(
        `INSERT INTO documents (id,kind,title,content,source,is_primary,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      ).run(
        id,
        input.kind,
        input.title,
        input.content ?? '',
        (input.source ?? 'manual') as ContentSource,
        toBit(input.is_primary),
        toJson(input.tags ?? []),
        ts,
        ts,
      );
      return this.get(id)!;
    });
  },
  update(id: string, input: Partial<DocumentInput>): DocumentRecord | null {
    const cur = this.get(id);
    if (!cur) return null;
    const db = getDb();
    const m = { ...cur, ...input } as DocumentRecord;
    // Demoting the previous primary + updating this doc must be atomic.
    return tx(() => {
      if (input.is_primary) db.prepare(`UPDATE documents SET is_primary=0 WHERE kind=?`).run(m.kind);
      db.prepare(
        `UPDATE documents SET kind=?,title=?,content=?,source=?,is_primary=?,tags=?,updated_at=? WHERE id=?`,
      ).run(m.kind, m.title, m.content, m.source, toBit(m.is_primary), toJson(m.tags), now(), id);
      return this.get(id);
    });
  },
  remove(id: string): boolean {
    return getDb().prepare(`DELETE FROM documents WHERE id=?`).run(id).changes > 0;
  },
};

/* ------------------------------------------------------------ Cover letters */

function mapVersion(r: any): CoverLetterVersionRecord {
  return {
    id: r.id,
    cover_letter_id: r.cover_letter_id,
    version_no: r.version_no,
    content: r.content,
    note: r.note,
    source: r.source,
    created_at: r.created_at,
  };
}

function mapCoverLetter(r: any, withVersions = false): CoverLetterRecord {
  const db = getDb();
  const versions = (
    db
      .prepare(`SELECT * FROM cover_letter_versions WHERE cover_letter_id=? ORDER BY version_no DESC`)
      .all(r.id) as any[]
  ).map(mapVersion);
  const current = versions.find((v) => v.id === r.current_version_id) ?? versions[0] ?? null;
  return {
    id: r.id,
    title: r.title,
    job_id: r.job_id,
    is_primary: fromBit(r.is_primary),
    current_version_id: r.current_version_id,
    version_count: versions.length,
    current_content: current ? current.content : null,
    versions: withVersions ? versions : undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const coverLetterRepo = {
  list(): CoverLetterRecord[] {
    return (
      getDb().prepare(`SELECT * FROM cover_letters ORDER BY is_primary DESC, updated_at DESC`).all() as any[]
    ).map((r) => mapCoverLetter(r, false));
  },
  get(id: string, withVersions = true): CoverLetterRecord | null {
    const r = getDb().prepare(`SELECT * FROM cover_letters WHERE id=?`).get(id);
    return r ? mapCoverLetter(r, withVersions) : null;
  },
  listByJob(jobId: string): CoverLetterRecord[] {
    return (
      getDb().prepare(`SELECT * FROM cover_letters WHERE job_id=? ORDER BY updated_at DESC`).all(jobId) as any[]
    ).map((r) => mapCoverLetter(r, false));
  },
  create(opts: { title: string; job_id?: string | null; is_primary?: boolean }): CoverLetterRecord {
    const ts = now();
    const id = newId('cl_');
    const db = getDb();
    return tx(() => {
      if (opts.is_primary) db.prepare(`UPDATE cover_letters SET is_primary=0`).run();
      db.prepare(
        `INSERT INTO cover_letters (id,title,job_id,is_primary,current_version_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`,
      ).run(id, opts.title, opts.job_id ?? null, toBit(opts.is_primary), null, ts, ts);
      return this.get(id)!;
    });
  },
  /** Append a new version. Creates the cover letter if cover_letter_id is omitted. */
  addVersion(opts: {
    cover_letter_id?: string;
    title?: string;
    job_id?: string | null;
    content: string;
    note?: string;
    source?: ContentSource;
    set_current?: boolean;
  }): { coverLetter: CoverLetterRecord; version: CoverLetterVersionRecord } {
    const db = getDb();
    // Create-if-needed + version INSERT + current_version_id/title/job_id UPDATEs
    // must all commit together, or mapCoverLetter's "current" lookup goes stale.
    return tx(() => {
      let clId = opts.cover_letter_id;
      if (!clId) {
        const cl = this.create({ title: opts.title ?? '자기소개서', job_id: opts.job_id ?? null });
        clId = cl.id;
      }
      const maxRow = db
        .prepare(`SELECT MAX(version_no) AS m FROM cover_letter_versions WHERE cover_letter_id=?`)
        .get(clId) as { m: number | null };
      const versionNo = (maxRow.m ?? 0) + 1;
      const vid = newId('clv_');
      const ts = now();
      db.prepare(
        `INSERT INTO cover_letter_versions (id,cover_letter_id,version_no,content,note,source,created_at) VALUES (?,?,?,?,?,?,?)`,
      ).run(vid, clId, versionNo, opts.content, opts.note ?? null, opts.source ?? 'ai', ts);

      const setCurrent = opts.set_current !== false;
      if (setCurrent) {
        db.prepare(`UPDATE cover_letters SET current_version_id=?, updated_at=? WHERE id=?`).run(vid, ts, clId);
      } else {
        db.prepare(`UPDATE cover_letters SET updated_at=? WHERE id=?`).run(ts, clId);
      }
      if (opts.title) db.prepare(`UPDATE cover_letters SET title=? WHERE id=?`).run(opts.title, clId);
      if (opts.job_id !== undefined)
        db.prepare(`UPDATE cover_letters SET job_id=? WHERE id=?`).run(opts.job_id, clId);

      return { coverLetter: this.get(clId)!, version: mapVersion(db.prepare(`SELECT * FROM cover_letter_versions WHERE id=?`).get(vid)) };
    });
  },
  setCurrentVersion(coverLetterId: string, versionId: string): CoverLetterRecord | null {
    getDb()
      .prepare(`UPDATE cover_letters SET current_version_id=?, updated_at=? WHERE id=?`)
      .run(versionId, now(), coverLetterId);
    return this.get(coverLetterId);
  },
  setPrimary(id: string): CoverLetterRecord | null {
    const db = getDb();
    return tx(() => {
      db.prepare(`UPDATE cover_letters SET is_primary=0`).run();
      db.prepare(`UPDATE cover_letters SET is_primary=1, updated_at=? WHERE id=?`).run(now(), id);
      return this.get(id);
    });
  },
  remove(id: string): boolean {
    const db = getDb();
    return tx(() => {
      db.prepare(`UPDATE applications SET cover_letter_id=NULL, updated_at=? WHERE cover_letter_id=?`).run(now(), id);
      db.prepare(`DELETE FROM cover_letter_versions WHERE cover_letter_id=?`).run(id);
      return db.prepare(`DELETE FROM cover_letters WHERE id=?`).run(id).changes > 0;
    });
  },
};

/* --------------------------------------------------------------------- Jobs */

function mapJob(r: any): JobRecord {
  return {
    id: r.id,
    company: r.company,
    position: r.position,
    url: r.url,
    location: r.location,
    employment_type: r.employment_type,
    description: r.description,
    requirements: fromJson(r.requirements, []),
    keywords: fromJson(r.keywords, []),
    deadline: r.deadline,
    source: r.source,
    company_overview: r.company_overview ?? null,
    talent_profile: r.talent_profile ?? null,
    core_values: fromJson(r.core_values, []),
    reputation: r.reputation ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const jobRepo = {
  list(): JobRecord[] {
    return (getDb().prepare(`SELECT * FROM jobs ORDER BY updated_at DESC`).all() as any[]).map(mapJob);
  },
  get(id: string): JobRecord | null {
    const r = getDb().prepare(`SELECT * FROM jobs WHERE id=?`).get(id);
    return r ? mapJob(r) : null;
  },
  findByUrl(url: string): JobRecord | null {
    const r = getDb().prepare(`SELECT * FROM jobs WHERE url=? LIMIT 1`).get(url);
    return r ? mapJob(r) : null;
  },
  relatedTo(company: string, position: string, excludeId?: string): JobRecord[] {
    const rows = getDb()
      .prepare(
        `SELECT * FROM jobs WHERE (company=? OR position LIKE ?) AND id != ? ORDER BY updated_at DESC LIMIT 10`,
      )
      .all(company, `%${position}%`, excludeId ?? '') as any[];
    return rows.map(mapJob);
  },
  upsert(input: JobInput, id?: string): JobRecord {
    const db = getDb();
    const existing = id ? this.get(id) : input.url ? this.findByUrl(input.url) : null;
    const ts = now();
    if (existing) {
      const m = { ...existing, ...input } as JobRecord;
      db.prepare(
        `UPDATE jobs SET company=?,position=?,url=?,location=?,employment_type=?,description=?,requirements=?,keywords=?,deadline=?,source=?,company_overview=?,talent_profile=?,core_values=?,reputation=?,updated_at=? WHERE id=?`,
      ).run(
        m.company,
        m.position,
        m.url ?? null,
        m.location ?? null,
        m.employment_type ?? null,
        m.description ?? null,
        toJson(m.requirements ?? []),
        toJson(m.keywords ?? []),
        m.deadline ?? null,
        m.source ?? null,
        m.company_overview ?? null,
        m.talent_profile ?? null,
        toJson(m.core_values ?? []),
        m.reputation ?? null,
        ts,
        existing.id,
      );
      return this.get(existing.id)!;
    }
    const newJobId = id ?? newId('job_');
    db.prepare(
      `INSERT INTO jobs (id,company,position,url,location,employment_type,description,requirements,keywords,deadline,source,company_overview,talent_profile,core_values,reputation,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      newJobId,
      input.company,
      input.position,
      input.url ?? null,
      input.location ?? null,
      input.employment_type ?? null,
      input.description ?? null,
      toJson(input.requirements ?? []),
      toJson(input.keywords ?? []),
      input.deadline ?? null,
      input.source ?? null,
      input.company_overview ?? null,
      input.talent_profile ?? null,
      toJson(input.core_values ?? []),
      input.reputation ?? null,
      ts,
      ts,
    );
    return this.get(newJobId)!;
  },
  remove(id: string): boolean {
    const db = getDb();
    // Delete the job and all its dependent rows atomically (no orphans on failure).
    return tx(() => {
      db.prepare(`UPDATE cover_letters SET job_id=NULL, updated_at=? WHERE job_id=?`).run(now(), id);
      db.prepare(`DELETE FROM fit_analyses WHERE job_id=?`).run(id);
      db.prepare(`DELETE FROM applications WHERE job_id=?`).run(id);
      db.prepare(`DELETE FROM interview_preps WHERE job_id=?`).run(id);
      db.prepare(`DELETE FROM application_timeline_events WHERE job_id=?`).run(id);
      return db.prepare(`DELETE FROM jobs WHERE id=?`).run(id).changes > 0;
    });
  },
};

/* ------------------------------------------------------------ Fit analyses */

function mapFit(r: any): FitAnalysisRecord {
  return {
    id: r.id,
    job_id: r.job_id,
    score: r.score,
    summary: r.summary,
    strengths: fromJson(r.strengths, []),
    gaps: fromJson(r.gaps, []),
    matched_keywords: fromJson(r.matched_keywords, []),
    missing_keywords: fromJson(r.missing_keywords, []),
    recommendations: fromJson(r.recommendations, []),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const fitRepo = {
  getByJob(jobId: string): FitAnalysisRecord | null {
    const r = getDb()
      .prepare(`SELECT * FROM fit_analyses WHERE job_id=? ORDER BY updated_at DESC LIMIT 1`)
      .get(jobId);
    return r ? mapFit(r) : null;
  },
  save(input: FitAnalysisInput): FitAnalysisRecord {
    const db = getDb();
    const existing = this.getByJob(input.job_id);
    const ts = now();
    if (existing) {
      const m = { ...existing, ...input } as FitAnalysisRecord;
      db.prepare(
        `UPDATE fit_analyses SET score=?,summary=?,strengths=?,gaps=?,matched_keywords=?,missing_keywords=?,recommendations=?,updated_at=? WHERE id=?`,
      ).run(
        m.score ?? null,
        m.summary ?? null,
        toJson(m.strengths ?? []),
        toJson(m.gaps ?? []),
        toJson(m.matched_keywords ?? []),
        toJson(m.missing_keywords ?? []),
        toJson(m.recommendations ?? []),
        ts,
        existing.id,
      );
      return this.getByJob(input.job_id)!;
    }
    const id = newId('fit_');
    db.prepare(
      `INSERT INTO fit_analyses (id,job_id,score,summary,strengths,gaps,matched_keywords,missing_keywords,recommendations,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      input.job_id,
      input.score ?? null,
      input.summary ?? null,
      toJson(input.strengths ?? []),
      toJson(input.gaps ?? []),
      toJson(input.matched_keywords ?? []),
      toJson(input.missing_keywords ?? []),
      toJson(input.recommendations ?? []),
      ts,
      ts,
    );
    return this.getByJob(input.job_id)!;
  },
};

/* ------------------------------------------------------------ Applications */

function mapApplication(r: any): ApplicationRecord {
  return {
    id: r.id,
    job_id: r.job_id,
    status: r.status,
    resume_id: r.resume_id,
    cover_letter_id: r.cover_letter_id,
    applied_at: r.applied_at,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const applicationRepo = {
  list(): ApplicationRecord[] {
    return (getDb().prepare(`SELECT * FROM applications ORDER BY updated_at DESC`).all() as any[]).map(
      mapApplication,
    );
  },
  get(id: string): ApplicationRecord | null {
    const r = getDb().prepare(`SELECT * FROM applications WHERE id=?`).get(id);
    return r ? mapApplication(r) : null;
  },
  getByJob(jobId: string): ApplicationRecord | null {
    const r = getDb().prepare(`SELECT * FROM applications WHERE job_id=?`).get(jobId);
    return r ? mapApplication(r) : null;
  },
  recent(limit = 10): ApplicationRecord[] {
    return (
      getDb().prepare(`SELECT * FROM applications ORDER BY updated_at DESC LIMIT ?`).all(limit) as any[]
    ).map(mapApplication);
  },
  /** Ensure a (single) application row exists for a job. */
  ensure(jobId: string, status: ApplicationStatus = 'draft'): ApplicationRecord {
    const existing = this.getByJob(jobId);
    if (existing) return existing;
    const ts = now();
    const id = newId('app_');
    getDb()
      .prepare(
        `INSERT INTO applications (id,job_id,status,resume_id,cover_letter_id,applied_at,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      )
      .run(id, jobId, status, null, null, null, null, ts, ts);
    return this.get(id)!;
  },
  upsert(input: ApplicationInput): ApplicationRecord {
    const app = this.ensure(input.job_id, input.status ?? 'draft');
    // A status change through upsert must respect the same lifecycle gate as setStatus.
    if (input.status && input.status !== app.status) assertStatusTransition(app.status, input.status);
    const m = { ...app, ...input } as ApplicationRecord;
    getDb()
      .prepare(
        `UPDATE applications SET status=?,resume_id=?,cover_letter_id=?,applied_at=?,notes=?,updated_at=? WHERE id=?`,
      )
      // Coerce undefined → null: node:sqlite rejects undefined bindings, and a
      // caller that spreads explicit `undefined` fields (e.g. updateApplicationStatus
      // with a doc-less submission) would otherwise crash here mid-write.
      .run(m.status, m.resume_id ?? null, m.cover_letter_id ?? null, m.applied_at ?? null, m.notes ?? null, now(), app.id);
    return this.get(app.id)!;
  },
  setStatus(jobId: string, status: ApplicationStatus, note?: string): ApplicationRecord {
    const app = this.ensure(jobId);
    assertStatusTransition(app.status, status);
    const appliedAt =
      status === 'applied' && !app.applied_at ? now() : app.applied_at;
    const notes = note ? [app.notes, note].filter(Boolean).join('\n') : app.notes;
    getDb()
      .prepare(`UPDATE applications SET status=?, applied_at=?, notes=?, updated_at=? WHERE id=?`)
      .run(status, appliedAt, notes, now(), app.id);
    return this.get(app.id)!;
  },
};

/* --------------------------------------------------------- Interview preps */

function mapInterviewPrep(r: any): InterviewPrepRecord {
  // debrief defaults to '{}' at the DB level; surface an empty debrief as null so
  // consumers can treat "no debrief yet" uniformly.
  const debrief = fromJson(r.debrief, null);
  return {
    id: r.id,
    job_id: r.job_id,
    questions: fromJson(r.questions, []),
    star_guides: fromJson(r.star_guides, []),
    self_introduction: r.self_introduction,
    notes: r.notes,
    debrief: debrief && Object.keys(debrief).length ? debrief : null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const interviewRepo = {
  getByJob(jobId: string): InterviewPrepRecord | null {
    const r = getDb().prepare(`SELECT * FROM interview_preps WHERE job_id=?`).get(jobId);
    return r ? mapInterviewPrep(r) : null;
  },
  list(): InterviewPrepRecord[] {
    return (getDb().prepare(`SELECT * FROM interview_preps ORDER BY updated_at DESC`).all() as any[]).map(
      mapInterviewPrep,
    );
  },
  save(input: InterviewPrepInput): InterviewPrepRecord {
    const db = getDb();
    const existing = this.getByJob(input.job_id);
    const ts = now();
    if (existing) {
      const m = { ...existing, ...input } as InterviewPrepRecord;
      // Debrief is shallow-merged (not replaced) so a later partial debrief save
      // doesn't wipe earlier fields; prep (pre) and debrief (post) coexist per job.
      const mergedDebrief = input.debrief
        ? { ...(existing.debrief ?? {}), ...input.debrief }
        : existing.debrief;
      db.prepare(
        `UPDATE interview_preps SET questions=?,star_guides=?,self_introduction=?,notes=?,debrief=?,updated_at=? WHERE id=?`,
      ).run(
        toJson(m.questions ?? []),
        toJson(m.star_guides ?? []),
        m.self_introduction ?? null,
        m.notes ?? null,
        toJson(mergedDebrief ?? {}),
        ts,
        existing.id,
      );
      return this.getByJob(input.job_id)!;
    }
    const id = newId('itv_');
    db.prepare(
      `INSERT INTO interview_preps (id,job_id,questions,star_guides,self_introduction,notes,debrief,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      input.job_id,
      toJson(input.questions ?? []),
      toJson(input.star_guides ?? []),
      input.self_introduction ?? null,
      input.notes ?? null,
      toJson(input.debrief ?? {}),
      ts,
      ts,
    );
    return this.getByJob(input.job_id)!;
  },
};

/* --------------------------------------------------------------- Activities */

export const activityRepo = {
  log(type: ActivityType, summary: string, entity_type?: EntityType, entity_id?: string): ActivityRecord {
    const ts = now();
    const id = newId('act_');
    getDb()
      .prepare(
        `INSERT INTO activities (id,type,entity_type,entity_id,summary,created_at) VALUES (?,?,?,?,?,?)`,
      )
      .run(id, type, entity_type ?? null, entity_id ?? null, summary, ts);
    return { id, type, entity_type: entity_type ?? null, entity_id: entity_id ?? null, summary, created_at: ts };
  },
  recent(limit = 20): ActivityRecord[] {
    return getDb()
      .prepare(`SELECT * FROM activities ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as ActivityRecord[];
  },
};

/* ------------------------------------------------------ Application timeline */

function mapTimelineEvent(r: any): ApplicationTimelineRecord {
  return {
    id: r.id,
    job_id: r.job_id,
    type: r.type,
    title: r.title,
    summary: r.summary,
    payload: fromJson(r.payload, {}),
    occurred_at: r.occurred_at,
    created_at: r.created_at,
  };
}

export const timelineRepo = {
  add(input: ApplicationTimelineInput): ApplicationTimelineRecord {
    const ts = now();
    const id = newId('tl_');
    getDb()
      .prepare(
        `INSERT INTO application_timeline_events (id,job_id,type,title,summary,payload,occurred_at,created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        input.job_id,
        input.type,
        input.title,
        input.summary ?? null,
        toJson(input.payload ?? {}),
        input.occurred_at ?? ts,
        ts,
      );
    return this.get(id)!;
  },
  get(id: string): ApplicationTimelineRecord | null {
    const r = getDb().prepare(`SELECT * FROM application_timeline_events WHERE id=?`).get(id);
    return r ? mapTimelineEvent(r) : null;
  },
  listByJob(jobId: string): ApplicationTimelineRecord[] {
    return (
      getDb()
        .prepare(`SELECT * FROM application_timeline_events WHERE job_id=? ORDER BY occurred_at ASC, created_at ASC`)
        .all(jobId) as any[]
    ).map(mapTimelineEvent);
  },
  remove(id: string): boolean {
    return getDb().prepare(`DELETE FROM application_timeline_events WHERE id=?`).run(id).changes > 0;
  },
};

/* -------------------------------------------------------------------- Offers */

function mapOffer(r: any): OfferRecord {
  const base = r.base_salary ?? null;
  const bonus = r.bonus_amount ?? null;
  const welfare = r.welfare_amount ?? null;
  // Annual cash estimate = base + bonus + welfare (signing is one-time → excluded).
  // null when no numeric cash piece was provided (can't estimate).
  const hasAny = base != null || bonus != null || welfare != null;
  const total = hasAny ? (base ?? 0) + (bonus ?? 0) + (welfare ?? 0) : null;
  return {
    id: r.id,
    job_id: r.job_id,
    base_salary: base,
    bonus_amount: bonus,
    welfare_amount: welfare,
    signing_amount: r.signing_amount ?? null,
    equity_note: r.equity_note ?? null,
    comp_note: r.comp_note ?? null,
    work_arrangement: r.work_arrangement ?? null,
    contract_type: r.contract_type ?? null,
    accept_deadline: r.accept_deadline ?? null,
    ai_score: r.ai_score ?? null,
    verdict: r.verdict ?? null,
    notes: r.notes ?? null,
    total_comp_annual_est: total,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const offerRepo = {
  getByJob(jobId: string): OfferRecord | null {
    const r = getDb().prepare(`SELECT * FROM offers WHERE job_id=?`).get(jobId);
    return r ? mapOffer(r) : null;
  },
  list(): OfferRecord[] {
    return (getDb().prepare(`SELECT * FROM offers ORDER BY ai_score IS NULL, ai_score DESC, updated_at DESC`).all() as any[]).map(mapOffer);
  },
  /** Upsert by job_id (one offer per job). Missing fields are preserved on update (partial-safe). */
  save(input: OfferInput): OfferRecord {
    const db = getDb();
    const existing = this.getByJob(input.job_id);
    const ts = now();
    const n = (v: number | undefined, prev: number | null | undefined) => (v ?? prev ?? null);
    const s = (v: string | undefined, prev: string | null | undefined) => (v ?? prev ?? null);
    if (existing) {
      db.prepare(
        `UPDATE offers SET base_salary=?,bonus_amount=?,welfare_amount=?,signing_amount=?,equity_note=?,comp_note=?,work_arrangement=?,contract_type=?,accept_deadline=?,ai_score=?,verdict=?,notes=?,updated_at=? WHERE id=?`,
      ).run(
        n(input.base_salary, existing.base_salary),
        n(input.bonus_amount, existing.bonus_amount),
        n(input.welfare_amount, existing.welfare_amount),
        n(input.signing_amount, existing.signing_amount),
        s(input.equity_note, existing.equity_note),
        s(input.comp_note, existing.comp_note),
        s(input.work_arrangement, existing.work_arrangement),
        s(input.contract_type, existing.contract_type),
        s(input.accept_deadline, existing.accept_deadline),
        n(input.ai_score, existing.ai_score),
        s(input.verdict, existing.verdict),
        s(input.notes, existing.notes),
        ts,
        existing.id,
      );
      return this.getByJob(input.job_id)!;
    }
    const id = newId('ofr_');
    db.prepare(
      `INSERT INTO offers (id,job_id,base_salary,bonus_amount,welfare_amount,signing_amount,equity_note,comp_note,work_arrangement,contract_type,accept_deadline,ai_score,verdict,notes,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      input.job_id,
      input.base_salary ?? null,
      input.bonus_amount ?? null,
      input.welfare_amount ?? null,
      input.signing_amount ?? null,
      input.equity_note ?? null,
      input.comp_note ?? null,
      input.work_arrangement ?? null,
      input.contract_type ?? null,
      input.accept_deadline ?? null,
      input.ai_score ?? null,
      input.verdict ?? null,
      input.notes ?? null,
      ts,
      ts,
    );
    return this.getByJob(input.job_id)!;
  },
};

/* ------------------------------------------------------------------ Counts */

/**
 * Entity counts for the dashboard/Settings/health endpoint. Uses COUNT(*) per
 * table instead of loading every row (the /api/health call hits this), and keeps
 * the raw SQL in the db layer. Table names are hardcoded constants, not input.
 */
export function getEntityCounts(): Record<string, number> {
  const db = getDb();
  // Table names are hardcoded below, but the name is interpolated into SQL, so
  // guard with an allowlist as defense-in-depth: a future caller can never turn
  // this into an injection sink even if `t` were sourced from elsewhere.
  const ALLOWED_TABLES = new Set([
    'profile',
    'experiences',
    'projects',
    'skills',
    'documents',
    'cover_letters',
    'jobs',
    'applications',
    'interview_preps',
    'application_timeline_events',
    'offers',
  ]);
  const c = (t: string): number => {
    if (!ALLOWED_TABLES.has(t)) throw new Error(`getEntityCounts: 허용되지 않은 테이블 이름: ${t}`);
    return (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  };
  return {
    profile: c('profile'),
    experiences: c('experiences'),
    projects: c('projects'),
    skills: c('skills'),
    documents: c('documents'),
    cover_letters: c('cover_letters'),
    jobs: c('jobs'),
    applications: c('applications'),
    interview_preps: c('interview_preps'),
    application_timeline_events: c('application_timeline_events'),
    offers: c('offers'),
  };
}

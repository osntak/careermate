/**
 * Job search import — pull postings from key-free public job-board endpoints by
 * keyword, so the AI can offer real listings the user can save into CareerMate.
 *
 * CareerMate is local-first: only the search keyword leaves the machine. Stored
 * profile, résumé, application, and document data are never sent to providers.
 * Provider endpoints are unofficial and therefore validated at runtime; a shape
 * change degrades only that provider instead of silently returning corrupt rows.
 */

import { z } from 'zod';
import { APP_VERSION } from '@careermate/shared';

export interface JobSearchResult {
  source: string;
  company: string;
  position: string;
  url: string;
  location?: string;
  experience?: string;
  keywords?: string[];
  deadline?: string;
  external_id: string;
}

export type ProviderStatus = 'healthy' | 'degraded' | 'unavailable';

export interface ProviderOutcome {
  source: string;
  label: string;
  ok: boolean;
  status: ProviderStatus;
  count: number;
  checked_at: string;
  error?: string;
}

export interface JobSearchResponse {
  query: string;
  results: JobSearchResult[];
  providers: ProviderOutcome[];
}

export interface JobSearchOptions {
  sources?: string[];
  limit?: number;
  timeoutMs?: number;
}

const UA = `careermate/${APP_VERSION} (+https://careermate.life)`;

function toYmd(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length < 10) return undefined;
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : undefined;
}

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': UA, 'accept-language': 'ko,en;q=0.8' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('json')) throw new Error(`unexpected content-type: ${type || 'unknown'}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

interface Provider {
  id: string;
  label: string;
  search(query: string, limit: number, timeoutMs: number): Promise<JobSearchResult[]>;
}

const wantedSchema = z.object({
  data: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      position: z.string().min(1),
      company: z.object({ name: z.string().min(1) }),
      annual_from: z.number().nullable().optional(),
      annual_to: z.number().nullable().optional(),
      due_time: z.string().nullable().optional(),
      address: z
        .object({ location: z.string().optional(), full_location: z.string().optional() })
        .nullable()
        .optional(),
    }).passthrough(),
  ),
}).passthrough();

const jumpitSchema = z.object({
  result: z.object({
    positions: z.array(
      z.object({
        id: z.union([z.string(), z.number()]),
        companyName: z.string().min(1),
        title: z.string().min(1),
        locations: z.array(z.string()).optional(),
        newcomer: z.boolean().optional(),
        minCareer: z.number().nullable().optional(),
        maxCareer: z.number().nullable().optional(),
        techStacks: z.array(z.string()).optional(),
        closedAt: z.string().nullable().optional(),
      }).passthrough(),
    ),
  }).passthrough(),
}).passthrough();

const wanted: Provider = {
  id: 'wanted',
  label: '원티드',
  async search(query, limit, timeoutMs) {
    const url =
      `https://www.wanted.co.kr/api/v4/jobs?country=kr&locations=all&years=-1` +
      `&job_sort=job.latest_order&limit=${limit}&offset=0&query=${encodeURIComponent(query)}`;
    const j = wantedSchema.parse(await getJson(url, timeoutMs));
    return j.data.map((r) => {
      const annual =
        r.annual_from || r.annual_to
          ? `${r.annual_from ?? 0}~${r.annual_to ?? '?'}년`
          : undefined;
      return {
        source: 'wanted',
        company: r.company.name,
        position: r.position,
        url: `https://www.wanted.co.kr/wd/${r.id}`,
        location: r.address?.location ?? r.address?.full_location,
        experience: annual,
        deadline: toYmd(r.due_time),
        external_id: String(r.id),
      };
    });
  },
};

const jumpit: Provider = {
  id: 'jumpit',
  label: '점핏',
  async search(query, limit, timeoutMs) {
    const url =
      `https://api.jumpit.co.kr/api/positions?sort=rsp_rate&page=1&keyword=${encodeURIComponent(query)}`;
    const j = jumpitSchema.parse(await getJson(url, timeoutMs));
    return j.result.positions.slice(0, limit).map((p) => ({
      source: 'jumpit',
      company: p.companyName,
      position: p.title,
      url: `https://www.jumpit.co.kr/position/${p.id}`,
      location: p.locations?.[0],
      experience: p.newcomer
        ? '신입'
        : p.minCareer != null
          ? `${p.minCareer}~${p.maxCareer ?? p.minCareer}년`
          : undefined,
      keywords: p.techStacks,
      deadline: toYmd(p.closedAt),
      external_id: String(p.id),
    }));
  },
};

const PROVIDERS: Provider[] = [wanted, jumpit];
export const JOB_SEARCH_SOURCES = PROVIDERS.map((p) => p.id);

function providerError(e: unknown): { status: ProviderStatus; error: string } {
  if (e instanceof z.ZodError) {
    const first = e.issues[0];
    return {
      status: 'degraded',
      error: `provider response changed${first ? ` (${first.path.join('.') || 'root'})` : ''}`,
    };
  }
  const message = e instanceof Error ? e.message : String(e);
  return { status: 'unavailable', error: message };
}

export async function searchJobs(query: string, opts: JobSearchOptions = {}): Promise<JobSearchResponse> {
  const q = (query ?? '').trim();
  if (!q) return { query: '', results: [], providers: [] };
  const limit = Math.min(50, Math.max(1, opts.limit ?? 10));
  const timeoutMs = Math.min(30_000, Math.max(1_000, opts.timeoutMs ?? 10_000));
  const chosen = opts.sources?.length
    ? PROVIDERS.filter((p) => opts.sources!.includes(p.id))
    : PROVIDERS;

  const settled = await Promise.all(
    chosen.map(async (p): Promise<{ outcome: ProviderOutcome; results: JobSearchResult[] }> => {
      const checked_at = new Date().toISOString();
      try {
        const results = await p.search(q, limit, timeoutMs);
        return {
          outcome: {
            source: p.id,
            label: p.label,
            ok: true,
            status: 'healthy',
            count: results.length,
            checked_at,
          },
          results,
        };
      } catch (e) {
        const failure = providerError(e);
        return {
          outcome: {
            source: p.id,
            label: p.label,
            ok: false,
            status: failure.status,
            count: 0,
            checked_at,
            error: failure.error,
          },
          results: [],
        };
      }
    }),
  );

  return {
    query: q,
    results: settled.flatMap((s) => s.results),
    providers: settled.map((s) => s.outcome),
  };
}

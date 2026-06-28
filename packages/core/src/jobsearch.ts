/**
 * Job search import — pull postings from key-free public job-board endpoints by
 * keyword, so the AI can offer real listings the user can save into CareerMate.
 *
 * Scope & boundaries (deliberate):
 *  - INBOUND only. We fetch publicly visible postings; we send only the search
 *    keyword, never the user's stored data. (Privacy = no user data leaves; this
 *    does not violate it.)
 *  - No WAF bypass, no auth keys. These providers' own frontends call these JSON
 *    endpoints unauthenticated; a plain fetch suffices. We do NOT bundle a
 *    scraper/anti-bot evasion (that's the legally dangerous part — see
 *    .claude/work/research/research_0004). Sites requiring keys (Saramin oapi,
 *    고용24) or that forbid it in robots.txt (JobKorea search) are excluded here.
 *  - Read-only w.r.t. the DB. This returns candidates; the AI shows them and the
 *    user picks which to save via save_job_posting (no auto-dumping into the DB).
 *
 * Providers are unofficial public endpoints — if a response shape changes, only
 * the affected provider's parser needs updating (others keep working).
 */

export interface JobSearchResult {
  /** Provider id, e.g. 'wanted' | 'jumpit'. */
  source: string;
  company: string;
  position: string;
  /** Canonical posting URL the user can open. */
  url: string;
  location?: string;
  /** Required experience, human-readable (e.g. '신입', '5~20년'). */
  experience?: string;
  /** Tech stack / tags when the provider exposes them. */
  keywords?: string[];
  /** Application deadline as YYYY-MM-DD when known. */
  deadline?: string;
  /** Provider-native id (for dedup / detail fetch). */
  external_id: string;
}

export interface ProviderOutcome {
  source: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface JobSearchResponse {
  query: string;
  results: JobSearchResult[];
  providers: ProviderOutcome[];
}

export interface JobSearchOptions {
  /** Which providers to query. Defaults to all registered. */
  sources?: string[];
  /** Max results per provider (1–50). Default 10. */
  limit?: number;
  /** Per-request timeout in ms. Default 10000. */
  timeoutMs?: number;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** Slice an ISO timestamp / date string to YYYY-MM-DD; undefined if not a date. */
function toYmd(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length < 10) return undefined;
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : undefined;
}

async function getJson(url: string, timeoutMs: number): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': UA, 'accept-language': 'ko,en;q=0.8' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

/** Wanted (wanted.co.kr) — public v4 jobs JSON, no auth. IT/startup roles. */
const wanted: Provider = {
  id: 'wanted',
  label: '원티드',
  async search(query, limit, timeoutMs) {
    const url =
      `https://www.wanted.co.kr/api/v4/jobs?country=kr&locations=all&years=-1` +
      `&job_sort=job.latest_order&limit=${limit}&offset=0&query=${encodeURIComponent(query)}`;
    const j = await getJson(url, timeoutMs);
    const rows: any[] = Array.isArray(j?.data) ? j.data : [];
    return rows.map((r) => {
      const annual =
        r.annual_from || r.annual_to
          ? `${r.annual_from ?? 0}~${r.annual_to ?? '?'}년`
          : undefined;
      return {
        source: 'wanted',
        company: r.company?.name ?? '',
        position: r.position ?? '',
        url: `https://www.wanted.co.kr/wd/${r.id}`,
        location: r.address?.location ?? r.address?.full_location ?? undefined,
        experience: annual,
        deadline: toYmd(r.due_time),
        external_id: String(r.id),
      } as JobSearchResult;
    });
  },
};

/** Jumpit (jumpit.co.kr) — public positions JSON, no auth. Dev roles, tech stacks. */
const jumpit: Provider = {
  id: 'jumpit',
  label: '점핏',
  async search(query, limit, timeoutMs) {
    const url =
      `https://api.jumpit.co.kr/api/positions?sort=rsp_rate&page=1&keyword=${encodeURIComponent(query)}`;
    const j = await getJson(url, timeoutMs);
    const rows: any[] = Array.isArray(j?.result?.positions) ? j.result.positions : [];
    return rows.slice(0, limit).map((p) => ({
      source: 'jumpit',
      company: p.companyName ?? '',
      position: p.title ?? '',
      url: `https://www.jumpit.co.kr/position/${p.id}`,
      location: Array.isArray(p.locations) ? p.locations[0] : undefined,
      experience: p.newcomer
        ? '신입'
        : p.minCareer != null
          ? `${p.minCareer}~${p.maxCareer ?? p.minCareer}년`
          : undefined,
      keywords: Array.isArray(p.techStacks) ? p.techStacks : undefined,
      deadline: toYmd(p.closedAt),
      external_id: String(p.id),
    } as JobSearchResult));
  },
};

const PROVIDERS: Provider[] = [wanted, jumpit];

/** Registered provider ids (key-free, no WAF bypass). */
export const JOB_SEARCH_SOURCES = PROVIDERS.map((p) => p.id);

/**
 * Search key-free public job boards by keyword. Each provider runs independently;
 * one failing (network/timeout/shape change) does not sink the others. Results
 * are returned for the AI to present — saving is a separate explicit step.
 */
export async function searchJobs(query: string, opts: JobSearchOptions = {}): Promise<JobSearchResponse> {
  const q = (query ?? '').trim();
  if (!q) return { query: '', results: [], providers: [] };
  const limit = Math.min(50, Math.max(1, opts.limit ?? 10));
  const timeoutMs = opts.timeoutMs ?? 10000;
  const chosen = opts.sources?.length
    ? PROVIDERS.filter((p) => opts.sources!.includes(p.id))
    : PROVIDERS;

  const settled = await Promise.all(
    chosen.map(async (p): Promise<{ outcome: ProviderOutcome; results: JobSearchResult[] }> => {
      try {
        const results = await p.search(q, limit, timeoutMs);
        return { outcome: { source: p.id, ok: true, count: results.length }, results };
      } catch (e) {
        return {
          outcome: { source: p.id, ok: false, count: 0, error: e instanceof Error ? e.message : String(e) },
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

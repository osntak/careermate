/**
 * Job search import — pull postings from key-free public job-board endpoints by
 * keyword, so the AI can offer real listings the user can save into CareerMate.
 *
 * CareerMate is local-first: only the search keyword and category filters leave the
 * machine. Stored profile, résumé, application, and document data are never sent to
 * providers. Locally it remembers which postings it has already seen (board id + date).
 * Provider endpoints are unofficial and therefore validated at runtime; a shape
 * change degrades only that provider instead of silently returning corrupt rows.
 */

import { z } from 'zod';
import { APP_VERSION } from '@careermate/shared';
import { markJobsSeen } from '@careermate/db';
import { isRememberCategory, isSaraminCategory } from './job-categories.ts';

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
  /** Saramin only: category codes of this posting, reusable in `saraminCategories`. */
  category_codes?: string[];
  /** Board's own posting date (Remember, Saramin "등록일"); Wanted/Jumpit lists don't carry one. */
  posted_at?: string;
  /** Day CareerMate first returned this posting (YYYY-MM-DD). */
  first_seen_at?: string;
  /** The same posting found on other boards (same company + title). */
  also_on?: { source: string; url: string }[];
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
  /** Results dropped by `postedSince`. */
  filtered_out?: number;
}

export interface JobSearchOptions {
  sources?: string[];
  limit?: number;
  timeoutMs?: number;
  /** Remember categories: "SW개발>프론트엔드" or a whole group "SW개발" (see findJobCategories). */
  rememberCategories?: string[];
  /** Saramin category codes (cat_kewd), e.g. ["92", "84"]. */
  saraminCategories?: string[];
  /** Keep only postings dated on/after this day (YYYY-MM-DD): posted_at, else first_seen_at. */
  postedSince?: string;
  /** Record first-seen dates in the local DB (default true; tests turn it off). */
  trackSeen?: boolean;
  /** "Today" for first-seen/postedSince, injectable for tests. */
  today?: string;
}

const UA = `careermate/${APP_VERSION} (+https://careermate.life)`;

function toYmd(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length < 10) return undefined;
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : undefined;
}

/** Calendar day in Korea for a timestamp with an offset ("...+09:00" or "...Z"), so "today" matches the board's day. */
function kstYmd(v: unknown): string | undefined {
  if (typeof v !== 'string' || !/T.*(Z|[+-]\d{2}:?\d{2})$/.test(v)) return toYmd(v);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

interface GetJsonInit {
  /** When set, POST it as a JSON body. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip the content-type check (Saramin serves its JSON as text/html). */
  anyType?: boolean;
}

async function getJson(url: string, timeoutMs: number, init: GetJsonInit = {}): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: init.body === undefined ? 'GET' : 'POST',
      headers: {
        accept: 'application/json',
        'user-agent': UA,
        'accept-language': 'ko,en;q=0.8',
        ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get('content-type') ?? '';
    if (!init.anyType && !type.includes('json')) throw new Error(`unexpected content-type: ${type || 'unknown'}`);
    return JSON.parse(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

interface Provider {
  id: string;
  label: string;
  /** Option that lets this provider search by category alone, without a keyword. */
  categoryOption?: 'rememberCategories' | 'saraminCategories';
  search(query: string, limit: number, timeoutMs: number, opts: JobSearchOptions): Promise<JobSearchResult[]>;
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
      // Wanted uses 100 for "no upper bound".
      const annual =
        r.annual_from || r.annual_to
          ? r.annual_to == null || r.annual_to >= 100
            ? `${r.annual_from ?? 0}년 이상`
            : `${r.annual_from ?? 0}~${r.annual_to}년`
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
    // Fixed page size of 16; keep paging until limit or a short page.
    const positions: z.infer<typeof jumpitSchema>['result']['positions'] = [];
    for (let page = 1; positions.length < limit && page <= Math.ceil(limit / 16); page++) {
      const url =
        `https://jumpit-api.saramin.co.kr/api/positions?sort=relation&page=${page}&keyword=${encodeURIComponent(query)}`;
      const got = jumpitSchema.parse(await getJson(url, timeoutMs)).result.positions;
      positions.push(...got);
      if (got.length < 16) break;
    }
    return positions.slice(0, limit).map((p) => ({
      source: 'jumpit',
      company: p.companyName,
      // Keyword searches come back with highlight markup, e.g. "<span>백엔드</span> 개발자".
      position: p.title.replace(/<[^>]*>/g, ''),
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

const rememberSchema = z.object({
  data: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      title: z.string().min(1),
      organization: z.object({ name: z.string().min(1) }).passthrough(),
      min_experience: z.number().nullable().optional(),
      max_experience: z.number().nullable().optional(),
      ends_at: z.string().nullable().optional(),
      starts_at: z.string().nullable().optional(),
      addresses: z
        .array(z.object({ address_level1: z.string().nullable().optional(), address_level2: z.string().nullable().optional() }).passthrough())
        .nullable()
        .optional(),
      job_categories: z.array(z.object({ level2: z.string().nullable().optional() }).passthrough()).nullable().optional(),
    }).passthrough(),
  ),
}).passthrough();

const remember: Provider = {
  id: 'remember',
  label: '리멤버',
  categoryOption: 'rememberCategories',
  async search(query, limit, timeoutMs, opts) {
    const cats = opts.rememberCategories ?? [];
    // Remember ignores names it doesn't know and returns everything, so reject them up front.
    const unknown = cats.filter((c) => !isRememberCategory(c));
    if (unknown.length) throw new Error(`unknown Remember category: ${unknown.join(', ')} (use find_job_categories)`);
    const search: Record<string, unknown> = {
      keywords: query ? [query] : [],
      organization_type: 'all',
      application_type: 'all',
    };
    if (cats.length) {
      search.job_category_names = cats.map((c) => {
        const [level1, level2] = c.split('>').map((s) => s.trim());
        return level2 ? { level1, level2 } : { level1 };
      });
    }
    // Remember rejects per > 50 ("최대 요청 수를 초과"), so larger limits take a second page.
    const per = Math.min(limit, 50);
    const pages = await Promise.all(
      Array.from({ length: Math.ceil(limit / per) }, (_, i) =>
        getJson('https://career-api.rememberapp.co.kr/job_postings/search', timeoutMs, {
          body: { search, sort: 'starts_at_desc', page: i + 1, per },
        }).then((r) => rememberSchema.parse(r).data),
      ),
    );
    return pages.flat().slice(0, limit).map((d) => {
      const addr = d.addresses?.[0];
      const min = d.min_experience;
      const max = d.max_experience;
      return {
        source: 'remember',
        company: d.organization.name,
        position: d.title,
        url: `https://career.rememberapp.co.kr/job/posting/${d.id}`,
        location: addr ? [addr.address_level1, addr.address_level2].filter(Boolean).join(' ') || undefined : undefined,
        experience:
          min != null && max != null ? `${min}~${max}년` : min != null ? `${min}년 이상` : max != null ? `~${max}년` : undefined,
        keywords: d.job_categories?.map((c) => c.level2).filter((s): s is string => !!s),
        deadline: toYmd(d.ends_at),
        external_id: String(d.id),
        posted_at: kstYmd(d.starts_at),
      };
    });
  },
};

const saraminListSchema = z.object({ innerHTML: z.string() }).passthrough();

function decodeHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "~ 12/04(금)" → YYYY-MM-DD; a month earlier than today's rolls into next year. Other labels (상시채용 etc.) → undefined. */
function saraminDeadline(text: string, now = new Date()): string | undefined {
  const m = text.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return undefined;
  const month = Number(m[1]);
  const year = now.getFullYear() + (month < now.getMonth() + 1 ? 1 : 0);
  return `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

/**
 * Parse the HTML fragment of Saramin's search list (`get-recruit-list` → innerHTML).
 * Items missing an id, title or company are dropped; an empty result from a
 * non-empty page means the markup changed, which the caller reports as degraded.
 */
export function parseSaraminList(html: string, now = new Date()): JobSearchResult[] {
  const out: JobSearchResult[] = [];
  for (const chunk of html.split('<div class="item_recruit"').slice(1)) {
    const id = chunk.match(/^\s*value="(\d+)"/)?.[1];
    const title = chunk.match(/class="job_tit">\s*<a[^>]*\btitle="([^"]*)"/)?.[1];
    const company = chunk.match(/class="corp_name">\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1];
    if (!id || !title || !company) continue;
    const cond = chunk.match(/class="job_condition">([\s\S]*?)<\/div>/)?.[1] ?? '';
    const spans = [...cond.matchAll(/<span>([\s\S]*?)<\/span>/g)].map((m) => decodeHtml(m[1]));
    const sector = chunk.match(/class="job_sector">([\s\S]*?)(?:<span class="job_day"|<\/div>)/)?.[1] ?? '';
    const links = [...sector.matchAll(/cat_kewd=(\d+)"\s*>([^<]*)<\/a>/g)];
    // "등록일 26/11/04" is the posting date; "수정일 ..." is only an edit, so it doesn't count.
    const reg = chunk.match(/class="job_day">\s*등록일\s*(\d{2})\/(\d{2})\/(\d{2})/);
    out.push({
      source: 'saramin',
      company: decodeHtml(company),
      position: decodeHtml(title),
      url: `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}`,
      location: spans[0] || undefined,
      experience: spans[1] || undefined,
      keywords: links.length ? links.map((m) => decodeHtml(m[2])) : undefined,
      deadline: saraminDeadline(chunk.match(/class="date">([^<]*)</)?.[1] ?? '', now),
      external_id: id,
      category_codes: links.length ? links.map((m) => m[1]) : undefined,
      posted_at: reg ? `20${reg[1]}-${reg[2]}-${reg[3]}` : undefined,
    });
  }
  return out;
}

const saramin: Provider = {
  id: 'saramin',
  label: '사람인',
  categoryOption: 'saraminCategories',
  async search(query, limit, timeoutMs, opts) {
    const params = new URLSearchParams({
      searchword: query,
      recruitPage: '1',
      // Relevance reads better for a keyword, but "new since" needs newest first.
      recruitSort: query && !opts.postedSince ? 'relation' : 'reg_dt',
      recruitPageCount: String(limit),
      mainSearch: 'n',
    });
    const cats = opts.saraminCategories ?? [];
    const unknown = cats.filter((c) => !isSaraminCategory(c));
    if (unknown.length) throw new Error(`unknown Saramin category code: ${unknown.join(', ')} (use find_job_categories)`);
    if (cats.length) params.set('cat_kewd', cats.join(','));
    const j = saraminListSchema.parse(
      await getJson(`https://www.saramin.co.kr/zf_user/search/get-recruit-list?${params}`, timeoutMs, {
        headers: { 'x-requested-with': 'XMLHttpRequest' },
        anyType: true,
      }),
    );
    const rows = parseSaraminList(j.innerHTML);
    if (!rows.length && j.innerHTML.includes('item_recruit')) {
      throw new z.ZodError([{ code: 'custom', path: ['innerHTML'], message: 'item markup changed' }]);
    }
    return rows.slice(0, limit);
  },
};

const PROVIDERS: Provider[] = [wanted, jumpit, remember, saramin];
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
  // A date filter drops most of a page, so fetch more by default when one is set.
  const limit = Math.min(100, Math.max(1, opts.limit ?? (opts.postedSince ? 50 : 10)));
  const timeoutMs = Math.min(30_000, Math.max(1_000, opts.timeoutMs ?? 10_000));
  // Without a keyword, only providers given their own category filter can search.
  const chosen = (opts.sources?.length ? PROVIDERS.filter((p) => opts.sources!.includes(p.id)) : PROVIDERS).filter(
    (p) => q || (p.categoryOption && opts[p.categoryOption]?.length),
  );
  if (!chosen.length) return { query: q, results: [], providers: [] };

  const settled = await Promise.all(
    chosen.map(async (p): Promise<{ outcome: ProviderOutcome; results: JobSearchResult[] }> => {
      const checked_at = new Date().toISOString();
      try {
        const results = await p.search(q, limit, timeoutMs, opts);
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

  const today = opts.today ?? new Date().toLocaleDateString('sv-SE'); // local YYYY-MM-DD
  let results = settled.flatMap((s) => s.results);
  if (opts.trackSeen !== false) {
    const seen = markJobsSeen(results, today);
    for (const r of results) r.first_seen_at = seen.get(`${r.source}:${r.external_id}`);
  }
  results = dedupeAcrossBoards(results);
  let filtered_out: number | undefined;
  if (opts.postedSince) {
    const kept = results.filter((r) => (r.posted_at ?? r.first_seen_at ?? today) >= opts.postedSince!);
    filtered_out = results.length - kept.length;
    results = kept;
  }

  return {
    query: q,
    results,
    providers: settled.map((s) => s.outcome),
    ...(filtered_out !== undefined ? { filtered_out } : {}),
  };
}

// Any "(...)" goes: "(주)" and brand notes like "힐링페이퍼(강남언니)" vs "(주)힐링페이퍼".
const normCompany = (s: string) =>
  s.replace(/\([^)]*\)|㈜|주식회사/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
/** Drop only a "[company]" tag (Remember prefixes titles with it); "[신입]", "[서울]" and the like stay. */
const normTitle = (title: string, company: string) => {
  const c = normCompany(company);
  return title
    .replace(/\[([^\]]*)\]/g, (tag, inner: string) => {
      const n = normCompany(inner);
      return n && c && (c.includes(n) || n.includes(c)) ? '' : tag;
    })
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
};

/**
 * Fold the same posting listed on several boards into one row (first board wins, the rest go
 * to `also_on`). Same company and title after normalization; differently worded titles stay
 * separate, which errs on showing a duplicate rather than hiding a real posting.
 */
export function dedupeAcrossBoards(results: JobSearchResult[]): JobSearchResult[] {
  const byKey = new Map<string, JobSearchResult>();
  const out: JobSearchResult[] = [];
  for (const r of results) {
    const key = `${normCompany(r.company)}|${normTitle(r.position, r.company)}`;
    const first = byKey.get(key);
    if (first && first.source !== r.source) {
      (first.also_on ??= []).push({ source: r.source, url: r.url });
      if (!first.posted_at && r.posted_at) first.posted_at = r.posted_at;
      continue;
    }
    byKey.set(key, r);
    out.push(r);
  }
  return out;
}

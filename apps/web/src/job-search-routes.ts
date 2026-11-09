/**
 * Dashboard "Find jobs" screen: the same board search the search_jobs MCP tool
 * runs, plus category lookup and saved conditions. The search reaches out to
 * the job boards, so it is a POST (CSRF token required) even though it only reads.
 */
import { z } from 'zod';
import {
  searchJobs,
  findJobCategories,
  isRememberCategory,
  isSaraminCategory,
  isWantedCategory,
  isJumpitCategory,
  saraminCategoryName,
  JOB_SEARCH_SOURCES,
} from '@careermate/core';
import { getJobSearchPreferences, setJobSearchPreferences, jobRepo, companyHealthRepo, companyKey } from '@careermate/db';
import { Router, HttpError, readJsonBody } from './http.ts';

const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s);

const Categories = {
  remember_categories: z.array(z.string().max(100)).max(20).optional(),
  saramin_categories: z.array(z.string().regex(/^\d+$/)).max(20).optional(),
  wanted_categories: z.array(z.string().regex(/^\d+$/)).max(20).optional(),
  jumpit_categories: z.array(z.string().regex(/^\d+$/)).max(20).optional(),
};

const SearchSchema = z.object({
  keyword: z.string().max(100).optional(),
  ...Categories,
  sources: z.array(z.enum([...JOB_SEARCH_SOURCES] as [string, ...string[]])).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  posted_since: z.string().refine((s) => s === 'today' || isYmd(s)).optional(),
  years: z.number().int().min(0).max(40).optional(),
});

const PrefsSchema = z.object({ keyword: z.string().max(100).optional(), ...Categories });

function assertKnownCategories(remember: string[] = [], saramin: string[] = [], wanted: string[] = [], jumpit: string[] = []): void {
  const bad = [
    ...remember.filter((c) => !isRememberCategory(c)),
    ...saramin.filter((c) => !isSaraminCategory(c)),
    ...wanted.filter((c) => !isWantedCategory(c)),
    ...jumpit.filter((c) => !isJumpitCategory(c)),
  ];
  if (bad.length) throw new HttpError(400, `리멤버·사람인·원티드·점핏 분류표에 없는 값입니다: ${bad.join(', ')}`);
}

export function registerJobSearchRoutes(router: Router): void {
  router.get('/api/job-search/categories', (ctx) => findJobCategories(ctx.query.get('q') ?? '', 20));

  router.get('/api/job-search/preferences', () => {
    const preferences = getJobSearchPreferences();
    const saramin_names = Object.fromEntries(preferences.saramin_categories.map((c) => [c, saraminCategoryName(c) ?? c]));
    return { preferences, saramin_names };
  });
  router.put('/api/job-search/preferences', async (ctx) => {
    const input = await readJsonBody(ctx.req, PrefsSchema);
    assertKnownCategories(input.remember_categories, input.saramin_categories, input.wanted_categories, input.jumpit_categories);
    return {
      preferences: setJobSearchPreferences({
        ...(input.keyword !== undefined ? { keyword: input.keyword.trim() } : {}),
        ...(input.remember_categories ? { remember_categories: input.remember_categories } : {}),
        ...(input.saramin_categories ? { saramin_categories: input.saramin_categories } : {}),
        ...(input.wanted_categories ? { wanted_categories: input.wanted_categories } : {}),
        ...(input.jumpit_categories ? { jumpit_categories: input.jumpit_categories } : {}),
      }),
    };
  });

  router.post('/api/job-search', async (ctx) => {
    const input = await readJsonBody(ctx.req, SearchSchema);
    let keyword = (input.keyword ?? '').trim();
    let remember = input.remember_categories ?? [];
    let saramin = input.saramin_categories ?? [];
    let wanted = input.wanted_categories ?? [];
    let jumpit = input.jumpit_categories ?? [];
    let usedSaved = false;
    if (!keyword && !remember.length && !saramin.length && !wanted.length && !jumpit.length) {
      const saved = getJobSearchPreferences();
      ({ keyword, remember_categories: remember, saramin_categories: saramin, wanted_categories: wanted, jumpit_categories: jumpit } = saved);
      usedSaved = true;
      if (!keyword && !remember.length && !saramin.length && !wanted.length && !jumpit.length) {
        throw new HttpError(400, '검색어나 직무를 넣어 주세요.');
      }
    }
    assertKnownCategories(remember, saramin, wanted, jumpit);
    const today = new Date().toLocaleDateString('sv-SE');
    const res = await searchJobs(keyword, {
      sources: input.sources,
      limit: input.limit,
      rememberCategories: remember,
      saraminCategories: saramin,
      wantedCategories: wanted,
      jumpitCategories: jumpit,
      postedSince: input.posted_since === 'today' ? today : input.posted_since,
      years: input.years,
      today,
    });
    // Mark postings already in the jobs list so the screen shows "saved" instead of a save button.
    const savedByUrl = new Map(jobRepo.list().filter((j) => j.url).map((j) => [j.url!, j.id]));
    const grades = companyHealthRepo.gradeIndex();
    // A merged row may have been saved earlier from another board, so check its also_on links too.
    const results = res.results.map((r) => ({
      ...r,
      saved_job_id: savedByUrl.get(r.url) ?? r.also_on?.map((a) => savedByUrl.get(a.url)).find(Boolean) ?? null,
      company_grade: grades.get(companyKey(r.company)) ?? null,
    }));
    return {
      ...res,
      results,
      used_saved_preferences: usedSaved,
      conditions: { keyword, remember_categories: remember, saramin_categories: saramin, wanted_categories: wanted, jumpit_categories: jumpit, years: input.years ?? null },
    };
  });
}

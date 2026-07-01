/**
 * Offer comparison use-cases. CareerMate stores offers and a deterministic annual
 * cash estimate (base+bonus+welfare); the connected AI writes the score/verdict at
 * save time (no LLM here). compareOffers returns all offers joined with their job,
 * pre-sorted by the AI's score — the dashboard renders that, and the head-to-head
 * "which is better" reasoning happens in the AI chat via this same data.
 */
import { offerRepo, jobRepo } from '@careermate/db';
import type { OfferInput, OfferRecord, JobRecord } from '@careermate/shared';

export interface OfferWithJob extends OfferRecord {
  company: string;
  position: string;
}

function withJob(offer: OfferRecord, job: JobRecord | null): OfferWithJob {
  return { ...offer, company: job?.company ?? '—', position: job?.position ?? '—' };
}

/** Save/update the offer for a job (one per job). The job must exist first. */
export function saveOffer(input: OfferInput): OfferWithJob {
  const job = jobRepo.get(input.job_id);
  if (!job) throw new Error('공고를 찾을 수 없습니다. 먼저 save_job_posting으로 공고를 저장하세요.');
  return withJob(offerRepo.save(input), job);
}

/** The offer for one job (or null). */
export function getOffer(jobId: string): OfferWithJob | null {
  const offer = offerRepo.getByJob(jobId);
  if (!offer) return null;
  return withJob(offer, jobRepo.get(jobId));
}

/**
 * All offers, joined with their job, sorted by the AI's score (desc, null last).
 * `total_comp_annual_est` on each is the server's deterministic sum — the AI does
 * the qualitative comparison from this structured data.
 */
export function compareOffers(): OfferWithJob[] {
  return offerRepo.list().map((o) => withJob(o, jobRepo.get(o.job_id)));
}

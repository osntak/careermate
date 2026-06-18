/**
 * Thin adapter over @careermate/exporters. Single integration point so the route
 * layer doesn't depend on the exporter package's internal shape. Resolves the
 * records a given export needs and returns a ready-to-download payload.
 */
import {
  coverLetterToMarkdown,
  coverLetterToHtml,
  resumeToMarkdown,
  profileToMarkdown,
  interviewPrepToMarkdown,
  type ExportResult,
} from '@careermate/exporters';
import {
  coverLetterRepo,
  documentRepo,
  jobRepo,
  profileRepo,
  experienceRepo,
  projectRepo,
  skillRepo,
  interviewRepo,
} from '@careermate/db';
import { HttpError } from './http.ts';

export type ExportFormat = 'md' | 'html' | 'txt';

function asFormat(result: ExportResult, format: ExportFormat): ExportResult {
  if (format === 'txt') {
    // Markdown is already readable as plain text; just relabel.
    return {
      filename: result.filename.replace(/\.(md|html)$/i, '.txt'),
      mimeType: 'text/plain; charset=utf-8',
      content: result.content,
    };
  }
  return result;
}

export function exportCoverLetter(id: string, format: ExportFormat): ExportResult {
  const cl = coverLetterRepo.get(id, true);
  if (!cl) throw new HttpError(404, '자기소개서를 찾을 수 없습니다.');
  const job = cl.job_id ? jobRepo.get(cl.job_id) : null;
  const profile = profileRepo.get();
  if (format === 'html') return coverLetterToHtml(cl, { job, profile });
  return asFormat(coverLetterToMarkdown(cl, { job, profile }), format);
}

export function exportDocument(id: string, format: ExportFormat): ExportResult {
  const doc = documentRepo.get(id);
  if (!doc) throw new HttpError(404, '문서를 찾을 수 없습니다.');
  return asFormat(resumeToMarkdown(doc, profileRepo.get()), format);
}

export function exportProfile(format: ExportFormat): ExportResult {
  const profile = profileRepo.get();
  if (!profile) throw new HttpError(404, '프로필이 없습니다.');
  return asFormat(
    profileToMarkdown(profile, experienceRepo.list(), projectRepo.list(), skillRepo.list()),
    format,
  );
}

export function exportInterview(jobId: string, format: ExportFormat): ExportResult {
  const prep = interviewRepo.getByJob(jobId);
  if (!prep) throw new HttpError(404, '면접 준비 자료가 없습니다.');
  return asFormat(interviewPrepToMarkdown(prep, jobRepo.get(jobId)), format);
}

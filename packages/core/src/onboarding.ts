/**
 * Onboarding status + profile completeness.
 *
 * "Completed" is intentionally generous: the moment the user has a profile and
 * at least one document, the AI should stop nagging and move to real work.
 * `next_steps` is what powers the "지금 해야 할 일" guidance everywhere.
 */
import {
  type OnboardingStatus,
  type ProfileRecord,
} from '@careermate/shared';
import {
  profileRepo,
  documentRepo,
  coverLetterRepo,
  experienceRepo,
  skillRepo,
  jobRepo,
} from '@careermate/db';

/** 0–100 score over the fields that make profiles useful for the AI. */
export function profileCompleteness(p: ProfileRecord | null): number {
  if (!p) return 0;
  const checks: boolean[] = [
    !!p.name,
    !!(p.headline || p.summary),
    !!p.location,
    p.desired_roles.length > 0,
    !!p.desired_conditions,
    !!p.preferred_tone,
    p.emphasis_points.length > 0,
    p.links.length > 0,
    experienceRepo.list().length > 0,
    skillRepo.list().length > 0,
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return score;
}

export function getOnboardingStatus(): OnboardingStatus {
  const profile = profileRepo.get();
  const resumes = documentRepo.list('resume');
  const careerDescriptions = documentRepo.list('career_description');
  const coverLetters = coverLetterRepo.list();
  const experiences = experienceRepo.list();
  const skills = skillRepo.list();
  const jobs = jobRepo.list();

  const has_profile = !!(profile && profile.name);
  const has_resume = resumes.length > 0 || careerDescriptions.length > 0;
  const has_cover_letter = coverLetters.length > 0;
  const has_experience = experiences.length > 0;
  const has_skills = skills.length > 0;
  const has_job = jobs.length > 0;

  const completeness = profileCompleteness(profile);
  const completed = has_profile && (has_resume || has_experience);

  const next_steps: string[] = [];
  if (!has_profile) next_steps.push('기본 프로필을 입력하세요 (이름, 한 줄 소개, 희망 직무).');
  if (!has_resume) next_steps.push('이력서나 경력기술서를 추가하세요. 파일 내용을 붙여넣어도 됩니다.');
  if (!has_experience) next_steps.push('주요 경력을 1개 이상 추가하면 적합도 분석 품질이 올라갑니다.');
  if (!has_skills) next_steps.push('보유 기술스택을 정리해 두면 공고 매칭이 정확해집니다.');
  if (has_profile && !has_cover_letter)
    next_steps.push('기존 자기소개서가 있다면 추가해 두세요. AI가 문체를 학습합니다.');
  if (completed && !has_job)
    next_steps.push('관심 있는 채용공고 URL이나 내용을 AI에게 전달해 적합도 분석을 받아보세요.');
  if (next_steps.length === 0)
    next_steps.push('준비가 잘 되어 있어요. 새 공고를 분석하거나 자기소개서를 작성해 보세요.');

  return {
    completed,
    has_profile,
    has_resume,
    has_cover_letter,
    has_experience,
    has_skills,
    has_job,
    profile_completeness: completeness,
    next_steps,
  };
}

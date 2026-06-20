/**
 * @careermate/db — SQLite persistence (built on Node's flag-free `node:sqlite`,
 * so there is no native module to compile). Exposes a shared connection,
 * migrations, and one repository object per entity.
 */
export * from './paths.ts';
export * from './runtime.ts';
export * from './connection.ts';
export * from './settings.ts';
export { migrate, MIGRATIONS } from './schema.ts';
export {
  profileRepo,
  experienceRepo,
  projectRepo,
  skillRepo,
  documentRepo,
  coverLetterRepo,
  jobRepo,
  fitRepo,
  applicationRepo,
  interviewRepo,
  activityRepo,
  timelineRepo,
  getEntityCounts,
} from './repositories.ts';

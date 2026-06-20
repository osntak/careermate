// English catalog — area modules merged into one flat map.
// Adding a locale/area = one file + one import. Count nouns use { one, other } objects.
import common from './en/common.js';
import nav from './en/nav.js';
import status from './en/status.js';
import settings from './en/settings.js';
import home from './en/home.js';
import jobs from './en/jobs.js';
import documents from './en/documents.js';
import profile from './en/profile.js';
import interview from './en/interview.js';
import applications from './en/applications.js';

export default {
  ...common, ...nav, ...status, ...settings,
  ...home, ...jobs, ...documents, ...profile, ...interview, ...applications,
};

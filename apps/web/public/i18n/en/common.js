// Common UI strings + toasts/errors (used by lib.js).
export default {
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.save': 'Save',
  'common.retry': 'Try again',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.open': 'Open',
  'common.justNow': 'just now',
  'common.export': 'Export',
  'common.fmtWord': 'Word',
  'common.fmtHtml': 'HTML',
  'common.fmtMarkdown': 'Markdown',
  'common.includePhoto': 'Include photo',
  'common.addPhoto': 'Add a photo',

  // Hiring-schedule stage D-day badge (shared by Home action lane + job detail).
  // Separate from the deadline D-day labels (applications.dday.*).
  'schedule.dday.today': 'D-day',
  'schedule.dday.future': 'D-{{n}}',
  'schedule.dday.past': 'Past',

  'toast.copied': 'Copied to clipboard.',
  'toast.copyFailed': "Couldn't copy. Please select and copy it manually.",
  'toast.errorTitle': 'Error',

  'err.connect': "Couldn't reach the server. Make sure the dashboard is running and try again.",
  'err.404': "We couldn't find that. Refresh and try again.",
  'err.403': 'A permission check is needed. Please refresh the dashboard.',
  'err.500': 'Something went wrong. Please try again in a moment.',
  'err.generic': "Couldn't complete the request. Check your input and try again.",

  // company health grade
  'company.grade.S': 'Very solid',
  'company.grade.A': 'Solid',
  'company.grade.B': 'Average',
  'company.grade.C': 'Caution',
  'company.grade.D': 'Risky',
  'company.grade.U': 'Not enough info',
  'company.gradeTitle': 'Company health (finances, headcount, reviews)',
};

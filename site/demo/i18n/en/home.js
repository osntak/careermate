// Home page
export default {
  // topbar primary action
  'home.action.addJob': 'Add posting',

  // greeting band
  'home.greeting.title': 'Hi {{name}}',
  'home.greeting.welcome': 'Welcome',
  'home.greeting.firstRun': "Let's get started — fill in your basics first.",
  'home.greeting.interviewTodo': {
    one: '{{count}} application needs interview prep.',
    other: '{{count}} applications need interview prep.',
  },
  'home.greeting.inProgress': {
    one: 'You have {{count}} application in progress.',
    other: 'You have {{count}} applications in progress.',
  },
  'home.greeting.jobsSaved': {
    one: '{{count}} saved posting · get a fresh fit analysis.',
    other: '{{count}} saved postings · get a fresh fit analysis.',
  },
  'home.greeting.idle': "Let's take one more step forward today.",

  // getting started card
  'home.start.title': 'Getting started',
  'home.start.completeness': 'Profile {{pct}}% complete',
  'home.start.calloutTitle': 'Your AI does the thinking, CareerMate keeps it',
  'home.start.calloutBody': 'Just ask your usual AI to analyze postings, write cover letters and career descriptions, or prep for interviews — the results land here on your dashboard.',
  'home.start.note': 'The more you complete, the better your AI fit analyses and cover letters get.',
  'home.start.step.profile': 'Fill in your basic profile',
  'home.start.step.resume': 'Add a career description or resume',
  'home.start.step.coverLetter': 'Register an existing cover letter',
  'home.start.step.job': 'Save a posting you care about',

  // KPI tiles
  'home.stat.jobs': 'Saved postings',
  'home.stat.activeApplications': 'Active applications',
  'home.stat.coverLetters': 'Cover letters',
  'home.stat.interviewPending': 'Interview prep',
  // KPI tile context sub-lines (derived from real counts; omitted when zero)
  'home.stat.jobsSub': '{{count}} to apply',
  'home.stat.subInterview': 'Interview {{count}}',
  'home.stat.subDocPassed': 'Screening {{count}}',
  'home.stat.subApplied': 'Applied {{count}}',

  // pipeline
  'home.pipeline.title': 'Application pipeline',
  'home.pipeline.openBoard': 'Open board',
  'home.pipeline.empty': 'No application stages yet. Set an application status on a posting and your pipeline fills in here.',
  'home.pipeline.stage.applied': 'Applied',
  'home.pipeline.stage.documentPassed': 'Screening passed',
  'home.pipeline.stage.interview': 'Interview',
  'home.pipeline.stage.finalPassed': 'Offer',
  'home.pipeline.conv.total': {
    one: '{{count}} total',
    other: '{{count}} total',
  },
  'home.pipeline.conv.vsApplied': '{{pct}}% of applied',
  'home.pipeline.conv.vsInterview': '{{pct}}% of interviews',

  // action lane
  'home.actionLane.title': 'What to do next',
  'home.actionLane.viewAll': 'View all',
  'home.actionLane.interviewPrep': 'Interview prep',
  'home.actionLane.followup': 'Follow up · {{n}}d',
  'home.actionLane.empty': 'Nothing to handle right now. Try analyzing a new posting.',
  'home.placeholder.dash': '—',

  // recent jobs
  'home.recentJobs.title': 'Recent postings',
  'home.recentJobs.viewAll': 'View all',
  'home.recentJobs.empty': 'No saved postings yet. Try adding a new one.',
  'home.recentJobs.score': '{{score}}',

  // activity feed
  'home.activity.title': 'Recent activity',
  'home.activity.empty': 'No activity yet. Save or analyze a posting and it shows up here.',
  'home.activity.today': 'Today',
  'home.activity.yesterday': 'Yesterday',
};

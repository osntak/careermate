// Documents page — cover letters / career descriptions / resumes & portfolios.
export default {
  // tabs
  'documents.tab.cover': 'Cover letters',
  'documents.tab.career': 'Career descriptions',
  'documents.tab.docs': 'Resumes & portfolios',

  // search / loading / empty
  'documents.search.cover': 'Search cover letters',
  'documents.search.career': 'Search career descriptions',
  'documents.search.docs': 'Search resumes & portfolios',
  'documents.search.aria': 'Search',
  'documents.search.empty': "No items match '{{query}}'.",
  'documents.search.clear': 'Clear filter',
  'documents.loading': 'Loading…',

  // create actions
  'documents.action.coverCreate': 'New cover letter',
  'documents.action.careerCreate': 'Add career description',
  'documents.action.docCreate': 'Add document',

  // cover letters tab — empty state
  'documents.cover.empty.title': 'No cover letters yet',
  'documents.cover.empty.body': 'Write or paste one to keep it with its versions.',

  // cover row
  'documents.cover.versionCount': { one: '{{count}} version', other: '{{count}} versions' },
  'documents.cover.primary': 'Primary',
  'documents.cover.open': 'Open',
  'documents.cover.copy': 'Copy',
  'documents.cover.exportMd': 'MD',
  'documents.cover.exportHtml': 'HTML',
  'documents.cover.exportMdTitle': 'Export as Markdown',
  'documents.cover.exportHtmlTitle': 'Export as HTML',
  'documents.cover.setPrimary': 'Set as primary',
  'documents.cover.delete': 'Delete',
  'documents.cover.noContent': 'No content yet.',

  // cover toasts / confirm
  'documents.cover.setPrimaryToast': 'Set as your primary cover letter.',
  'documents.cover.deleteTitle': 'Delete cover letter',
  'documents.cover.deleteConfirm': 'Delete "{{title}}"? All version history will be deleted too.',
  'documents.cover.deleteConfirmLabel': 'Delete',
  'documents.cover.deleteToast': 'Cover letter deleted.',

  // cover create modal
  'documents.coverCreate.title': 'New cover letter',
  'documents.coverCreate.titlePlaceholder': 'e.g. Backend Engineer cover letter',
  'documents.coverCreate.contentPlaceholder': 'Paste your content. Leave it empty to create a blank cover letter.',
  'documents.coverCreate.jobNone': 'Not linked',
  'documents.coverCreate.fieldTitle': 'Title (required)',
  'documents.coverCreate.fieldContent': 'Content (optional)',
  'documents.coverCreate.fieldContentHint': 'If you add content, it’s saved as the first version.',
  'documents.coverCreate.fieldJob': 'Posting to link (optional)',
  'documents.coverCreate.fieldJobHint': 'Link it to a posting and it shows up on that posting’s page too.',
  'documents.coverCreate.fieldJobHintEmpty': 'No saved postings yet.',
  'documents.coverCreate.cancel': 'Cancel',
  'documents.coverCreate.submit': 'Save cover letter',
  'documents.coverCreate.titleRequired': 'Please enter a title.',
  'documents.coverCreate.toast': 'Cover letter added.',

  // cover detail body
  'documents.coverDetail.exportMd': 'Export as Markdown',
  'documents.coverDetail.exportHtml': 'Export as HTML',
  'documents.coverDetail.currentVersion': 'Current version',
  'documents.coverDetail.copy': 'Copy',
  'documents.coverDetail.noContent': 'No content.',
  'documents.coverDetail.history': 'Version history',
  'documents.coverDetail.historyEmpty': 'No version history yet.',

  // version item
  'documents.version.label': 'v{{n}}',
  'documents.version.current': 'Current version',
  'documents.version.view': 'View this version',
  'documents.version.viewLabel': 'Viewing v{{n}}',
  'documents.version.makeCurrent': 'Set as current version',
  'documents.version.copy': 'Copy',
  'documents.version.makeCurrentToast': 'Current version changed.',

  // edit new version
  'documents.editVersion.notePlaceholder': 'e.g. Strengthened motivation, polished wording',
  'documents.editVersion.fieldContent': 'Content',
  'documents.editVersion.fieldNote': 'Change note (optional)',
  'documents.editVersion.submit': 'Save as new version',
  'documents.editVersion.contentRequired': 'Please enter some content.',
  'documents.editVersion.toast': 'New version saved.',
  'documents.editVersion.cancel': 'Cancel',
  'documents.editVersion.toggle': 'Edit and save as new version',

  // career descriptions tab — empty state
  'documents.career.empty.title': 'No career descriptions yet',
  'documents.career.empty.body': 'Ask the AI to write a career description and it’ll be saved here.',
  'documents.career.empty.action': 'Add manually',

  // documents tab — empty state
  'documents.docs.empty.title': 'No saved documents',
  'documents.docs.empty.body': 'Keep your resumes, portfolios, and other documents here.',
  'documents.docs.empty.action': 'Add document',

  // doc detail modal
  'documents.docDetail.updated': 'Updated {{when}}',
  'documents.docDetail.noContent': 'No content.',
  'documents.docDetail.copy': 'Copy',
  'documents.docDetail.export': 'Export',
  'documents.docDetail.exportTitle': 'Export as Markdown',
  'documents.docDetail.delete': 'Delete',
  'documents.docDetail.deleteTitle': 'Delete document',
  'documents.docDetail.deleteConfirm': 'Delete "{{title}}"?',
  'documents.docDetail.deleteConfirmLabel': 'Delete',
  'documents.docDetail.deleteToast': 'Document deleted.',
  'documents.docDetail.edit': 'Edit',

  // doc form
  'documents.docForm.defaultKind': 'Document',
  'documents.docForm.editTitle': 'Edit document',
  'documents.docForm.createTitle': 'Add {{kind}}',
  'documents.docForm.titlePlaceholderCareer': 'e.g. Master career description',
  'documents.docForm.titlePlaceholderDefault': 'e.g. 2026 resume',
  'documents.docForm.contentPlaceholderCareer': 'Paste the body of your career description.',
  'documents.docForm.contentPlaceholderDefault': 'Paste the body of your resume or portfolio.',
  'documents.docForm.fieldKind': 'Type',
  'documents.docForm.fieldTitle': 'Title (required)',
  'documents.docForm.fieldContent': 'Content (required)',
  'documents.docForm.markPrimary': 'Set as primary document',
  'documents.docForm.cancel': 'Cancel',
  'documents.docForm.submit': 'Save document',
  'documents.docForm.titleRequired': 'Please enter a title.',
  'documents.docForm.contentRequired': 'Please enter some content.',
  'documents.docForm.editToast': 'Document updated.',
  'documents.docForm.createToast': 'Document added.',
};

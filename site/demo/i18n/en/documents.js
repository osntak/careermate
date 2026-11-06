// Documents: cover letter, resume, career description, portfolio and other tabs.
export default {
  // Documents tabs (tabs other than cover letters use kind.*)
  'documents.tab.cover': 'Cover letters',

  // search / loading / empty
  'documents.search.placeholder': 'Search {{kind}}',
  'documents.search.aria': 'Search',
  'documents.search.empty': "No items match '{{query}}'.",
  'documents.search.clear': 'Clear filter',
  'documents.loading': 'Loading…',

  // create actions
  'documents.action.coverCreate': 'Add cover letter',
  'documents.action.create': 'Add {{kind}}',

  // cover letters tab — empty state
  'documents.cover.empty.title': 'No cover letters yet',
  'documents.cover.empty.body': 'Write or paste one to keep it with its versions.',

  // cover row
  'documents.cover.versionCount': { one: '{{count}} version', other: '{{count}} versions' },
  'documents.cover.noJob': 'No posting linked',
  'documents.cover.primary': 'Primary',
  'documents.cover.open': 'Open',
  'documents.cover.copy': 'Copy',
  'documents.cover.more': 'More',
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
  'documents.kind.empty.title.resume': 'No resume yet',
  'documents.kind.empty.title.career_description': 'No career descriptions yet',
  'documents.kind.empty.title.portfolio': 'No portfolio yet',
  'documents.kind.empty.title.other': 'No other documents yet',
  'documents.kind.empty.body.resume': 'Add one base resume and the AI builds on it for each posting.',
  'documents.kind.empty.body.career_description': "Ask the AI to write a career description and it'll be saved here.",
  'documents.kind.empty.body.portfolio': 'Keep portfolio notes or a list of links here.',
  'documents.kind.empty.body.other': 'Keep certificates, references and anything not listed above.',
  'documents.kind.empty.action': 'Add manually',

  // doc detail modal
  'documents.docDetail.updated': 'Updated {{when}}',
  'documents.docDetail.noContent': 'No content.',
  'documents.docDetail.copy': 'Copy',
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

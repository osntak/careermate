// Settings page.
export default {
  // shared
  'settings.copy': 'Copy',
  'settings.confirm': 'OK',
  'settings.cancel': 'Cancel',
  'settings.copyPath': 'Copy path',

  // data location
  'settings.dataLocation.title': 'Where your data lives',
  'settings.dataLocation.dataDir': 'Data folder',
  'settings.dataLocation.database': 'Database',
  'settings.dataLocation.appVersion': 'App version',
  'settings.dataLocation.nodeVersion': 'Node version',
  'settings.dataLocation.privacyTitle': 'Stored only on your computer',
  'settings.dataLocation.privacyBody': 'All your data stays on this computer and is never sent anywhere. The AI only sees what you type in or what it looks up through MCP.',

  // connection
  'settings.connection.title': 'Connection',
  'settings.connection.shortcutDemoToast': "Here's a preview of how the shortcut works.",
  'settings.connection.shortcutToast': 'Created a dashboard shortcut.',
  'settings.connection.shortcutDemoTitle': 'Shortcut preview',
  'settings.connection.shortcutTitle': 'Shortcut created',
  'settings.connection.shortcutDemoCalloutTitle': "The demo doesn't create files",
  'settings.connection.shortcutCalloutTitle': 'Folder created',
  'settings.connection.shortcutDemoCalloutBody': 'The real app creates a dashboard shortcut folder and launcher; here we just show example paths.',
  'settings.connection.shortcutCalloutBody': "If the dashboard is running it just opens your browser; if it's stopped, it starts the server first and then opens the browser.",
  'settings.connection.shortcutFolder': 'Folder',
  'settings.connection.shortcutLauncher': 'Shortcut',
  'settings.connection.running': 'Running',
  'settings.connection.dashboard': 'Dashboard',
  'settings.connection.createShortcut': 'Create shortcut',
  'settings.connection.mcpServer': 'MCP server',
  'settings.connection.mcpBody': 'Your AI client (Claude, ChatGPT, Cursor) runs the MCP server itself, and it shares the same database as this dashboard.',
  'settings.connection.openInstall': 'Open setup guide',

  // theme
  'settings.theme.title': 'Theme',
  'settings.theme.sub': 'Follow your system setting or pick one yourself',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.theme.system': 'System',

  // cover-letter number check mode
  'settings.verify.title': 'Cover letter number check',
  'settings.verify.sub': 'Before saving, automatically checks that any numbers the AI wrote are backed by your real data',
  'settings.verify.basic': 'Standard',
  'settings.verify.strict': 'Strict',
  'settings.verify.basicDesc': 'Blocks only numbers with no basis at all in your saved experience, resume, or projects',
  'settings.verify.strictDesc': 'Also blocks numbers that appear only in structured experience/project entries but not in your resume text',
  'settings.verify.strictOnToast': 'Strict mode is on.',
  'settings.verify.strictOffToast': 'Strict mode is off.',
  'settings.verify.note': 'In strict mode, numbers that are not in your uploaded resume may be blocked. If that happens, upload your resume or turn the mode off. You can also tell the AI "check this strictly" to turn it on.',

  // my data
  'settings.myData.title': 'My data',
  'settings.myData.sub': 'Items stored on this computer',

  // count labels (COUNT_LABELS / BACKUP_COUNT_LABELS)
  'settings.count.profile': 'Profile',
  'settings.count.experiences': 'Experience',
  'settings.count.projects': 'Projects',
  'settings.count.skills': 'Skills',
  'settings.count.documents': 'Documents',
  'settings.count.cover_letters': 'Cover letters',
  'settings.count.jobs': 'Postings',
  'settings.count.applications': 'Applications',
  'settings.count.interview_preps': 'Interview prep',
  'settings.count.cover_letter_versions': 'Cover letter versions',
  'settings.count.fit_analyses': 'Fit analyses',
  'settings.count.activities': 'Activity',

  // export / import
  'settings.backup.title': 'Export / Import',
  'settings.backup.export': 'Export (JSON)',
  'settings.backup.import': 'Import (JSON)',
  'settings.backup.create': 'Back up current state',
  'settings.backup.createToast': 'Created a backup.',
  'settings.backup.colFile': 'File',
  'settings.backup.colCreated': 'Created',
  'settings.backup.colSize': 'Size',
  'settings.backup.size': '{{kb}} KB',
  'settings.backup.empty': 'No local backups yet. Use "Back up current state" to save your data now.',
  'settings.backup.readError': "Couldn't read the backup file.",
  'settings.backup.parseError': 'Only JSON backup files can be restored.',
  'settings.backup.unknownDate': 'Unknown',

  // import preview table
  'settings.preview.empty': 'Nothing to restore.',
  'settings.preview.colData': 'Data',
  'settings.preview.colCount': 'Items',

  // import modal
  'settings.import.gateWord': 'IMPORT',
  'settings.import.title': 'Import data',
  'settings.import.calloutTitle': 'Your current data is backed up first',
  'settings.import.calloutBody': 'Importing replaces all CareerMate data on this computer with the contents of the JSON you selected.',
  'settings.import.file': 'File',
  'settings.import.exportedAt': 'Backed up at',
  'settings.import.schema': 'Schema',
  'settings.import.schemaValue': '{{version}} / current {{current}}',
  'settings.import.totalRows': 'Total items',
  'settings.import.warningsTitle': 'Please review',
  'settings.import.instruction': 'To continue, type {{word}} in the field below.',
  'settings.import.confirm': 'Import',
  'settings.import.doneToast': 'Data imported.',

  // danger zone
  'settings.reset.gateWord': 'RESET',
  'settings.reset.title': 'Reset all data',
  'settings.reset.calloutTitle': "This can't be undone",
  'settings.reset.calloutBody': 'All data, including your profile, postings, applications, documents, and interview prep, will be permanently deleted. For safety, a backup is created automatically right before the reset.',
  'settings.reset.instruction': 'To continue, type {{word}} in the field below.',
  'settings.reset.confirm': 'Reset all data',
  'settings.reset.doneToast': 'All data has been reset.',
  'settings.danger.title': 'Danger zone',
  'settings.danger.sub': "This action can't be undone",
  'settings.danger.resetTitle': 'Reset all data',
  'settings.danger.resetBody': 'Deletes all CareerMate data stored on this computer. A backup is created automatically before the reset.',

  // help / report a problem
  'settings.support.title': 'Help & report a problem',
  'settings.support.sub': 'Report bugs on GitHub Issues, ask how-to questions in Discussions, or email us for anything else.',
  'settings.support.report': 'Report a problem',
  'settings.support.ask': 'Ask a question',
  'settings.support.email': 'Email us',
};

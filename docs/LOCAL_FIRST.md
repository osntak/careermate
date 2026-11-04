# Local-first data ownership

CareerMate uses **local-first** to mean that the primary career workspace is owned by the user and stored on the user's machine.

## Stored locally

- SQLite database
- profile, experience, project, and skill records
- résumés, career descriptions, and cover-letter versions
- saved job postings, application status, interview preparation, and timeline history
- backups and exports
- deterministic verification results

These records are not uploaded to a CareerMate account or CareerMate-operated database.

## Optional network activity

Some features may use the network without changing the local-first model:

- checking the npm registry for a newer CareerMate version
- opening current installation documentation
- searching supported public job-board endpoints using only the user's search keyword and job category (locally, CareerMate only records which postings it has already seen: board, posting id, date)
- loading the public product website or demo
- public-site analytics on `careermate.life`

CareerMate must not attach locally stored résumé, profile, document, or application data to these requests.

## Product language

Do not describe CareerMate as fully offline. Prefer:

> Your career database and documents stay on your computer. Optional discovery and update features may access the internet without sending your stored career data.

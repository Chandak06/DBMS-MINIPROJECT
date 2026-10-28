# College-independent authentication and database update

Verified on 28 October 2026. This document supersedes earlier OAuth/demo login and web role-assignment instructions. The original dated PDF/Word/screenshot deliverables remain historical snapshots; the source and current documents describe this update.

## Result

Google and role-only demo login are removed. An Admin must register a college, its code, three distinct exact role domains and each role's email ID format before its accounts can sign in. Student and Staff accounts are provisioned by an Admin. An address matching the format does not grant an account. Admin creation is available only through the trusted development/test CLI, never through web signup, account forms, role promotion or reference seeds.

No PES-specific username convention or domain is built into the application or setup defaults. One college may use `S{digits:6}@students.example.edu`; another may use `{digits:4}-{letters:2}-{digits:2}@learners.other.edu`. Staff/Admin domains and formats are separately configured. The project members' real SRNs remain attribution data in the README and report.

The Admin supplies literal text or safe tokens `{id}`, `{letters}`, `{digits}`, `{alnum}` and optional exact counts, such as `{digits:6}`. Bounded dynamic matching validates the template without executing supplied regular expressions. MySQL stores each policy in COLLEGE_EMAIL_DOMAIN. Account creation, login and protected sessions enforce it. A college/domain/format change revokes previous sessions; disabling a college blocks its existing accounts. The login page displays registered Student formats directly from SQL.

## Role and data boundaries

Students create and manage their own lost/found reports and submit ownership claims. Staff review reports, match items and verify returns within their college. Admin manages colleges/accounts, audit and synchronization, with supervisory operational access. Staff/Admin cannot create/edit/delete reports or submit claims. Existing historical reports and account relationships are preserved.

MySQL stores identities, salted password hashes, college policies and relational workflows. MongoDB stores variable item details, match evidence and audit events. The durable SQL outbox provides ordered, idempotent eventual synchronization, including outage recovery. No plaintext password or hash is sent to Mongo audit payloads or public responses.

## Implementation and syllabus

- [Authentication and trusted Admin setup](implementation/Authentication.md), [API reference](implementation/API_Endpoints.md), [architecture](implementation/Architecture.md).
- [Syllabus and normalization mapping](design/Syllabus_Mapping.md) covers all four units using implemented MySQL/MongoDB concepts.
- [College authentication migration](../database/mysql/college-auth.sql) adds college registration/account state and normalized role domains.
- [College email format migration](../database/mysql/college-email-formats.sql) persists local ID templates without changing existing report records.
- [Full-text indexes and CTE/window views](../database/mysql/syllabus-features.sql) support searchable reports, candidate ranks and recovery statistics.
- [Executable syllabus queries](../database/mysql/syllabus-demo.sql), [actual results and EXPLAIN plans](testing/results/syllabus-evidence.json).

Existing SQL keys/checks/FKs, joins, grouping, correlated subqueries, views, triggers, procedures/functions, transactions, locks and concurrency guards remain in use. Documentation explains functional dependencies, 1NF/2NF/3NF/BCNF and limits of higher-form claims. MongoDB validators, indexes, keyed document retrieval and aggregation demonstrate the selected NoSQL model. Graph and vector databases are syllabus alternatives and are not claimed as deployed features.

## Verification

| Check | Current result | Evidence |
|---|---|---|
| TypeScript | Passed | npm run typecheck; production build also validates types |
| Unit tests | 154 passed, 0 failed | [Results](testing/results/college-unit-results.json) |
| Application + SQL/Mongo integration | 100 passed, 0 failed | [Results](testing/results/college-integration-results.json), [log](testing/results/college-integration.log) |
| Real Mongo outage/recovery | 13 passed, 0 failed | [Results](testing/results/outbox-integration-results.json) |
| Fresh/repeated schema/bootstrap | 5 passed, 0 failed | [Results](testing/results/college-schema-results.json) |
| Optimized Next.js build | Passed | [Build log](testing/results/college-build.log) |
| Configured main MySQL + Atlas | Connected; 13 tables, 4 views, no pending outbox events at capture | [Read-only inventory](testing/results/college-live-storage.json) |

Live tests cover separate colleges with different ID schemes, rejection of unregistered colleges/wrong formats, credential revocation, privileged endpoint denial, Student-only report mutations, private evidence, college-scoped Staff operations/notifications, report matching and concurrent claim decisions. Isolated `clf_college_*` databases retain their test fixtures. No application database was dropped or cleared.

Credential/source scan: [237 text files and 4 extracted PDF/Word documents](testing/results/college-secret-scan.json), zero findings. Documentation links and current/historical evidence validation passed. The [running login screenshot](screenshots/17-college-login.png) shows the college-independent form with no Google or demo buttons.

## Main installation handoff

The main database migrations and Atlas validators/indexes are applied. At the latest inventory capture, the main installation had **zero registered college policies and zero provisioned password accounts for Admin**. Existing passwordless legacy accounts remain disabled. No replacement Admin credentials were invented or published.

Run `npm run seed:admin` on the trusted laptop. Enter the college's own name, code, role domains, ID formats and Admin address, then enter/confirm a private password in the hidden prompt. This missing private setup input must come from the operator. The command registers the college and creates its first Admin transactionally. After login, use Reference data and College accounts to register other colleges/departments and provision Students/Staff. The app does not create or verify external college mailboxes.

Run `npm run db:college-evidence` to refresh the read-only main inventory after setup. The running app is available at http://127.0.0.1:3000/login; `npm run db:worker` synchronizes queued Mongo events.

Source publication is maintained in [the GitHub repository](https://github.com/Chandak06/DBMS-MINIPROJECT). Private environment files, credentials, local database files and build output remain excluded; repository history records the published file-by-file changes.

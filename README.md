# Campus Lost & Found Intelligent Matching System

A Next.js DBMS project using **MySQL + MongoDB**. Students report lost/found items, Staff compare matches and verify returns within their college, and Admin manages colleges, accounts, audit and synchronization.

| Member | SRN |
|---|---|
| Harshit Chandak | PES2UG24CS185 |
| Hamza Shabir Sahapurwala | PES2UG24CS177 |

## Authentication and roles

Every account uses a college email and password. An Admin must first register its college code, three distinct role domains and each role's email-ID template. Colleges choose their own naming conventions; there is no fixed institutional prefix. For example, `S{digits:6}@students.example.edu`, `{letters}.{letters}@staff.example.edu`, or `admin@admin.example.edu`. `{id}` accepts the college's assigned username; fixed-count tokens such as `{digits:6}` restrict its length.

Only the trusted local CLI can create an Admin. Admin provisions Student/Staff accounts through College accounts, including an initial password. Email format alone grants no access; there is no public signup. The application stores salted scrypt hashes, enforces SQL-backed lockout, checks current account/college policy on protected requests, and revokes sessions using credential_version on password or policy changes and account disablement.

Students manage their own reports/claims/profile/inbox. Staff review their college's reports, generate/review matches and process claims. Admin registers colleges and reference data, provisions/enables/disables Student/Staff accounts, resets their passwords and supervises audit/sync/operations. Staff/Admin do not submit reports or ownership claims. Admin account rows have no web promotion, enable/disable or password-reset controls.

College IT supplies actual email identities. This app neither creates institutional mailboxes nor independently verifies their ownership; the Admin verifies identity before provisioning an account.

## Shared team database

Both laptops use **one MySQL instance and one authenticated MongoDB instance on the host laptop over private ZeroTier**. Each keeps its own ignored `.env.local`: the host uses loopback, and its teammate uses the host's private ZeroTier IP for both databases. Both select the same MySQL database and the same MongoDB database/authSource. Atlas remains supported through `MONGODB_URI`, but is not required for this setup. See [local MongoDB setup and Atlas migration](docs/LOCAL_MONGODB_SETUP.md) and [shared MySQL setup](docs/SHARED_DATABASE_SETUP.md).

Keep the host awake with MySQL, MongoDB and ZeroTier running. Run Next.js independently on each laptop, and keep one `npm run db:worker` running against the shared databases to deliver MySQL outbox changes to MongoDB. This worker is still needed with local MongoDB; it is not laptop-to-laptop replication. Verify `npm run db:health -- --team` on both laptops: compare both database fingerprints, names and counts while writes are paused. Do not expose database ports publicly or share database administrator credentials. ZeroTier must itself remain reachable on the college network.

## Fresh installation

Requires Node.js 22.12+, MySQL 8.0.16+ and a reachable MongoDB/Atlas database.

```powershell
npm ci
if (-not (Test-Path -LiteralPath .env.local)) { Copy-Item .env.example .env.local }
node scripts/init-local-env.mjs
```

Privately configure MYSQL_HOST/PORT/USER/PASSWORD/DATABASE, MONGODB_URI/DATABASE and APP_BASE_URL in `.env.local`. The initializer supplies a missing SESSION_SECRET. Environment files and database data are excluded from Git. Create the dedicated project MySQL account using the shared-database guide before running setup.

```powershell
npm run db:setup
npm run seed
npm run seed:admin
```

Database setup applies safe repeatable migrations and refreshes procedures/functions and Mongo validators/indexes. Reference seed creates only CAMPUS, DEPARTMENT, CATEGORY and LOCATION data; repeated runs preserve existing master data. It creates no login identities. Existing accounts without hashes remain disabled and related records remain preserved.

Run `seed:admin` in an interactive terminal on the trusted laptop. Confirm development/test mode, enter the existing campus ID (normally 1 after reference seeding), your college name/code, role domains/ID formats, Admin email, and a hidden password with confirmation. No college values or Admin password are hardcoded. The CLI registers the college and creates its Admin with a durable audit event in one SQL transaction; repeating it preserves an existing active Admin. Production mode and web-based Admin creation are refused. See [authentication](docs/implementation/Authentication.md).

## Daily startup

```powershell
npm run dev
# Or: npm run build; npm start
```

In a second terminal:

```powershell
npm run db:worker
```

Open [the login page](http://127.0.0.1:3000/login). Admin uses Campus data to register colleges/departments and email formats, then College accounts to provision Students/Staff. Each user can change their own password in Profile. Use `npm run db:sync` for one synchronization pass. Restart the dev server after pulling route deletions so generated route types are refreshed.

## Database responsibilities and workflow

MySQL is authoritative for 13 relational/infrastructure tables: campus, department, account, category, location, lost/found reports, matches, claims, notifications, college email policies, outbox and migration history. It enforces keys, checks, uniqueness, revisions, role guards, stored procedures, locks and transactional decisions. Full-text indexes, CTE/window views, joins, grouping, functions and recovery views remain part of the [syllabus mapping](docs/design/Syllabus_Mapping.md).

MongoDB holds `lost_item_details`, `found_item_details`, `match_evidence` and `audit_events`, with validators and stable SQL-ID indexes. There are no cross-database foreign keys. Each SQL mutation and document/audit event is committed to MONGO_OUTBOX in one transaction; the worker performs ordered idempotent Mongo writes with retries, backoff and retained failures. This provides eventual consistency across the stores.

A deterministic weighted-rule matcher checks category, college and time-window eligibility, scores comparisons and records evidence. Staff accepts an eligible current match; its Student owner submits proof; Staff/Admin verifies the claim; approval closes both reports and records notifications/audit atomically. Revision guards, unique success constraints and row locks prevent stale or competing decisions.

## Optional sample reports

After provisioning two active Student accounts in the same college, set SEED_STUDENT_EMAIL and SEED_FINDER_EMAIL privately and run `npm run seed:samples`. The development/test command adds only sample report pairs and outbox events. It checks current college policy and uses that college's locations; it never creates accounts/passwords or reopens existing reports.

No development reset command is provided: normal setup preserves data, and tests use fresh isolated databases. Existing records are never deleted automatically during startup, migrations or seeding.

## Validation

```powershell
npm run typecheck
npm test
npm run build
npm run db:setup
npm run test:schema
npm run test:audit
npm run db:health
npm run db:college-evidence
python scripts/audit-submission.py
npm run verify
```

Integration/schema tests create and retain uniquely named `clf_college_*` MySQL/Mongo databases, using test ports 3100/3101. They require a separate local MongoDB on port 27018, or AUDIT_MONGODB_URI pointing to an explicit test server. Start an installed mongod with a dedicated data folder and `--bind_ip 127.0.0.1 --port 27018`. The application database is never cleared. `test:integration` and `test:audit` invoke the same canonical driver. Current results live under `docs/testing/results/current`; old evidence retains its original timestamps.

`db:college-evidence` captures a read-only inventory. `db:evidence` executes the academic SQL/Mongo examples (including transaction/savepoint rollback and session-temporary DDL examples); it writes current evidence separately. The credential scanner `scripts/audit-submission.py` also extracts PDF/Word text and writes a current scan, without imposing obsolete schema/document hashes. Run it with Python and pypdf installed before `npm run verify`.

## Documentation

- [Shared database setup and manual Windows commands](docs/SHARED_DATABASE_SETUP.md), [validation report](docs/SHARED_DATABASE_REPORT_2026-11-11.md)
- [Cleanup report and full changed-file list](docs/CLEANUP_REPORT_2026-11-08.md)
- [Inspection findings and complete file inventory](docs/CLEANUP_AUDIT_2026-11-08.md)
- [Authentication](docs/implementation/Authentication.md), [API](docs/implementation/API_Endpoints.md), [architecture](docs/implementation/Architecture.md)
- [Matching](docs/implementation/Matching.md), [syllabus/normalization](docs/design/Syllabus_Mapping.md)
- [Historical academic evidence catalogue](docs/HISTORICAL_EVIDENCE.md): original dated reports, PDFs, screenshots, planning records and test captures
- [GitHub repository](https://github.com/Chandak06/DBMS-MINIPROJECT)

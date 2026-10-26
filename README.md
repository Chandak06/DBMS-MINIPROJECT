# Campus Lost & Found Intelligent Matching System

A DBMS Level 3 project using Next.js, MySQL and MongoDB. Students report belongings; staff review explainable candidates and ownership evidence; approved recovery closes both reports atomically.

| Member | SRN | Assigned scope |
|---|---|---|
| Harshit Chandak | PES2UG24CS185 | Identity, campus/department, lost reports, notifications, student interface, MongoDB lost details/audit |
| Hamza Shabir Sahapurwala | PES2UG24CS177 | Category/location, found reports, matches/claims, staff/admin interface, MongoDB found details/evidence, advanced SQL |

Both members' database and application parts are delivered. The allocation records responsibility, not personal authorship of automated edits.



## Reliability and role audit — 26 October 2026

The [current audit report](docs/AUDIT_2026-10-26.md) supersedes earlier implementation/test statements. The October 2 PDFs and archived evidence remain dated snapshots; the source documentation below reflects the fixes.

| Capability | Student | Staff | Admin |
|---|---|---|---|
| Own reports, profile, claims and inbox | Yes | Yes | Yes |
| Browse public found items / read reference choices | Yes | Yes | Yes |
| All operational reports and claims | No | Yes | Yes |
| Generate/review matches; verify another user's claim | No | Yes | Yes |
| Modify campus master data | No | No | Yes |
| Create accounts / assign other users' roles | No | No | Yes |
| Inspect audit records / manage synchronization | No | No | Yes |
| Change own role / process own claim | No | No | No |

Staff's campus data view is read-only. Admin has separate Users, Sync and Audit pages. New verified Google accounts register as Student. Role changes are refreshed from SQL on every request.

The original pending Atlas write was retained and replayed successfully; current live pending writes: **0**. The shared worker preserves per-document ordering, idempotent IDs and failure payloads, with exponential backoff and eight automatic attempts. Start its continuous mode in a separate PowerShell terminal:

```powershell
npm run db:worker
```

Safe repeatable upgrade and application start:

```powershell
npm ci
npm run db:setup
npm run build
npm start
```

Preserve the existing `.env.local`. For a new installation, copy `.env.example`, fill the database variables locally, then run `node scripts/init-local-env.mjs --demo`, `npm run db:setup`, `npm run seed` and optionally `npm run seed:demo`. Existing installations do not need reseeding. `npm run db:setup -- --sql-only` installs SQL upgrades if MongoDB is temporarily unavailable; rerun full setup when its connection returns.

Current validation: **85 unit tests, 152 live workflow checks, 13 synchronization fault/recovery checks**, production build and TypeScript passed. Next.js is **15.5.28**, Zod **4.6.7**; the patched lockfile reports **0 npm advisories**. The earlier version/test table is a historical snapshot.

```powershell
npm run typecheck
npm test
npm run build
npm run test:audit
```

`test:audit` uses separate, uniquely named SQL/Mongo databases and a server on port 3100; its outage test uses 3101. It retains its test data. Run a separate local MongoDB on port 27018 first (or set `AUDIT_MONGODB_URI` to an explicitly selected test MongoDB server):

```powershell
$auditDbPath = Join-Path $PWD 'artifacts\local\mongo-audit'
New-Item -ItemType Directory -Path $auditDbPath -Force | Out-Null
& 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe' --dbpath $auditDbPath --bind_ip 127.0.0.1 --port 27018
```

Leave that terminal running; execute `npm run test:audit` in another. Adjust the mongod executable path to your installed version. A separate lint command is not configured; TypeScript and the Next production build are the available static checks. Real Google consent/token exchange still requires team-owned OAuth settings; provider calls are mocked in registration unit tests, while local role/session workflows use real SQL/Mongo databases.


## Technology

| Layer | Implemented technology |
|---|---|
| Interface / backend | Next.js 15.5.28 App Router and Route Handlers; React 19.3.0 |
| SQL | MySQL 8; mysql2 3.24.4 |
| NoSQL | MongoDB; Node driver 6.21.0 |
| Validation / sessions | Zod 4.6.7; jose 5.10.0; Google OAuth and signed sessions |
| Language / testing | TypeScript 5.9.3; Vitest 5.0.3; live Node integration harness |

Exact dependencies are pinned in `package-lock.json`. Matching uses deterministic weighted rules; it does not use a trained model or embeddings.

## Prerequisites and environment

Node.js 22.12+ and npm; MySQL 8.0.16+ with enforced CHECK constraints (tested: 8.0.46); a running MongoDB server or reachable Atlas cluster. Setup needs permission to create databases, tables, routines, triggers and MongoDB collections/indexes. Scratch tests create/drop only their uniquely named databases.

Run from the project root in PowerShell:

```powershell
npm ci
Copy-Item -LiteralPath .env.example -Destination .env.local
```

Copy the example only for a new installation; preserve an existing configured file. Edit `.env.local` locally and set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MONGODB_URI` and `MONGODB_DATABASE`. Keep passwords and tokens out of chat, Git and the submission.

## Initialize and run

```powershell
node scripts/init-local-env.mjs --demo
npm run db:setup
npm run seed
npm run seed:demo
npm run dev
```

The initializer creates a random session secret, preserves database credentials and explicitly enables loopback demo sign-in. Open [http://localhost:3000](http://localhost:3000) and select Student, Staff or Admin. The server binds to 127.0.0.1. Production mode:

```powershell
npm run build
npm start
```

Stop an existing server before rebuilding. Setup installs ten domain tables plus MONGO_OUTBOX and SCHEMA_MIGRATION, two views, two procedures, one function, eight triggers and four MongoDB collections. Fresh/repeated setup and seeds were tested. A fresh schema has unsigned auto-increment identities; the compatibility path preserves existing signed identity types. Back up non-demo databases before schema changes: MySQL DDL is not rollback-safe.

The ZIP contains source, not installed packages or databases. An evaluator creates their own databases using these scripts.

## Demonstrate the workflow

Student creates a lost report; Staff records a corresponding found report, generates candidates and accepts one; the accepted lost owner submits proof; authorized staff approves it; both reports become CLOSED and an inbox notification is committed.

The delivered local wallet is recovered; a headphones candidate remains pending. On a fresh database the seeded pairs start available for demonstration. Seeds preserve existing terminal decisions. Use a distinct pair for repeat demonstrations. Follow [DEMO_SCRIPT](docs/DEMO_SCRIPT.md).

## Google login and roles

Google sign-in requires a verified email; new identities register as Student in MySQL. Set valid `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `APP_BASE_URL`; register `http://localhost:3000/api/auth/google/callback` for the default URL. Set distinct `DEMO_STUDENT_EMAIL`, `DEMO_STAFF_EMAIL` and `DEMO_ADMIN_EMAIL` before seeding, or register users in Admin management.

For a new installation without demo access use `node scripts/init-local-env.mjs` without `--demo`. External deployment requires HTTPS and `DEMO_LOGIN_ENABLED=false`. Real Google provider login is unverified; signed local sessions, role refresh and OAuth state rejection are tested.

## Existing commands

| Command | Purpose |
|---|---|
| `npm run db:setup` | Create/upgrade both database models |
| `npm run seed` / `npm run seed:demo` | Idempotent reference/user / sample-report seed |
| `npm run db:sync` | Replay pending MongoDB writes |
| `npm run typecheck` / `npm test` | TypeScript / unit checks |
| `npm run build` / `npm start` | Build / serve production application |
| `npm run check` | TypeScript, unit tests and build |
| `npm run test:integration` | Live app and both database checks |
| `npm run test:schema` | Fresh/repeated setup and seeds in scratch databases |
| `npm run db:evidence` | Capture actual SQL/Mongo metadata and query output |
| `node scripts/verify-deliverables.mjs` | Verify document links, evidence and text credential exclusion |
| `powershell -File scripts/package-submission.ps1` | Create clean folder and integrity-checked ZIP |

Keep `npm start` or `npm run dev` running in another terminal for integration tests. `TEST_BASE_URL` overrides the default test URL. Tests clean only their own fixtures; run them against a local demonstration installation.

Final cleanup verification: TypeScript PASS, 28 unit tests PASS, production build PASS, 46 integration checks PASS, fresh/repeated setup and seeds PASS. [Testing results](docs/testing/Testing_Results.md) record timestamps and limitations.

## Database concepts

MySQL demonstrates PK/FK/UNIQUE/CHECK, CREATE/ALTER/DROP, CRUD, JOIN/GROUP BY/HAVING/ORDER BY, aggregates and subqueries. Advanced features include transactional procedures, `fn_match_band`, two reporting views, eight role/date triggers and workflow indexes. MongoDB demonstrates strict validation, unique ID/text/multikey indexes and aggregation.

See [SQL queries](database/mysql/queries.sql), [procedures](database/mysql/procedures.sql), [DDL](database/mysql/ddl_demo.sql), [transactions](database/mysql/transactions.sql), [Mongo examples](database/mongodb/demo_queries.js) and [executed evidence](docs/testing/results/database-evidence.json).

## Deliverables

- [Report PDF](docs/Campus_Lost_Found_Final_Report.pdf) and [Markdown report](docs/FINAL_REPORT.md)
- [Schema PDF](docs/design/Relational_Schema.pdf), [editable Word schema](docs/design/Relational_Schema.docx), [Markdown schema](docs/design/Relational_Schema.md), [data dictionary](docs/design/Data_Dictionary.md)
- [Approved ER image](docs/design/ER_Diagram.png) and [editable ER](docs/design/ER_Diagram.drawio)
- [Architecture](docs/implementation/Architecture.md), [API](docs/implementation/API_Endpoints.md), [Mongo model](docs/implementation/MongoDB_Model.md), [matching](docs/implementation/Matching.md), [authentication](docs/implementation/Authentication.md)
- [Faculty audit](docs/requirements/Requirements_Traceability.md), [delivery checklist](docs/DELIVERY_CHECKLIST.md), [final audit](docs/FINAL_AUDIT.md)
- [Screenshots](docs/screenshots/README.md), [work division](docs/planning/Team_Work_Division.md), [Harshit](docs/contributions/Member1_Work.md), [Hamza](docs/contributions/Member2_Work.md)

## GitHub repository

[Chandak06 / DBMS-MINIPROJECT](https://github.com/Chandak06/DBMS-MINIPROJECT)

Read-only verification on 2 October 2026 found nine existing commits, all attributed to Harshit Chandak. Local HEAD and remote main matched `b68b64425da2b385c4d5e2d7eb6883aab6b3b0cd`. That snapshot predates the later publication; the application source is now published in this repository. No Hamza commit was verified in that history.

Before submission both members must review and push genuine assigned work using their own accounts. [The handoff plan](docs/planning/GitHub_Jira_Plan.md) maps files and manual steps. Jira is optional planning, not required by the supplied faculty draft.

## Layout

`app/` pages/APIs; `components/` interface; `lib/` services; `database/` executable models; `scripts/` setup/testing/package tools; `tests/` unit tests; `docs/` design/report/evidence. `deliverables/` contains the clean Submission folder, ZIP and checksum and is excluded from Git. Only `.env.example` belongs in the submission.


## Persistent database storage verified on 12 October 2026

The running app uses the configured MySQL database and MongoDB Atlas database, both named `campus_lost_found`. Business data is read through SQL queries and MongoDB collection queries; JSON testing evidence and seed arrays are not runtime data sources.

MySQL stores users, campus/reference data, lost/found reports, matches, claims and notifications. MongoDB stores `lost_item_details`, `found_item_details`, `match_evidence` and `audit_events`. The currently configured Atlas cluster was initialized and, with explicit approval, received the missing 2 lost-detail documents, 2 found-detail documents, 2 matching explanations and 26 audit events from the original local MongoDB. Existing Atlas documents, the local originals and SQL recovery decisions were preserved.

The live integration suite passed all 46 checks against MySQL and Atlas. Verification found no missing linked demonstration documents and no pending MongoDB writes. Run the read-only storage check (it writes a local evidence file) with:

```powershell
node --env-file=.env.local scripts/verify-database-storage.mjs --write-evidence
```

[Current database-storage evidence](docs/testing/results/database-storage.json) and [approved migration evidence](docs/testing/results/database-storage-migration.json) record counts and linkage without credentials. Changing `MONGODB_URI` selects a different database server; already processed outbox rows are not automatically replayed to that server. The optional `--copy-local` tool requires an explicitly selected destination host/database and inserts missing local documents without replacing existing target records. Use it only for an approved migration.


## GitHub publication on 19 October 2026

The implementation was published to [github.com/Chandak06/DBMS-MINIPROJECT](https://github.com/Chandak06/DBMS-MINIPROJECT) on the existing main branch, preserving the earlier history. The source publication was acknowledged at commit 94d64d493f01a689842fdd0875ac1421c095e629; the publication documentation is committed separately afterward. Each new publication commit changes one file.

This publication uses the existing configured Git identity, Harshit Chandak, and records an automated publication requested by the user. No teammate identity, backdated commit or personal authorship evidence was fabricated. The 2 October Git audit is a historical pre-publication snapshot; consult the current GitHub history for the latest state. Both team members still need to review and demonstrate their assigned work; this publication does not establish a genuine Hamza-authored contribution.

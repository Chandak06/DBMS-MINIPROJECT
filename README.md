# Campus Lost & Found Intelligent Matching System

A Next.js DBMS mini-project using **MySQL + MongoDB**. Students report lost/found items; Staff review matches and verify returns; Admin registers colleges and provisions college accounts.

| Member | SRN |
|---|---|
| Harshit Chandak | PES2UG24CS185 |
| Hamza Shabir Sahapurwala | PES2UG24CS177 |

## College accounts (28 October 2026)

Google OAuth and passwordless role/demo buttons have been removed. Old URLs return HTTP 410 and cannot create a session. Only password-protected accounts in an **Admin-registered college** can sign in.

| Role | Example only (college-configurable) | Responsibility |
|---|---|---|
| Student | S100001@students.example.edu | Own lost/found reports, matches, claims and profile |
| Staff | EMP1001@staff.example.edu | College-scoped matching, claims, verification and return operations |
| Admin | admin@admin.example.edu | College/domain registration, Student/Staff accounts, audit and synchronization |

These are application account examples, not college mailboxes created by this project. College IT must supply the corresponding real email identities. A matching address alone never grants an account or role: Student/Staff accounts must be provisioned by an Admin. Unknown/unregistered colleges cannot sign in. The Admin defines the ID format before @ and the exact domain separately for each role. Login, account creation and protected requests enforce the saved policy; the login page lists registered Student formats. Admin creation and promotion are not available through HTTP, the website, registration, seeds or role selectors.

Staff/Admin cannot submit, edit or delete lost/found reports or submit claims. Existing historical reports are preserved. Staff may review a found item physically received at the desk; the original Student report remains the recorded submission. Admin supervises operations and manages the system.

## Install and initialize (Windows PowerShell)

Node.js 22.12+, MySQL 8.0.16+ and reachable MongoDB/Atlas are required. From the repository root:

```powershell
npm ci
# New installation only; never overwrite an existing configured .env.local:
if (-not (Test-Path -LiteralPath .env.local)) { Copy-Item .env.example .env.local }
node scripts/init-local-env.mjs
npm run db:setup
npm run seed
```

Configure MYSQL_HOST/PORT/USER/PASSWORD/DATABASE, MONGODB_URI/DATABASE, APP_BASE_URL and SESSION_SECRET privately in .env.local. The initializer generates only the missing session secret. The reference seed does not create any user/Admin or password. Existing installations need `npm run db:setup`; migrations preserve current records. `npm run db:setup -- --sql-only` works while MongoDB is offline; run full setup when it recovers.

## Create the first Admin on your trusted laptop

Run the interactive script locally:

```powershell
npm run seed:admin
```

It asks for an existing campus ID (normally 1 after reference seeding), your college name/code, your three role domains, each role's email ID format, and your Admin email. No institution or real domain is hardcoded. For example, one college may use `S{digits:6}@students.example.edu`; another may use `{digits:4}-{letters:2}-{digits:2}@learners.other.edu`. Choose the values assigned by your college. The password is entered with a hidden local terminal prompt, never in chat or a command-line argument. The script registers the college and creates one Admin in the configured MySQL database; MongoDB receives the durable audit event through the outbox.

The script requires development/test mode and explicit local confirmation. Production mode is refused. Repeating it preserves an existing active Admin and its password; it does not promote another account, reset credentials or silently replace an existing college policy. See [authentication and Admin setup](docs/implementation/Authentication.md).

## Run

```powershell
npm run dev
# Or:
npm run build
npm start
```

In another terminal:

```powershell
npm run db:worker
```

Open [http://127.0.0.1:3000/login](http://127.0.0.1:3000/login). Loopback alternatives such as port 3001 work without disabling cross-origin protection. Sign in with the provisioned college account, then register colleges and departments before provisioning their Students/Staff in **College accounts**. All accounts can change their own password; only Admin can reset a Student/Staff password. Previous sessions are revoked on credential changes or account/college disablement.

## MySQL and MongoDB

MySQL stores identities, college-domain registration, departments/campuses, item lifecycle, matches, claims, notifications and durable document events. MongoDB stores flexible item details, comparison evidence and audit events. Passwords are salted scrypt hashes in MySQL and never enter MongoDB or public API responses.

Core relational changes and outbox events commit in one MySQL transaction. A shared worker performs idempotent Mongo upserts with per-document ordering, bounded backoff and retained failed payloads. This is eventual consistency, not a distributed transaction. Matching can use relevant committed recovery snapshots during an outage.

## Syllabus concepts used

The [syllabus mapping and normalization analysis](docs/design/Syllabus_Mapping.md) maps all four units to actual code, constraints, SQL and Mongo operations. New features include MySQL full-text report search, CTE/window candidate ranking and college-scoped reporting views. [Executable syllabus examples](database/mysql/syllabus-demo.sql) include UNION, correlated subqueries, full-text retrieval and EXPLAIN. Existing transactions, locks, triggers, procedures/functions, indexes, SQL views and Mongo aggregation remain in use. No extra graph/vector database is claimed or required for the selected SQL + NoSQL implementation.

## Verify

```powershell
npm run typecheck
npm test
npm run build
npm run test:audit
npm run test:schema
```

The integration driver uses uniquely named `clf_college_*` SQL/Mongo databases, a test app on 3100 and an outage app on 3101. It retains its fixtures and never clears the application databases. It requires a separate local MongoDB on port 27018 or an explicitly configured AUDIT_MONGODB_URI. Start a local test MongoDB in a separate terminal if needed:

```powershell
$testDataPath = Join-Path $PWD 'artifacts\local\mongo-test-data'
New-Item -ItemType Directory -Path $testDataPath -Force | Out-Null
& 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe' --dbpath $testDataPath --bind_ip 127.0.0.1 --port 27018
```

Use your installed mongod path. Use `npm run db:college-evidence` for a read-only, credential-free inventory of the configured main databases. Test results are written to docs/testing/results/college-*.json; older dated audit files/PDFs remain historical snapshots, not evidence for this authentication change. No standalone ESLint script is configured.

## Documentation

- [Current change audit](docs/COLLEGE_AUTH_2026-10-28.md)
- [Authentication / Admin provisioning](docs/implementation/Authentication.md)
- [Architecture](docs/implementation/Architecture.md), [API](docs/implementation/API_Endpoints.md)
- [Syllabus and normal forms](docs/design/Syllabus_Mapping.md), [current schema changes](docs/design/Relational_Schema.md)
- [Original report](docs/FINAL_REPORT.md), [October 26 audit](docs/AUDIT_2026-10-26.md) (historical)
- [GitHub repository](https://github.com/Chandak06/DBMS-MINIPROJECT)

Credentials, .env.local, database data files, node_modules, build output and local test artifacts stay excluded from Git. Real college approval and ownership of institutional email accounts are administrative decisions; the app does not replace the college directory or create external mailboxes.

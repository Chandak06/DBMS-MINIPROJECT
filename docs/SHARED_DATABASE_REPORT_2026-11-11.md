# Shared database implementation and validation — 11 November 2026

## Current architecture

```text
Laptop A -> Shared MySQL <- Laptop B
Laptop A -> MongoDB Atlas <- Laptop B
MySQL transaction -> MONGO_OUTBOX -> one continuous worker -> Atlas
```

This is the supported target, not a claim that laptop B has been connected. The application already accepted remote MYSQL_HOST/PORT/USER/PASSWORD/DATABASE. Inspection found duplicate option construction in the Next.js pool, CLI helper and reference seed. They now use **one canonical option factory**, lib/mysql-config.mjs, retaining those existing variables. The web pool reuses connections, uses UTC/keepalive, has a 10-second connection timeout and a bounded wait queue. CLI/seed options match the pool. Optional MYSQL_SSL and MYSQL_SSL_CA_FILE enable verified TLS without forcing it on private VPN/local development. A pure shared error classifier distinguishes connectivity/auth/database/TLS failures and keeps server filesystem configuration out of client bundles.

No schema, account-role, password-hashing, report/match/claim, notification, audit, Mongo model or outbox synchronization redesign was introduced. No replication between independent SQL databases was added.

## Shared MySQL configuration

Each laptop keeps its own ignored .env.local. This task **did not overwrite or edit that private file**.

| Setting | Host A | Teammate B |
|---|---|---|
| MYSQL_HOST | 127.0.0.1 | <HOST_PRIVATE_ZEROTIER_OR_LAN_IPV4> |
| MYSQL_PORT | 3306 | 3306 |
| MYSQL_USER | campus_app | campus_app |
| MYSQL_PASSWORD | Project password, entered privately | Same project password, shared privately |
| MYSQL_DATABASE | campus_lost_found | campus_lost_found |
| MONGODB_URI | Existing Atlas URI, kept private | Same Atlas cluster URI, kept private |
| MONGODB_DATABASE | Existing shared Mongo database | Exact same Mongo database |
| APP_BASE_URL | Local app URL | Local app URL |
| SESSION_SECRET | Private random local secret | Private random local secret; may differ |

Provision the intended shared Admin once. Admin-created Students/Staff and committed workflow records then share the same SQL rows. Refresh the other app to see newly committed records; enrichment is eventually synchronized. One continuous worker is simplest, while existing SQL locks/idempotency retain protection against overlapping workers.

## Host-machine steps

Use [the canonical Windows setup guide](SHARED_DATABASE_SETUP.md), sections A.1 through A.4. It contains the exact commands for joining/inspecting the private ZeroTier/LAN network, service/config discovery, explicit MySQL host-account creation and schema-scoped grants, loopback/private bind addresses, narrow firewall scope, existing-rule review, restart and local authentication.

The essential manual sequence is:

```powershell
Get-Service MySQL80
Get-NetIPAddress -AddressFamily IPv4 | Where-Object InterfaceAlias -Like '*ZeroTier*'
Get-CimInstance Win32_Service -Filter "Name='MySQL80'" | Select-Object Name,PathName
# Back up/edit the actual my.ini as Administrator using the guide.
# In [mysqld]: bind-address=127.0.0.1,<HOST_PRIVATE_IPV4>
mysql --host=127.0.0.1 --port=3306 --user=root --password
# Run the guide's CREATE USER / GRANT statements locally as DBA.
```

Use campus_app@localhost, campus_app@127.0.0.1 and campus_app@<TEAMMATE_PRIVATE_IPV4>, with a strong private project password. Grants are limited to campus_lost_found.*; no global administrative/replication/account-creation privileges or remote root sharing. Development DDL/routine privileges support setup; the guide explains the host DBA's conditional binary-log function-creation requirement. Never grant SUPER to the teammate as a shortcut.

Administrator PowerShell, after reviewing actual addresses/interface and old broad rules:

```powershell
$teamHostIp = '<HOST_PRIVATE_IPV4>'
$teamPeerIp = '<TEAMMATE_PRIVATE_IPV4>'
$teamAdapter = '<EXACT_PRIVATE_ADAPTER_ALIAS>'
New-NetFirewallRule -DisplayName 'Campus Lost Found MySQL - teammate only' `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3306 `
  -LocalAddress $teamHostIp -RemoteAddress $teamPeerIp `
  -InterfaceAlias $teamAdapter -Profile Any
Restart-Service MySQL80
Test-NetConnection -ComputerName 127.0.0.1 -Port 3306
```

No firewall, MySQL bind/service configuration, project database account, router rule or private-network membership was changed automatically. No public port forwarding is required. Full command details, scoped grants and security references remain in the setup guide rather than a second competing configuration system.

## Teammate steps

After both developers have the same published code revision and have joined/authorized the private network:

```powershell
$teamHostIp = '<HOST_PRIVATE_IPV4>'
Test-NetConnection -ComputerName $teamHostIp -Port 3306
mysql --host=$teamHostIp --port=3306 --user=campus_app --password campus_lost_found
Set-Location '<LOCAL_REPOSITORY_PATH>'
notepad.exe .env.local
npm ci
npm run db:health
npm run db:health -- --team
npm run dev
```

Compare the complete server fingerprint/database on both machines, then migrations and counts while writes are quiet. Fingerprinting uses non-secret server UUID plus database and never prints raw UUID/hostname. If UUID is inaccessible, a labelled weaker metadata fallback is used without elevated privileges. The health script masks remote hosts, suppresses driver errors and never prints passwords, password hashes, full Mongo URI or SESSION_SECRET. Its SQL inspection transaction is READ ONLY; it checks linked documents in bounded batches and never repairs/deletes data. Historical audit events are intentionally excluded from orphan deletion/invalidation rules.

## Validation results

Observed from **this laptop's existing configuration**, not from laptop B:

| Check | Result |
|---|---|
| MySQL connectivity / selected database | PASS — local loopback, campus_lost_found |
| MySQL server metadata/fingerprint | PASS — UUID-based comparison available |
| Required SQL tables | PASS — all 13 present |
| MongoDB Atlas connectivity | PASS — configured cluster reachable; host masked |
| Required Mongo collections | PASS — all 4 present |
| Mongo indexes / validators | PASS — match database/mongodb/model.mjs |
| Authentication sanity | PASS — 0 enabled accounts missing password hashes |
| Registered college policy | PASS — 1 registered campus, valid distinct role domains/formats |
| Outbox | PASS — 0 pending, 0 permanent/exhausted failures |
| SQL/Mongo orphans | PASS — lost 0, found 0, match evidence 0 |
| npm ci | PASS — locked installation, 0 reported vulnerabilities |
| npm run typecheck | PASS |
| Unit tests | 178 passed, 0 failed |
| Production build | PASS |
| npm run db:setup | PASS — safe repeated setup, existing migrations preserved |
| npm run db:college-evidence | PASS — current read-only inventory captured |
| Schema tests | 5 passed, 0 failed |
| Integration/audit | 105 passed, 0 failed |
| Outbox fault suite | 13 passed, 0 failed |
| Source/document credential scan | PASS — 246 text files, 4 extracted documents, 0 findings |
| Actual laptop-B private connection / same server | NOT VERIFIED — requires the manual peer-side steps above |

Overall live health is **ATTENTION**, not HEALTHY: the preserved local configuration still uses root. All structural/integrity checks passed, but the dedicated project account and peer connection must be configured/confirmed before team use. There are 4 existing SQL user rows, including historical disabled accounts; no main application user was added for this work. Optional TLS settings/verification flags were unit-tested; a hosted MySQL TLS endpoint was not supplied for a live handshake test.

Evidence: [health](testing/results/current/shared-database-health.json), [shareable team summary](testing/results/current/shared-database-team.json), [unit tests](testing/results/current/unit-results.json), [build](testing/results/current/build.log), [schema](testing/results/current/college-schema-results.json), [integration](testing/results/current/college-integration-results.json), [outbox](testing/results/current/outbox-integration-results.json), [main inventory](testing/results/current/college-live-storage.json), [secret scan](testing/results/current/secret-scan.json).

The new live integration case compares health and --team fingerprints/state, verifies required checks, and confirms outbox row count is unchanged by inspection. Other integration tests retain their isolated clf_college_* SQL/Mongo databases. A separate loopback-only MongoDB on 27018 was started for those tests; the actual shared Atlas dataset was not used for fixtures. No real shared write probe or junk application record was created. The required setup refreshed routines/validators idempotently while preserving main data. The local Next.js app was paused for npm ci's Windows file lock and restarted; its login page returns HTTP 200.

## Remaining manual actions and limits

Confirm the authoritative existing SQL host; join/authorize the private network; review its bind/firewall settings; create the dedicated host-restricted project account; enter private configuration on both laptops; allow each app/worker's intended Atlas egress; coordinate setup/migrations; and compare both --team outputs. These steps may already partly exist but were not remotely verified or automatically changed. Source publication and individual-file history are maintained in [the GitHub repository](https://github.com/Chandak06/DBMS-MINIPROJECT). The pre-existing generated next-env.d.ts development reference remains local.

If both old local SQL instances wrote overlapping numeric IDs/outbox event IDs into Atlas, a zero-orphan result alone cannot prove historical document contents are correct. Review backups before reconciling divergent records; no automatic merge or destructive reset is supplied.

## Files changed

The complete Git-visible file manifest is below. next-env.d.ts was already a generated development-route-reference change at the start; Next.js may regenerate it during app restart. Private .env.local, database files, certificates, dependencies and build caches stay excluded.

| Change | File |
|---|---|
| Modified | `.env.example` |
| Modified | `README.md` |
| Added | `docs/SHARED_DATABASE_REPORT_2026-11-11.md` |
| Added | `docs/SHARED_DATABASE_SETUP.md` |
| Modified | `docs/implementation/Architecture.md` |
| Modified | `docs/testing/results/current/build.log` |
| Modified | `docs/testing/results/current/college-integration-results.json` |
| Modified | `docs/testing/results/current/college-live-storage.json` |
| Modified | `docs/testing/results/current/college-schema-results.json` |
| Modified | `docs/testing/results/current/integration.log` |
| Modified | `docs/testing/results/current/outbox-integration-results.json` |
| Modified | `docs/testing/results/current/secret-scan.json` |
| Added | `docs/testing/results/current/shared-database-health.json` |
| Added | `docs/testing/results/current/shared-database-team.json` |
| Modified | `docs/testing/results/current/syllabus-evidence.json` |
| Modified | `docs/testing/results/current/unit-results.json` |
| Modified | `lib/errors.ts` |
| Added | `lib/mysql-config.d.mts` |
| Added | `lib/mysql-config.mjs` |
| Added | `lib/mysql-errors.d.mts` |
| Added | `lib/mysql-errors.mjs` |
| Modified | `lib/mysql.ts` |
| Generated/pre-existing | `next-env.d.ts` |
| Modified | `package.json` |
| Added | `scripts/check-shared-databases.d.mts` |
| Added | `scripts/check-shared-databases.mjs` |
| Modified | `scripts/college-integration.mjs` |
| Modified | `scripts/db-config.mjs` |
| Modified | `scripts/seed.mjs` |
| Modified | `scripts/verify-deliverables.mjs` |
| Added | `tests/shared-databases.test.ts` |

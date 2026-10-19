# Demonstration script — approximately 10 minutes

Harshit Chandak (PES2UG24CS185) presents identity, lost reports, MongoDB lost details and notifications. Hamza Shabir Sahapurwala (PES2UG24CS177) presents found reports, matching, claims and advanced SQL. Both explain the shared integration and tests.

## Prepare

Run README setup commands and start the server. Sign in through Local demo; real Google login needs valid OAuth credentials. The delivered local wallet is already recovered; the headphones candidate remains pending for a live demonstration. Seed scripts preserve terminal states, so do not expect re-seeding to reopen the wallet. For repeat demonstrations create a new report pair with distinct names.

## Member 1 — minutes 0–3

1. Introduce the problem and show the ER image, ten domain tables and the SQL/NoSQL split.
2. Sign in as Student. Explain role restrictions and current user profile.
3. Open Lost items and filter a seeded item by text/category/status. Show its detail and MongoDB tags.
4. Open Report lost item. Explain name/category/location/time and optional enrichment. A future timestamp or invalid reference is rejected.
5. Show the student dashboard and inbox. Explain parameterized SQL and notification ownership.

## Member 2 — minutes 3–7

1. Sign in as Staff. Open Found items and show found report details; identifying private attributes remain staff/reporter-only.
2. On the dashboard generate matches or open the pending headphones match. Explain same category/campus, time window, 55% threshold and per-rule weighted evidence.
3. Accept the pending candidate with verification notes. The procedure moves both reports to MATCHED and creates a notification atomically.
4. Sign in as Student, open the accepted match and submit proof that only the owner would know.
5. Sign in as Staff and verify/approve the claim. The claim becomes APPROVED and both reports become CLOSED in one transaction.
6. Sign in as Student, show the decision and collection notification.

## Database depth — minutes 7–9

- Show queries.sql Q1–Q6 for joins, grouping/HAVING, subquery and notification reporting; Q7–Q12 for score bands, aggregates, claims and recovery view.
- Show ddl_demo.sql (isolated CREATE/ALTER/DROP) and transactions.sql (INSERT/UPDATE, savepoint rollback and complete rollback).
- Explain sp_review_match, sp_process_claim, fn_match_band, role/date triggers and generated unique columns.
- In MongoDB show unique SQL-link indexes, text/tag retrieval, audit aggregation and match explanation documents using demo_queries.js. CRUD examples use a unique scratch collection.
- Show the outbox retry mechanism. The failure/replay integration check retains a failed write and later processes it; it does not silently lose enrichment.

## Verification and division — minutes 9–10

Open Testing_Results.md, actual result JSON files, screenshot gallery and each member's contribution record. Explain the distinction between implemented responsibilities and real individual Git/Jira history. Mention bounded candidate comparisons and deterministic rules; a high score suggests a candidate and is not ownership proof.

## Commands for the evaluator

```powershell
npm run typecheck
npm run test
npm run build
# Keep npm run start/dev running in a separate terminal:
npm run test:integration
npm run test:schema
npm run db:evidence
npm run db:sync
```

test:schema temporarily creates an independently named scratch database and drops only that scratch database. Integration tests clean up only their own generated fixtures. The database evidence file records actual executed queries and installed structures without credentials.

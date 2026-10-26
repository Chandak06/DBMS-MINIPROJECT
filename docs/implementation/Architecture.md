# Application architecture

The browser uses Next.js server pages and JSON route handlers. Zod validates request bodies; session middleware checks mutation origins; services enforce role and record ownership. MySQL holds identity, reference data and recovery state. MongoDB holds variable item descriptions, matching explanations and audit events.

```mermaid
flowchart LR
 Browser[Student / Staff / Admin browser] --> Next[Next.js pages and API routes]
 Next --> Auth[Signed session and current SQL role]
 Next --> Services[Validation and ownership services]
 Services --> SQL[(MySQL: ten domain tables)]
 Services --> Queue[(MySQL: MONGO_OUTBOX)]
 SQL --> Procedures[Match and claim procedures]
 Queue --> Worker[Ordered idempotent replay]
 Worker --> Mongo[(MongoDB: four collections)]
 Services --> Mongo
 Procedures --> SQL
```

## Recovery state

```mermaid
stateDiagram-v2
 [*] --> OPEN: Report created
 OPEN --> MATCHED: Staff accepts a current candidate
 MATCHED --> CLOSED: Staff approves ownership claim
 OPEN --> CLOSED: Reporter closes unmatched report
 CLOSED --> [*]
```

Matches move from PENDING to ACCEPTED or REJECTED. Claims move from PENDING to APPROVED or REJECTED. Terminal decisions are immutable in the application. Rejection of a claim leaves the pair matched for staff follow-up; duplicate claims from the same person for the same found item remain blocked.

## SQL transaction boundary

`sp_review_match` locks the lost report, found report and candidate in that order. It checks the actor's role, OPEN states and stored report revisions. Acceptance updates both reports, rejects competing candidates and creates a student notification before COMMIT. Unique generated columns also prevent two accepted pairs sharing a report.

`sp_process_claim` follows the same lock order. It checks the accepted match and claimant, prevents self-processing, approves the claim, closes both reports and commits the collection notification together. SQL exceptions trigger ROLLBACK.

## Cross-database consistency

Report core fields, enrichment events and mutation audit events commit together in MySQL. Match/claim procedures also enqueue decision audit events in their SQL transaction. MongoDB remains the indexed document read model. This is eventual consistency, not a distributed transaction.

The app and CLI share `lib/outbox-worker.mjs`. A connection-scoped MySQL named lock serializes workers. Only the earliest unfinished event for each document can run; a failed document does not block unrelated documents. Upsert keys are stable SQL IDs. Audit events use `event_id=outbox:<outbox_id>` with a partial unique index that preserves legacy audit records.

Transient failures retain payloads and receive exponential backoff (5 seconds, doubling to at most 1 hour). Eight failures exhaust automatic retries. Validation/authorization errors are classified as permanent. The Admin sync page displays pending, retryable and failed counts, connection health and per-write attempts. An explicit per-record retry preserves attempt history and payloads. Success sets `processed_at` only after MongoDB acknowledgement. A crash before SQL acknowledgement safely replays the same Mongo document.

Run `npm run db:worker` alongside the app for unattended recovery, including after restart. App mutations opportunistically process due writes; `npm run db:sync` processes a batch. No database reset is needed. Matching uses the relevant latest committed outbox snapshot when MongoDB is stale/unavailable. Legacy details without a snapshot require MongoDB availability; missing data is never silently scored as empty during an outage. Unrelated pending writes do not block matching. Per-document responses report actual enrichment/evidence synchronization state.

## Security and operational choices

- MySQL queries use parameters; editable field names come from fixed allowlists.
- Cookies are signed with HS256, HttpOnly and SameSite=Lax; production Google cookies use HTTPS security settings. Role and account existence are checked against SQL on each request.
- Students see their own lost reports, matches and claims. Found-item private attributes and remarks are restricted to the reporter and staff/admin.
- Staff/Admin generate matches, review candidates and process claims. Only Admin changes master data, roles, users, sync controls and audit views. New verified Google registrations always receive STUDENT. Staff reference data is read-only.
- SQL foreign keys, unique keys, CHECKs and triggers reinforce API checks. MongoDB uses strict JSON schema validation and unique SQL-link indexes.
- API input timestamps carry an offset and are stored in UTC; UI renders Asia/Kolkata. IDs are immutable and foreign keys use RESTRICT.
- API lists are capped at 500 records; matching stops above 2,000 eligible comparisons and can be restricted to a specific lost report.

Implementation entry points: `lib/report-service.ts`, `lib/match-service.ts`, `lib/claim-service.ts`, `lib/outbox.ts`, `database/mysql/procedures.sql`, and `database/mongodb/model.mjs`.

## Final inventory and conceptual design

The verified schema has 10 domain tables, MONGO_OUTBOX and SCHEMA_MIGRATION, 2 views, 2 procedures, 1 function and 8 triggers; MongoDB has 4 collections. SCHEMA_MIGRATION belongs to setup infrastructure and is outside request flows. The unchanged conceptual ER predates queue/migration, revision and generated uniqueness additions; the final relational schema and dictionary document these explicitly. Migration checksums are stored but not compared during repeat setup. Revisions are incremented by application edits, not SQL triggers.


## Configured storage verified on 12 October 2026

The running installation currently reads relational records from configured MySQL and flexible details/evidence/activity from configured MongoDB Atlas. The previously local MongoDB documents were restored to Atlas with explicit approval while retaining both originals and existing target documents. Runtime report lists/dashboards use SQL queries; report details and match explanations use MongoDB queries. Seed files initialize databases; testing JSON files do not feed the interface. See [database-storage evidence](../testing/results/database-storage.json).

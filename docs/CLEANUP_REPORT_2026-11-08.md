# Repository cleanup report — 8 November 2026

## Legacy functionality removed

Removed all three unused 410 authentication routes: the former provider entry/callback and role-only endpoint now return normal 404 responses. Removed two unimported report components, the unused requireStaff helper, an unused validation alias, unused imports/declarations, the stale sync query parameter, duplicate test-entry wrappers and the unused synchronization wrapper export. No provider-only dependency remains; every installed direct dependency supports current code or tests.

Removed obsolete one-off import/migration/capture/lock tools and document/package generators tied to the old fixed-schema submission snapshot. Their dated reports, PDFs, approved ER assets, screenshots, CSV planning records and original result files remain as academic evidence. They are clearly labelled/catalogued rather than rewritten as current passes.

## Current authentication flow

Trusted local operator runs `npm run seed:admin`, confirms development/test mode, registers the college and its role domains/ID templates, and enters a hidden password. The CLI is the only application entry point that creates Admins. Admin then provisions Students/Staff with passwords through College accounts. Public signup and web Admin promotion remain unavailable. Current role-domain/format, enabled account/college, salted scrypt hash, SQL lockout and credential_version checks protect login and sessions. Five failures still lock an account for 15 minutes; after expiration, a new failure starts a fresh counter rather than immediately relocking it.

## Database behavior

MySQL remains authoritative for 13 tables, all current keys/checks/foreign keys/unique and full-text indexes, four views, eight triggers, two procedures and one function. MongoDB keeps four validated/indexed collections: lost_item_details, found_item_details, match_evidence and audit_events. SQL IDs link documents without cross-database foreign keys. Transactions enqueue document/audit changes in MONGO_OUTBOX; the shared worker retains ordered/idempotent retries, failure tracking and continuous execution.

Weighted matching, category/college/time eligibility, score threshold, manual comparison, current-revision acceptance, private proof, terminal claim decisions and atomic recovery remain intact. Procedure guards now also reject disabled/unregistered operational accounts and Staff working outside their college. Lock order and concurrency protections are preserved.

## Frontend fixes

Reusable forms accept context-specific submit/success labels. College accounts distinguishes Provision account, Disable/Enable account, Reset password, and script-managed Admin rows. Accounts without hashes show a reset-first instruction instead of an Enable control that always fails. All master-data buttons describe their action. Removed dead duplicate report UI, the obsolete sync query parameter and a corrupted dashboard arrow. Document synchronization notices derive from actual SQL outbox state.

## Backend fixes

Retired routes are deleted, not kept as compatibility tombstones. Meaningful test commands call one canonical integration driver directly. Strict TypeScript now checks unused locals/parameters; route types regenerate before typecheck so deleted endpoints do not survive in stale generated validators. Security scanning discovers secret variables generically and extracts legacy Windows-1252/Word/PDF text without asserting obsolete document hashes. The current evidence validator checks current results and links rather than pretending old fixed totals describe this version.

## Database cleanup

No destructive reset command was added or run. Existing configured MySQL/Mongo records remain intact. `seed` creates only reference/master data and preserves repeated records. The renamed `seed:samples` accepts two distinct, enabled, provisioned Students in the same registered college, checks their actual email policy, uses that college's locations, and writes only sample reports plus transactional outbox events. It refuses production, invalid roles and incompatible accounts, preserves repeats, and creates no users/passwords. The evidence collector uses a unique session-temporary DDL table and full rollback for transaction examples.

Private `.env.local` had obsolete authentication/test-default keys removed while retaining current credentials. It remains ignored. No environment values are reproduced here. Integration/schema fixtures are retained only in uniquely named isolated test databases.

## Tests

| Check | Result | Current evidence |
|---|---|---|
| npm ci | Passed; 82 packages installed, 0 reported vulnerabilities | Clean lockfile installation |
| npm run typecheck | Passed with unused-code checks and route type generation | Production build also validates types |
| npm test | 154 passed, 0 failed | [Unit JSON](testing/results/current/unit-results.json) |
| npm run build | Passed; deleted endpoints absent from route inventory | [Build log](testing/results/current/build.log) |
| npm run db:setup | Passed against configured MySQL + MongoDB | Migrations retained; procedures refreshed |
| npm run test:schema | 5 passed, 0 failed | [Fresh/repeated schema](testing/results/current/college-schema-results.json) |
| npm run test:audit | 104 passed, 0 failed | [Integration JSON](testing/results/current/college-integration-results.json), [log](testing/results/current/integration.log) |
| Outbox fault suite | 13 passed, 0 failed | [Recovery JSON](testing/results/current/outbox-integration-results.json) |
| npm run db:evidence | Passed | [Current SQL/Mongo examples](testing/results/current/database-evidence.json) |
| Main storage inventory | Connected, 13 tables, 4 collections, no pending outbox events at capture | [Read-only inventory](testing/results/current/college-live-storage.json) |
| Credential scan | 235 text files and 4 extracted documents; zero findings | [Scan](testing/results/current/secret-scan.json) |
| npm run verify | Passed current evidence and documentation links | Historical results left dated |

Live checks include former endpoints returning 404; role/college/private-record boundaries; account disable/reset/version revocation; expired-lock behavior; direct stored-procedure scope/disabled-actor rejection; UI labels and reset-first controls; SQL/Mongo sample persistence and idempotency; competing match/claim decisions; real Mongo outage, restart, lost acknowledgement, multiple workers and retained failure recovery. A sample-worker callback mismatch discovered by integration was corrected and the complete suite rerun successfully. Relevant SQL EXPLAIN/window/full-text examples also execute.

## Remaining intentional historical references

[The historical catalogue](HISTORICAL_EVIDENCE.md) identifies old audit/report, contribution/planning, testing, screenshot and requirement records. Original JSON/log captures outside `testing/results/current`, PDF/Word outputs, ER assets and planning CSV retain their dates and original claims. Banners explicitly direct readers to current instructions. Old credentials/provider setup and seeded-role instructions inside those records are not active instructions. Removed URL strings remain only as negative regression fixtures asserting 404; older missing-version tokens are tested for rejection. Security token-pattern detection is credential auditing, not an authentication implementation.

## Final architecture sanity check

There is one active authentication architecture: password-protected college accounts, trusted local CLI Admin bootstrap, and Admin-provisioned Students/Staff. There is one report service, weighted matcher and shared outbox worker path. No public signup, provider authentication, role-only login, additional database, or default Admin password was introduced. MySQL + MongoDB and the current DBMS syllabus concepts remain in use.

The cleaned production app is running at http://127.0.0.1:3000/login with its worker. Main storage already contains a registered college and provisioned Admin; no new main identity was created for this cleanup. The cleanup source and per-file publication history are maintained in [the GitHub repository](https://github.com/Chandak06/DBMS-MINIPROJECT). Private environment/database files remain excluded.

## Files changed

This is the complete Git-visible manifest for this cleanup. The ignored private environment file is described separately above.

| Change | File |
|---|---|
| Modified | `.env.example` |
| Modified | `.gitignore` |
| Modified | `README.md` |
| Modified | `app/admin/users/page.tsx` |
| Modified | `app/api/admin/users/route.ts` |
| Deleted | `app/api/auth/demo/route.ts` |
| Deleted | `app/api/auth/google/callback/route.ts` |
| Deleted | `app/api/auth/google/route.ts` |
| Modified | `app/api/matches/generate/route.ts` |
| Modified | `app/api/notifications/[id]/read/route.ts` |
| Modified | `app/api/notifications/read-all/route.ts` |
| Modified | `app/claims/new/page.tsx` |
| Modified | `app/found-items/[id]/page.tsx` |
| Modified | `app/lost-items/[id]/page.tsx` |
| Modified | `app/reference-data/page.tsx` |
| Modified | `components/CreateRecordForm.tsx` |
| Modified | `components/Dashboards.tsx` |
| Modified | `components/ItemForm.tsx` |
| Deleted | `components/LostItemActions.tsx` |
| Deleted | `components/LostItemForm.tsx` |
| Modified | `components/ReportPages.tsx` |
| Modified | `database/mysql/procedures.sql` |
| Modified | `docs/AUDIT_2026-10-26.md` |
| Added | `docs/CLEANUP_AUDIT_2026-11-08.md` |
| Added | `docs/CLEANUP_REPORT_2026-11-08.md` |
| Modified | `docs/COLLEGE_AUTH_2026-10-28.md` |
| Modified | `docs/DELIVERY_CHECKLIST.md` |
| Modified | `docs/DEMO_SCRIPT.md` |
| Modified | `docs/FINAL_AUDIT.md` |
| Modified | `docs/FINAL_REPORT.md` |
| Added | `docs/HISTORICAL_EVIDENCE.md` |
| Modified | `docs/contributions/Member1_Checklist.md` |
| Modified | `docs/contributions/Member1_Work.md` |
| Modified | `docs/contributions/Member2_Checklist.md` |
| Modified | `docs/contributions/Member2_Work.md` |
| Modified | `docs/design/Data_Dictionary.md` |
| Modified | `docs/design/Relational_Schema.md` |
| Modified | `docs/implementation/API_Endpoints.md` |
| Modified | `docs/implementation/Architecture.md` |
| Modified | `docs/implementation/Authentication.md` |
| Modified | `docs/planning/GitHub_Jira_Plan.md` |
| Modified | `docs/planning/Member2_TODO.md` |
| Modified | `docs/planning/Team_Work_Division.md` |
| Modified | `docs/requirements/Requirements_Traceability.md` |
| Modified | `docs/screenshots/README.md` |
| Modified | `docs/testing/Screenshot_Checklist.md` |
| Modified | `docs/testing/Test_Cases.md` |
| Modified | `docs/testing/Testing_Results.md` |
| Added | `docs/testing/results/current/build.log` |
| Added | `docs/testing/results/current/college-integration-results.json` |
| Added | `docs/testing/results/current/college-live-storage.json` |
| Added | `docs/testing/results/current/college-schema-results.json` |
| Added | `docs/testing/results/current/database-evidence.json` |
| Added | `docs/testing/results/current/integration.log` |
| Added | `docs/testing/results/current/outbox-integration-results.json` |
| Added | `docs/testing/results/current/secret-scan.json` |
| Added | `docs/testing/results/current/syllabus-evidence.json` |
| Added | `docs/testing/results/current/unit-results.json` |
| Modified | `lib/auth-service.ts` |
| Modified | `lib/match-service.ts` |
| Modified | `lib/validations.ts` |
| Modified | `package.json` |
| Deleted | `scripts/audit-integration.mjs` |
| Modified | `scripts/audit-submission.py` |
| Deleted | `scripts/build-schema-documents.py` |
| Deleted | `scripts/build-submission-pdfs.py` |
| Deleted | `scripts/capture-audit-state.mjs` |
| Modified | `scripts/collect-evidence.mjs` |
| Modified | `scripts/college-evidence.mjs` |
| Modified | `scripts/college-integration.mjs` |
| Deleted | `scripts/inspect-db.mjs` |
| Deleted | `scripts/inspect-final-schema.mjs` |
| Deleted | `scripts/integration-test.mjs` |
| Modified | `scripts/outbox-integration.mjs` |
| Deleted | `scripts/package-submission.ps1` |
| Deleted | `scripts/prepare-lock.mjs` |
| Deleted | `scripts/read-requirements.py` |
| Deleted | `scripts/schema-smoke.mjs` |
| Deleted | `scripts/seed-demo.mjs` |
| Added | `scripts/seed-samples.mjs` |
| Modified | `scripts/sync-mongo.mjs` |
| Deleted | `scripts/verify-database-storage.mjs` |
| Modified | `scripts/verify-deliverables.mjs` |
| Deleted | `scripts/write-test-documentation.mjs` |
| Modified | `tsconfig.json` |

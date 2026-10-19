# Final cleanup testing results

Verified locally on 2 October 2026 (Asia/Kolkata). Machine timestamps are UTC. Checks used the actual MySQL/MongoDB and production Next.js app.

| Check | Actual result | Evidence |
|---|---|---|
| Clean npm ci | PASS | Cleanup execution; final-verification.json |
| TypeScript | PASS | check.log |
| Unit tests | PASS, 28/28 | unit-results.json |
| Production build | PASS | check.log and build.log |
| Live integration | PASS, 46; zero failures | integration-results.json |
| Fresh and repeated setup | PASS | schema-smoke.json |
| Reference/demo seeds repeated | PASS | schema-smoke.json |
| MySQL inventory | 12 base tables, 2 views, 2 procedures, 1 function, 8 triggers | final-schema.json |
| MongoDB model | Four strict validated/indexed collections | final-schema.json and database-evidence.json |
| SQL/Mongo queries | 12 SQL examples; DDL/savepoint rollback; text/tag/aggregations | database-evidence.json |
| Dependency audit | PASS, zero reported registry vulnerabilities | dependency-audit.json |
| Screenshots | 14 genuine captures, including both report forms | Screenshot_Checklist.md |
| Document/source secret checks | See final-verification.json and secret-scan.json | Credential values never printed |
| Word page rendering | NOT RUN - dependency unavailable | LibreOffice soffice.exe missing |
| External Google sign-in | NOT RUN - external credentials unavailable | Implemented callback state checks pass |
| Production/load/user study | NOT RUN - outside local submission verification | No related outcome claimed |

Final live run: **2026-10-02T03:26:43.878Z**. Fresh/repeated scratch setup: **2026-10-02T03:26:39.214Z**. Unit timestamps are recorded directly in unit-results.json. Earlier results are preserved in the excluded local backup folder.

## Meaningful checks

The live suite covers tampered sessions, current SQL role, OAuth invalid state, origin rejection, invalid references/future times, duplicate prevention, two-store persistence, private fields and owner-only access, idempotent matching, stale-version rollback, concurrent competing acceptance, concurrent approval, direct SQL/Mongo invalid input, notification ownership, report deletion and failed outbox retention/replay.

The scratch harness creates uniquely named databases, executes setup twice and both seeds twice, checks schema/documents and drops only those scratch databases. Local integration fixtures are also uniquely labeled and cleaned by the harness.

## Reproduce

Run `npm ci`, `npm run check`; serve the built app with `npm start` in another terminal; run `npm run test:integration`, `npm run test:schema` and `npm run db:evidence`. Credentials remain in .env.local. Full cases are in [Test_Cases.md](Test_Cases.md). [The gallery](../screenshots/README.md) records actual UI states.

An npm advisory result is time-specific and does not guarantee complete security. Covered local correctness does not establish production performance or matching accuracy.

Fresh unit run started 2026-10-02T03:26:41.894Z. Both generated PDFs were rendered with bundled Poppler and all 24 report/15 schema page images inspected. The Word content inventory was checked against fresh metadata; its visual layout is not verified.


## Database storage follow-up on 12 October 2026

The configured MongoDB Atlas destination was missing the existing local detail/evidence documents. After explicit approval, 2 lost-detail documents, 2 found-detail documents, 2 match explanations and 26 audit events were copied using insert-if-missing operations. The local originals, existing Atlas records and MySQL states were retained.

The 46-check live integration suite was rerun using actual MySQL and Atlas and passed with zero failures. `npm run db:setup`, reference seeding, repeated sample seeding and `npm run db:sync` succeeded. The current storage check found 2 lost reports, 2 found reports and 2 matching records in SQL, each with its linked MongoDB detail/evidence document; pending writes were zero. SQL/Mongo query evidence was refreshed from these configured databases.

Evidence: [storage and linkage](results/database-storage.json), [approved migration](results/database-storage-migration.json), [new live results](results/integration-results.json), [executed queries](results/database-evidence.json). Previous results are preserved in the excluded local backup folder. TypeScript/unit/build/PDF results earlier in this document retain their original verification dates; application business logic was not changed in this follow-up.

A pre-existing formatting edit in database/mongodb/model.mjs was compared with the earlier archive: exported validator/index definitions and the complete JavaScript syntax tree were identical. Original capture hashes were retained; source-formatting.json records both byte hashes and matching semantic hashes. Submission checks accept only this explicitly verified formatting version and still reject further source edits.


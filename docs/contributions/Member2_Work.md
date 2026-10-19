# Member 2 Contribution Record

**Hamza Shabir Sahapurwala — PES2UG24CS177**

This record maps the completed implementation to Member 2's assigned responsibilities.

| Area | Implementation |
|---|---|
| MySQL entities | CATEGORY, LOCATION, FOUND_ITEM, MATCH and CLAIM in `schema.sql` |
| Found reports | Found pages/APIs; create, search, filter, edit, close, guarded delete; private identifying attributes |
| Matching | `lib/matching.ts`, `lib/match-service.ts`, match pages/APIs; automatic rankings, manual candidates, review and revision checks |
| Claims | `lib/claim-service.ts`, claim pages/APIs; accepted owner-only submission, private proof, verified approval/rejection |
| Staff/admin | Queues, SQL recovery view, Mongo aggregations, retry control, reference-data screens and admin account registration |
| Flexible details | `found_item_details` validator and unique ID/tag/text indexes |
| Explanations | `match_evidence` snapshots, rule scores, matched tags and algorithm version; ordered durable writes |
| Advanced SQL | `advanced.sql`, `revisions.sql`, `sp_review_match`, `sp_process_claim`, `fn_match_band`, transaction/savepoint demo |
| Integrity | Unique report pairs, one accepted match per lost/found item, one approved claim per found item, canonical transitions and role/date triggers |
| Tests | Scoring rules, privacy, duplicate claims, stale candidates, SQL/Mongo validation and simultaneous decisions |

A match score is an explainable heuristic; it is not a probability or a trained AI prediction. Staff verify ownership using the private attributes and the claimant's evidence before returning items.

This record is a responsibility map. Real member-authored commits/reviews remain separate evidence.


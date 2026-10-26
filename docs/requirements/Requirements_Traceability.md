# Final faculty requirement audit

Source read in full: [DBMS Level 3 Requirements Draft](DBMS_Level_3_Requirements_Draft.docx). Verified against executable source, fresh database metadata, live test output and existing captures on 2 October 2026. PASS denotes inspected implementation/evidence; MANUAL ACTION denotes a human or external verification; no mandatory technical requirement is recorded as FAIL.

| Requirement | Evidence/File | Status |
|---|---|---|
| Unique title within the section | Exact approved title retained in README/report; section list unavailable | MANUAL ACTION - team/instructor confirms uniqueness |
| Meaningful real-world problem beyond CRUD | Report sections 2-3; ranking, proof, atomic closure, revision/concurrency checks | PASS |
| Two members approved by instructor | Team_Work_Division names/SRNs; instructor approval unavailable | MANUAL ACTION - confirm approval |
| Both members contribute to database and app | Existing division and both contribution records; assigned features implemented | PASS - scope; personal activity verified separately |
| Mandatory SQL (MySQL/PostgreSQL) | database/mysql; MySQL 8.0.46 metadata | PASS |
| Second paradigm, NoSQL/vector | Four MongoDB collections in model.mjs | PASS - SQL + NoSQL option |
| ER entities, attributes, PK/FK, relationships | Original ER image/drawio; updated schema and dictionary | PASS |
| Final schema/constraints match implementation | Relational_Schema.md/.docx/.pdf; final-schema.json; source hashes | PASS - content; Word layout check manual |
| NoSQL collections/documents/model | MongoDB_Model.md; model.mjs; sample documents | PASS |
| NoSQL indexes, metadata and retrieval | Unique/tag/text/score/audit indexes; demo_queries.js; evidence | PASS |
| Embeddings and vectors as applicable | Optional recommended feature; selected SQL + NoSQL option uses no vectors | PASS - applicability explained |
| CREATE | schema.sql and executed ddl_demo.sql | PASS |
| ALTER | migrations and isolated DDL example | PASS |
| DROP | isolated DDL table, scratch Mongo CRUD | PASS |
| Primary and foreign keys | final-schema metadata and relational schema | PASS |
| Constraints and database validation | CHECK/UNIQUE, eight triggers, Mongo strict validators; negative live tests | PASS |
| Indexes | SQL/Mongo installed index inventories | PASS |
| Views where appropriate | Two installed/executed reporting views | PASS |
| INSERT | Report/claim APIs and both-database persistence checks | PASS |
| UPDATE | Guarded report edits and match/claim decisions | PASS |
| DELETE | Unmatched OPEN report removal and Mongo delete live check | PASS |
| SELECT | Lists/details/dashboards and twelve executed SQL examples | PASS |
| JOIN | queries.sql Q1/Q7/Q9 and captured rows | PASS |
| GROUP BY | Q2/Q3/Q5/Q8/Q12 | PASS |
| HAVING | Q3/Q4/Q8 | PASS |
| ORDER BY | Q1/Q2/Q3/Q5/Q7/Q8/Q9/Q11/Q12 | PASS |
| Aggregate functions | COUNT/AVG/SUM/MIN/MAX in Q2-Q8 | PASS |
| Subqueries | Q4 aggregate subquery and Q10 NOT EXISTS | PASS |
| At least four advanced concepts | Transactions, views, procedures/function, triggers, indexing/full text, NoSQL aggregation | PASS |
| Transactions | Atomic review/approval, conflict rollback, concurrency, savepoint demo | PASS |
| Stored procedures | sp_review_match and sp_process_claim | PASS |
| Stored function | fn_match_band, queried in Q7/live checks | PASS |
| Triggers | Eight installed role/date insert/update guards; invalid SQL rejected | PASS |
| Full-text search | Mongo text indexes and executed text retrieval | PASS |
| NoSQL aggregation | Audit, score and matched-tag pipelines with captured output | PASS |
| Functional Next.js interface | Role pages; actual screenshot gallery; production build | PASS |
| Forms/tables/search/filter/dashboard | Report/claim/reference forms, lists and role dashboards | PASS |
| Backend/API integration | Route handlers, services, MySQL and Mongo clients, outbox | PASS |
| Environment variables; no hard-coded credentials | .env.example; ignore rules; source/document/archive scans | PASS |
| Authentication and minimum two roles | Google routes and signed local sessions; STUDENT/STAFF/ADMIN | PASS - external Google exchange optional/unverified |
| Consistency and integrity | PK/FK/checks/uniques, version guards, transactions and replay tests | PASS |
| Basic web/database security | Origin checks, parameterized SQL, private fields, session/role negative tests | PASS |
| No plaintext application passwords or submitted credentials | No application password store; local credentials excluded from package/Git | PASS |
| Report problem/objectives/scope/functional requirements | FINAL_REPORT.md sections 1-5 | PASS |
| Report ER/schema/justification/dictionary | Report sections 9-14 and detailed design files | PASS |
| Report SQL/NoSQL/queries/architecture | Sections 10 and 14-28; executable sources | PASS |
| Report screenshots/testing/conclusion/future | Sections 29-37 and linked evidence | PASS |
| Maintain final source using Git/GitHub | Implementation published to main on 19 October 2026; existing history preserved and one changed file per publication commit | PASS |
| Commits demonstrate individual contributions | Publication uses the existing Harshit Git identity; no Hamza author entry verified | MANUAL ACTION - genuine member review/contributions still required |
| README setup/execution | Actual npm scripts and evaluator instructions | PASS |
| Final demonstration covers all required topics | DEMO_SCRIPT.md and DB/query/test evidence | MANUAL ACTION - both members present/explain live |
| Originality and distinction from similar projects | Original design artifacts preserved; provenance cannot be independently certified | MANUAL ACTION - team attests and confirms course policy |

Detailed files: [report](../FINAL_REPORT.md), [schema](../design/Relational_Schema.md), [dictionary](../design/Data_Dictionary.md), [architecture](../implementation/Architecture.md), [Mongo model](../implementation/MongoDB_Model.md), [results](../testing/Testing_Results.md), [Git handoff](../planning/GitHub_Jira_Plan.md).

The faculty draft does not require Jira. Its optional planning CSV is not remote activity evidence. External Google consent/exchange, university portal formalities and instructor/title/originality approval are not represented as automatically verified.


Publication update on 19 October 2026: the source-code GitHub requirement is fulfilled. The older audit snapshots describe the pre-publication state; publication does not fabricate the separate individual-contribution requirement.


## 26 October 2026 implementation update

The role, synchronization, security and testing statements above retain their original verification dates. See [current implemented-fixes audit](../AUDIT_2026-10-26.md) for the superseding permission matrix, safe upgrade instructions, confirmed issues, fixes and current 85/152/13 passing test results. The configured MySQL and Atlas are connected; the original pending write is retained and processed, with zero writes remaining. No historical evidence timestamps, PDFs or submission archives were rewritten.

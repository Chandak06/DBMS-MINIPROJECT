> Historical submission audit. For the current college-registration, configurable email-format and Student-only reporting changes, see [the 28 October audit](COLLEGE_AUTH_2026-10-28.md).

# Final submission audit

## FINAL VERDICT

**READY AFTER MANUAL ACTIONS**

Both members' assigned application/database features are implemented and verified locally. The cleanup is complete in the working project. The source has since been published; genuine individual contributions and faculty confirmations remain team actions.

## AUTOMATICALLY FIXED

- Regenerated relational schema DOCX/Markdown from actual fresh-install database metadata; added a rendered schema PDF.
- Replaced the field dictionary with exact columns/types/defaults/nullability/keys/checks/indexes for 10 domain and 2 internal tables. Documented revisions/generated guards, legacy identity types and preserved conceptual ER.
- Expanded the report to 37 sections and created a 24-page report PDF with genuine screenshots and enlarged original ER extracts.
- Corrected evaluator README, architecture/Mongo notes, faculty traceability, delivery checklist, contribution checklists and honest Git handoff.
- Added the actual found-report form capture; gallery now has 14 images.
- Strengthened environment ignore rules and credential/document consistency checks.
- Added reproducible document builders and a clean-copy packager with per-file hash verification and core/ER preservation checks.
- Preserved the previous report/schema/archive/test evidence in the excluded local backup directory.

## VERIFIED REQUIREMENTS

MySQL + MongoDB; normalized ER/schema; meaningful CRUD and recovery workflow; CREATE/ALTER/DROP; JOIN/GROUP BY/HAVING/ORDER BY/aggregates/subqueries; transactions, two views, two procedures, function, eight triggers, SQL/Mongo indexes/full-text retrieval and Mongo aggregation; Next.js forms/search/filter/dashboards/APIs; three roles, validation, privacy and replayable consistency. [Faculty audit](requirements/Requirements_Traceability.md) records each requirement and its evidence.

## REMAINING MANUAL ACTIONS

1. Harshit Chandak (PES2UG24CS185) and Hamza Shabir Sahapurwala (PES2UG24CS177) review/run their assigned work, coordinate shared files, and commit/push genuinely through their own accounts. Checked history has nine Harshit commits and no verified Hamza commit; remote main contains the earlier design baseline, not the final local application.
2. Verify evaluator access to the existing [repository](https://github.com/Chandak06/DBMS-MINIPROJECT). Follow [file review map](planning/GitHub_Jira_Plan.md). Regenerate packaging after genuine source changes.
3. Confirm title uniqueness, instructor team approval, originality and portal requirements; both members present the live demo.
4. Open the updated Word schema and check printed page layout. Its column inventory matches metadata, but LibreOffice is unavailable for DOCX page rendering. The companion PDF is rendered and visually checked.
5. Optional: provide genuine Google OAuth credentials and test provider login. Local three-role sessions and callback-state checks already pass.

No history, identity, remote issue, external login, originality approval or instructor approval is fabricated. Jira is optional planning.

## TEST RESULTS

| Test | Result |
|---|---|
| Dependency installation | PASS, npm ci |
| TypeScript | PASS |
| Unit Tests | PASS, 28/28 |
| Build | PASS |
| Integration Tests | PASS, 46; zero failures |
| MySQL Setup | PASS, fresh/repeated setup and seeds |
| MongoDB | PASS, four collections, validation/retrieval/aggregation and replay |
| Secret Scan | PASS, source and extracted document contents; zero findings |
| PDF layout | PASS, all 24 report and 15 schema pages inspected |
| Word layout | NOT RUN - dependency unavailable |
| External Google login | NOT RUN - external credentials unavailable |

[Testing results](testing/Testing_Results.md), [secret scan](testing/results/secret-scan.json), [fresh metadata](testing/results/final-schema.json) and [Git history](testing/results/git-history.json) contain the genuine evidence. Final packaging validates staged/decompressed hashes and emits verification beside the ZIP.

## FINAL FILE STRUCTURE

```text
Submission/
  README.md, .env.example, package.json, package-lock.json, configs
  app/, components/, lib/, database/, scripts/, tests/
  docs/
    FINAL_REPORT.md, Campus_Lost_Found_Final_Report.pdf
    FINAL_AUDIT.md, DELIVERY_CHECKLIST.md, DEMO_SCRIPT.md
    design/ (approved ER, updated schema DOCX/MD/PDF, dictionary)
    implementation/, requirements/, contributions/, planning/
    screenshots/ (14 actual captures), testing/ (results and evidence)
  SUBMISSION_MANIFEST.json
```

Workspace output: deliverables/Submission/; deliverables/Campus_Lost_Found_Submission.zip; adjacent archive checksum and packaging/credential verification. The ZIP excludes real environment files, Git metadata, dependencies, Next builds, caches and backups.

## SUBMISSION BLOCKERS

The source is published. Genuine individual contribution evidence from both members remains outstanding; Hamza has no verified author entry in the checked history. There are no failing implementation tests. Complete the listed faculty and Word-layout confirmations before declaring unconditional submission readiness.

## Database storage follow-up on 12 October 2026

PASS: the existing SQL records are retained and the configured Atlas collections now contain their linked detail/matching documents. The explicitly approved migration copied 6 detail/evidence documents and 26 audit events while preserving original local and existing remote records. All 46 live integration checks passed against MySQL and Atlas; pending document writes were zero. Database persistence is operational; the previously listed faculty/Git/Word manual actions are unchanged.


## GitHub publication update on 19 October 2026

The source publication was acknowledged at https://github.com/Chandak06/DBMS-MINIPROJECT/commit/94d64d493f01a689842fdd0875ac1421c095e629, preserving the original nine commits. Each new source publication commit changes one file. The final publication documentation is committed separately afterward under the same existing Git identity. Credentials, local configuration, dependencies, caches, backups and generated build/package folders are excluded. This resolves the source-publication blocker; Hamza's genuine contribution evidence, faculty confirmations and the previously documented Word-layout check remain separate manual actions.


## 26 October 2026 implementation update

The role, synchronization, security and testing statements above retain their original verification dates. See [current implemented-fixes audit](AUDIT_2026-10-26.md) for the superseding permission matrix, safe upgrade instructions, confirmed issues, fixes and current 85/152/13 passing test results. The configured MySQL and Atlas are connected; the original pending write is retained and processed, with zero writes remaining. No historical evidence timestamps, PDFs or submission archives were rewritten.

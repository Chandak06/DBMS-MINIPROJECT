# Team review and genuine GitHub contribution handoff

Repository: [Chandak06 / DBMS-MINIPROJECT](https://github.com/Chandak06/DBMS-MINIPROJECT). Read-only verification on 2 October 2026 found nine genuine existing commits, all attributed to Harshit Chandak. Local HEAD and remote main matched `b68b64425da2b385c4d5e2d7eb6883aab6b3b0cd`. No Hamza-authored commit was verified in that history. [git-history.json](../testing/results/git-history.json) records the observed local history and remote result.

The combined implementation and cleanup were local at the dated 2 October audit; the later publication is recorded below. No commit, push, Git identity change or impersonation was performed during cleanup. Assigned ownership does not prove who personally authored automated edits.

Before submission, both team members must push their genuine assigned work using their own GitHub accounts so the repository visibly demonstrates individual contribution.

## File review map

This map follows [Team_Work_Division.md](Team_Work_Division.md); shared files remain shared.

| Reviewer | Existing files and scope |
|---|---|
| Harshit Chandak, PES2UG24CS185 | app/api/auth; app/profile; app/api/users/me; app/lost-items; app/notifications; app/api/lost-items; app/api/notifications; lib/auth.ts; identity/profile/inbox services; Mongo lost/audit model sections |
| Harshit SQL | CAMPUS/DEPARTMENT/USER/LOST_ITEM/NOTIFICATION sections of schema.sql; indexes_views.sql; queries.sql Q1-Q6; ddl_demo.sql and validation_demo.sql |
| Hamza Shabir Sahapurwala, PES2UG24CS177 | app/found-items; app/api/found-items; app/matches; app/api/matches; app/claims; app/api/claims; lib/matching.ts; lib/match-service.ts; lib/claim-service.ts; found/evidence model sections |
| Hamza SQL | CATEGORY/LOCATION/FOUND_ITEM/MATCH/CLAIM sections of schema.sql; advanced.sql; revisions.sql; procedures.sql; transactions.sql; queries.sql Q7-Q12 |
| Shared review | Dashboard/reference screens and services; report-service.ts; outbox; schema.sql/model.mjs shared sections; setup/seeds; unit/integration tests; ER/schema/dictionary/report; security, package and README |

Names in this map denote review responsibility. Source paths are repository-relative. Do not assign a whole shared file to one member merely to manufacture commit attribution.

## Manual completion checklist

1. Each member reviews and runs the assigned database and application features, understands the code, and makes any genuine corrections or additions under their own identity.
2. Coordinate shared-file review. Stage only work actually reviewed/performed. Do not stage .env.local, other real environment files, node_modules, builds or deliverables.
3. Each member commits and pushes through their own account. Preserve existing history; do not backdate, impersonate, alter attribution or create empty contribution commits.
4. Combine the reviewed work and rerun the documented checks. Inspect GitHub's commit history for both real authors and verify the published source includes the final docs.
5. If the published source changes, regenerate the submission copy/ZIP and checksum. Confirm evaluator repository access and complete the faculty live demonstration.

Jira_Import.csv is optional local planning. It lists review tasks and unverified account assignments, not completed remote Jira history. Import only if the team wants Jira; it is not required by the supplied faculty draft.

The remote commit checked on 2 October contained only the original design artifacts and README. That historical snapshot predates the publication recorded below.



## Publication update on 19 October 2026

The user authorized publication of all project files as individual file commits. The existing https://github.com/Chandak06/DBMS-MINIPROJECT repository and main branch were reused. Source publication was acknowledged at 94d64d493f01a689842fdd0875ac1421c095e629, with 189 verified single-file commits and the final publication documents committed separately afterward. Existing history was retained, and the configured Harshit Chandak identity was used throughout.

This is an automated publication record, not a claim that either student personally authored every edit. Hamza has no verified author entry in the checked history; the original member responsibility map and genuine individual review/contribution requirement remain applicable.

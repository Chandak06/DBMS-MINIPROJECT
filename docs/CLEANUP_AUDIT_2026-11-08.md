# Repository cleanup audit — 8 November 2026

## Inspection before changes

Baseline: 0a2ffe021ce08a0a1ce672051402023d3d9d4a44. The only initial working change was Next.js switching its generated next-env.d.ts route reference to .next-dev. No user source edits were present.

Current path: college password login -> current SQL identity/policy -> role/ownership/campus services -> transactional workflow and outbox -> MongoDB documents. scrypt, lockout, credential versions, typed schemas, deterministic matcher, procedures and worker remain active.

Confirmed cleanup targets:
- Three retired authentication 410 routes have no final-project consumer; remove them and assert normal 404 responses in regression checks.
- LostItemForm and LostItemActions have no importers; remove duplicate report UI. requireStaff and lostItemDetailsSchema have no consumers.
- Generic record buttons mislabel password reset and provisioning. Account page offers Enable to accounts without password hashes, which the API always rejects.
- Eight TypeScript unused declarations/imports; two integration helper imports unused.
- Optional seed-demo creates reports only, but its naming, unchecked account eligibility, fixed campus locations and misleading staff variable are stale. Replace with seed:samples using enabled, provisioned, same-college Students and transactional outbox writes.
- Two npm test entry wrappers duplicate one canonical driver. Point meaningful commands directly to the driver, including schema-only mode.
- Old documentation generators recreate prior authentication instructions or assert a fixed 12-table snapshot. One-off lock/migration/import helpers and dated capture scripts are obsolete. Preserve their produced historical artifacts, remove obsolete executable paths and keep current read-only evidence tools.
- Verification scripts require old auth environment names and historical fixed test totals. Separate current verification from dated evidence and use a generic secret-variable scan.
- Unversioned testing/demo/contribution/planning/reference documents contain old instructions. Mark dated evidence clearly and provide current instructions in README/API/authentication/testing documents.
- Stored procedures enforce reviewer role/self-review/state/revision but rely on API for college scope. Add current enabled-account/registered-college and Staff-college guards in the procedures, retaining their transaction/lock order and workflow.

No reset command is necessary: normal seed already creates only reference data, and isolated fresh test databases provide a clean environment. No existing application users/reports/documents will be deleted. Preserve 13 tables, 4 Mongo collections, weighted matcher and outbox.

## Complete tracked-file inventory at inspection

| File | Classification |
|---|---|
| .env.example | Project configuration |
| .gitignore | Project configuration |
| README.md | Project configuration |
| app/admin/audit/page.tsx | Current application |
| app/admin/sync/page.tsx | Current application |
| app/admin/users/page.tsx | Current application |
| app/api/admin/users/[id]/password/route.ts | Current application |
| app/api/admin/users/[id]/route.ts | Current application |
| app/api/admin/users/route.ts | Current application |
| app/api/auth/demo/route.ts | Current application |
| app/api/auth/google/callback/route.ts | Current application |
| app/api/auth/google/route.ts | Current application |
| app/api/auth/login/route.ts | Current application |
| app/api/auth/logout/route.ts | Current application |
| app/api/auth/me/route.ts | Current application |
| app/api/campuses/[id]/route.ts | Current application |
| app/api/campuses/route.ts | Current application |
| app/api/categories/route.ts | Current application |
| app/api/claims/[id]/route.ts | Current application |
| app/api/claims/route.ts | Current application |
| app/api/departments/route.ts | Current application |
| app/api/found-items/[id]/details/route.ts | Current application |
| app/api/found-items/[id]/route.ts | Current application |
| app/api/found-items/route.ts | Current application |
| app/api/locations/route.ts | Current application |
| app/api/lost-items/[id]/details/route.ts | Current application |
| app/api/lost-items/[id]/route.ts | Current application |
| app/api/lost-items/route.ts | Current application |
| app/api/matches/[id]/route.ts | Current application |
| app/api/matches/generate/route.ts | Current application |
| app/api/matches/route.ts | Current application |
| app/api/notifications/[id]/read/route.ts | Current application |
| app/api/notifications/read-all/route.ts | Current application |
| app/api/notifications/route.ts | Current application |
| app/api/system/sync/route.ts | Current application |
| app/api/users/me/password/route.ts | Current application |
| app/api/users/me/route.ts | Current application |
| app/claims/[id]/page.tsx | Current application |
| app/claims/new/page.tsx | Current application |
| app/claims/page.tsx | Current application |
| app/dashboard/page.tsx | Current application |
| app/error.tsx | Current application |
| app/found-items/[id]/edit/page.tsx | Current application |
| app/found-items/[id]/page.tsx | Current application |
| app/found-items/new/page.tsx | Current application |
| app/found-items/page.tsx | Current application |
| app/globals.css | Current application |
| app/layout.tsx | Current application |
| app/login/page.tsx | Current application |
| app/lost-items/[id]/edit/page.tsx | Current application |
| app/lost-items/[id]/page.tsx | Current application |
| app/lost-items/new/page.tsx | Current application |
| app/lost-items/page.tsx | Current application |
| app/matches/[id]/page.tsx | Current application |
| app/matches/page.tsx | Current application |
| app/not-found.tsx | Current application |
| app/notifications/page.tsx | Current application |
| app/page.tsx | Current application |
| app/profile/page.tsx | Current application |
| app/reference-data/page.tsx | Current application |
| app/staff/page.tsx | Current application |
| components/ActionButton.tsx | Current application |
| components/AdminDashboard.tsx | Current application |
| components/ClaimForm.tsx | Current application |
| components/CreateRecordForm.tsx | Current application |
| components/Dashboards.tsx | Current application |
| components/DecisionForm.tsx | Current application |
| components/ItemForm.tsx | Current application |
| components/LoginForm.tsx | Current application |
| components/LostItemActions.tsx | Current application |
| components/LostItemForm.tsx | Current application |
| components/ManualMatchForm.tsx | Current application |
| components/Nav.tsx | Current application |
| components/NotificationActions.tsx | Current application |
| components/PasswordForm.tsx | Current application |
| components/ProfileForm.tsx | Current application |
| components/ReportPages.tsx | Current application |
| components/SyncPanel.tsx | Current application |
| database/mongodb/demo_queries.js | Current database definitions/examples |
| database/mongodb/model.mjs | Current database definitions/examples |
| database/mongodb/setup.js | Current database definitions/examples |
| database/mysql/advanced.sql | Current database definitions/examples |
| database/mysql/college-auth.sql | Current database definitions/examples |
| database/mysql/college-email-formats.sql | Current database definitions/examples |
| database/mysql/ddl_demo.sql | Current database definitions/examples |
| database/mysql/indexes_views.sql | Current database definitions/examples |
| database/mysql/outbox-reliability.sql | Current database definitions/examples |
| database/mysql/procedures.sql | Current database definitions/examples |
| database/mysql/queries.sql | Current database definitions/examples |
| database/mysql/revisions.sql | Current database definitions/examples |
| database/mysql/schema.sql | Current database definitions/examples |
| database/mysql/syllabus-demo.sql | Current database definitions/examples |
| database/mysql/syllabus-features.sql | Current database definitions/examples |
| database/mysql/transactions.sql | Current database definitions/examples |
| database/mysql/validation_demo.sql | Current database definitions/examples |
| docs/AUDIT_2026-10-26.md | Dated evidence/reference (preserve original content) |
| docs/COLLEGE_AUTH_2026-10-28.md | Dated evidence/reference (preserve original content) |
| docs/Campus_Lost_Found_Final_Report.pdf | Dated evidence/reference (preserve original content) |
| docs/DELIVERY_CHECKLIST.md | Dated evidence/reference (preserve original content) |
| docs/DEMO_SCRIPT.md | Dated evidence/reference (preserve original content) |
| docs/FINAL_AUDIT.md | Dated evidence/reference (preserve original content) |
| docs/FINAL_REPORT.md | Dated evidence/reference (preserve original content) |
| docs/contributions/Member1_Checklist.md | Dated evidence/reference (preserve original content) |
| docs/contributions/Member1_Work.md | Dated evidence/reference (preserve original content) |
| docs/contributions/Member2_Checklist.md | Dated evidence/reference (preserve original content) |
| docs/contributions/Member2_Work.md | Dated evidence/reference (preserve original content) |
| docs/design/Data_Dictionary.md | Dated evidence/reference (preserve original content) |
| docs/design/ER_Diagram.drawio | Dated evidence/reference (preserve original content) |
| docs/design/ER_Diagram.png | Dated evidence/reference (preserve original content) |
| docs/design/Relational_Schema.docx | Dated evidence/reference (preserve original content) |
| docs/design/Relational_Schema.md | Dated evidence/reference (preserve original content) |
| docs/design/Relational_Schema.pdf | Dated evidence/reference (preserve original content) |
| docs/design/Syllabus_Mapping.md | Dated evidence/reference (preserve original content) |
| docs/implementation/API_Endpoints.md | Dated evidence/reference (preserve original content) |
| docs/implementation/Architecture.md | Dated evidence/reference (preserve original content) |
| docs/implementation/Authentication.md | Dated evidence/reference (preserve original content) |
| docs/implementation/Matching.md | Dated evidence/reference (preserve original content) |
| docs/implementation/MongoDB_Member1.md | Dated evidence/reference (preserve original content) |
| docs/implementation/MongoDB_Model.md | Dated evidence/reference (preserve original content) |
| docs/planning/GitHub_Jira_Plan.md | Dated evidence/reference (preserve original content) |
| docs/planning/Jira_Import.csv | Dated evidence/reference (preserve original content) |
| docs/planning/Member2_TODO.md | Dated evidence/reference (preserve original content) |
| docs/planning/Team_Work_Division.md | Dated evidence/reference (preserve original content) |
| docs/requirements/DBMS_Level_3_Requirements_Draft.docx | Dated evidence/reference (preserve original content) |
| docs/requirements/Requirements_Traceability.md | Dated evidence/reference (preserve original content) |
| docs/screenshots/01-sign-in.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/02-student-dashboard.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/03-staff-candidates.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/04-match-evidence.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/05-ownership-claim.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/06-approved-claim.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/07-closed-found-report.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/08-notifications.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/09-report-form.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/10-filtered-reports.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/11-admin-management.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/12-recovery-dashboard.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/13-mobile-dashboard.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/14-found-report-form.jpg | Dated evidence/reference (preserve original content) |
| docs/screenshots/15-admin-dashboard-audit.png | Dated evidence/reference (preserve original content) |
| docs/screenshots/16-sync-health-audit.png | Dated evidence/reference (preserve original content) |
| docs/screenshots/17-college-login.png | Dated evidence/reference (preserve original content) |
| docs/screenshots/README.md | Dated evidence/reference (preserve original content) |
| docs/testing/Screenshot_Checklist.md | Dated evidence/reference (preserve original content) |
| docs/testing/Test_Cases.md | Dated evidence/reference (preserve original content) |
| docs/testing/Testing_Results.md | Dated evidence/reference (preserve original content) |
| docs/testing/results/artifact-qa.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/audit-build.log | Dated evidence/reference (preserve original content) |
| docs/testing/results/audit-dependencies.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/audit-final-verification.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/audit-integration-results.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/audit-integration.log | Dated evidence/reference (preserve original content) |
| docs/testing/results/audit-live-storage.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/audit-secret-scan.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/audit-unit-results.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/build.log | Dated evidence/reference (preserve original content) |
| docs/testing/results/check.log | Dated evidence/reference (preserve original content) |
| docs/testing/results/college-build.log | Dated evidence/reference (preserve original content) |
| docs/testing/results/college-integration-results.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/college-integration.log | Dated evidence/reference (preserve original content) |
| docs/testing/results/college-live-storage.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/college-schema-results.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/college-secret-scan.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/college-unit-results.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/database-evidence.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/database-storage-migration.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/database-storage.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/dependency-audit.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/final-schema.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/final-verification.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/git-history.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/integration-results.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/origin-fix-live-results.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/origin-fix-unit-results.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/outbox-integration-results.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/schema-smoke.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/secret-scan.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/source-formatting.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/syllabus-evidence.json | Dated evidence/reference (preserve original content) |
| docs/testing/results/unit-results.json | Dated evidence/reference (preserve original content) |
| lib/api-route.ts | Current application |
| lib/audit.ts | Current application |
| lib/auth-service.ts | Current application |
| lib/auth.ts | Current application |
| lib/claim-service.ts | Current application |
| lib/college-email.d.mts | Current application |
| lib/college-email.mjs | Current application |
| lib/dates.ts | Current application |
| lib/detail-snapshots.ts | Current application |
| lib/diagnostics.ts | Current application |
| lib/errors.ts | Current application |
| lib/http.ts | Current application |
| lib/match-evidence.ts | Current application |
| lib/match-service.ts | Current application |
| lib/matching.ts | Current application |
| lib/mongo.ts | Current application |
| lib/mysql.ts | Current application |
| lib/outbox-worker.d.mts | Current application |
| lib/outbox-worker.mjs | Current application |
| lib/outbox.ts | Current application |
| lib/page-permission.ts | Current application |
| lib/password.d.mts | Current application |
| lib/password.mjs | Current application |
| lib/permissions.ts | Current application |
| lib/provisioning.d.mts | Current application |
| lib/provisioning.mjs | Current application |
| lib/reference-service.ts | Current application |
| lib/report-service.ts | Current application |
| lib/request-json.ts | Current application |
| lib/transaction.ts | Current application |
| lib/types.ts | Current application |
| lib/validations.ts | Current application |
| lib/workflow.ts | Current application |
| middleware.ts | Project configuration |
| next-env.d.ts | Project configuration |
| next.config.mjs | Project configuration |
| package-lock.json | Project configuration |
| package.json | Project configuration |
| scripts/admin-input.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/audit-integration.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/audit-submission.py | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/build-schema-documents.py | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/build-submission-pdfs.py | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/capture-audit-state.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/collect-evidence.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/college-evidence.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/college-integration.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/db-config.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/export-mongo-setup.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/init-local-env.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/inspect-db.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/inspect-final-schema.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/integration-test.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/outbox-integration.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/package-submission.ps1 | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/prepare-lock.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/provision-admin.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/read-requirements.py | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/schema-smoke.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/seed-demo.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/seed.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/setup-databases.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/sync-mongo.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/verify-database-storage.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/verify-deliverables.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| scripts/write-test-documentation.mjs | Verification/bootstrap/tooling (reviewed for stale behavior) |
| tests/college-email.test.ts | Verification/bootstrap/tooling (reviewed for stale behavior) |
| tests/college-login.test.ts | Verification/bootstrap/tooling (reviewed for stale behavior) |
| tests/matching.test.ts | Verification/bootstrap/tooling (reviewed for stale behavior) |
| tests/middleware.test.ts | Verification/bootstrap/tooling (reviewed for stale behavior) |
| tests/outbox.test.ts | Verification/bootstrap/tooling (reviewed for stale behavior) |
| tests/password.test.ts | Verification/bootstrap/tooling (reviewed for stale behavior) |
| tests/permissions.test.ts | Verification/bootstrap/tooling (reviewed for stale behavior) |
| tests/validations.test.ts | Verification/bootstrap/tooling (reviewed for stale behavior) |
| tests/workflow-validation.test.ts | Verification/bootstrap/tooling (reviewed for stale behavior) |
| tests/workflow.test.ts | Verification/bootstrap/tooling (reviewed for stale behavior) |
| tsconfig.json | Project configuration |
| vitest.config.ts | Project configuration |

# Evidence checklist — both members

The [screenshot gallery](../screenshots/README.md) contains actual browser captures from the local production app. Database structures and executed query results are recorded in [database-evidence.json](results/database-evidence.json); they are machine-readable database evidence, not fabricated Workbench screenshots.

| Required evidence | Delivered |
|---|---|
| Login and student dashboard | 01-sign-in, 02-student-dashboard |
| Staff dashboard and ranked candidates | 03-staff-candidates |
| Mongo-backed scoring explanation | 04-match-evidence |
| Claim proof, staff decision and closed report | 05-ownership-claim, 06-approved-claim, 07-closed-found-report |
| Recovery notification | 08-notifications |
| Lost report form and filtered list | 09-report-form, 10-filtered-reports |
| Admin reference/user management | 11-admin-management |
| Final recovery metrics | 12-recovery-dashboard |
| Mobile layout | 13-mobile-dashboard |
| Found report form and private detail inputs | 14-found-report-form |
| SQL columns/indexes/views/triggers/queries/DDL | results/database-evidence.json |
| Mongo documents/validators/indexes/aggregates | results/database-evidence.json |
| Unit/integration/fresh setup/audit | Corresponding result JSON and build log |

Real Google provider login and genuine individual GitHub history require the team's valid credentials and own actions. See Authentication.md and GitHub_Jira_Plan.md. These are distinguished from the completed local demo. Jira is optional planning, not required by the faculty draft.


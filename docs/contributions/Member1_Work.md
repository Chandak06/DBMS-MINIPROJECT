# Member 1 Contribution Record

**Harshit Chandak — PES2UG24CS185**

This record maps the completed implementation to Member 1's assigned responsibilities.

| Area | Implementation |
|---|---|
| MySQL entities | CAMPUS, DEPARTMENT, USER, LOST_ITEM and NOTIFICATION in `database/mysql/schema.sql` |
| Authentication | Google OAuth routes, signed HTTP-only sessions, database role refresh, local demo sign-in |
| Profile | `app/profile/`, `app/api/users/me/`; users cannot change their role through profile input |
| Lost reports | `app/lost-items/`, shared report pages/service and lost APIs; search, filters, open-only edit/close, guarded DELETE |
| Notifications | Inbox, mark one/all read, match/claim notifications created in SQL decision transactions |
| Flexible details | `lost_item_details` validator, unique ID/tag/text indexes, details forms/API and queued synchronization |
| Audit | `audit_events` records and staff dashboard aggregation; failures logged without reversing committed decisions |
| Advanced SQL | `indexes_views.sql`, `queries.sql`, `ddl_demo.sql`, `validation_demo.sql` |
| Tests | Lost/profile validation, role isolation, owner-only reads, stale details, notification ownership and report deletion |

Member 1's work is integrated with Member 2: lost reports feed matching; accepted matches permit claims; processed claims update report status and the inbox.

The record describes assigned technical ownership. Both named members should review the relevant files and commit under their actual Git identities before claiming individual development history in an academic submission.

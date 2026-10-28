# API reference — college accounts

Current behavior: 28 October 2026. SQL values use prepared parameters. Input schemas reject role/ownership injection. Every protected request refreshes its account, registered college, email format and credential version from MySQL.

| Method | Endpoint | Permission and behavior |
|---|---|---|
| POST | /api/auth/login | Public; email + password only. Requires a provisioned active account and enabled Admin-registered college; exact role domain and college-defined ID template must match |
| GET | /api/auth/google, /api/auth/google/callback | Retired; HTTP 410 without authentication |
| POST | /api/auth/demo | Retired; HTTP 410 without authentication |
| POST | /api/auth/logout | Clear HttpOnly session cookie |
| GET | /api/auth/me | Current SQL-validated identity |
| GET, PATCH | /api/users/me | Current profile; same-college department only; role/email changes rejected |
| POST | /api/users/me/password | Verify current password, replace salted hash, revoke old sessions and clear cookie |
| GET | /api/campuses, /api/departments, /api/categories, /api/locations | Signed-in reference lists |
| POST | /api/campuses | Admin registers college name/code, distinct role domains and email ID formats |
| PATCH | /api/campuses/:id | Admin updates registration policy or disables college; own current Admin access cannot be removed |
| POST | /api/departments, /api/categories, /api/locations | Admin creates reference data |
| GET, POST | /api/admin/users | Admin lists accounts / provisions Student or Staff in a registered college; Admin role refused |
| PATCH | /api/admin/users/:id | Admin enables/disables Student/Staff only; role assignment and Admin targets refused |
| POST | /api/admin/users/:id/password | Admin resets Student/Staff password and revokes sessions; Admin targets refused |
| GET | /api/lost-items | Students' own reports; Staff their college's reports; Admin supervision |
| GET | /api/found-items | Student/Staff current-college browse; Admin supervision; other Students' private attributes hidden |
| POST | /api/lost-items, /api/found-items | Student only; create own OPEN report at same-college location, enqueue Mongo details atomically |
| GET | /api/lost-items/:id | Student owner, same-college Staff or Admin |
| GET | /api/found-items/:id | College-scoped browse; private remarks restricted |
| PATCH | /api/lost-items/:id, /api/found-items/:id | Student owner, OPEN report only; atomic SQL + enrichment update; revision increment |
| DELETE | /api/lost-items/:id, /api/found-items/:id | Student owner, OPEN only and no match/claim history |
| GET | /api/lost-items/:id/details | Student owner, same-college Staff or Admin |
| GET | /api/found-items/:id/details | College-scoped; identifying attributes/media restricted to owner, Staff or Admin |
| PUT, DELETE | /api/lost-items/:id/details, /api/found-items/:id/details | Student owner's OPEN report; durable write and revision increment |
| GET | /api/matches | Student's lost-report candidates; Staff current college; Admin supervision |
| POST | /api/matches | Staff/Admin manual pair: lostId, foundId; Staff college restriction enforced |
| POST | /api/matches/generate | Staff/Admin automatic candidates; optional lostId; Staff college restriction enforced |
| GET | /api/matches/:id | Lost owner or authorized Staff/Admin; SQL state plus available Mongo/recovery explanation |
| PATCH | /api/matches/:id | Authorized Staff/Admin accepts/rejects with remarks; stale/self/terminal decisions denied |
| GET | /api/claims | Student's own claims; Staff current college; Admin supervision |
| POST | /api/claims | Student owner of an accepted matched lost report; private proof required |
| GET | /api/claims/:id | Claimant or authorized Staff/Admin; private proof |
| PATCH | /api/claims/:id | Authorized Staff/Admin approves/rejects; own/terminal claim decisions denied |
| GET | /api/notifications | Current inbox; optional unread=1 |
| POST | /api/notifications | Staff sends within college; Admin supervises globally |
| PATCH | /api/notifications/:id/read, /api/notifications/read-all | Current user's notifications only |
| GET, POST | /api/system/sync | Admin inspects/processes outbox; optional outboxId explicitly retries a retained failure |

Admin creation exists only in [the trusted local script](../../scripts/provision-admin.mjs), with development/test confirmation. There is no public signup, web Admin promotion or role-only demo login.

## College email policy

Registration fields are institutionCode, studentDomain, staffDomain, adminDomain and studentLocalFormat/staffLocalFormat/adminLocalFormat. Formats describe only the ID before @; domains are separate exact names and must differ by role. A template can use literal text, {id}, {letters}, {digits}, {alnum}, or fixed counts such as S{digits:6}. No institution-specific ID prefix or arbitrary regular expression is required. Omitted format fields default to {id}; Admin UI and local setup show them explicitly. The login page reads enabled Student formats from SQL. Unknown colleges or emails that fail their stored format cannot authenticate even with a valid password.

PATCH registration accepts the complete policy above or exactly {"registrationEnabled":false}. Policy changes revoke affected users' old credential versions. Account state PATCH accepts exactly {"active":true/false}; password resets accept {"password":"..."}. No password hash is returned or included in audit payloads.

## Filters, consistency and errors

Report filters: q, status=OPEN|MATCHED|CLOSED, categoryId, locationId, mine=1. searchMode=fulltext uses indexed MySQL MATCH ... AGAINST; default contains supports substring lookup. Lists are bounded to 500 rows. Matching bounds candidate comparisons to 2000; provide lostId to narrow the work.

Dates must be ISO values with a timezone. Browser input is converted to UTC, SQL DATETIME stores UTC, and the interface displays IST. Report creation returns lostId/foundId and enrichmentSaved; false means SQL committed and enrichment remains durably queued. Mongo outages never imply a distributed rollback across stores.

Errors: 400 invalid input, 401 missing/invalid authentication, 403 forbidden action, 404 private/unavailable resource, 409 conflicting/stale decision, 410 removed authentication endpoint, 413 oversized login body, 429 account lock or bounded hashing capacity, 503 unavailable database. Five failed known-account attempts lock login for 15 minutes. Cookies are HttpOnly, SameSite=Lax and Secure for HTTPS configuration. Same-origin middleware remains enabled, including validated local loopback aliases.

Staff uses reference data read-only. Only Students see report submission and ownership-claim controls. Admin manages colleges/accounts, audit and synchronization; Staff/Admin retain operational matching and claim review.

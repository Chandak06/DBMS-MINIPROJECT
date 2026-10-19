# API Reference

All write operations validate input. Database values use prepared parameters; SQL table/column choices come from fixed internal mappings.

| Method | Endpoint | Permission and behavior |
|---|---|---|
| GET | /api/auth/google | Public; start OAuth with random state cookie |
| GET | /api/auth/google/callback | Validate state, verified Google email and registered SQL user |
| POST | /api/auth/demo | Enabled local demonstration only; fixed seeded role accounts |
| POST | /api/auth/logout | Clear HTTP-only session cookie |
| GET | /api/auth/me | Current session identity |
| GET, PATCH | /api/users/me | Current user's profile; role changes rejected |
| GET | /api/campuses, /api/departments | Public reference lists |
| POST | /api/campuses, /api/departments | STAFF/ADMIN creates reference data |
| GET | /api/categories, /api/locations | Signed-in reference lists |
| POST | /api/categories, /api/locations | STAFF/ADMIN creates reference data |
| GET | /api/lost-items | Students' own reports; staff/admin see all |
| GET | /api/found-items | Signed-in browse; private remarks excluded for other students |
| POST | /api/lost-items, /api/found-items | Signed-in report creation as OPEN; queue MongoDB details in same SQL transaction |
| GET | /api/lost-items/:id | Owner or staff/admin |
| GET | /api/found-items/:id | Signed-in browse; private remarks restricted |
| PATCH | /api/lost-items/:id, /api/found-items/:id | Owner only, OPEN only; OPEN/CLOSED status input; revision increment |
| DELETE | /api/lost-items/:id, /api/found-items/:id | Owner only, OPEN only, no match/claim history |
| GET | /api/lost-items/:id/details | Owner or staff/admin |
| GET | /api/found-items/:id/details | Signed-in; identifying attributes/media restricted to owner or staff/admin |
| PUT, DELETE | /api/lost-items/:id/details, /api/found-items/:id/details | Owner's OPEN report; durable write and revision increment |
| GET | /api/matches | Students' own lost-report candidates; staff/admin all |
| POST | /api/matches | STAFF/ADMIN manual pair: lostId, foundId |
| POST | /api/matches/generate | STAFF/ADMIN automatic candidates; optional lostId |
| GET | /api/matches/:id | Lost owner or staff/admin; SQL state plus MongoDB explanation |
| PATCH | /api/matches/:id | STAFF/ADMIN; ACCEPTED or REJECTED with remarks |
| GET | /api/claims | Students' own claims; staff/admin all |
| POST | /api/claims | Owner of an accepted matched lost report; foundId, claimDescription, optional claimRemarks |
| GET | /api/claims/:id | Claimant or staff/admin; private ownership proof |
| PATCH | /api/claims/:id | STAFF/ADMIN, cannot process own claim; APPROVED/REJECTED with remarks |
| GET | /api/notifications | Current user's inbox; optional unread=1 |
| POST | /api/notifications | STAFF/ADMIN sends a database inbox notification |
| PATCH | /api/notifications/:id/read | Notification owner only |
| PATCH | /api/notifications/read-all | Current user's notifications only |
| POST | /api/system/sync | STAFF/ADMIN retry durable MongoDB writes |
| GET, POST | /api/admin/users | ADMIN lists/registers SQL Google accounts |

## Filters and errors

Report list filters: `q`, `status=OPEN|MATCHED|CLOSED`, `categoryId`, `locationId`, `mine=1`. Match/claim lists accept their respective status enums. Lists return at most 500 rows. Matching refuses more than 2000 pairs; supply `lostId` to narrow the candidate set.

Responses use 400 for invalid input, 401 for missing authentication, 403 for forbidden roles/actions, 404 for unavailable or private records, 409 for duplicate/conflicting decisions, and 503 for unavailable database services. Report creation returns `lostId`/`foundId` and `enrichmentSaved`; false means SQL succeeded and extra details remain safely queued.

Date/time input must be an ISO date/time with a timezone. The browser converts local input to UTC; SQL stores UTC DATETIME, and interface dates display in IST.

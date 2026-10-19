# Team Work Division

Both assigned parts are implemented in the same application. The names below identify the requested responsibility allocation.

| Member | Name | SRN |
|---|---|---|
| 1 | Harshit Chandak | PES2UG24CS185 |
| 2 | Hamza Shabir Sahapurwala | PES2UG24CS177 |

## Member 1 responsibilities

- MySQL: CAMPUS, DEPARTMENT, USER, LOST_ITEM, NOTIFICATION; reporting indexes and `vw_user_lost_summary`.
- MongoDB: `lost_item_details` and `audit_events`; validators, ID/tag/text indexes and activity aggregation.
- Application: Google OAuth and local demo sessions, profile, student dashboard, lost-report create/search/edit/close/delete and inbox.
- Verification: lost validation, profile restrictions, report privacy, notification ownership, SQL joins/aggregates/subqueries, CREATE/ALTER/DROP examples.

## Member 2 responsibilities

- MySQL: CATEGORY, LOCATION, FOUND_ITEM, MATCH and CLAIM; uniqueness guards, workflow indexes, role/date triggers, procedures, function and transactions.
- MongoDB: `found_item_details` and `match_evidence`; validators, ID/tag/text indexes, evidence aggregation.
- Application: found reports, weighted candidate generation, manual pairing, staff match review, ownership claims, transactional processing and staff/admin dashboards.
- Verification: scoring, stale-revision checks, owner-only claims, concurrent review/approval, one accepted pair per item and one approved claim per found item.

## Shared responsibilities

The ER diagram, relational schema, dictionary, architecture, durable Mongo outbox, reference-data screens, security checks, integration tests, setup scripts, final report and demo are shared deliverables. Unit and live integration tests exercise both members' responsibilities.

The contribution records map implemented work to each member's assigned scope. They do not replace real individual Git commits, PR reviews or Jira activity.

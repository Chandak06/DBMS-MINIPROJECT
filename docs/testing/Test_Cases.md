# Combined test cases

Actual live integration run: 2026-10-01T19:04:34.995Z. Fixtures are created by the test harness and only those fixtures are cleaned up.

| ID | Test | Actual result |
|---|---|---|
| INT-01 | Authentication required | PASS |
| INT-02 | Tampered session rejected | PASS |
| INT-03 | Database role overrides stale admin claim | PASS |
| INT-04 | OAuth callback rejects invalid state before provider exchange | PASS |
| INT-05 | Student cannot manage categories | PASS |
| INT-06 | Student cannot manage users | PASS |
| INT-07 | Cross-origin mutation rejected | PASS |
| INT-08 | Future date rejected | PASS |
| INT-09 | Invalid foreign reference rejected | PASS |
| INT-10 | Lost report persists in both databases | PASS |
| INT-11 | Duplicate active report rejected | PASS |
| INT-12 | Other student's lost report hidden | PASS |
| INT-13 | Student cannot set MATCHED | PASS |
| INT-14 | Found report persists in both databases | PASS |
| INT-15 | Private found attributes hidden from strangers | PASS |
| INT-16 | Student cannot generate matches | PASS |
| INT-17 | Matching persists ranked evidence | PASS |
| INT-18 | Match generation is idempotent | PASS |
| INT-19 | Changed details block stale acceptance and roll back | PASS |
| INT-20 | Regeneration refreshes revisions | PASS |
| INT-21 | Manual pairing creates competing candidate | PASS |
| INT-22 | Student cannot review match | PASS |
| INT-23 | Other student cannot read match | PASS |
| INT-24 | Claim requires accepted match | PASS |
| INT-25 | Concurrent match decisions produce one accepted pair | PASS |
| INT-26 | Matched report cannot be edited | PASS |
| INT-27 | Match notification is committed | PASS |
| INT-28 | Wrong owner cannot claim | PASS |
| INT-29 | Owner can submit claim | PASS |
| INT-30 | Duplicate claim rejected | PASS |
| INT-31 | Claim evidence is private | PASS |
| INT-32 | Student cannot approve claim | PASS |
| INT-33 | Concurrent claim approval commits once and closes both reports | PASS |
| INT-34 | Terminal claim cannot be reversed | PASS |
| INT-35 | MongoDB audit aggregation records one approval | PASS |
| INT-36 | MySQL role trigger rejects student reviewer | PASS |
| INT-37 | MySQL CHECK rejects invalid score | PASS |
| INT-38 | MySQL trigger rejects future date | PASS |
| INT-39 | MongoDB validator rejects invalid detail | PASS |
| INT-40 | Failed outbox write is retained and successfully replayed | PASS |
| INT-41 | Views and stored function return results | PASS |
| INT-42 | All role pages render | PASS |
| INT-43 | Invalid demo payload returns a validation response | PASS |
| INT-44 | Local demo login is gated | PASS |
| INT-45 | Notification ownership is enforced | PASS |
| INT-46 | Unmatched OPEN report deletes SQL and MongoDB | PASS |

## Unit coverage

- weighted matching weights sum to one: passed
- weighted matching ranks a near identical item highly: passed
- weighted matching rejects a different category: passed
- weighted matching rejects a different campus: passed
- weighted matching rejects found-before-lost dates: passed
- weighted matching rejects reports beyond fourteen days: passed
- weighted matching treats missing brand/color as unknown: passed
- weighted matching uses MongoDB tag overlap: passed
- weighted matching normalizes case punctuation and repeated words: passed
- weighted matching handles malformed dates without NaN scores: passed
- weighted matching does not inflate scores with repeated tags: passed
- role permissions does not grant staff/admin privileges to students: passed
- role permissions grants master-data permission to staff and admin: passed
- profile validation accepts a valid profile update: passed
- lost item validation accepts valid lost item data: passed
- lost item validation rejects a future lost date: passed
- lost item validation does not allow a student update payload to set MATCHED: passed
- lost item validation allows a student to close an OPEN report: passed
- workflow validation accepts a found report: passed
- workflow validation rejects non-finite item attributes: passed
- workflow validation requires meaningful claim evidence: passed
- workflow validation does not accept caller-supplied claim ownership: passed
- workflow validation requires decision notes: passed
- workflow validation rejects reopening a terminal claim: passed
- workflow validation prevents role escalation via profile changes: passed
- workflow validation rejects executable media URLs: passed
- calendar and timezone validation rejects impossible calendar dates: passed
- calendar and timezone validation rejects ambiguous timezone-free dates: passed

## External/manual checks

Real Google authentication with registered and unregistered accounts needs valid provider credentials. GitHub personal contribution and Jira activity must be captured after the team performs its own review and commits. These are not labeled automated passes.

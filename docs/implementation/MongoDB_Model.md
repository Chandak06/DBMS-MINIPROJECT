# MongoDB Data Model

MySQL stores stable identity, referential relationships, lifecycle states and decisions. MongoDB stores heterogeneous item descriptions and explainable comparison data that vary across categories.

| Collection | SQL reference | Document fields | Indexes |
|---|---|---|---|
| lost_item_details | lost_id | tags, search_keywords, media, extra_attributes, created_at, updated_at | unique lost_id; tags; text tags/keywords |
| found_item_details | found_id | tags, search_keywords, media, extra_attributes, created_at, updated_at | unique found_id; tags; text tags/keywords |
| match_evidence | match_id | score, rule_scores, matched_tags, explanation, evidence snapshots and algorithm version, timestamps | unique match_id; descending score |
| audit_events | user_id and entity_id | event_type, entity_type/id, payload, occurred_at | user/time; event/time; entity/type |

The authoritative validators and index definitions are in `database/mongodb/model.mjs`. Setup updates validators on existing collections using `collMod` and creates missing indexes. Invalid document types, negative IDs, non-string tags and malformed media are rejected by MongoDB. This follows [MongoDB's validation update API](https://www.mongodb.com/docs/manual/core/schema-validation/update-schema-validation/).

## Document example

```json
{
  "lost_id": 4,
  "tags": ["wallet", "black", "leather"],
  "search_keywords": ["silver zipper"],
  "media": [],
  "extra_attributes": {"material": "leather"},
  "created_at": "BSON Date",
  "updated_at": "BSON Date"
}
```

Media stores URLs rather than binary uploads. Flexible fields hold scalar string/number/boolean values. Found identifying fields and media are private to the reporter and staff/admin; match evidence only snapshots the non-private fields used by the scoring rules.

## Retrieval and aggregation

Item pages retrieve one detail document by its unique SQL ID. Candidate generation loads documents in batches with `$in` and consumes tag/keyword overlap. Text indexes support `$text` query demonstrations; tag indexes support category-independent attribute lookup. Staff dashboard pipelines group audit events and compute average match scores. Member 2's demonstration pipeline unwinds matched tags and groups their frequency.

## Consistency and failure handling

MySQL and MongoDB do not share an atomic transaction. The application commits report/details/evidence operations into MONGO_OUTBOX with the SQL record, then replays them in order through idempotent upserts/deletes. A named SQL lock permits one replay worker; a failed write stops later writes until retry succeeds. A staff button and `npm run db:sync` allow retries. Candidate generation waits for the queue to clear so it cannot score knowingly unsynchronized details. IDs are verified through SQL before reading Mongo documents.

Audit writes are best effort and can fail independently. They are not the authoritative record of match/claim status; SQL records and notifications remain authoritative. Migration DDL, an unplanned worker crash and deletes that affect existing SQL history require operational care; the queue's contents and attempts provide recovery evidence.

## Linked ID validation boundary

The strict validators accept positive BSON numeric int/long/double IDs. They do not independently prove that a double is integral or that the referenced SQL row exists. The application validates integer IDs and checks MySQL ownership/references before accessing linked documents. No cross-database FK is claimed.


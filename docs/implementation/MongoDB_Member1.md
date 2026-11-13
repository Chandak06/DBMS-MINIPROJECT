# MongoDB - Member 1

## lost_item_details

Example:

```json
{
  "lost_id": 12,
  "media": [
    { "url": "https://...", "type": "image", "caption": "Front view" }
  ],
  "tags": ["wallet", "black", "leather"],
  "search_keywords": ["student id", "zipper"],
  "extra_attributes": {
    "material": "leather",
    "has_id_slot": true
  },
  "created_at": "Date",
  "updated_at": "Date"
}
```

Indexes:

- unique `{ lost_id: 1 }`
- `{ tags: 1 }`
- text index on `search_keywords` and `tags`

The app first reads the lost item from MySQL and then gets the extra MongoDB fields using `lost_id`.

## audit_events

Example:

```json
{
  "user_id": 5,
  "event_type": "LOST_ITEM_UPDATE",
  "entity_type": "LOST_ITEM",
  "entity_id": 12,
  "payload": { "fields": ["brand", "color"] },
  "occurred_at": "Date"
}
```

Indexes:

- `{ user_id: 1, occurred_at: -1 }`
- `{ event_type: 1, occurred_at: -1 }`
- `{ entity_type: 1, entity_id: 1 }`

MongoDB query examples are in `database/mongodb/demo_queries.js`.

// Generated from model.mjs by node scripts/export-mongo-setup.mjs.
// Run with mongosh; MONGODB_DATABASE defaults to campus_lost_found.
db = db.getSiblingDB(process.env.MONGODB_DATABASE || "campus_lost_found");
const models = {
  "lost_item_details": {
    "schema": {
      "bsonType": "object",
      "required": [
        "lost_id",
        "created_at",
        "updated_at"
      ],
      "properties": {
        "lost_id": {
          "bsonType": [
            "int",
            "long",
            "double"
          ],
          "minimum": 1
        },
        "media": {
          "bsonType": "array",
          "maxItems": 10,
          "items": {
            "bsonType": "object",
            "required": [
              "url",
              "type"
            ],
            "properties": {
              "url": {
                "bsonType": "string",
                "pattern": "^https?://"
              },
              "type": {
                "enum": [
                  "image",
                  "document"
                ]
              },
              "caption": {
                "bsonType": "string",
                "maxLength": 200
              }
            }
          }
        },
        "tags": {
          "bsonType": "array",
          "maxItems": 30,
          "items": {
            "bsonType": "string",
            "maxLength": 80
          }
        },
        "search_keywords": {
          "bsonType": "array",
          "maxItems": 30,
          "items": {
            "bsonType": "string",
            "maxLength": 80
          }
        },
        "extra_attributes": {
          "bsonType": "object"
        },
        "created_at": {
          "bsonType": "date"
        },
        "updated_at": {
          "bsonType": "date"
        }
      }
    },
    "indexes": [
      [
        {
          "lost_id": 1
        },
        {
          "unique": true,
          "name": "ux_lost_item_details_lost_id"
        }
      ],
      [
        {
          "tags": 1
        },
        {
          "name": "idx_lost_item_details_tags"
        }
      ],
      [
        {
          "search_keywords": "text",
          "tags": "text"
        },
        {
          "name": "txt_lost_item_details_search"
        }
      ]
    ]
  },
  "found_item_details": {
    "schema": {
      "bsonType": "object",
      "required": [
        "found_id",
        "created_at",
        "updated_at"
      ],
      "properties": {
        "found_id": {
          "bsonType": [
            "int",
            "long",
            "double"
          ],
          "minimum": 1
        },
        "media": {
          "bsonType": "array",
          "maxItems": 10,
          "items": {
            "bsonType": "object",
            "required": [
              "url",
              "type"
            ],
            "properties": {
              "url": {
                "bsonType": "string",
                "pattern": "^https?://"
              },
              "type": {
                "enum": [
                  "image",
                  "document"
                ]
              },
              "caption": {
                "bsonType": "string",
                "maxLength": 200
              }
            }
          }
        },
        "tags": {
          "bsonType": "array",
          "maxItems": 30,
          "items": {
            "bsonType": "string",
            "maxLength": 80
          }
        },
        "search_keywords": {
          "bsonType": "array",
          "maxItems": 30,
          "items": {
            "bsonType": "string",
            "maxLength": 80
          }
        },
        "extra_attributes": {
          "bsonType": "object"
        },
        "created_at": {
          "bsonType": "date"
        },
        "updated_at": {
          "bsonType": "date"
        }
      }
    },
    "indexes": [
      [
        {
          "found_id": 1
        },
        {
          "unique": true,
          "name": "ux_found_item_details_found_id"
        }
      ],
      [
        {
          "tags": 1
        },
        {
          "name": "idx_found_item_details_tags"
        }
      ],
      [
        {
          "search_keywords": "text",
          "tags": "text"
        },
        {
          "name": "txt_found_item_details_search"
        }
      ]
    ]
  },
  "match_evidence": {
    "schema": {
      "bsonType": "object",
      "required": [
        "match_id",
        "rule_scores",
        "evidence",
        "explanation",
        "created_at"
      ],
      "properties": {
        "match_id": {
          "bsonType": [
            "int",
            "long",
            "double"
          ],
          "minimum": 1
        },
        "matched_tags": {
          "bsonType": "array",
          "maxItems": 30,
          "items": {
            "bsonType": "string",
            "maxLength": 80
          }
        },
        "rule_scores": {
          "bsonType": "object"
        },
        "evidence": {
          "bsonType": "object"
        },
        "explanation": {
          "bsonType": "string"
        },
        "score": {
          "bsonType": [
            "double",
            "int"
          ],
          "minimum": 0,
          "maximum": 1
        },
        "created_at": {
          "bsonType": "date"
        },
        "updated_at": {
          "bsonType": "date"
        }
      }
    },
    "indexes": [
      [
        {
          "match_id": 1
        },
        {
          "unique": true,
          "name": "ux_match_evidence_match_id"
        }
      ],
      [
        {
          "score": -1
        },
        {
          "name": "idx_match_evidence_score"
        }
      ]
    ]
  },
  "audit_events": {
    "schema": {
      "bsonType": "object",
      "required": [
        "user_id",
        "event_type",
        "occurred_at"
      ],
      "properties": {
        "user_id": {
          "bsonType": [
            "int",
            "long",
            "double"
          ],
          "minimum": 1
        },
        "event_type": {
          "bsonType": "string"
        },
        "entity_type": {
          "bsonType": [
            "string",
            "null"
          ]
        },
        "entity_id": {
          "bsonType": [
            "int",
            "long",
            "double",
            "string",
            "null"
          ]
        },
        "payload": {
          "bsonType": "object"
        },
        "occurred_at": {
          "bsonType": "date"
        }
      }
    },
    "indexes": [
      [
        {
          "event_id": 1
        },
        {
          "unique": true,
          "name": "ux_audit_event_id",
          "partialFilterExpression": {
            "event_id": {
              "$type": "string"
            }
          }
        }
      ],
      [
        {
          "user_id": 1,
          "occurred_at": -1
        },
        {
          "name": "idx_audit_user_time"
        }
      ],
      [
        {
          "event_type": 1,
          "occurred_at": -1
        },
        {
          "name": "idx_audit_event_time"
        }
      ],
      [
        {
          "entity_type": 1,
          "entity_id": 1
        },
        {
          "name": "idx_audit_entity"
        }
      ]
    ]
  }
};
for (const [name, model] of Object.entries(models)) {
 const options={validator:{$jsonSchema:model.schema},validationLevel:"strict",validationAction:"error"};
 if(db.getCollectionNames().includes(name)) db.runCommand({collMod:name,...options});
 else db.createCollection(name,options);
 for(const [keys,options] of model.indexes) db.getCollection(name).createIndex(keys,options);
}

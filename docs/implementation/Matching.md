# Explainable Matching

Candidate generation first requires two OPEN reports in the same category and campus. Found time must be between five minutes before lost time and fourteen days after it. The five-minute allowance handles minor clock differences.

| Comparison | Weight | Similarity rule |
|---|---|---|
| Category | 25% | Exact category |
| Name | 20% | Jaccard token overlap |
| Description | 10% | Jaccard token overlap |
| Color | 10% | Equal normalized non-empty values |
| Brand | 10% | Equal normalized non-empty values |
| Location | 10% | Same location ID |
| Time | 5% | Linear decline over fourteen days |
| MongoDB tags and keywords | 10% | Jaccard overlap across normalized sets |

Weights total 100%. Missing fields score zero, repeated tokens/tags cannot inflate similarity, and incompatible candidates have score zero. An eligible automatic candidate is saved at 55% or above. A staff-created MANUAL candidate can be below that threshold but must still pass category/campus/time gates.

HYBRID identifies the combination of structured SQL and document attributes. The implementation is deterministic and has no embeddings, external model calls, model training or probabilistic confidence.

One MATCH per report pair avoids repeated duplicates. Regeneration refreshes only PENDING candidates and preserves reviewed decisions. Report/details changes increment revisions; acceptance rejects a candidate whose stored revisions are stale. MongoDB stores the original comparison snapshots, individual rule scores, matched tags, total score and algorithm version.

Staff acceptance is a MySQL procedure that locks the reports, updates both to MATCHED, rejects competing pending candidates and creates a notification. Claim approval later verifies the matched lost owner and closes both reports. Generated unique columns additionally prevent competing accepted pairs and multiple approved claims.

The heuristic can miss synonyms, category mistakes and reports outside the date window. Staff review and private ownership proof are therefore required. Semantic embeddings, image comparison and supervised weight tuning are future enhancements.

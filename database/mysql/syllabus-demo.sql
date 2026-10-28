USE campus_lost_found;
-- Unit 1: projection, selection, join, aggregate/grouping; union as a set operation.
SELECT 'LOST' AS report_kind,lost_id AS report_id,item_name,status FROM LOST_ITEM WHERE status='OPEN'
UNION ALL
SELECT 'FOUND',found_id,item_name,status FROM FOUND_ITEM WHERE status='OPEN';
-- Unit 2: correlated subquery with NOT EXISTS.
SELECT li.lost_id,li.item_name FROM LOST_ITEM li WHERE li.status='OPEN'
AND NOT EXISTS(SELECT 1 FROM `MATCH` m WHERE m.lost_id=li.lost_id AND m.status='ACCEPTED');
-- Unit 2: CTE plus window ranking used by the operational dashboard.
SELECT * FROM vw_ranked_match_candidates ORDER BY lost_id,candidate_rank;
-- Unit 2: indexed natural-language full-text search used by report filters.
SELECT lost_id,item_name,MATCH(item_name,description,brand) AGAINST('wallet leather' IN NATURAL LANGUAGE MODE) AS relevance
FROM LOST_ITEM WHERE MATCH(item_name,description,brand) AGAINST('wallet leather' IN NATURAL LANGUAGE MODE) ORDER BY relevance DESC,lost_id;
-- Unit 3: actual optimizer plan, not an invented performance result.
EXPLAIN SELECT lost_id,item_name FROM LOST_ITEM WHERE reported_by=1 AND status='OPEN' ORDER BY created_at DESC;
EXPLAIN SELECT lost_id FROM LOST_ITEM WHERE MATCH(item_name,description,brand) AGAINST('wallet' IN NATURAL LANGUAGE MODE);
-- Unit 4: visibility into durable transaction recovery; no payloads or credentials selected.
SELECT collection_name,COUNT(*) pending,SUM(attempts) attempts FROM MONGO_OUTBOX WHERE processed_at IS NULL GROUP BY collection_name;

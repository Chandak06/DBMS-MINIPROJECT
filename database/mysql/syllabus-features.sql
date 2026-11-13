USE campus_lost_found;
CREATE FULLTEXT INDEX idx_lost_fulltext ON LOST_ITEM(item_name,description,brand);
CREATE FULLTEXT INDEX idx_found_fulltext ON FOUND_ITEM(item_name,description,brand);
CREATE OR REPLACE VIEW vw_ranked_match_candidates AS
WITH candidates AS (
 SELECT m.match_id,m.lost_id,m.found_id,m.similarity_score,li.item_name AS lost_name,fi.item_name AS found_name,l.campus_id
 FROM `MATCH` m JOIN LOST_ITEM li ON li.lost_id=m.lost_id JOIN FOUND_ITEM fi ON fi.found_id=m.found_id
 JOIN LOCATION l ON l.location_id=li.location_id WHERE m.status='PENDING'
)
SELECT candidates.*,ROW_NUMBER() OVER(PARTITION BY lost_id ORDER BY similarity_score DESC,match_id ASC) AS candidate_rank FROM candidates;
CREATE OR REPLACE VIEW vw_campus_recovery_dashboard AS
SELECT cp.campus_id,cp.campus_name,c.category_id,c.category_name,
 (SELECT COUNT(*) FROM LOST_ITEM li JOIN LOCATION l ON l.location_id=li.location_id WHERE li.category_id=c.category_id AND l.campus_id=cp.campus_id) AS lost_reports,
 (SELECT COUNT(*) FROM FOUND_ITEM fi JOIN LOCATION l ON l.location_id=fi.location_id WHERE fi.category_id=c.category_id AND l.campus_id=cp.campus_id) AS found_reports,
 (SELECT COUNT(*) FROM CLAIM cl JOIN FOUND_ITEM fi ON fi.found_id=cl.found_id JOIN LOCATION l ON l.location_id=fi.location_id WHERE fi.category_id=c.category_id AND l.campus_id=cp.campus_id AND cl.status='APPROVED') AS recovered_items
FROM CAMPUS cp CROSS JOIN CATEGORY c;

USE campus_lost_found;
-- Q1 Member 1: JOIN and ORDER BY.
SELECT li.lost_id,CONCAT_WS(' ',u.first_name,u.middle_name,u.last_name) AS reporter,
 li.item_name,c.category_name,l.location_name,li.status,li.lost_datetime
FROM LOST_ITEM li JOIN `USER` u ON u.user_id=li.reported_by
JOIN CATEGORY c ON c.category_id=li.category_id
JOIN LOCATION l ON l.location_id=li.location_id ORDER BY li.lost_datetime DESC;
-- Q2 Member 1: GROUP BY, COUNT and ORDER BY.
SELECT status,COUNT(*) AS report_count FROM LOST_ITEM GROUP BY status ORDER BY report_count DESC;
-- Q3 Member 1: GROUP BY and HAVING.
SELECT u.user_id,u.email,COUNT(*) AS active_reports FROM `USER` u
JOIN LOST_ITEM li ON li.reported_by=u.user_id WHERE li.status IN ('OPEN','MATCHED')
GROUP BY u.user_id,u.email HAVING COUNT(*)>=2 ORDER BY active_reports DESC;
-- Q4 Member 1: aggregate subquery.
SELECT u.user_id,u.email,COUNT(li.lost_id) AS report_count FROM `USER` u
JOIN LOST_ITEM li ON li.reported_by=u.user_id GROUP BY u.user_id,u.email
HAVING COUNT(li.lost_id)>(SELECT AVG(user_report_count) FROM
 (SELECT COUNT(*) AS user_report_count FROM LOST_ITEM GROUP BY reported_by) counts_per_user);
-- Q5 Member 1: notification aggregate.
SELECT type,COUNT(*) AS unread_count FROM NOTIFICATION WHERE is_read=0
GROUP BY type ORDER BY unread_count DESC;
-- Q6 Member 1: reporting view.
SELECT * FROM vw_user_lost_summary ORDER BY total_lost_reports DESC;
-- Q7 Member 2: candidate JOIN with function and ranking.
SELECT m.match_id,li.item_name AS lost_item,fi.item_name AS found_item,
 m.similarity_score,fn_match_band(m.similarity_score) AS score_band,m.status
FROM `MATCH` m JOIN LOST_ITEM li ON li.lost_id=m.lost_id
JOIN FOUND_ITEM fi ON fi.found_id=m.found_id ORDER BY m.similarity_score DESC,m.match_id;
-- Q8 Member 2: AVG/MAX/MIN/SUM and HAVING.
SELECT match_method,COUNT(*) AS candidates,AVG(similarity_score) AS mean_score,
 MAX(similarity_score) AS best_score,MIN(similarity_score) AS lowest_score,
 SUM(status='ACCEPTED') AS accepted
FROM `MATCH` GROUP BY match_method HAVING COUNT(*)>0 ORDER BY mean_score DESC;
-- Q9 Member 2: claim ownership and reviewer JOIN.
SELECT cl.claim_id,fi.item_name,u.email AS claimant,cl.status,
 reviewer.email AS processor,cl.processing_remarks
FROM CLAIM cl JOIN FOUND_ITEM fi ON fi.found_id=cl.found_id
JOIN `USER` u ON u.user_id=cl.submitted_by
LEFT JOIN `USER` reviewer ON reviewer.user_id=cl.processed_by ORDER BY cl.created_at DESC;
-- Q10 Member 2: NOT EXISTS subquery identifies reports without pending candidates.
SELECT li.lost_id,li.item_name FROM LOST_ITEM li WHERE li.status='OPEN'
AND NOT EXISTS(SELECT 1 FROM `MATCH` m WHERE m.lost_id=li.lost_id AND m.status='PENDING');
-- Q11 Member 2: category recovery analytics view.
SELECT *,ROUND(100.0*recovered_items/NULLIF(lost_reports,0),1) AS recovery_percent
FROM vw_recovery_dashboard ORDER BY recovered_items DESC,category_name;
-- Q12 Combined: queue observability.
SELECT collection_name,COUNT(*) AS waiting,SUM(attempts) AS retry_attempts
FROM MONGO_OUTBOX WHERE processed_at IS NULL GROUP BY collection_name ORDER BY waiting DESC;

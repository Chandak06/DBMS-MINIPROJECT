USE campus_lost_found;
DROP PROCEDURE IF EXISTS sp_review_match;
DROP PROCEDURE IF EXISTS sp_process_claim;
DROP FUNCTION IF EXISTS fn_match_band;
DELIMITER $$

CREATE FUNCTION fn_match_band(p_score DECIMAL(10,6))
RETURNS VARCHAR(12) DETERMINISTIC NO SQL
BEGIN
 RETURN CASE WHEN p_score >= 0.8 THEN 'HIGH' WHEN p_score >= 0.55 THEN 'POSSIBLE' ELSE 'LOW' END;
END$$

-- Locks LOST_ITEM then FOUND_ITEM then MATCH in every decision.
CREATE PROCEDURE sp_review_match(IN p_match_id INT UNSIGNED, IN p_actor INT UNSIGNED, IN p_decision VARCHAR(30), IN p_remarks TEXT)
BEGIN
 DECLARE v_lost INT UNSIGNED DEFAULT NULL;
 DECLARE v_found INT UNSIGNED DEFAULT NULL;
 DECLARE v_lost_rev INT;
 DECLARE v_found_rev INT;
 DECLARE v_match_lost_rev INT;
 DECLARE v_match_found_rev INT;
 DECLARE v_owner INT UNSIGNED;
 DECLARE v_lost_status VARCHAR(30);
 DECLARE v_found_status VARCHAR(30);
 DECLARE v_status VARCHAR(30);
 DECLARE v_role VARCHAR(30);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 SELECT role INTO v_role FROM `USER` WHERE user_id=p_actor;
 IF v_role IS NULL OR v_role NOT IN ('STAFF','ADMIN') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Staff or Admin role required.'; END IF;
 IF p_decision NOT IN ('ACCEPTED','REJECTED') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid match decision.'; END IF;
 SELECT lost_id, found_id INTO v_lost, v_found FROM `MATCH` WHERE match_id=p_match_id;
 IF v_lost IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Match does not exist.'; END IF;
 SELECT status, reported_by,revision INTO v_lost_status,v_owner,v_lost_rev FROM LOST_ITEM WHERE lost_id=v_lost FOR UPDATE;
 SELECT status,revision INTO v_found_status,v_found_rev FROM FOUND_ITEM WHERE found_id=v_found FOR UPDATE;
 SELECT status,lost_revision,found_revision INTO v_status,v_match_lost_rev,v_match_found_rev FROM `MATCH` WHERE match_id=p_match_id FOR UPDATE;
 IF v_status <> 'PENDING' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only pending matches can be reviewed.'; END IF;
 IF p_decision='ACCEPTED' THEN
  IF v_lost_rev<>v_match_lost_rev OR v_found_rev<>v_match_found_rev THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Report details changed. Regenerate the candidate before acceptance.'; END IF;
  IF v_lost_status <> 'OPEN' OR v_found_status <> 'OPEN' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Both reports must be open.'; END IF;
  UPDATE LOST_ITEM SET status='MATCHED' WHERE lost_id=v_lost;
  UPDATE FOUND_ITEM SET status='MATCHED' WHERE found_id=v_found;
  UPDATE `MATCH` SET status='REJECTED', reviewed_by=p_actor, reviewed_at=UTC_TIMESTAMP(), review_remarks='A competing match was accepted.'
   WHERE match_id<>p_match_id AND status='PENDING' AND (lost_id=v_lost OR found_id=v_found);
 END IF;
 UPDATE `MATCH` SET status=p_decision, reviewed_by=p_actor, reviewed_at=UTC_TIMESTAMP(), review_remarks=p_remarks WHERE match_id=p_match_id;
 INSERT INTO NOTIFICATION(title,message,type,user_id)
 VALUES (CONCAT('Match ',LOWER(p_decision)), CONCAT('Match #',p_match_id,' was ',LOWER(p_decision),'. ',COALESCE(p_remarks,'')), 'MATCH',v_owner);
 INSERT INTO MONGO_OUTBOX(collection_name,document_id,payload) VALUES ('audit_events',p_actor,
  JSON_OBJECT('user_id',p_actor,'event_type',CONCAT('MATCH_',p_decision),'entity_type','MATCH','entity_id',p_match_id,'payload',JSON_OBJECT('remarks',p_remarks)));
 COMMIT;
END$$

CREATE PROCEDURE sp_process_claim(IN p_claim_id INT UNSIGNED, IN p_actor INT UNSIGNED, IN p_decision VARCHAR(30), IN p_remarks TEXT)
BEGIN
 DECLARE v_found INT UNSIGNED DEFAULT NULL;
 DECLARE v_lost INT UNSIGNED DEFAULT NULL;
 DECLARE v_lost_rev INT;
 DECLARE v_found_rev INT;
 DECLARE v_match_lost_rev INT;
 DECLARE v_match_found_rev INT;
 DECLARE v_owner INT UNSIGNED;
 DECLARE v_submitter INT UNSIGNED;
 DECLARE v_status VARCHAR(30);
 DECLARE v_found_status VARCHAR(30);
 DECLARE v_lost_status VARCHAR(30);
 DECLARE v_role VARCHAR(30);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 SELECT role INTO v_role FROM `USER` WHERE user_id=p_actor;
 IF v_role IS NULL OR v_role NOT IN ('STAFF','ADMIN') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Staff or Admin role required.'; END IF;
 IF p_decision NOT IN ('APPROVED','REJECTED') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid claim decision.'; END IF;
 SELECT found_id INTO v_found FROM CLAIM WHERE claim_id=p_claim_id;
 IF v_found IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Claim does not exist.'; END IF;
 SELECT lost_id INTO v_lost FROM `MATCH` WHERE found_id=v_found AND status='ACCEPTED';
 IF v_lost IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='An accepted match is required.'; END IF;
 SELECT status,reported_by INTO v_lost_status,v_owner FROM LOST_ITEM WHERE lost_id=v_lost FOR UPDATE;
 SELECT status,revision INTO v_found_status,v_found_rev FROM FOUND_ITEM WHERE found_id=v_found FOR UPDATE;
 SELECT status,submitted_by INTO v_status,v_submitter FROM CLAIM WHERE claim_id=p_claim_id FOR UPDATE;
 IF v_status <> 'PENDING' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only pending claims can be processed.'; END IF;
 IF v_submitter=p_actor THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Another staff member must process your claim.'; END IF;
 IF p_decision='APPROVED' THEN
  IF v_submitter <> v_owner THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Claimant must own the matched lost report.'; END IF;
  IF v_found_status <> 'MATCHED' OR v_lost_status <> 'MATCHED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Both matched reports must remain available.'; END IF;
  INSERT INTO NOTIFICATION(title,message,type,user_id)
   SELECT 'Claim rejected','Another verified owner recovered this item.','CLAIM',submitted_by FROM CLAIM WHERE found_id=v_found AND claim_id<>p_claim_id AND status='PENDING';
  UPDATE CLAIM SET status='REJECTED',processed_by=p_actor,processed_at=UTC_TIMESTAMP(),processing_remarks='Another claim was approved.'
   WHERE found_id=v_found AND claim_id<>p_claim_id AND status='PENDING';
  UPDATE FOUND_ITEM SET status='CLOSED' WHERE found_id=v_found;
  UPDATE LOST_ITEM SET status='CLOSED' WHERE lost_id=v_lost;
 END IF;
 UPDATE CLAIM SET status=p_decision,processed_by=p_actor,processed_at=UTC_TIMESTAMP(),processing_remarks=p_remarks WHERE claim_id=p_claim_id;
 INSERT INTO NOTIFICATION(title,message,type,user_id)
 VALUES (CONCAT('Claim ',LOWER(p_decision)), CONCAT('Claim #',p_claim_id,' was ',LOWER(p_decision),'. ',COALESCE(p_remarks,'')), 'CLAIM',v_submitter);
 INSERT INTO MONGO_OUTBOX(collection_name,document_id,payload) VALUES ('audit_events',p_actor,
  JSON_OBJECT('user_id',p_actor,'event_type',CONCAT('CLAIM_',p_decision),'entity_type','CLAIM','entity_id',p_claim_id,'payload',JSON_OBJECT('remarks',p_remarks)));
 COMMIT;
END$$
DELIMITER ;


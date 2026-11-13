USE campus_lost_found;
-- Run the automated equivalent with npm run test:integration.
-- Each commented statement is intentionally invalid; substitute existing IDs
-- before interactive execution. No invalid record should be committed.
-- Invalid role: rejected by chk_user_role.
-- INSERT INTO `USER`(first_name,last_name,email,role) VALUES('Invalid','Role','invalid@example.test','GUEST');
-- Invalid status: rejected by chk_lost_item_status.
-- UPDATE LOST_ITEM SET status='RETURNED' WHERE lost_id=<existing_lost_id>;
-- Invalid score: rejected by chk_match_similarity_score.
-- UPDATE `MATCH` SET similarity_score=2 WHERE match_id=<existing_match_id>;
-- Invalid reviewer: rejected by trg_match_review_bu.
-- UPDATE `MATCH` SET reviewed_by=<student_user_id> WHERE match_id=<existing_match_id>;
-- Invalid processor: rejected by trg_claim_process_bu.
-- UPDATE CLAIM SET processed_by=<student_user_id> WHERE claim_id=<existing_claim_id>;
-- Future timestamp: rejected by trg_found_date_bu.
-- UPDATE FOUND_ITEM SET found_datetime=UTC_TIMESTAMP()+INTERVAL 2 DAY WHERE found_id=<existing_found_id>;
-- Invalid foreign key: rejected by fk_lost_item_category.
-- UPDATE LOST_ITEM SET category_id=2147483647 WHERE lost_id=<existing_lost_id>;
-- Short claim: rejected by chk_claim_description.
-- UPDATE CLAIM SET claim_description='short' WHERE claim_id=<existing_claim_id>;
-- Duplicate match pair/claim: uq_match_pair and uq_claim_user_found reject duplicates.
-- Two accepted matches for one report: uq_match_accepted_lost/uq_match_accepted_found.
-- Two approved claims for one found item: uq_claim_approved_found.
-- Procedure business rules: student actor, stale revision, repeated terminal
-- decision and incompatible report states cause SIGNAL and full ROLLBACK.
SELECT CONSTRAINT_NAME,CONSTRAINT_TYPE,TABLE_NAME
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_TYPE;

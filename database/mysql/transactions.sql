USE campus_lost_found;
-- Member 2 transaction demo, safe to execute: leaves no demo rows.
START TRANSACTION;
INSERT INTO CATEGORY(category_name,description) VALUES (CONCAT('Transaction demo ',UUID()),'Temporary rollback example');
SET @demo_category_id=LAST_INSERT_ID();
SAVEPOINT category_added;
UPDATE CATEGORY SET description='Updated inside a transaction' WHERE category_id=@demo_category_id;
SELECT category_id,category_name,description FROM CATEGORY WHERE category_id=@demo_category_id;
ROLLBACK TO SAVEPOINT category_added;
SELECT description FROM CATEGORY WHERE category_id=@demo_category_id;
ROLLBACK;
SELECT COUNT(*) AS should_be_zero FROM CATEGORY WHERE category_id=@demo_category_id;

-- Application commits and rolls back real decisions through these procedures.
-- Substitute actual ids; calls below are intentionally commented.
-- CALL sp_review_match(1, 2, 'ACCEPTED', 'Category, color and location verified');
-- CALL sp_process_claim(1, 2, 'APPROVED', 'Ownership evidence verified at collection desk');
-- Verify all related records and the notification changed together.
-- SELECT * FROM vw_recovery_dashboard;

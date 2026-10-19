USE campus_lost_found;

-- Member 2 integrity and workflow indexes.
ALTER TABLE `MATCH`
 ADD CONSTRAINT uq_match_pair UNIQUE (lost_id, found_id),
 ADD COLUMN accepted_lost_id INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'ACCEPTED' THEN lost_id ELSE NULL END) STORED,
 ADD COLUMN accepted_found_id INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'ACCEPTED' THEN found_id ELSE NULL END) STORED,
 ADD CONSTRAINT uq_match_accepted_lost UNIQUE (accepted_lost_id),
 ADD CONSTRAINT uq_match_accepted_found UNIQUE (accepted_found_id);
ALTER TABLE CLAIM
 ADD CONSTRAINT uq_claim_user_found UNIQUE (submitted_by, found_id),
 ADD COLUMN approved_found_id INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'APPROVED' THEN found_id ELSE NULL END) STORED,
 ADD CONSTRAINT uq_claim_approved_found UNIQUE (approved_found_id);
ALTER TABLE LOST_ITEM ADD CONSTRAINT chk_lost_name CHECK (CHAR_LENGTH(TRIM(item_name)) >= 2);
ALTER TABLE FOUND_ITEM ADD CONSTRAINT chk_found_name CHECK (CHAR_LENGTH(TRIM(item_name)) >= 2);
ALTER TABLE CLAIM ADD CONSTRAINT chk_claim_description CHECK (CHAR_LENGTH(TRIM(claim_description)) >= 10);
CREATE INDEX idx_found_category_location ON FOUND_ITEM(category_id, location_id, status);
CREATE INDEX idx_found_user_created ON FOUND_ITEM(reported_by, created_at);
CREATE INDEX idx_claim_user_created ON CLAIM(submitted_by, created_at);
CREATE INDEX idx_match_lost_status ON `MATCH`(lost_id, status);

-- Infrastructure table: durable, ordered MongoDB writes committed with core records.
CREATE TABLE MONGO_OUTBOX (
 outbox_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 collection_name VARCHAR(40) NOT NULL,
 document_id INT UNSIGNED NOT NULL,
 payload JSON NOT NULL,
 operation VARCHAR(10) NOT NULL DEFAULT 'UPSERT',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 processed_at DATETIME NULL,
 attempts INT UNSIGNED NOT NULL DEFAULT 0,
 last_error VARCHAR(500),
 CONSTRAINT chk_outbox_collection CHECK (collection_name IN ('lost_item_details','found_item_details','match_evidence')),
 CONSTRAINT chk_outbox_operation CHECK (operation IN ('UPSERT','DELETE')),
 INDEX idx_outbox_pending (processed_at, outbox_id)
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vw_recovery_dashboard AS
SELECT c.category_id, c.category_name,
 (SELECT COUNT(*) FROM LOST_ITEM li WHERE li.category_id=c.category_id) AS lost_reports,
 (SELECT COUNT(*) FROM FOUND_ITEM fi WHERE fi.category_id=c.category_id) AS found_reports,
 (SELECT COUNT(*) FROM CLAIM cl JOIN FOUND_ITEM fi ON fi.found_id=cl.found_id WHERE fi.category_id=c.category_id AND cl.status='APPROVED') AS recovered_items
FROM CATEGORY c;

DELIMITER $$
CREATE TRIGGER trg_lost_date_bi BEFORE INSERT ON LOST_ITEM FOR EACH ROW
BEGIN
 IF NEW.lost_datetime > UTC_TIMESTAMP() + INTERVAL 1 MINUTE THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Lost time cannot be in the future.';
 END IF;
END$$
CREATE TRIGGER trg_lost_date_bu BEFORE UPDATE ON LOST_ITEM FOR EACH ROW
BEGIN
 IF NEW.lost_datetime > UTC_TIMESTAMP() + INTERVAL 1 MINUTE THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Lost time cannot be in the future.';
 END IF;
END$$
CREATE TRIGGER trg_found_date_bi BEFORE INSERT ON FOUND_ITEM FOR EACH ROW
BEGIN
 IF NEW.found_datetime > UTC_TIMESTAMP() + INTERVAL 1 MINUTE THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Found time cannot be in the future.';
 END IF;
END$$
CREATE TRIGGER trg_found_date_bu BEFORE UPDATE ON FOUND_ITEM FOR EACH ROW
BEGIN
 IF NEW.found_datetime > UTC_TIMESTAMP() + INTERVAL 1 MINUTE THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Found time cannot be in the future.';
 END IF;
END$$
DELIMITER ;

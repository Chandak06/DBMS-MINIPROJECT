CREATE DATABASE IF NOT EXISTS campus_lost_found
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE campus_lost_found;

CREATE TABLE `CAMPUS` (
    campus_id INT UNSIGNED AUTO_INCREMENT,
    campus_name VARCHAR(120) NOT NULL,
    street VARCHAR(150),
    city VARCHAR(80),
    state VARCHAR(80),
    postal_code VARCHAR(20),

    CONSTRAINT pk_campus
        PRIMARY KEY (campus_id)
) ENGINE = InnoDB;

CREATE TABLE `DEPARTMENT` (
    department_id INT UNSIGNED AUTO_INCREMENT,
    department_name VARCHAR(120) NOT NULL,
    campus_id INT UNSIGNED NOT NULL,

    CONSTRAINT pk_department
        PRIMARY KEY (department_id),

    CONSTRAINT fk_department_campus
        FOREIGN KEY (campus_id)
        REFERENCES `CAMPUS` (campus_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `USER` (
    user_id INT UNSIGNED AUTO_INCREMENT,
    first_name VARCHAR(80) NOT NULL,
    middle_name VARCHAR(80),
    last_name VARCHAR(80) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    department_id INT UNSIGNED,

    CONSTRAINT pk_user
        PRIMARY KEY (user_id),

    CONSTRAINT fk_user_department
        FOREIGN KEY (department_id)
        REFERENCES `DEPARTMENT` (department_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `CATEGORY` (
    category_id INT UNSIGNED AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,

    CONSTRAINT pk_category
        PRIMARY KEY (category_id)
) ENGINE = InnoDB;

CREATE TABLE `LOCATION` (
    location_id INT UNSIGNED AUTO_INCREMENT,
    location_name VARCHAR(150) NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(50),
    area VARCHAR(100),
    type VARCHAR(50),
    campus_id INT UNSIGNED NOT NULL,

    CONSTRAINT pk_location
        PRIMARY KEY (location_id),

    CONSTRAINT fk_location_campus
        FOREIGN KEY (campus_id)
        REFERENCES `CAMPUS` (campus_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `LOST_ITEM` (
    lost_id INT UNSIGNED AUTO_INCREMENT,
    item_name VARCHAR(150) NOT NULL,
    description TEXT,
    lost_datetime DATETIME NOT NULL,
    color VARCHAR(60),
    brand VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    remarks TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reported_by INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NOT NULL,

    CONSTRAINT pk_lost_item
        PRIMARY KEY (lost_id),

    CONSTRAINT fk_lost_item_reporter
        FOREIGN KEY (reported_by)
        REFERENCES `USER` (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_lost_item_category
        FOREIGN KEY (category_id)
        REFERENCES `CATEGORY` (category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_lost_item_location
        FOREIGN KEY (location_id)
        REFERENCES `LOCATION` (location_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `FOUND_ITEM` (
    found_id INT UNSIGNED AUTO_INCREMENT,
    item_name VARCHAR(150) NOT NULL,
    description TEXT,
    found_datetime DATETIME NOT NULL,
    color VARCHAR(60),
    brand VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    remarks TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reported_by INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NOT NULL,

    CONSTRAINT pk_found_item
        PRIMARY KEY (found_id),

    CONSTRAINT fk_found_item_reporter
        FOREIGN KEY (reported_by)
        REFERENCES `USER` (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_found_item_category
        FOREIGN KEY (category_id)
        REFERENCES `CATEGORY` (category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_found_item_location
        FOREIGN KEY (location_id)
        REFERENCES `LOCATION` (location_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `MATCH` (
    match_id INT UNSIGNED AUTO_INCREMENT,
    lost_id INT UNSIGNED NOT NULL,
    found_id INT UNSIGNED NOT NULL,
    similarity_score DECIMAL(10,6) NOT NULL,
    match_method VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    matched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT UNSIGNED,
    reviewed_at DATETIME,
    review_remarks TEXT,

    CONSTRAINT pk_match
        PRIMARY KEY (match_id),

    CONSTRAINT fk_match_lost_item
        FOREIGN KEY (lost_id)
        REFERENCES `LOST_ITEM` (lost_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_match_found_item
        FOREIGN KEY (found_id)
        REFERENCES `FOUND_ITEM` (found_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_match_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES `USER` (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_match_review_relationship
        CHECK (
            reviewed_by IS NOT NULL
            OR (
                reviewed_at IS NULL
                AND review_remarks IS NULL
            )
        )
) ENGINE = InnoDB;

CREATE TABLE `CLAIM` (
    claim_id INT UNSIGNED AUTO_INCREMENT,
    claim_description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    claim_remarks TEXT,
    submitted_by INT UNSIGNED NOT NULL,
    found_id INT UNSIGNED NOT NULL,
    processed_by INT UNSIGNED,
    processed_at DATETIME,
    processing_remarks TEXT,

    CONSTRAINT pk_claim
        PRIMARY KEY (claim_id),

    CONSTRAINT fk_claim_submitter
        FOREIGN KEY (submitted_by)
        REFERENCES `USER` (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_claim_found_item
        FOREIGN KEY (found_id)
        REFERENCES `FOUND_ITEM` (found_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_claim_processor
        FOREIGN KEY (processed_by)
        REFERENCES `USER` (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_claim_process_relationship
        CHECK (
            processed_by IS NOT NULL
            OR (
                processed_at IS NULL
                AND processing_remarks IS NULL
            )
        )
) ENGINE = InnoDB;

CREATE TABLE `NOTIFICATION` (
    notification_id INT UNSIGNED AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id INT UNSIGNED NOT NULL,

    CONSTRAINT pk_notification
        PRIMARY KEY (notification_id),

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES `USER` (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE INDEX idx_lost_item_status_datetime
    ON `LOST_ITEM` (status, lost_datetime);

CREATE INDEX idx_found_item_status_datetime
    ON `FOUND_ITEM` (status, found_datetime);

CREATE INDEX idx_match_similarity
    ON `MATCH` (similarity_score);

CREATE INDEX idx_match_status
    ON `MATCH` (status);

CREATE INDEX idx_claim_status
    ON `CLAIM` (status);

CREATE INDEX idx_notification_user_read
    ON `NOTIFICATION` (user_id, is_read);

ALTER TABLE `USER`
    ADD CONSTRAINT uq_user_email
        UNIQUE (email),

    ADD CONSTRAINT chk_user_role
        CHECK (
            UPPER(TRIM(role))
            IN ('STUDENT', 'STAFF', 'ADMIN')
        );

ALTER TABLE `CATEGORY`
    ADD CONSTRAINT uq_category_name
        UNIQUE (category_name);

ALTER TABLE `LOST_ITEM`
    ADD CONSTRAINT chk_lost_item_status
        CHECK (
            UPPER(TRIM(status))
            IN ('OPEN', 'MATCHED', 'CLOSED')
        );

ALTER TABLE `FOUND_ITEM`
    ADD CONSTRAINT chk_found_item_status
        CHECK (
            UPPER(TRIM(status))
            IN ('OPEN', 'MATCHED', 'CLOSED')
        );

ALTER TABLE `MATCH`
    ADD CONSTRAINT chk_match_similarity_score
        CHECK (
            similarity_score >= 0
            AND similarity_score <= 1
        ),

    ADD CONSTRAINT chk_match_method
        CHECK (
            UPPER(TRIM(match_method))
            IN ('AI', 'MANUAL', 'HYBRID')
        ),

    ADD CONSTRAINT chk_match_status
        CHECK (
            UPPER(TRIM(status))
            IN ('PENDING', 'ACCEPTED', 'REJECTED')
        ),

    ADD CONSTRAINT chk_match_review_status
        CHECK (
            UPPER(TRIM(status)) = 'PENDING'
            OR reviewed_by IS NOT NULL
        );

ALTER TABLE `CLAIM`
    ADD CONSTRAINT chk_claim_status
        CHECK (
            UPPER(TRIM(status))
            IN ('PENDING', 'APPROVED', 'REJECTED')
        ),

    ADD CONSTRAINT chk_claim_processing_status
        CHECK (
            UPPER(TRIM(status)) = 'PENDING'
            OR processed_by IS NOT NULL
        );

ALTER TABLE `NOTIFICATION`
    ADD CONSTRAINT chk_notification_type
        CHECK (
            UPPER(TRIM(type))
            IN ('MATCH', 'CLAIM', 'GENERAL')
        ),

    ADD CONSTRAINT chk_notification_is_read
        CHECK (
            is_read IN (0, 1)
        );

DROP TRIGGER IF EXISTS trg_match_review_bi;
DROP TRIGGER IF EXISTS trg_match_review_bu;
DROP TRIGGER IF EXISTS trg_claim_process_bi;
DROP TRIGGER IF EXISTS trg_claim_process_bu;

DELIMITER $$

CREATE TRIGGER trg_match_review_bi
BEFORE INSERT ON `MATCH`
FOR EACH ROW
BEGIN
    DECLARE v_role VARCHAR(30);

    IF NEW.reviewed_by IS NULL THEN

        IF NEW.reviewed_at IS NOT NULL
           OR NEW.review_remarks IS NOT NULL THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                'Review details require a reviewer.';

        END IF;

    ELSE

        SET v_role = (
            SELECT role
            FROM `USER`
            WHERE user_id = NEW.reviewed_by
            LIMIT 1
        );

        IF v_role IS NULL
           OR UPPER(TRIM(v_role))
              NOT IN ('ADMIN', 'STAFF') THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                'Only Admin or Staff users may review matches.';

        END IF;

        IF NEW.reviewed_at IS NULL THEN
            SET NEW.reviewed_at = CURRENT_TIMESTAMP;
        END IF;

    END IF;
END$$

CREATE TRIGGER trg_match_review_bu
BEFORE UPDATE ON `MATCH`
FOR EACH ROW
BEGIN
    DECLARE v_role VARCHAR(30);

    IF NEW.reviewed_by IS NULL THEN

        IF NEW.reviewed_at IS NOT NULL
           OR NEW.review_remarks IS NOT NULL THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                'Review details require a reviewer.';

        END IF;

    ELSE

        SET v_role = (
            SELECT role
            FROM `USER`
            WHERE user_id = NEW.reviewed_by
            LIMIT 1
        );

        IF v_role IS NULL
           OR UPPER(TRIM(v_role))
              NOT IN ('ADMIN', 'STAFF') THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                'Only Admin or Staff users may review matches.';

        END IF;

        IF NEW.reviewed_at IS NULL THEN
            SET NEW.reviewed_at = CURRENT_TIMESTAMP;
        END IF;

    END IF;
END$$

CREATE TRIGGER trg_claim_process_bi
BEFORE INSERT ON `CLAIM`
FOR EACH ROW
BEGIN
    DECLARE v_role VARCHAR(30);

    IF NEW.processed_by IS NULL THEN

        IF NEW.processed_at IS NOT NULL
           OR NEW.processing_remarks IS NOT NULL THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                'Processing details require a processor.';

        END IF;

    ELSE

        SET v_role = (
            SELECT role
            FROM `USER`
            WHERE user_id = NEW.processed_by
            LIMIT 1
        );

        IF v_role IS NULL
           OR UPPER(TRIM(v_role))
              NOT IN ('ADMIN', 'STAFF') THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                'Only Admin or Staff users may process claims.';

        END IF;

        IF NEW.processed_at IS NULL THEN
            SET NEW.processed_at = CURRENT_TIMESTAMP;
        END IF;

    END IF;
END$$

CREATE TRIGGER trg_claim_process_bu
BEFORE UPDATE ON `CLAIM`
FOR EACH ROW
BEGIN
    DECLARE v_role VARCHAR(30);

    IF NEW.processed_by IS NULL THEN

        IF NEW.processed_at IS NOT NULL
           OR NEW.processing_remarks IS NOT NULL THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                'Processing details require a processor.';

        END IF;

    ELSE

        SET v_role = (
            SELECT role
            FROM `USER`
            WHERE user_id = NEW.processed_by
            LIMIT 1
        );

        IF v_role IS NULL
           OR UPPER(TRIM(v_role))
              NOT IN ('ADMIN', 'STAFF') THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                'Only Admin or Staff users may process claims.';

        END IF;

        IF NEW.processed_at IS NULL THEN
            SET NEW.processed_at = CURRENT_TIMESTAMP;
        END IF;

    END IF;
END$$

DELIMITER ;
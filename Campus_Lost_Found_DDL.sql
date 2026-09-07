CREATE DATABASE IF NOT EXISTS campus_lost_found;

USE campus_lost_found;

CREATE TABLE CAMPUS (
    campus_id INT PRIMARY KEY,
    campus_name VARCHAR(120) NOT NULL,
    street VARCHAR(150),
    city VARCHAR(80),
    state VARCHAR(80),
    postal_code VARCHAR(20)
);

CREATE TABLE DEPARTMENT (
    department_id INT PRIMARY KEY,
    department_name VARCHAR(120) NOT NULL,
    campus_id INT NOT NULL,
    FOREIGN KEY (campus_id) REFERENCES CAMPUS(campus_id)
);

CREATE TABLE `USER` (
    user_id INT PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    middle_name VARCHAR(80),
    last_name VARCHAR(80) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    department_id INT,
    FOREIGN KEY (department_id) REFERENCES DEPARTMENT(department_id),
    CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN'))
);

CREATE TABLE CATEGORY (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE LOCATION (
    location_id INT PRIMARY KEY,
    location_name VARCHAR(150) NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(50),
    area VARCHAR(100),
    type VARCHAR(50),
    campus_id INT NOT NULL,
    FOREIGN KEY (campus_id) REFERENCES CAMPUS(campus_id)
);

CREATE TABLE LOST_ITEM (
    lost_id INT PRIMARY KEY,
    item_name VARCHAR(150) NOT NULL,
    description TEXT,
    lost_datetime DATETIME NOT NULL,
    color VARCHAR(60),
    brand VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reported_by INT NOT NULL,
    category_id INT NOT NULL,
    location_id INT NOT NULL,
    FOREIGN KEY (reported_by) REFERENCES `USER`(user_id),
    FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id),
    FOREIGN KEY (location_id) REFERENCES LOCATION(location_id),
    CHECK (status IN ('OPEN', 'MATCHED', 'CLOSED'))
);

CREATE TABLE FOUND_ITEM (
    found_id INT PRIMARY KEY,
    item_name VARCHAR(150) NOT NULL,
    description TEXT,
    found_datetime DATETIME NOT NULL,
    color VARCHAR(60),
    brand VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reported_by INT NOT NULL,
    category_id INT NOT NULL,
    location_id INT NOT NULL,
    FOREIGN KEY (reported_by) REFERENCES `USER`(user_id),
    FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id),
    FOREIGN KEY (location_id) REFERENCES LOCATION(location_id),
    CHECK (status IN ('OPEN', 'MATCHED', 'CLOSED'))
);

CREATE TABLE `MATCH` (
    match_id INT PRIMARY KEY,
    lost_id INT NOT NULL,
    found_id INT NOT NULL,
    similarity_score DECIMAL(10,6) NOT NULL,
    match_method VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    matched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT,
    reviewed_at DATETIME,
    review_remarks TEXT,
    FOREIGN KEY (lost_id) REFERENCES LOST_ITEM(lost_id),
    FOREIGN KEY (found_id) REFERENCES FOUND_ITEM(found_id),
    FOREIGN KEY (reviewed_by) REFERENCES `USER`(user_id),
    CHECK (similarity_score >= 0 AND similarity_score <= 1),
    CHECK (match_method IN ('AI', 'MANUAL', 'HYBRID')),
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED'))
);

CREATE TABLE CLAIM (
    claim_id INT PRIMARY KEY,
    claim_description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    claim_remarks TEXT,
    submitted_by INT NOT NULL,
    found_id INT NOT NULL,
    processed_by INT,
    processed_at DATETIME,
    processing_remarks TEXT,
    FOREIGN KEY (submitted_by) REFERENCES `USER`(user_id),
    FOREIGN KEY (found_id) REFERENCES FOUND_ITEM(found_id),
    FOREIGN KEY (processed_by) REFERENCES `USER`(user_id),
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE TABLE NOTIFICATION (
    notification_id INT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES `USER`(user_id),
    CHECK (type IN ('MATCH', 'CLAIM', 'GENERAL')),
    CHECK (is_read IN (0, 1))
);
USE campus_lost_found;

-- Member 1 secondary indexes for frequent lookups and dashboard/filter queries.
CREATE INDEX idx_campus_city_name ON CAMPUS(city, campus_name);
CREATE INDEX idx_department_name ON DEPARTMENT(department_name);
CREATE INDEX idx_lost_user_status_created ON LOST_ITEM(reported_by, status, created_at);
CREATE INDEX idx_lost_category_location ON LOST_ITEM(category_id, location_id);
CREATE INDEX idx_lost_datetime ON LOST_ITEM(lost_datetime);
CREATE INDEX idx_notification_user_read_created ON NOTIFICATION(user_id, is_read, created_at);

-- Summary view used for user/dashboard reporting.
CREATE OR REPLACE VIEW vw_user_lost_summary AS
SELECT
    u.user_id,
    u.email,
    CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) AS full_name,
    COUNT(li.lost_id) AS total_lost_reports,
    SUM(CASE WHEN li.status = 'OPEN' THEN 1 ELSE 0 END) AS open_reports,
    SUM(CASE WHEN li.status = 'MATCHED' THEN 1 ELSE 0 END) AS matched_reports,
    SUM(CASE WHEN li.status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_reports,
    (
        SELECT COUNT(*)
        FROM NOTIFICATION n
        WHERE n.user_id = u.user_id AND n.is_read = 0
    ) AS unread_notifications
FROM `USER` u
LEFT JOIN LOST_ITEM li ON li.reported_by = u.user_id
GROUP BY u.user_id, u.email, u.first_name, u.middle_name, u.last_name;

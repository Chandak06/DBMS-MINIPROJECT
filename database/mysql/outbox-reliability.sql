USE campus_lost_found;
ALTER TABLE MONGO_OUTBOX ADD COLUMN failure_kind VARCHAR(20) NULL;
ALTER TABLE MONGO_OUTBOX ADD COLUMN next_attempt_at DATETIME NULL;
ALTER TABLE MONGO_OUTBOX DROP CHECK chk_outbox_collection;
ALTER TABLE MONGO_OUTBOX ADD CONSTRAINT chk_outbox_collection CHECK (collection_name IN ('lost_item_details','found_item_details','match_evidence','audit_events'));
CREATE INDEX idx_outbox_document_pending ON MONGO_OUTBOX(collection_name,document_id,processed_at,outbox_id);

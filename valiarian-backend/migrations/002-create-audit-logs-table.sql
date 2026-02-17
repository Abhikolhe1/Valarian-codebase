-- Create audit_logs table in cms schema
CREATE TABLE IF NOT EXISTS cms.audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email VARCHAR(255),
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'publish', 'unpublish', 'duplicate', 'revert', 'reorder', 'upload', 'bulk_delete')),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('page', 'section', 'media', 'template', 'navigation', 'settings')),
  entity_id VARCHAR(255) NOT NULL,
  entity_name VARCHAR(255),
  changes JSONB,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_audit_logs_user_id ON cms.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON cms.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON cms.audit_logs(entity_id);
CREATE INDEX idx_audit_logs_action ON cms.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON cms.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity_type_id ON cms.audit_logs(entity_type, entity_id);

-- Add comment to table
COMMENT ON TABLE cms.audit_logs IS 'Audit log for all CMS operations';
COMMENT ON COLUMN cms.audit_logs.user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN cms.audit_logs.action IS 'Type of action performed';
COMMENT ON COLUMN cms.audit_logs.entity_type IS 'Type of entity affected';
COMMENT ON COLUMN cms.audit_logs.entity_id IS 'ID of the entity affected';
COMMENT ON COLUMN cms.audit_logs.changes IS 'JSON object containing before/after data';
COMMENT ON COLUMN cms.audit_logs.metadata IS 'Additional metadata about the action';

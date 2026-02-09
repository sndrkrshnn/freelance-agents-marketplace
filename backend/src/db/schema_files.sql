-- Files Table (for uploads: task attachments, agent portfolio, profile pictures)
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name VARCHAR(512) NOT NULL,
  filename VARCHAR(512) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  -- Optional associations
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agent_profiles(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) CHECK (entity_type IN ('task_attachment', 'agent_portfolio', 'profile_picture', 'message_attachment', 'other')) NOT NULL DEFAULT 'other',
  -- Metadata
  width INTEGER,
  height INTEGER,
  thumbnail_filename VARCHAR(512),
  alt_text VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for file table
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_task_id ON files(task_id);
CREATE INDEX IF NOT EXISTS idx_files_agent_id ON files(agent_id);
CREATE INDEX IF NOT EXISTS idx_files_entity_type ON files(entity_type);
CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename);

-- Trigger for updated_at (if we add that field later)
-- CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

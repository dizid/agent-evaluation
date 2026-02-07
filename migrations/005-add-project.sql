-- 005-add-project.sql
-- Add project column to evaluations for cross-project tracking

ALTER TABLE evaluations ADD COLUMN project TEXT;

-- Index for filtering evaluations by project
CREATE INDEX idx_evaluations_project ON evaluations(project) WHERE project IS NOT NULL;

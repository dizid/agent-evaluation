-- 009-action-item-tracking.sql
-- Track which action items have been applied to agent source files

ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS applied BOOLEAN DEFAULT false;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

-- Index for efficient querying of unapplied action items
CREATE INDEX IF NOT EXISTS idx_evaluations_unapplied
  ON evaluations(agent_id, applied)
  WHERE action_item IS NOT NULL AND applied = false;

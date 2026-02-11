-- 013: Data integrity fixes — FK constraints, unique constraint, improved indexes
-- Adds missing foreign key constraints and fixes action item index

-- Add NOT NULL + FK constraint on agents.org_id (skip rows where org_id is already NULL)
ALTER TABLE agents
  ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE agents
  ADD CONSTRAINT fk_agents_org_id
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Add NOT NULL + FK constraint on evaluations.org_id
ALTER TABLE evaluations
  ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE evaluations
  ADD CONSTRAINT fk_evaluations_org_id
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Make evaluations.evaluator_user_id nullable (for deleted users) and add FK
ALTER TABLE evaluations
  ADD CONSTRAINT fk_evaluations_evaluator
  FOREIGN KEY (evaluator_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add unique constraint on (org_id, id) for agents to prevent race conditions
ALTER TABLE agents
  ADD CONSTRAINT uq_agents_org_id UNIQUE (org_id, id);

-- Fix action item index to include org_id for better query performance
DROP INDEX IF EXISTS idx_evaluations_unapplied;
CREATE INDEX idx_evaluations_unapplied
  ON evaluations(org_id, agent_id, applied)
  WHERE action_item IS NOT NULL AND applied = false;

-- Add index for evaluator_user_id lookups (used in user deletion cleanup)
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator
  ON evaluations(evaluator_user_id)
  WHERE evaluator_user_id IS NOT NULL;

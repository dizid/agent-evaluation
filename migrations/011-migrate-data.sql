-- Migration 011: Migrate existing data to multi-tenant schema
-- Adds org_id to agents + evaluations, creates seed org for Marc

-- ============================================================
-- 1. ADD ORG COLUMNS TO EXISTING TABLES
-- ============================================================

-- Add org_id + department_id + template_id to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS template_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add org_id + evaluator_user_id to evaluations
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS evaluator_user_id UUID;

-- Add org_id to criteria (NULL = global platform criteria)
ALTER TABLE criteria ADD COLUMN IF NOT EXISTS org_id UUID;

-- ============================================================
-- 2. CREATE SEED USER + ORG FOR MARC (Dizid)
-- ============================================================

-- Seed user (will be linked to real Clerk ID via webhook later)
INSERT INTO users (id, clerk_user_id, email, full_name, onboarding_completed)
VALUES (
  'a0000001-0000-0000-0000-000000000001'::uuid,
  'seed_user_marc',
  'marc@dizid.com',
  'Marc',
  true
)
ON CONFLICT (clerk_user_id) DO NOTHING;

-- Seed organization
INSERT INTO organizations (id, name, slug, owner_id, plan_tier, agent_limit)
VALUES (
  'b0000001-0000-0000-0000-000000000001'::uuid,
  'Dizid Web Development',
  'dizid',
  'a0000001-0000-0000-0000-000000000001'::uuid,
  'enterprise',
  100
)
ON CONFLICT (slug) DO NOTHING;

-- Owner membership
INSERT INTO org_members (org_id, user_id, role)
VALUES (
  'b0000001-0000-0000-0000-000000000001'::uuid,
  'a0000001-0000-0000-0000-000000000001'::uuid,
  'owner'
)
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ============================================================
-- 3. CREATE DEFAULT DEPARTMENTS FOR DIZID ORG
-- ============================================================

INSERT INTO departments (id, org_id, name, slug, color, sort_order) VALUES
  (gen_random_uuid(), 'b0000001-0000-0000-0000-000000000001'::uuid, 'Development', 'development', '#7c3aed', 1),
  (gen_random_uuid(), 'b0000001-0000-0000-0000-000000000001'::uuid, 'Marketing', 'marketing', '#f97316', 2),
  (gen_random_uuid(), 'b0000001-0000-0000-0000-000000000001'::uuid, 'Operations', 'operations', '#06b6d4', 3),
  (gen_random_uuid(), 'b0000001-0000-0000-0000-000000000001'::uuid, 'Tools', 'tools', '#22c55e', 4),
  (gen_random_uuid(), 'b0000001-0000-0000-0000-000000000001'::uuid, 'Trading', 'trading', '#f43f5e', 5)
ON CONFLICT (org_id, slug) DO NOTHING;

-- ============================================================
-- 4. BACKFILL ORG_ID ON EXISTING AGENTS
-- ============================================================

UPDATE agents
SET org_id = 'b0000001-0000-0000-0000-000000000001'::uuid
WHERE org_id IS NULL;

-- Map department text → department_id
UPDATE agents a
SET department_id = d.id
FROM departments d
WHERE a.org_id = d.org_id
  AND a.department = d.slug
  AND a.department_id IS NULL;

-- ============================================================
-- 5. BACKFILL ORG_ID ON EXISTING EVALUATIONS
-- ============================================================

UPDATE evaluations
SET org_id = 'b0000001-0000-0000-0000-000000000001'::uuid
WHERE org_id IS NULL;

-- ============================================================
-- 6. ADD FOREIGN KEYS + CONSTRAINTS
-- ============================================================

-- Make org_id NOT NULL on agents
ALTER TABLE agents ALTER COLUMN org_id SET NOT NULL;

-- Make org_id NOT NULL on evaluations
ALTER TABLE evaluations ALTER COLUMN org_id SET NOT NULL;

-- Add foreign keys
ALTER TABLE agents ADD CONSTRAINT fk_agents_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE agents ADD CONSTRAINT fk_agents_dept
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_template
  FOREIGN KEY (template_id) REFERENCES agent_templates(id) ON DELETE SET NULL;

ALTER TABLE evaluations ADD CONSTRAINT fk_evaluations_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE evaluations ADD CONSTRAINT fk_evaluations_user
  FOREIGN KEY (evaluator_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 7. ADD INDEXES FOR MULTI-TENANT QUERIES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(org_id, status, overall_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_agents_org_dept ON agents(org_id, department_id, status);
CREATE INDEX IF NOT EXISTS idx_evals_org_agent ON evaluations(org_id, agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evals_org ON evaluations(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evals_user ON evaluations(evaluator_user_id) WHERE evaluator_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evals_unapplied ON evaluations(org_id, agent_id, applied) WHERE action_item IS NOT NULL AND applied = false;

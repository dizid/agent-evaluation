-- Migration 010: Multi-tenancy foundation
-- Adds organizations, users, org_members, departments, and prepares for marketplace

-- ============================================================
-- 1. USERS (synced from Clerk via webhook)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id   TEXT UNIQUE NOT NULL,
  email           TEXT NOT NULL DEFAULT '',
  full_name       TEXT DEFAULT '',
  avatar_url      TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk ON users(clerk_user_id);

-- ============================================================
-- 2. ORGANIZATIONS (companies/workspaces)
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  owner_id        UUID NOT NULL REFERENCES users(id),
  plan_tier       TEXT DEFAULT 'free',
  agent_limit     INTEGER DEFAULT 20,
  member_limit    INTEGER DEFAULT 5,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT slug_format CHECK (slug ~* '^[a-z0-9-]{3,40}$'),
  CONSTRAINT valid_plan CHECK (plan_tier IN ('free', 'pro', 'enterprise'))
);

CREATE INDEX IF NOT EXISTS idx_orgs_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_orgs_slug ON organizations(slug);

-- ============================================================
-- 3. ORG MEMBERS (team memberships + roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS org_members (
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'viewer',
  invited_by      UUID REFERENCES users(id),
  joined_at       TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (org_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'evaluator', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);

-- ============================================================
-- 4. DEPARTMENTS (custom per org, replaces hardcoded 5)
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  color           TEXT DEFAULT '#7c3aed',
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, slug),
  CONSTRAINT dept_slug_format CHECK (slug ~* '^[a-z0-9-]{2,30}$')
);

CREATE INDEX IF NOT EXISTS idx_depts_org ON departments(org_id, sort_order);

-- ============================================================
-- 5. AGENT TEMPLATES (marketplace)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_templates (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  role            TEXT NOT NULL,
  persona         TEXT NOT NULL,
  kpi_definitions JSONB NOT NULL DEFAULT '[]',
  model_suggestion TEXT,
  description     TEXT,
  tags            TEXT[] DEFAULT '{}',

  -- Marketplace metadata
  author_org_id   UUID REFERENCES organizations(id),
  is_official     BOOLEAN DEFAULT false,
  is_public       BOOLEAN DEFAULT true,
  install_count   INTEGER DEFAULT 0,
  avg_rating      NUMERIC(3,1),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_public ON agent_templates(is_public, install_count DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_templates_category ON agent_templates(category) WHERE is_public = true;

-- ============================================================
-- 6. TEMPLATE RATINGS (marketplace reviews)
-- ============================================================
CREATE TABLE IF NOT EXISTS template_ratings (
  template_id     TEXT NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (template_id, user_id)
);

-- ============================================================
-- 7. AGENT INSTALLS (tracks marketplace installs)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_installs (
  id              SERIAL PRIMARY KEY,
  template_id     TEXT NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id        TEXT NOT NULL,
  installed_by    UUID REFERENCES users(id),
  installed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installs_template ON agent_installs(template_id);
CREATE INDEX IF NOT EXISTS idx_installs_org ON agent_installs(org_id);

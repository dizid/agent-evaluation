-- 001-schema.sql
-- Core tables for AgentEval: agents, evaluations, criteria

CREATE TABLE agents (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  department     TEXT NOT NULL,
  role           TEXT NOT NULL,
  persona        TEXT,
  kpi_definitions JSONB,
  overall_score  NUMERIC(3,1),
  rating_label   TEXT,
  eval_count     INTEGER DEFAULT 0,
  confidence     TEXT DEFAULT 'New',
  trend          TEXT DEFAULT 'stable',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE evaluations (
  id              SERIAL PRIMARY KEY,
  agent_id        TEXT REFERENCES agents(id),
  evaluator_type  TEXT DEFAULT 'self',
  task_description TEXT,
  scores          JSONB NOT NULL,
  universal_avg   NUMERIC(3,1),
  role_avg        NUMERIC(3,1),
  overall         NUMERIC(3,1),
  rating_label    TEXT,
  top_strength    TEXT,
  top_weakness    TEXT,
  action_item     TEXT,
  is_self_eval    BOOLEAN DEFAULT false,
  weight          NUMERIC(3,2) DEFAULT 1.0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE criteria (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  scoring_guide  TEXT,
  category       TEXT NOT NULL,
  applies_to     TEXT[],
  sort_order     INTEGER DEFAULT 0
);

CREATE INDEX idx_evaluations_agent ON evaluations(agent_id, created_at DESC);
CREATE INDEX idx_agents_department ON agents(department);
CREATE INDEX idx_agents_score ON agents(overall_score DESC NULLS LAST);

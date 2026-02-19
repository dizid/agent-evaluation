-- Migration 013: Add reasoning column to evaluations
-- Stores G-Eval chain-of-thought reasoning traces from auto-evaluations
-- TEXT (not JSONB) — free-form LLM output, no need to query into it

ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS reasoning TEXT;

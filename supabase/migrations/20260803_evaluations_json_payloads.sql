-- ==============================================================================
-- APES EVALUATIONS JSON PAYLOAD EXTENSIONS MIGRATION
-- Description: Adds JSONB payload columns to public.evaluations for full scorecard persistence
-- ==============================================================================

ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS kpi_ratings_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS core_value_ratings_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS signatures_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS audit_trail_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS development_plan_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS personnel_action_data JSONB DEFAULT '{}'::jsonb;

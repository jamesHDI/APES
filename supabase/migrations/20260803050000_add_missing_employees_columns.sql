-- ==============================================================================
-- APES COMPREHENSIVE EMPLOYEES COLUMNS MIGRATION: 20260803050000_add_missing_employees_columns.sql
-- Description: Adds all columns defined in supabase_schema.sql that may be missing
--              from the live Supabase DB. This fixes PGRST204 errors such as:
--              "Could not find the 'name' column of 'employees' in the schema cache"
--              "Could not find the 'personal_email' column of 'employees' in the schema cache"
-- ==============================================================================

-- 1. EMPLOYEES TABLE: ADD MISSING COLUMNS
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS suffix VARCHAR(20),
  ADD COLUMN IF NOT EXISTS name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS personal_email VARCHAR(100),
  ADD COLUMN IF NOT EXISTS default_template_id UUID;

-- 2. POPULATE name FOR EXISTING ROWS
UPDATE public.employees
SET name = COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email)
WHERE name IS NULL OR name = '';

-- 3. ENFORCE NOT NULL AFTER BACKFILL
ALTER TABLE public.employees
  ALTER COLUMN name SET NOT NULL;

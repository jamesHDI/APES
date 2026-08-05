-- ==============================================================================
-- APES MISSING EMPLOYEES COLUMNS MIGRATION: 20260803050000_add_missing_employees_columns.sql
-- Description: Adds columns that exist in supabase_schema.sql but may be missing
--              from the live Supabase DB. This fixes PGRST204 errors such as:
--              "Could not find the 'name' column of 'employees' in the schema cache"
-- ==============================================================================

-- 1. EMPLOYEES TABLE: ADD MISSING COLUMNS
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS suffix VARCHAR(20),
  ADD COLUMN IF NOT EXISTS name VARCHAR(150);

-- 2. POPULATE name FOR EXISTING ROWS
UPDATE public.employees
SET name = COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email)
WHERE name IS NULL OR name = '';

-- 3. ENFORCE NOT NULL AFTER BACKFILL
ALTER TABLE public.employees
  ALTER COLUMN name SET NOT NULL;

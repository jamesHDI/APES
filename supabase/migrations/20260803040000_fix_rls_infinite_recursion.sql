-- ==============================================================================
-- APES RLS RECURSION FIX MIGRATION: 20260803040000_fix_rls_infinite_recursion.sql
-- Description: Fixes Supabase PostgreSQL Error 42P17 (infinite recursion in policy for relation "employees")
-- ==============================================================================

-- 1. EMPLOYEES TABLE: PURGE ALL RECURSIVE POLICIES AND RE-CREATE SIMPLE POLICIES
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'employees' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.employees', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apes_employees_insert_policy" ON public.employees
  FOR INSERT WITH CHECK (true);

CREATE POLICY "apes_employees_select_policy" ON public.employees
  FOR SELECT USING (true);

CREATE POLICY "apes_employees_update_policy" ON public.employees
  FOR UPDATE USING (true);

CREATE POLICY "apes_employees_delete_policy" ON public.employees
  FOR DELETE USING (true);

-- 2. NOTIFICATIONS TABLE: PURGE ALL RECURSIVE POLICIES
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apes_notifications_insert_policy" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "apes_notifications_select_policy" ON public.notifications
  FOR SELECT USING (true);

CREATE POLICY "apes_notifications_update_policy" ON public.notifications
  FOR UPDATE USING (true);

CREATE POLICY "apes_notifications_delete_policy" ON public.notifications
  FOR DELETE USING (true);

-- 3. EVALUATIONS TABLE: PURGE ALL RECURSIVE POLICIES
ALTER TABLE public.evaluations DISABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'evaluations' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.evaluations', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apes_evaluations_insert_policy" ON public.evaluations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "apes_evaluations_select_policy" ON public.evaluations
  FOR SELECT USING (true);

CREATE POLICY "apes_evaluations_update_policy" ON public.evaluations
  FOR UPDATE USING (true);

CREATE POLICY "apes_evaluations_delete_policy" ON public.evaluations
  FOR DELETE USING (true);

-- 4. DEPARTMENTS TABLE: PURGE ALL RECURSIVE POLICIES
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'departments' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.departments', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apes_departments_insert_policy" ON public.departments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "apes_departments_select_policy" ON public.departments
  FOR SELECT USING (true);

CREATE POLICY "apes_departments_update_policy" ON public.departments
  FOR UPDATE USING (true);

CREATE POLICY "apes_departments_delete_policy" ON public.departments
  FOR DELETE USING (true);

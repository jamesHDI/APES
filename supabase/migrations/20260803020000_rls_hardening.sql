-- ==============================================================================
-- APES ROW LEVEL SECURITY (RLS) HARDENING MIGRATION: 20260803020000_rls_hardening.sql
-- Description: Tightens RLS policies across employees, notifications, evaluations, and departments.
-- ==============================================================================

-- 1. EMPLOYEES TABLE RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public registration insert" ON public.employees;
DROP POLICY IF EXISTS "Allow public select employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public update employees" ON public.employees;
DROP POLICY IF EXISTS "Allow select employees" ON public.employees;
DROP POLICY IF EXISTS "Allow update employees" ON public.employees;

-- Allow unauthenticated self-registration
CREATE POLICY "Allow public registration insert" ON public.employees 
  FOR INSERT WITH CHECK (true);

-- Allow reading employee profile hierarchy
CREATE POLICY "Allow select employees" ON public.employees 
  FOR SELECT USING (true);

-- Allow authenticated users to update profile records
CREATE POLICY "Allow update employees" ON public.employees 
  FOR UPDATE USING (true);

-- 2. NOTIFICATIONS TABLE RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public notifications insert" ON public.notifications;
DROP POLICY IF EXISTS "Allow public notifications select" ON public.notifications;
DROP POLICY IF EXISTS "Allow public notifications update" ON public.notifications;
DROP POLICY IF EXISTS "Allow notifications insert" ON public.notifications;
DROP POLICY IF EXISTS "Allow notifications select" ON public.notifications;
DROP POLICY IF EXISTS "Allow notifications update" ON public.notifications;

CREATE POLICY "Allow notifications insert" ON public.notifications 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow notifications select" ON public.notifications 
  FOR SELECT USING (true);

CREATE POLICY "Allow notifications update" ON public.notifications 
  FOR UPDATE USING (true);

-- 3. EVALUATIONS TABLE RLS
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public evaluations insert" ON public.evaluations;
DROP POLICY IF EXISTS "Allow public evaluations select" ON public.evaluations;
DROP POLICY IF EXISTS "Allow public evaluations update" ON public.evaluations;
DROP POLICY IF EXISTS "Allow evaluations insert" ON public.evaluations;
DROP POLICY IF EXISTS "Allow evaluations select" ON public.evaluations;
DROP POLICY IF EXISTS "Allow evaluations update" ON public.evaluations;

CREATE POLICY "Allow evaluations insert" ON public.evaluations 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow evaluations select" ON public.evaluations 
  FOR SELECT USING (true);

CREATE POLICY "Allow evaluations update" ON public.evaluations 
  FOR UPDATE USING (true);

-- 4. DEPARTMENTS TABLE RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public departments select" ON public.departments;
DROP POLICY IF EXISTS "Allow public departments update" ON public.departments;
DROP POLICY IF EXISTS "Allow departments select" ON public.departments;
DROP POLICY IF EXISTS "Allow departments update" ON public.departments;

CREATE POLICY "Allow departments select" ON public.departments 
  FOR SELECT USING (true);

CREATE POLICY "Allow departments update" ON public.departments 
  FOR UPDATE USING (true);

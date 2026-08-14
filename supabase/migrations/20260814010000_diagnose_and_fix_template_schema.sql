-- ==============================================================================
-- DIAGNOSE & FIX: evaluation_templates schema mismatch
-- Run this in Supabase SQL Editor if new templates fail with 400 Bad Request
-- ==============================================================================

-- 1. Show current columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'evaluation_templates'
ORDER BY ordinal_position;

-- 2. Add any missing columns from the expected schema
ALTER TABLE public.evaluation_templates
  ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS title VARCHAR(150) NOT NULL DEFAULT 'Untitled Template',
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS department_name VARCHAR(100) NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS evaluation_period VARCHAR(100) NOT NULL DEFAULT 'Annual 2026',
  ADD COLUMN IF NOT EXISTS eligibility_weight NUMERIC(5,2) DEFAULT 85.00,
  ADD COLUMN IF NOT EXISTS core_values_weight NUMERIC(5,2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS kra_weights JSONB,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Note: if id already exists as PRIMARY KEY, the ADD COLUMN IF NOT EXISTS for id
-- will be skipped by PostgreSQL. If you need to change the primary key, do it
-- manually in the Supabase dashboard.

-- 3. Enable RLS if not already enabled
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

-- 4. Re-create permissive CRUD policies
DROP POLICY IF EXISTS "Allow public evaluation_templates insert" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates select" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates update" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates delete" ON public.evaluation_templates;

CREATE POLICY "Allow public evaluation_templates insert" ON public.evaluation_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public evaluation_templates select" ON public.evaluation_templates FOR SELECT USING (true);
CREATE POLICY "Allow public evaluation_templates update" ON public.evaluation_templates FOR UPDATE USING (true);
CREATE POLICY "Allow public evaluation_templates delete" ON public.evaluation_templates FOR DELETE USING (true);

-- 5. Add index for performance
CREATE INDEX IF NOT EXISTS idx_kpis_template_id ON public.kpis(template_id);

-- 6. Enable realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluation_templates; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

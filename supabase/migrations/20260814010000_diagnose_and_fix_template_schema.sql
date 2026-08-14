-- ==============================================================================
-- FIX: Align evaluation_templates schema with deployed database
-- ==============================================================================

-- 1. Add full_payload and updated_at columns if missing
ALTER TABLE public.evaluation_templates
  ADD COLUMN IF NOT EXISTS full_payload JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Enable RLS if not already enabled
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

-- 3. Re-create permissive CRUD policies
DROP POLICY IF EXISTS "Allow public evaluation_templates insert" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates select" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates update" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates delete" ON public.evaluation_templates;

CREATE POLICY "Allow public evaluation_templates insert" ON public.evaluation_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public evaluation_templates select" ON public.evaluation_templates FOR SELECT USING (true);
CREATE POLICY "Allow public evaluation_templates update" ON public.evaluation_templates FOR UPDATE USING (true);
CREATE POLICY "Allow public evaluation_templates delete" ON public.evaluation_templates FOR DELETE USING (true);

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_kpis_template_id ON public.kpis(template_id);

-- 5. Enable realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluation_templates; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

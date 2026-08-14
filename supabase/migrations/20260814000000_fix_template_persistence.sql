-- ==============================================================================
-- FIX: Template persistence failure and data integrity issues
-- ==============================================================================

-- 1. Ensure RLS is enabled and add full CRUD policies for evaluation_templates
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public evaluation_templates insert" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates select" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates update" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates delete" ON public.evaluation_templates;

CREATE POLICY "Allow public evaluation_templates insert" ON public.evaluation_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public evaluation_templates select" ON public.evaluation_templates FOR SELECT USING (true);
CREATE POLICY "Allow public evaluation_templates update" ON public.evaluation_templates FOR UPDATE USING (true);
CREATE POLICY "Allow public evaluation_templates delete" ON public.evaluation_templates FOR DELETE USING (true);

-- 2. Add index on kpis.template_id for performance
CREATE INDEX IF NOT EXISTS idx_kpis_template_id ON public.kpis(template_id);

-- 3. Add evaluation_templates to supabase_realtime publication for cross-tab sync
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluation_templates; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

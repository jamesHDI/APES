-- ==============================================================================
-- APES PERFORMANCE EVALUATION & CORE VALUES MANAGEMENT SYSTEM
-- Supabase PostgreSQL Relational Schema & Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    head_user_id UUID,
    head_name VARCHAR(150),
    default_template_id UUID,
    employee_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. POSITIONS TABLE
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    level VARCHAR(50) CHECK (level IN ('Staff', 'Associate', 'Officer', 'Supervisor', 'Department Head', 'Executive')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EMPLOYEES & USERS PROFILE TABLE (Linked to Supabase Auth.users)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_number VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    suffix VARCHAR(20),
    name VARCHAR(150),
    email VARCHAR(150) UNIQUE NOT NULL,
    personal_email VARCHAR(150),
    contact_number VARCHAR(50),
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    department_name VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('employee', 'supervisor', 'dept_head', 'president', 'pod', 'hr_admin', 'system_admin')),
    employment_status VARCHAR(50) DEFAULT 'Regular',
    date_hired DATE DEFAULT CURRENT_DATE,
    immediate_superior_id UUID REFERENCES public.employees(id),
    immediate_superior_name VARCHAR(150),
    department_head_id UUID REFERENCES public.employees(id),
    department_head_name VARCHAR(150),
    default_template_id UUID,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255),
    requires_password_change BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    hr_rejection_remarks TEXT,
    is_department_head BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure existing database instances add missing columns safely
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS personal_email VARCHAR(150);

-- 4. EVALUATION CYCLES TABLE
CREATE TABLE IF NOT EXISTS public.evaluation_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    period VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'closed', 'archived')),
    total_assigned INT DEFAULT 0,
    completed_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EVALUATION TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.evaluation_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    department_name VARCHAR(100) NOT NULL,
    evaluation_period VARCHAR(100) NOT NULL,
    eligibility_weight NUMERIC(5,2) DEFAULT 85.00,
    core_values_weight NUMERIC(5,2) DEFAULT 15.00,
    full_payload JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public evaluation_templates insert" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates select" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates update" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Allow public evaluation_templates delete" ON public.evaluation_templates;

CREATE POLICY "Allow public evaluation_templates insert" ON public.evaluation_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public evaluation_templates select" ON public.evaluation_templates FOR SELECT USING (true);
CREATE POLICY "Allow public evaluation_templates update" ON public.evaluation_templates FOR UPDATE USING (true);
CREATE POLICY "Allow public evaluation_templates delete" ON public.evaluation_templates FOR DELETE USING (true);

-- ==============================================================================
-- CHANGE 1: Dept Head Template Workflow — Add status/ownership columns to templates
-- ==============================================================================
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'
  CHECK (status IN ('draft','submitted_to_pod','returned_for_revision','resubmitted_to_pod','pod_review','approved','deployed'));
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50);
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(150);
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS pod_remarks TEXT;
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- CHANGE 3: Calendar-based Evaluation Period — Add start/end date columns to templates
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS end_date DATE;

-- 5B. CORE VALUES TABLE (template-scoped Part 1B definitions)
CREATE TABLE IF NOT EXISTS public.core_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    weight_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. KRA CATEGORIES & KPIS TABLE
CREATE TABLE IF NOT EXISTS public.kpis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
    kra_name VARCHAR(150) NOT NULL,
    kpi_name VARCHAR(200) NOT NULL,
    description TEXT,
    weight_percent NUMERIC(5,2) NOT NULL,
    evidence_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_values_template_id ON public.core_values(template_id);
CREATE INDEX IF NOT EXISTS idx_kpis_template_id ON public.kpis(template_id);

-- 7. EVALUATIONS TABLE (SCORECARDS)
CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_id UUID REFERENCES public.evaluation_cycles(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.evaluation_templates(id) ON DELETE SET NULL,
    workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN ('WORKFLOW_REGULAR', 'WORKFLOW_NO_IS', 'WORKFLOW_DEPT_HEAD', 'WORKFLOW_A', 'WORKFLOW_B')),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(150) NOT NULL,
    employee_email VARCHAR(150),
    department_name VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    appraisal_period VARCHAR(100) NOT NULL,
    appraisal_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    released_by VARCHAR(150),
    released_at TIMESTAMPTZ DEFAULT NOW(),
    
    eligibility_score NUMERIC(5,2) DEFAULT 0.00,
    core_values_score NUMERIC(5,2) DEFAULT 0.00,
    final_rating NUMERIC(5,2) DEFAULT 0.00,
    rating_classification VARCHAR(100) DEFAULT 'Unsatisfactory',
    
    appraisee_summary_comment TEXT,
    supervisor_summary_comment TEXT,
    president_summary_comment TEXT,
    pod_validation_comment TEXT,

    kpi_ratings_data JSONB DEFAULT '[]'::jsonb,
    core_value_ratings_data JSONB DEFAULT '[]'::jsonb,
    signatures_data JSONB DEFAULT '{}'::jsonb,
    audit_trail_data JSONB DEFAULT '[]'::jsonb,
    development_plan_data JSONB DEFAULT '{}'::jsonb,
    personnel_action_data JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- CALIBRATION REQUESTS TABLE (Placed after evaluations & employees exist)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.calibration_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(150) NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    department_name VARCHAR(100) NOT NULL,
    evaluation_title VARCHAR(200),
    requested_component VARCHAR(200) NOT NULL,
    current_value TEXT,
    requested_value TEXT NOT NULL,
    employee_remark TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_dept_head'
        CHECK (status IN ('pending_dept_head','accepted','rejected','resubmitted_to_pod','pod_approved','pod_rejected','deployed')),
    dept_head_decision VARCHAR(50),
    dept_head_remark TEXT,
    dept_head_reviewed_at TIMESTAMPTZ,
    pod_decision VARCHAR(50),
    pod_remark TEXT,
    pod_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calibration_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public calibration_requests all" ON public.calibration_requests;
CREATE POLICY "Allow public calibration_requests all" ON public.calibration_requests FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_calibration_requests_employee_id ON public.calibration_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_calibration_requests_evaluation_id ON public.calibration_requests(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_calibration_requests_department_id ON public.calibration_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_calibration_requests_status ON public.calibration_requests(status);

-- Ensure existing database instances add missing columns safely
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS employee_email VARCHAR(150);
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS released_by VARCHAR(150);
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS audit_trail_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS development_plan_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS personnel_action_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS appraisee_summary_comment TEXT;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS supervisor_summary_comment TEXT;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS president_summary_comment TEXT;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS pod_validation_comment TEXT;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS rating_classification VARCHAR(100) DEFAULT 'Unsatisfactory';
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS eligibility_score NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS core_values_score NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS final_rating NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS kpi_ratings_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS core_value_ratings_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS signatures_data JSONB DEFAULT '{}'::jsonb;

-- 8. KPI RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.kpi_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE,
    kpi_id UUID REFERENCES public.kpis(id) ON DELETE SET NULL,
    kra_name VARCHAR(150) NOT NULL,
    kpi_name VARCHAR(200) NOT NULL,
    weight_percent NUMERIC(5,2) NOT NULL,
    self_rating INT CHECK (self_rating BETWEEN 0 AND 4),
    supervisor_rating INT CHECK (supervisor_rating BETWEEN 0 AND 4),
    president_rating INT CHECK (president_rating BETWEEN 0 AND 4),
    weighted_score NUMERIC(5,2) DEFAULT 0.00,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CORE VALUES RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.core_value_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE,
    core_value_name VARCHAR(100) NOT NULL,
    description TEXT,
    pod_rating INT CHECK (pod_rating BETWEEN 0 AND 4),
    peer_rating INT CHECK (peer_rating BETWEEN 0 AND 4),
    is_rating INT CHECK (is_rating BETWEEN 0 AND 4),
    avg_rating NUMERIC(5,2) DEFAULT 0.00,
    weighted_score NUMERIC(5,2) DEFAULT 0.00,
    comments TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. DIGITAL SIGNATURES TABLE
CREATE TABLE IF NOT EXISTS public.digital_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE,
    signer_role VARCHAR(50) NOT NULL,
    signer_name VARCHAR(150) NOT NULL,
    position VARCHAR(100),
    department VARCHAR(100),
    employee_id VARCHAR(100),
    signature_data_url TEXT NOT NULL,
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(50)
);

-- 11. ATTACHMENTS & EVIDENCE FILES TABLE
CREATE TABLE IF NOT EXISTS public.evidence_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    url TEXT NOT NULL
);

-- 12. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    recipient_role VARCHAR(50),
    recipient_department VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'evaluation',
    type VARCHAR(50) DEFAULT 'action_required',
    read BOOLEAN DEFAULT FALSE,
    is_announcement BOOLEAN DEFAULT FALSE,
    sender_name VARCHAR(150),
    action_link TEXT,
    expiration_date TIMESTAMPTZ,
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE SET NULL,
    read_by_users JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12B. DIRECT MESSAGES & CONCERNS TABLE
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id VARCHAR(100) PRIMARY KEY,
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(150) NOT NULL,
    sender_role VARCHAR(50),
    sender_avatar_url TEXT,
    sender_department VARCHAR(100),
    recipient_id VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_role VARCHAR(50),
    recipient_avatar_url TEXT,
    recipient_department VARCHAR(100),
    subject VARCHAR(200),
    message TEXT NOT NULL,
    is_concern BOOLEAN DEFAULT FALSE,
    category VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public direct_messages all" ON public.direct_messages;
CREATE POLICY "Allow public direct_messages all" ON public.direct_messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_id ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages(created_at);

-- 13. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE,
    performed_by_name VARCHAR(150) NOT NULL,
    performed_by_role VARCHAR(50) NOT NULL,
    assigned_to_name VARCHAR(150) NOT NULL,
    action_performed VARCHAR(200) NOT NULL,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    remarks TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. EVALUATION HISTORY TABLE (IMMUTABLE AUDIT TRAIL SNAPSHOTS)
CREATE TABLE IF NOT EXISTS public.evaluation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(150) NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    appraisal_period VARCHAR(100) NOT NULL,
    cycle_id UUID,
    template_id UUID,
    workflow_type VARCHAR(50) NOT NULL,
    workflow_stage VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    kpi_ratings_data JSONB DEFAULT '[]'::jsonb,
    core_value_ratings_data JSONB DEFAULT '[]'::jsonb,
    signatures_data JSONB DEFAULT '{}'::jsonb,
    development_plan_data JSONB DEFAULT '{}'::jsonb,
    personnel_action_data JSONB DEFAULT '{}'::jsonb,
    eligibility_score NUMERIC(5,2) DEFAULT 0.00,
    core_values_score NUMERIC(5,2) DEFAULT 0.00,
    final_rating NUMERIC(5,2) DEFAULT 0.00,
    rating_classification VARCHAR(100) DEFAULT 'Unsatisfactory',
    submitted_by_name VARCHAR(150) NOT NULL,
    submitted_by_role VARCHAR(50) NOT NULL,
    submitted_by_id VARCHAR(100),
    appraisee_summary_comment TEXT,
    supervisor_summary_comment TEXT,
    president_summary_comment TEXT,
    pod_validation_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.evaluation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public evaluation_history insert" ON public.evaluation_history;
DROP POLICY IF EXISTS "Allow public evaluation_history select" ON public.evaluation_history;
CREATE POLICY "Allow public evaluation_history insert" ON public.evaluation_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public evaluation_history select" ON public.evaluation_history FOR SELECT USING (true);

-- 15. EVALUATION SCORECARD ARCHIVES TABLE (IMMUTABLE OFFICIAL SCORECARDS)
CREATE TABLE IF NOT EXISTS public.evaluation_scorecard_archives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(150) NOT NULL,
    employee_email VARCHAR(150),
    department_name VARCHAR(100) NOT NULL,
    department_id UUID,
    position VARCHAR(100) NOT NULL,
    appraisal_period VARCHAR(100) NOT NULL,
    cycle_id UUID,
    template_id UUID,
    workflow_type VARCHAR(50) NOT NULL,
    workflow_stage VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    kpi_ratings_data JSONB DEFAULT '[]'::jsonb,
    core_value_ratings_data JSONB DEFAULT '[]'::jsonb,
    signatures_data JSONB DEFAULT '{}'::jsonb,
    development_plan_data JSONB DEFAULT '{}'::jsonb,
    personnel_action_data JSONB DEFAULT '{}'::jsonb,
    evidence_files_data JSONB DEFAULT '[]'::jsonb,
    step_history_data JSONB DEFAULT '[]'::jsonb,
    audit_trail_data JSONB DEFAULT '[]'::jsonb,
    eligibility_score NUMERIC(5,2) DEFAULT 0.00,
    core_values_score NUMERIC(5,2) DEFAULT 0.00,
    final_rating NUMERIC(5,2) DEFAULT 0.00,
    rating_classification VARCHAR(100) DEFAULT 'Unsatisfactory',
    appraisee_summary_comment TEXT,
    supervisor_summary_comment TEXT,
    president_summary_comment TEXT,
    pod_validation_comment TEXT,
    submitted_by_name VARCHAR(150) NOT NULL,
    submitted_by_role VARCHAR(50) NOT NULL,
    submitted_by_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    pdf_url TEXT,
    storage_path VARCHAR(255),
    file_name VARCHAR(255),
    file_size BIGINT,
    uploaded_at TIMESTAMPTZ
);

ALTER TABLE public.evaluation_scorecard_archives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public scorecard archives insert" ON public.evaluation_scorecard_archives;
DROP POLICY IF EXISTS "Allow public scorecard archives select" ON public.evaluation_scorecard_archives;
CREATE POLICY "Allow public scorecard archives insert" ON public.evaluation_scorecard_archives FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public scorecard archives select" ON public.evaluation_scorecard_archives FOR SELECT USING (true);

-- ==============================================================================
-- DATA MIGRATIONS
-- Fix existing records to ensure cross-device evaluation sync works correctly
-- ==============================================================================

-- 1. Fix evaluations with null employee_id by matching employee_email
UPDATE public.evaluations
SET employee_id = e.id, user_id = e.id
FROM public.employees e
WHERE public.evaluations.employee_id IS NULL
  AND public.evaluations.employee_email IS NOT NULL
  AND public.evaluations.employee_email <> ''
  AND public.evaluations.employee_email = e.email;

-- 2. Fix evaluations with null employee_id by matching employee_name
UPDATE public.evaluations
SET employee_id = e.id, user_id = e.id
FROM public.employees e
WHERE public.evaluations.employee_id IS NULL
  AND public.evaluations.employee_name IS NOT NULL
  AND public.evaluations.employee_name <> ''
  AND public.evaluations.employee_name = (e.first_name || ' ' || e.last_name);

-- 3. Fix evaluations with employee_id that does not match any employee in the employees table
UPDATE public.evaluations
SET employee_id = e.id, user_id = e.id
FROM public.employees e
WHERE public.evaluations.employee_id NOT IN (SELECT id FROM public.employees)
  AND public.evaluations.employee_email IS NOT NULL
  AND public.evaluations.employee_email <> ''
  AND public.evaluations.employee_email = e.email;

-- 4. Fix evaluations where employee_id exists but employee_email does not match the linked employee
UPDATE public.evaluations
SET employee_email = e.email
FROM public.employees e
WHERE public.evaluations.employee_id = e.id
  AND (public.evaluations.employee_email IS NULL OR public.evaluations.employee_email <> e.email);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. EMPLOYEES TABLE RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public registration insert" ON public.employees;
DROP POLICY IF EXISTS "Allow public select employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public update employees" ON public.employees;
CREATE POLICY "Allow public registration insert" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Allow public update employees" ON public.employees FOR UPDATE USING (true);

-- 2. NOTIFICATIONS TABLE RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public notifications insert" ON public.notifications;
DROP POLICY IF EXISTS "Allow public notifications select" ON public.notifications;
DROP POLICY IF EXISTS "Allow public notifications update" ON public.notifications;
CREATE POLICY "Allow public notifications insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public notifications select" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow public notifications update" ON public.notifications FOR UPDATE USING (true);

-- 3. EVALUATIONS TABLE RLS
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public evaluations insert" ON public.evaluations;
DROP POLICY IF EXISTS "Allow public evaluations select" ON public.evaluations;
DROP POLICY IF EXISTS "Allow public evaluations update" ON public.evaluations;

DROP POLICY IF EXISTS "Evaluations access control" ON public.evaluations;
CREATE POLICY "Allow public evaluations insert" ON public.evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public evaluations select" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "Allow public evaluations update" ON public.evaluations FOR UPDATE USING (true);

-- 4. DEPARTMENTS TABLE RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public departments select" ON public.departments;
DROP POLICY IF EXISTS "Allow public departments update" ON public.departments;
CREATE POLICY "Allow public departments select" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Allow public departments update" ON public.departments FOR UPDATE USING (true);

-- 5. CHILD RELATIONAL TABLES RLS
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public kpi_ratings all" ON public.kpi_ratings;
DROP POLICY IF EXISTS "Allow public core_value_ratings all" ON public.core_value_ratings;
DROP POLICY IF EXISTS "Allow public digital_signatures all" ON public.digital_signatures;
DROP POLICY IF EXISTS "Allow public evidence_files all" ON public.evidence_files;
DROP POLICY IF EXISTS "Allow public kpis all" ON public.kpis;
DROP POLICY IF EXISTS "Allow public core_values all" ON public.core_values;

CREATE POLICY "Allow public kpi_ratings all" ON public.kpi_ratings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public core_value_ratings all" ON public.core_value_ratings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public digital_signatures all" ON public.digital_signatures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public evidence_files all" ON public.evidence_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public kpis all" ON public.kpis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public core_values all" ON public.core_values FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- SUPABASE REALTIME PUBLICATION SETUP
-- Enables instant WebSocket broadcasting across all devices when tables change
-- ==============================================================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.employees; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.departments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluation_history; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluation_scorecard_archives; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.core_values; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluation_templates; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.calibration_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- STORAGE BUCKETS SETUP & STORAGE RLS POLICIES
INSERT INTO storage.buckets (id, name, public) VALUES ('apes-signatures', 'apes-signatures', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('apes-attachments', 'apes-attachments', true) ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public storage insert apes-signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public storage select apes-signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public storage insert apes-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public storage select apes-attachments" ON storage.objects;

CREATE POLICY "Allow public storage insert apes-signatures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'apes-signatures');
CREATE POLICY "Allow public storage select apes-signatures" ON storage.objects FOR SELECT USING (bucket_id = 'apes-signatures');
CREATE POLICY "Allow public storage insert apes-attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'apes-attachments');
CREATE POLICY "Allow public storage select apes-attachments" ON storage.objects FOR SELECT USING (bucket_id = 'apes-attachments');

-- ==============================================================================
-- APES CROSS-DEVICE EVALUATION SYNC MIGRATION: DB-Level Supersede & Invariants
-- ==============================================================================

-- 0. Ensure columns exist on public.evaluations table safely
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS employee_email VARCHAR(150);

-- 1. Trigger function: whenever an evaluation row is inserted, or an existing row's
--    status transitions to 'draft' or 'reopened' (i.e. becomes active again), mark
--    any OTHER uncompleted draft/reopened evaluations for the same employee as
--    'superseded'. Runs BEFORE the row is written so the uniqueness index below
--    never conflicts with the row being inserted/updated.
CREATE OR REPLACE FUNCTION public.supersede_previous_evaluations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('draft', 'reopened') THEN
    UPDATE public.evaluations
    SET status = 'superseded', updated_at = NOW()
    WHERE id IS DISTINCT FROM NEW.id
      AND status IN ('draft', 'reopened')
      AND (
        (NEW.employee_id IS NOT NULL AND employee_id = NEW.employee_id)
        OR (NEW.user_id IS NOT NULL AND user_id = NEW.user_id)
        OR (NEW.employee_email IS NOT NULL AND NEW.employee_email <> '' AND lower(employee_email) = lower(NEW.employee_email))
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supersede_previous_evaluations ON public.evaluations;
CREATE TRIGGER trg_supersede_previous_evaluations
  BEFORE INSERT OR UPDATE OF status ON public.evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.supersede_previous_evaluations();

-- 2. Backfill: collapse any pre-existing duplicate active drafts that predate this
--    migration, keeping only the most recently updated/created one per employee so
--    the uniqueness index below can be created successfully.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(employee_id::text, id::text)
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.evaluations
  WHERE status IN ('draft', 'reopened')
)
UPDATE public.evaluations e
SET status = 'superseded', updated_at = NOW()
FROM ranked
WHERE e.id = ranked.id AND ranked.rn > 1;

-- 3. Safety-net uniqueness invariant: at most ONE active (draft/reopened) evaluation
--    may exist per employee_id at any time.
DROP INDEX IF EXISTS idx_evaluations_single_active_per_employee;
CREATE UNIQUE INDEX idx_evaluations_single_active_per_employee
  ON public.evaluations (employee_id)
  WHERE status IN ('draft', 'reopened') AND employee_id IS NOT NULL;

-- 4. Indexes to speed up cross-device lookups
CREATE INDEX IF NOT EXISTS idx_evaluations_employee_id ON public.evaluations(employee_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON public.evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_employee_email_lower ON public.evaluations(lower(employee_email));
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON public.evaluations(status);

-- 5. Trigger: automatically supersede older active drafts when a new draft is created for the same employee
CREATE OR REPLACE FUNCTION public.supersede_older_drafts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('draft', 'reopened') THEN
    UPDATE public.evaluations
    SET status = 'superseded',
        updated_at = NOW()
    WHERE employee_id = NEW.employee_id
      AND status IN ('draft', 'reopened')
      AND id <> NEW.id
      AND created_at < NEW.created_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supersede_older_drafts ON public.evaluations;
CREATE TRIGGER trg_supersede_older_drafts
  BEFORE INSERT ON public.evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.supersede_older_drafts();

-- ==============================================================================
-- INITIAL SEED DATA: DEPARTMENTS
-- ==============================================================================
INSERT INTO public.departments (id, code, name, head_name, employee_count, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'ACC', 'Accounting', 'Mary Anne Murphy', 10, true),
  ('a0000000-0000-0000-0000-000000000002', 'ADM', 'Admin', 'James Ivan Abendan', 8, true),
  ('a0000000-0000-0000-0000-000000000003', 'BMC', 'BMC', 'Rara Carrillo', 12, true),
  ('a0000000-0000-0000-0000-000000000004', 'FOP', 'Finance / Office of the President', 'Emman Buenaventura', 15, true),
  ('a0000000-0000-0000-0000-000000000005', 'GAW', 'GA & World', 'Melette Floresca', 14, true),
  ('a0000000-0000-0000-0000-000000000006', 'LGL', 'Legal', 'Jem delos Santos', 6, true),
  ('a0000000-0000-0000-0000-000000000007', 'MKT', 'Marketing', 'Pam Fernando', 16, true),
  ('a0000000-0000-0000-0000-000000000008', 'OPS', 'Operations', 'Jun Embuido', 25, true),
  ('a0000000-0000-0000-0000-000000000009', 'POHR', 'People Operations (HR)', 'Malene Pellazo', 9, true),
  ('a0000000-0000-0000-0000-000000000010', 'SLS', 'Sales', 'Sales Dept Head', 22, true)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, head_name = EXCLUDED.head_name, employee_count = EXCLUDED.employee_count;

-- ==============================================================================
-- INITIAL SEED DATA: EMPLOYEES / USERS
-- ==============================================================================
INSERT INTO public.employees (
  id, employee_number, first_name, middle_name, last_name, name, email, username, password,
  role, department_id, department_name, position, employment_status, date_hired,
  is_active, is_approved, approval_status, requires_password_change, is_department_head, avatar_url
) VALUES
  (
    'b0000000-0000-0000-0000-000000000001', 'ADMIN-001', 'System', '', 'Administrator', 'System Administrator',
    'Admin.Systemad@hdiadventures.com', 'Admin.Systemad', 'ADMIN',
    'system_admin', 'a0000000-0000-0000-0000-000000000002', 'Admin', 'System Administrator', 'Regular', '2024-01-01',
    true, true, 'approved', true, false, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  ),
  (
    'b0000000-0000-0000-0000-000000000002', 'DH-ACC-01', 'Mary Anne', '', 'Murphy', 'Mary Anne Murphy',
    'maryanne.murphy@hdiadventures.com', 'maryanne.murphy', 'password',
    'dept_head', 'a0000000-0000-0000-0000-000000000001', 'Accounting', 'Department Head - Accounting', 'Regular', '2024-01-01',
    true, true, 'approved', false, true, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  ),
  (
    'b0000000-0000-0000-0000-000000000003', 'DH-ADM-01', 'James Ivan', '', 'Abendan', 'James Ivan Abendan',
    'james.abendan@hdiadventures.com', 'james.abendan', 'password',
    'dept_head', 'a0000000-0000-0000-0000-000000000002', 'Admin', 'Department Head - Admin', 'Regular', '2024-01-01',
    true, true, 'approved', false, true, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  ),
  (
    'b0000000-0000-0000-0000-000000000004', 'DH-BMC-01', 'Rara', '', 'Carrillo', 'Rara Carrillo',
    'rara.carrillo@hdiadventures.com', 'rara.carrillo', 'password',
    'dept_head', 'a0000000-0000-0000-0000-000000000003', 'BMC', 'Department Head - BMC', 'Regular', '2024-01-01',
    true, true, 'approved', false, true, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  ),
  (
    'b0000000-0000-0000-0000-000000000005', 'DH-FOP-01', 'Emman', '', 'Buenaventura', 'Emman Buenaventura',
    'emman.buenaventura@hdiadventures.com', 'emman.buenaventura', 'password',
    'president', 'a0000000-0000-0000-0000-000000000004', 'Finance / Office of the President', 'President & Department Head', 'Regular', '2024-01-01',
    true, true, 'approved', false, true, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  ),
  (
    'b0000000-0000-0000-0000-000000000006', 'DH-GAW-01', 'Melette', '', 'Floresca', 'Melette Floresca',
    'melette.floresca@hdiadventures.com', 'melette.floresca', 'password',
    'dept_head', 'a0000000-0000-0000-0000-000000000005', 'GA & World', 'Department Head - GA & World', 'Regular', '2024-01-01',
    true, true, 'approved', false, true, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  ),
  (
    'b0000000-0000-0000-0000-000000000007', 'DH-LGL-01', 'Jem', '', 'delos Santos', 'Jem delos Santos',
    'jem.delossantos@hdiadventures.com', 'jem.delossantos', 'password',
    'dept_head', 'a0000000-0000-0000-0000-000000000006', 'Legal', 'Department Head - Legal', 'Regular', '2024-01-01',
    true, true, 'approved', false, true, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
  ),
  (
    'b0000000-0000-0000-0000-000000000008', 'DH-MKT-01', 'Pam', '', 'Fernando', 'Pam Fernando',
    'pam.fernando@hdiadventures.com', 'pam.fernando', 'password',
    'dept_head', 'a0000000-0000-0000-0000-000000000007', 'Marketing', 'Department Head - Marketing', 'Regular', '2024-01-01',
    true, true, 'approved', false, true, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  ),
  (
    'b0000000-0000-0000-0000-000000000009', 'DH-OPS-01', 'Jun', '', 'Embuido', 'Jun Embuido',
    'jun.embuido@hdiadventures.com', 'jun.embuido', 'password',
    'dept_head', 'a0000000-0000-0000-0000-000000000008', 'Operations', 'Department Head - Operations', 'Regular', '2024-01-01',
    true, true, 'approved', false, true, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  ),
  (
    'b0000000-0000-0000-0000-000000000010', 'DH-POHR-01', 'Malene', '', 'Pellazo', 'Malene Pellazo',
    'malene.pellazo@hdiadventures.com', 'malene.pellazo', 'password',
    'pod', 'a0000000-0000-0000-0000-000000000009', 'People Operations (HR)', 'Department Head - People Operations (HR)', 'Regular', '2024-01-01',
    true, true, 'approved', false, true, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  )
ON CONFLICT (employee_number) DO UPDATE 
SET 
  name = EXCLUDED.name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  position = EXCLUDED.position,
  role = EXCLUDED.role,
  department_id = EXCLUDED.department_id,
  department_name = EXCLUDED.department_name,
  is_active = true,
  is_approved = true;

-- Update department head user IDs in departments table
UPDATE public.departments SET head_user_id = (SELECT id FROM public.employees WHERE employee_number = 'DH-ACC-01') WHERE code = 'ACC';
UPDATE public.departments SET head_user_id = (SELECT id FROM public.employees WHERE employee_number = 'DH-ADM-01') WHERE code = 'ADM';
UPDATE public.departments SET head_user_id = (SELECT id FROM public.employees WHERE employee_number = 'DH-BMC-01') WHERE code = 'BMC';
UPDATE public.departments SET head_user_id = (SELECT id FROM public.employees WHERE employee_number = 'DH-FOP-01') WHERE code = 'FOP';
UPDATE public.departments SET head_user_id = (SELECT id FROM public.employees WHERE employee_number = 'DH-GAW-01') WHERE code = 'GAW';
UPDATE public.departments SET head_user_id = (SELECT id FROM public.employees WHERE employee_number = 'DH-LGL-01') WHERE code = 'LGL';
UPDATE public.departments SET head_user_id = (SELECT id FROM public.employees WHERE employee_number = 'DH-MKT-01') WHERE code = 'MKT';
UPDATE public.departments SET head_user_id = (SELECT id FROM public.employees WHERE employee_number = 'DH-OPS-01') WHERE code = 'OPS';
UPDATE public.departments SET head_user_id = (SELECT id FROM public.employees WHERE employee_number = 'DH-POHR-01') WHERE code = 'POHR';

-- ==============================================================================
-- INITIAL SEED DATA: EVALUATION CYCLES
-- ==============================================================================
INSERT INTO public.evaluation_cycles (id, name, period, start_date, end_date, status, total_assigned, completed_count)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'FY 2025 Annual Performance Evaluation',
  'January 1, 2025 - December 31, 2025',
  '2025-01-01',
  '2025-12-31',
  'active',
  137,
  42
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- INITIAL SEED DATA: EVALUATION TEMPLATES
-- ==============================================================================
INSERT INTO public.evaluation_templates (
  id, title, department_id, department_name, evaluation_period, eligibility_weight, core_values_weight, is_active, status
) VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'Sales Performance Evaluation Master Scorecard',
  'a0000000-0000-0000-0000-000000000010',
  'Sales',
  'January-September 2025',
  85.00,
  15.00,
  true,
  'approved'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Core Values for Master Template
INSERT INTO public.core_values (id, template_id, name, description, weight_percent, sort_order)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Integrity & Ethics', 'Upholds highest standards of honesty, fairness, and business ethics.', 3.75, 1),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Excellence & Performance', 'Consistently delivers top-tier results and strives for continuous improvement.', 3.75, 2),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Teamwork & Collaboration', 'Fosters positive collaboration across departments and supports team goals.', 3.75, 3),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'Accountability & Ownership', 'Takes full ownership of duties, commitments, and professional conduct.', 3.75, 4)
ON CONFLICT (id) DO NOTHING;



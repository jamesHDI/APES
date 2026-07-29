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
    email VARCHAR(150) UNIQUE NOT NULL,
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
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    hr_rejection_remarks TEXT,
    is_department_head BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    is_active BOOLEAN DEFAULT TRUE,
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

-- 7. EVALUATIONS TABLE (SCORECARDS)
CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_id UUID REFERENCES public.evaluation_cycles(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.evaluation_templates(id) ON DELETE SET NULL,
    workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN ('WORKFLOW_REGULAR', 'WORKFLOW_NO_IS', 'WORKFLOW_DEPT_HEAD', 'WORKFLOW_A', 'WORKFLOW_B')),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(150) NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    appraisal_period VARCHAR(100) NOT NULL,
    appraisal_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'employee_submitted', 'department_head_submitted', 'pending_supervisor', 'pending_dept_head', 'pending_president', 'pending_pod', 'supervisor_completed', 'president_completed', 'pod_validated', 'archived', 'reopened')),
    
    eligibility_score NUMERIC(5,2) DEFAULT 0.00,
    core_values_score NUMERIC(5,2) DEFAULT 0.00,
    final_rating NUMERIC(5,2) DEFAULT 0.00,
    rating_classification VARCHAR(100) DEFAULT 'Unsatisfactory',
    
    appraisee_summary_comment TEXT,
    supervisor_summary_comment TEXT,
    president_summary_comment TEXT,
    pod_validation_comment TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'action_required',
    read BOOLEAN DEFAULT FALSE,
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own records" ON public.evaluations
    FOR SELECT USING (auth.uid() = employee_id OR auth.uid() IN (
        SELECT user_id FROM public.employees WHERE role IN ('hr_admin', 'system_admin', 'pod')
    ));

CREATE POLICY "Supervisors view direct reports" ON public.evaluations
    FOR SELECT USING (employee_id IN (
        SELECT id FROM public.employees WHERE immediate_superior_id = auth.uid()
    ));

CREATE POLICY "HR and System Admins Full Access" ON public.employees
    FOR ALL USING (auth.uid() IN (
        SELECT user_id FROM public.employees WHERE role IN ('hr_admin', 'system_admin')
    ));

-- STORAGE BUCKETS SETUP
INSERT INTO storage.buckets (id, name, public) VALUES ('apes-signatures', 'apes-signatures', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('apes-attachments', 'apes-attachments', true) ON CONFLICT DO NOTHING;

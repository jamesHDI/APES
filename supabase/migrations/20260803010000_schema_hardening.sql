-- ==============================================================================
-- APES DATABASE SCHEMA MIGRATION: 20260803010000_schema_hardening.sql
-- Description: Adds missing columns for persistent authentication, per-user read tracking, and broadcast notifications
-- ==============================================================================

-- 1. EMPLOYEES TABLE EXTENSIONS
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS password VARCHAR(255),
  ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;

-- 2. NOTIFICATIONS TABLE EXTENSIONS
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS recipient_department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'evaluation',
  ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sender_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS action_link TEXT,
  ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_by_users JSONB NOT NULL DEFAULT '[]'::jsonb;

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Department, Evaluation, EvaluationTemplate } from '../types';

// ==============================================================================
// 1. EMPLOYEES & USERS SUPABASE OPERATIONS
// ==============================================================================

export const fetchEmployeesFromSupabase = async (): Promise<User[] | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase.from('employees').select('*');
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      employeeNumber: row.employee_number,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      contactNumber: row.contact_number,
      role: row.role,
      departmentId: row.department_id,
      departmentName: row.department_name,
      position: row.position,
      employmentStatus: row.employment_status,
      dateHired: row.date_hired,
      immediateSuperiorId: row.immediate_superior_id,
      immediateSuperiorName: row.immediate_superior_name,
      departmentHeadId: row.department_head_id,
      departmentHeadName: row.department_head_name,
      defaultTemplateId: row.default_template_id,
      username: row.username,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
      isApproved: row.is_approved,
      approvalStatus: row.approval_status,
      hrRejectionRemarks: row.hr_rejection_remarks,
      isDepartmentHead: row.is_department_head,
    }));
  } catch (err) {
    console.warn('Error fetching employees from Supabase:', err);
    return null;
  }
};

export const saveEmployeeToSupabase = async (user: User): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const payload = {
      id: user.id,
      employee_number: user.employeeNumber,
      first_name: user.firstName || user.name.split(' ')[0],
      middle_name: user.middleName || '',
      last_name: user.lastName || user.name.split(' ')[1] || '',
      email: user.email,
      contact_number: user.contactNumber,
      department_id: user.departmentId,
      department_name: user.departmentName,
      position: user.position,
      role: user.role,
      employment_status: user.employmentStatus || 'Regular',
      date_hired: user.dateHired || new Date().toISOString().substring(0, 10),
      immediate_superior_id: user.immediateSuperiorId,
      immediate_superior_name: user.immediateSuperiorName,
      department_head_id: user.departmentHeadId,
      department_head_name: user.departmentHeadName,
      default_template_id: user.defaultTemplateId,
      username: user.username || user.email.split('@')[0],
      avatar_url: user.avatarUrl,
      is_active: user.isActive ?? true,
      is_approved: user.isApproved ?? true,
      approval_status: user.approvalStatus || 'approved',
      is_department_head: user.isDepartmentHead || false,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('employees').upsert(payload);
    return !error;
  } catch (err) {
    console.warn('Error saving employee to Supabase:', err);
    return false;
  }
};

// ==============================================================================
// 2. DEPARTMENTS SUPABASE OPERATIONS
// ==============================================================================

export const fetchDepartmentsFromSupabase = async (): Promise<Department[] | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase.from('departments').select('*');
    if (error || !data) return null;

    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      headId: d.head_user_id,
      headName: d.head_name,
      defaultTemplateId: d.default_template_id,
      employeeCount: d.employee_count || 0,
      isActive: d.is_active
    }));
  } catch (err) {
    console.warn('Error fetching departments from Supabase:', err);
    return null;
  }
};

export const saveDepartmentToSupabase = async (dept: Department): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const payload = {
      id: dept.id,
      code: dept.code,
      name: dept.name,
      head_user_id: dept.headId,
      head_name: dept.headName,
      default_template_id: dept.defaultTemplateId,
      employee_count: dept.employeeCount,
      is_active: dept.isActive ?? true,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('departments').upsert(payload);
    return !error;
  } catch (err) {
    console.warn('Error saving department to Supabase:', err);
    return false;
  }
};

// ==============================================================================
// 3. EVALUATIONS SUPABASE OPERATIONS
// ==============================================================================

export const fetchEvaluationsFromSupabase = async (): Promise<Evaluation[] | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data: evals, error: evalErr } = await supabase.from('evaluations').select('*');
    if (evalErr || !evals) return null;

    // Map base evaluations
    return evals.map((e: any) => ({
      id: e.id,
      cycleId: e.cycle_id || 'cycle_2025_annual',
      templateId: e.template_id || 'template_sales',
      workflowType: e.workflow_type,
      employeeId: e.employee_id,
      employeeName: e.employee_name,
      departmentName: e.department_name,
      position: e.position,
      appraisalPeriod: e.appraisal_period,
      appraisalDate: e.appraisal_date,
      status: e.status,
      eligibilityScore: Number(e.eligibility_score || 0),
      coreValuesScore: Number(e.core_values_score || 0),
      totalEligibilityWeightedRating: Number(e.eligibility_score || 0),
      totalCoreValuesWeightedRating: Number(e.core_values_score || 0),
      finalRating: Number(e.final_rating || 0),
      ratingClassification: e.rating_classification,
      kpiRatings: [],
      coreValueRatings: [],
      developmentPlan: { strengths: '', areasForImprovement: '', learningNeeds: [] },
      personnelAction: { actionType: 'no_action' },
      signatures: {},
      evidenceFiles: [],
      createdAt: e.created_at,
      updatedAt: e.updated_at
    }));
  } catch (err) {
    console.warn('Error fetching evaluations from Supabase:', err);
    return null;
  }
};

export const saveEvaluationToSupabase = async (evaluation: Evaluation): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const payload = {
      id: evaluation.id,
      cycle_id: evaluation.cycleId,
      template_id: evaluation.templateId,
      workflow_type: evaluation.workflowType,
      employee_id: evaluation.employeeId,
      employee_name: evaluation.employeeName,
      department_name: evaluation.departmentName,
      position: evaluation.position,
      appraisal_period: evaluation.appraisalPeriod,
      appraisal_date: evaluation.appraisalDate,
      status: evaluation.status,
      eligibility_score: evaluation.eligibilityScore,
      core_values_score: evaluation.coreValuesScore,
      final_rating: evaluation.finalRating,
      rating_classification: evaluation.ratingClassification,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('evaluations').upsert(payload);
    return !error;
  } catch (err) {
    console.warn('Error saving evaluation to Supabase:', err);
    return false;
  }
};

// ==============================================================================
// 4. SUPABASE STORAGE BUCKET FILE UPLOADS
// ==============================================================================

export const uploadFileToSupabaseStorage = async (
  bucket: 'apes-signatures' | 'apes-attachments',
  fileName: string,
  fileBlob: Blob
): Promise<string | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const filePath = `${Date.now()}_${fileName}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, fileBlob);

    if (error) return null;

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn(`Error uploading file to Supabase storage bucket ${bucket}:`, err);
    return null;
  }
};

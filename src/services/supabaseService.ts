import { supabase, isSupabaseConfigured, triggerRealtimeBroadcast } from './supabaseClient';
import { User, Department, Evaluation, Notification } from '../types';

// Helper: Ensure valid UUID format for PostgreSQL UUID columns
export const isValidUuid = (str?: string): boolean => {
  if (!str) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

export const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'f0000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');
};

const SEED_UUID_MAP: Record<string, string> = {
  'usr_default_admin': '00000000-0000-4000-8000-000000000001',
  'usr_hr_admin_01': '00000000-0000-4000-8000-000000000002',
  'usr_dh_acc': '00000000-0000-4000-8000-000000000010',
  'usr_dh_adm': '00000000-0000-4000-8000-000000000011',
  'usr_dh_bmc': '00000000-0000-4000-8000-000000000012',
  'usr_dh_fop': '00000000-0000-4000-8000-000000000013',
  'usr_dh_gaw': '00000000-0000-4000-8000-000000000014',
  'usr_dh_lgl': '00000000-0000-4000-8000-000000000015',
  'usr_dh_mkt': '00000000-0000-4000-8000-000000000016',
  'usr_dh_ops': '00000000-0000-4000-8000-000000000017',
  'usr_dh_pohr': '00000000-0000-4000-8000-000000000018',
  'usr_dh_sls': '00000000-0000-4000-8000-000000000019',
  'usr_emp_01': '00000000-0000-4000-8000-000000000020',
  'usr_sup_01': '00000000-0000-4000-8000-000000000021',
  'usr_pres_01': '00000000-0000-4000-8000-000000000022',
  'usr_pod_01': '00000000-0000-4000-8000-000000000023',
};

export const ensureUuid = (id?: string): string => {
  if (!id) return generateUuid();
  if (isValidUuid(id)) return id;
  if (SEED_UUID_MAP[id]) return SEED_UUID_MAP[id];

  const clean = id.replace(/[^a-f0-9]/gi, '');
  const pad = (clean + '00000000000000000000000000000000').substring(0, 32).toLowerCase();
  return `${pad.substring(0, 8)}-${pad.substring(8, 12)}-4${pad.substring(13, 16)}-8${pad.substring(17, 20)}-${pad.substring(20, 32)}`;
};

// ==============================================================================
// 1. EMPLOYEES & USERS SUPABASE OPERATIONS
// ==============================================================================

const mapRowToUser = (row: any): User => ({
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
  password: row.password || (row.email === 'Admin.Systemad@hdiadventures.com' ? 'ADMIN' : 'password'),
  requiresPasswordChange: row.requires_password_change ?? false,
  avatarUrl: row.avatar_url,
  isActive: row.is_active,
  isApproved: row.is_approved,
  approvalStatus: row.approval_status,
  hrRejectionRemarks: row.hr_rejection_remarks,
  isDepartmentHead: row.is_department_head,
});

export const findEmployeeInSupabase = async (cleanId: string): Promise<User | null> => {
  if (!isSupabaseConfigured || !supabase || !cleanId) return null;

  try {
    // Query 1: By Email
    const { data: byEmail, error: errEmail } = await supabase
      .from('employees')
      .select('*')
      .ilike('email', cleanId)
      .maybeSingle();

    if (byEmail && !errEmail) {
      console.log(`[Supabase Auth] Employee matched by email in Supabase: ${byEmail.email}`);
      return mapRowToUser(byEmail);
    }

    // Query 2: By Employee Number
    const { data: byNum, error: errNum } = await supabase
      .from('employees')
      .select('*')
      .ilike('employee_number', cleanId)
      .maybeSingle();

    if (byNum && !errNum) {
      console.log(`[Supabase Auth] Employee matched by employee_number in Supabase: ${byNum.employee_number}`);
      return mapRowToUser(byNum);
    }

    // Query 3: By Username
    const { data: byUser, error: errUser } = await supabase
      .from('employees')
      .select('*')
      .ilike('username', cleanId)
      .maybeSingle();

    if (byUser && !errUser) {
      console.log(`[Supabase Auth] Employee matched by username in Supabase: ${byUser.username}`);
      return mapRowToUser(byUser);
    }

    // Fallback Auto-Seed: If query didn't find record in Supabase, search SEED_USERS and sync to Supabase
    const { SEED_USERS } = await import('./storage');
    const matchedSeed = SEED_USERS.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.employeeNumber && u.employeeNumber.toLowerCase() === cleanId) ||
        (u.username && u.username.toLowerCase() === cleanId) ||
        cleanId.includes(u.email.toLowerCase()) ||
        (u.username && cleanId.includes(u.username.toLowerCase())) ||
        (u.username && u.username.toLowerCase().includes(cleanId))
    );

    if (matchedSeed) {
      console.log(`[Supabase Auth] Auto-seeding matched enterprise account "${matchedSeed.name}" (${matchedSeed.email}) into Supabase PostgreSQL...`);
      await saveEmployeeToSupabase(matchedSeed);
      return matchedSeed;
    }

    return null;
  } catch (err) {
    console.error('[Supabase Auth] Exception finding employee in Supabase:', err);
    return null;
  }
};

export const fetchEmployeesFromSupabase = async (): Promise<User[] | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase.from('employees').select('*');
    if (error || !data || data.length === 0) {
      // Auto-seed SEED_USERS into Supabase employees table
      const { SEED_USERS } = await import('./storage');
      console.log('[Supabase Sync] Auto-seeding SEED_USERS into Supabase employees table...');
      for (const u of SEED_USERS) {
        await saveEmployeeToSupabase(u);
      }
      const { data: retryData } = await supabase.from('employees').select('*');
      return (retryData || []).map(mapRowToUser);
    }

    return data.map(mapRowToUser);
  } catch (err) {
    console.warn('Error fetching employees from Supabase:', err);
    return null;
  }
};

export interface SupabaseSaveResult {
  success: boolean;
  error?: {
    code?: string;
    message: string;
    details?: string;
    hint?: string;
  };
}

export const saveEmployeeToSupabaseDetailed = async (user: User): Promise<SupabaseSaveResult> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: { code: 'NO_SB_CONFIG', message: 'Supabase cloud client is not configured.' } };
  }

  try {
    const cleanEmail = (user.email || '').trim().toLowerCase();
    
    let targetId = isValidUuid(user.id) ? user.id : ensureUuid(user.id);
    if (cleanEmail) {
      try {
        const { data: existing } = await supabase
          .from('employees')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existing && existing.id) {
          targetId = existing.id;
        }
      } catch (e) {
        // Fallback to computed targetId
      }
    }

    const payload: any = {
      id: targetId,
      employee_number: user.employeeNumber || `EMP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      first_name: user.firstName || user.name.split(' ')[0] || 'Employee',
      middle_name: user.middleName || '',
      last_name: user.lastName || user.name.split(' ')[1] || 'User',
      email: cleanEmail,
      contact_number: user.contactNumber || '',
      department_name: user.departmentName || 'General',
      position: user.position || 'Staff',
      role: user.role || 'employee',
      employment_status: user.employmentStatus || 'Regular',
      date_hired: user.dateHired || new Date().toISOString().substring(0, 10),
      username: user.username || `${cleanEmail.split('@')[0]}_${Date.now().toString().slice(-4)}_${Math.floor(1000 + Math.random() * 9000)}`,
      password: user.password || 'password123',
      requires_password_change: user.requiresPasswordChange ?? false,
      avatar_url: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      is_active: user.isActive ?? false,
      is_approved: user.isApproved ?? false,
      approval_status: user.approvalStatus || 'pending',
      hr_rejection_remarks: user.hrRejectionRemarks || null,
      is_department_head: user.isDepartmentHead || false,
      updated_at: new Date().toISOString()
    };

    if (isValidUuid(user.departmentId)) {
      payload.department_id = user.departmentId;
    }
    if (isValidUuid(user.immediateSuperiorId)) {
      payload.immediate_superior_id = user.immediateSuperiorId;
      payload.immediate_superior_name = user.immediateSuperiorName;
    }
    if (isValidUuid(user.departmentHeadId)) {
      payload.department_head_id = user.departmentHeadId;
      payload.department_head_name = user.departmentHeadName;
    }

    // Try INSERT first to guarantee unauthenticated self-registration from mobile devices succeeds under RLS
    const { error: insertErr } = await supabase.from('employees').insert(payload);

    if (insertErr) {
      console.error('Supabase Insert Error:', {
        code: insertErr.code,
        message: insertErr.message,
        details: insertErr.details,
        hint: insertErr.hint
      });

      // Try upsert fallback if conflict on ID
      const { error: upsertErr } = await supabase.from('employees').upsert(payload, { onConflict: 'id' });
      if (upsertErr) {
        console.error('Supabase Upsert Error:', {
          code: upsertErr.code,
          message: upsertErr.message,
          details: upsertErr.details,
          hint: upsertErr.hint
        });
        return {
          success: false,
          error: {
            code: upsertErr.code || insertErr.code,
            message: upsertErr.message || insertErr.message,
            details: upsertErr.details || insertErr.details,
            hint: upsertErr.hint || insertErr.hint
          }
        };
      }
    }

    triggerRealtimeBroadcast('data_changed', { type: 'employee', email: cleanEmail });
    return { success: true };
  } catch (err: any) {
    console.error('Supabase Exception Error:', err);
    return {
      success: false,
      error: {
        code: err?.code || 'EXCEPT_500',
        message: err?.message || String(err),
        details: err?.details || '',
        hint: err?.hint || ''
      }
    };
  }
};

export const saveEmployeeToSupabase = async (user: User): Promise<boolean> => {
  const result = await saveEmployeeToSupabaseDetailed(user);
  return result.success;
};

export const deleteEmployeeFromSupabase = async (userId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const uuid = ensureUuid(userId);
    const { error } = await supabase.from('employees').delete().eq('id', uuid);
    if (error) {
      console.warn('Error deleting employee from Supabase:', error);
    }
    return !error;
  } catch (err) {
    console.warn('Error deleting employee from Supabase:', err);
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
      id: ensureUuid(dept.id),
      code: dept.code,
      name: dept.name,
      head_user_id: isValidUuid(dept.headId) ? dept.headId : null,
      head_name: dept.headName,
      default_template_id: isValidUuid(dept.defaultTemplateId) ? dept.defaultTemplateId : null,
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
// 3. NOTIFICATIONS SUPABASE OPERATIONS
// ==============================================================================

export const fetchNotificationsFromSupabase = async (userId?: string, userRole?: string): Promise<Notification[] | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    let query = supabase.from('notifications').select('*');

    // Server-side filtering: fetch only notifications targeted to user ID, recipient role, or global announcements
    if (userId && isValidUuid(userId)) {
      if (userRole === 'system_admin' || userRole === 'hr_admin') {
        query = query.or(`user_id.eq.${userId},user_id.is.null,recipient_role.eq.ALL,recipient_role.eq.ALL_ADMINS,recipient_role.eq.${userRole},is_announcement.eq.true`);
      } else if (userRole) {
        query = query.or(`user_id.eq.${userId},user_id.is.null,recipient_role.eq.ALL,recipient_role.eq.${userRole},is_announcement.eq.true`);
      } else {
        query = query.or(`user_id.eq.${userId},user_id.is.null,recipient_role.eq.ALL,is_announcement.eq.true`);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetchNotifications error:', error.message, error.details);
      return null;
    }

    if (!data) return [];

    const mapped = data.map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      recipientRole: n.recipient_role,
      recipientDepartment: n.recipient_department,
      title: n.title,
      message: n.message,
      category: n.category || 'evaluation',
      type: n.type || 'action_required',
      read: n.read || false,
      readByUsers: Array.isArray(n.read_by_users) ? n.read_by_users : [],
      isAnnouncement: Boolean(n.is_announcement),
      senderName: n.sender_name,
      actionLink: n.action_link,
      expirationDate: n.expiration_date,
      evaluationId: n.evaluation_id,
      date: 'Just now',
      dateTime: n.created_at ? new Date(n.created_at).toLocaleString() : new Date().toLocaleString(),
    }));

    return mapped;
  } catch (err) {
    console.error('Exception fetching notifications from Supabase:', err);
    return null;
  }
};

export const saveNotificationToSupabase = async (notif: Notification): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const payload: any = {
      id: ensureUuid(notif.id),
      user_id: isValidUuid(notif.userId) ? notif.userId : null,
      recipient_role: notif.recipientRole || null,
      recipient_department: notif.recipientDepartment || null,
      title: notif.title,
      message: notif.message,
      category: notif.category || 'evaluation',
      type: notif.type || 'action_required',
      read: notif.read || false,
      read_by_users: notif.readByUsers || [],
      is_announcement: Boolean(notif.isAnnouncement),
      sender_name: notif.senderName || null,
      action_link: notif.actionLink || null,
      expiration_date: notif.expirationDate || null,
      evaluation_id: isValidUuid(notif.evaluationId) ? notif.evaluationId : null
    };

    const { error } = await supabase.from('notifications').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('[Broadcast Debug] Supabase notifications upsert error:', error.message, error.details);
    }
    return !error;
  } catch (err) {
    console.error('[Broadcast Debug] Error saving notification to Supabase:', err);
    return false;
  }
};

export const saveNotificationsBatchToSupabase = async (notifs: Notification[]): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase || !notifs || notifs.length === 0) return false;

  try {
    const payloads = notifs.map(notif => ({
      id: ensureUuid(notif.id),
      user_id: isValidUuid(notif.userId) ? notif.userId : null,
      recipient_role: notif.recipientRole || null,
      recipient_department: notif.recipientDepartment || null,
      title: notif.title,
      message: notif.message,
      category: notif.category || 'evaluation',
      type: notif.type || 'action_required',
      read: notif.read || false,
      read_by_users: notif.readByUsers || [],
      is_announcement: Boolean(notif.isAnnouncement),
      sender_name: notif.senderName || null,
      action_link: notif.actionLink || null,
      expiration_date: notif.expirationDate || null,
      evaluation_id: isValidUuid(notif.evaluationId) ? notif.evaluationId : null
    }));

    console.log(`[Broadcast Debug] Inserting batch of ${payloads.length} notification rows into Supabase...`);
    const { error } = await supabase.from('notifications').upsert(payloads, { onConflict: 'id' });
    if (error) {
      console.error('[Broadcast Debug] Supabase batch notifications insert error:', error.message, error.details);
      return false;
    }
    console.log(`[Broadcast Debug] Successfully inserted ${payloads.length} notification rows into Supabase.`);
    return true;
  } catch (err) {
    console.error('[Broadcast Debug] Exception saving batch notifications to Supabase:', err);
    return false;
  }
};

// ==============================================================================
// 4. EVALUATIONS SUPABASE OPERATIONS
// ==============================================================================

export const fetchEvaluationsFromSupabase = async (): Promise<Evaluation[] | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    let { data: evals, error: evalErr } = await supabase.from('evaluations').select('*');
    
    if (evalErr || !evals || evals.length < 3) {
      const { SEED_EVALUATIONS } = await import('./storage');
      console.log('[Supabase Sync] Auto-seeding SEED_EVALUATIONS into Supabase evaluations table...');
      for (const ev of SEED_EVALUATIONS) {
        await saveEvaluationToSupabase(ev);
      }
      const { data: retryEvals } = await supabase.from('evaluations').select('*');
      evals = retryEvals || [];
    }

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
      kpiRatings: Array.isArray(e.kpi_ratings_data) ? e.kpi_ratings_data : [],
      coreValueRatings: Array.isArray(e.core_value_ratings_data) ? e.core_value_ratings_data : [],
      developmentPlan: e.development_plan_data || { strengths: '', areasForImprovement: '', learningNeeds: [] },
      personnelAction: e.personnel_action_data || { actionType: 'no_action' },
      signatures: e.signatures_data || {},
      evidenceFiles: [],
      auditTrail: Array.isArray(e.audit_trail_data) ? e.audit_trail_data : [],
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
      id: ensureUuid(evaluation.id),
      cycle_id: isValidUuid(evaluation.cycleId) ? evaluation.cycleId : null,
      template_id: isValidUuid(evaluation.templateId) ? evaluation.templateId : null,
      workflow_type: evaluation.workflowType,
      employee_id: isValidUuid(evaluation.employeeId) ? evaluation.employeeId : null,
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
      kpi_ratings_data: evaluation.kpiRatings || [],
      core_value_ratings_data: evaluation.coreValueRatings || [],
      signatures_data: evaluation.signatures || {},
      audit_trail_data: evaluation.auditTrail || [],
      development_plan_data: evaluation.developmentPlan || {},
      personnel_action_data: evaluation.personnelAction || {},
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('evaluations').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('[Evaluation Debug] Supabase evaluations upsert error:', error.message, error.details);
    } else {
      console.log(`[APES Sync - Eval] Saved evaluation ${evaluation.id} (${evaluation.employeeName}) to Supabase.`);
    }
    return !error;
  } catch (err) {
    console.warn('Error saving evaluation to Supabase:', err);
    return false;
  }
};

// ==============================================================================
// 5. SUPABASE STORAGE BUCKET FILE UPLOADS
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

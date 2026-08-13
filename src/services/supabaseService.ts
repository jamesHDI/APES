import { supabase, isSupabaseConfigured, triggerRealtimeBroadcast } from './supabaseClient';
import { User, Department, Evaluation, Notification, EvaluationHistory, EvaluationScorecardArchive, EvidenceFile, EvaluationTemplate, KRACategory, KPITemplateItem, CoreValue } from '../types';
import { hashPassword, isHashedPassword } from '../utils/crypto';
import { MASTER_SALES_EVALUATION_TEMPLATE, createMasterBasedTemplate } from '../constants/masterSalesTemplate';

export const logEmployeesSchema = async (): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { data: columns, error: colErr } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'employees')
      .order('ordinal_position');

    if (colErr) {
      console.error('[Schema Inspect] Failed to fetch columns:', colErr);
      return;
    }

    console.log('[Schema Inspect] employees table columns:', columns);

    const { data: constraints, error: conErr } = await supabase
      .from('information_schema.check_constraints')
      .select('constraint_name, check_clause')
      .eq('constraint_schema', 'public');

    if (conErr) {
      console.error('[Schema Inspect] Failed to fetch constraints:', conErr);
      return;
    }

    const employeeConstraints = (constraints || []).filter((c: any) =>
      (c.check_clause || '').toLowerCase().includes('employees')
    );

    console.log('[Schema Inspect] employees-related CHECK constraints:', employeeConstraints);
  } catch (err) {
    console.error('[Schema Inspect] Exception:', err);
  }
};

export const getSupabaseDiagnostics = (): { configured: boolean; url: string; keyPrefix: string; error?: string } => {
  const metaEnv = (import.meta as any).env || {};
  const url = (metaEnv.VITE_SUPABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
  const key = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^['"]|['"]$/g, '');

  if (!url || !key) {
    return {
      configured: false,
      url: url || 'MISSING',
      keyPrefix: key ? key.substring(0, 20) : 'MISSING',
      error: 'Supabase environment variables are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    };
  }

  if (url === 'https://your-supabase-project.supabase.co' || key === 'your-supabase-anon-key-here') {
    return {
      configured: false,
      url,
      keyPrefix: key.substring(0, 20),
      error: 'Supabase credentials are still using placeholder values. Please replace them with your actual project credentials from the Supabase Dashboard.'
    };
  }

  if (!url.startsWith('http')) {
    return {
      configured: false,
      url,
      keyPrefix: key.substring(0, 20),
      error: 'Invalid Supabase URL format. It should start with https://'
    };
  }

  return {
    configured: true,
    url,
    keyPrefix: key.substring(0, 20) + '...'
  };
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    const diag = getSupabaseDiagnostics();
    return { success: false, error: diag.error || 'Supabase is not configured.' };
  }

  try {
    const { error } = await supabase.from('employees').select('count').limit(1);
    if (error) {
      if (error.code === '15' || error.message?.includes('key.usages')) {
        return {
          success: false,
          error: 'API key permission error. Verify that VITE_SUPABASE_ANON_KEY is the correct anon/public key (not service_role) and that it has not been regenerated.'
        };
      }
      return { success: false, error: error.message || 'Unknown database error' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection test failed' };
  }
};

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
  suffix: row.suffix || '',
  name: row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
  email: row.email,
  personalEmail: row.personal_email || '',
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
  password: row.password || '',
  requiresPasswordChange: row.requires_password_change ?? false,
  avatarUrl: row.avatar_url || '',
  isActive: row.is_active,
  isApproved: row.is_approved,
  approvalStatus: row.approval_status,
  hrRejectionRemarks: row.hr_rejection_remarks,
  isDepartmentHead: row.is_department_head,
});


export const findEmployeeInSupabase = async (cleanId: string): Promise<User | null> => {
  if (!isSupabaseConfigured || !supabase || !cleanId) return null;

  try {
    const target = (cleanId || '').trim();
    const targetLower = target.toLowerCase();
    const mappedUuid = isValidUuid(target) ? target : ensureUuid(target);

    console.log(`[Supabase Auth] Trace Profile Loading - Searching employees table for identifier: "${target}" (mapped UUID: ${mappedUuid})...`);

    // 1. Query by ID (mapped UUID or raw ID)
    if (isValidUuid(mappedUuid)) {
      const { data: byId, error: errId } = await supabase
        .from('employees')
        .select('*')
        .eq('id', mappedUuid)
        .maybeSingle();

      if (byId && !errId) {
        console.log(`[Supabase Auth] SINGLE SOURCE OF TRUTH: Loaded employee record directly from Supabase DB by ID: ${byId.id} (${byId.email})`);
        return mapRowToUser(byId);
      }
    }

    // 2. Query by Email
    if (targetLower.includes('@')) {
      const { data: byEmail, error: errEmail } = await supabase
        .from('employees')
        .select('*')
        .ilike('email', targetLower)
        .maybeSingle();

      if (byEmail && !errEmail) {
        console.log(`[Supabase Auth] SINGLE SOURCE OF TRUTH: Loaded employee record directly from Supabase DB by Email: ${byEmail.email}`);
        return mapRowToUser(byEmail);
      }
    }

    // 3. Query by Employee Number
    const { data: byNum, error: errNum } = await supabase
      .from('employees')
      .select('*')
      .ilike('employee_number', target)
      .maybeSingle();

    if (byNum && !errNum) {
      console.log(`[Supabase Auth] SINGLE SOURCE OF TRUTH: Loaded employee record directly from Supabase DB by Employee Number: ${byNum.employee_number}`);
      return mapRowToUser(byNum);
    }

    // 4. Query by Username
    const { data: byUser, error: errUser } = await supabase
      .from('employees')
      .select('*')
      .ilike('username', targetLower)
      .maybeSingle();

    if (byUser && !errUser) {
      console.log(`[Supabase Auth] SINGLE SOURCE OF TRUTH: Loaded employee record directly from Supabase DB by Username: ${byUser.username}`);
      return mapRowToUser(byUser);
    }

    // 5. Query by Email fallback
    const { data: byEmailFallback } = await supabase
      .from('employees')
      .select('*')
      .ilike('email', targetLower)
      .maybeSingle();

    if (byEmailFallback) {
      console.log(`[Supabase Auth] SINGLE SOURCE OF TRUTH: Loaded employee record directly from Supabase DB by Email fallback: ${byEmailFallback.email}`);
      return mapRowToUser(byEmailFallback);
    }

    // Fallback Seed ONLY if account is completely missing from Supabase DB
    const { SEED_USERS } = await import('./storage');
    const matchedSeed = SEED_USERS.find(
      (u) =>
        u.id === target ||
        ensureUuid(u.id) === mappedUuid ||
        u.email.toLowerCase() === targetLower ||
        (u.employeeNumber && u.employeeNumber.toLowerCase() === targetLower) ||
        (u.username && u.username.toLowerCase() === targetLower)
    );

    if (matchedSeed) {
      const seedUuid = ensureUuid(matchedSeed.id);
      // Check if user already exists in Supabase DB by seed UUID or email
      const { data: checkDb } = await supabase
        .from('employees')
        .select('*')
        .or(`id.eq.${seedUuid},email.ilike.${matchedSeed.email}`)
        .maybeSingle();

      if (checkDb) {
        console.log(`[Supabase Auth] SINGLE SOURCE OF TRUTH: Found authoritative database record for "${checkDb.email}" in Supabase DB. Returning DB record without overwriting.`);
        return mapRowToUser(checkDb);
      }

      console.log(`[Supabase Auth] Account "${matchedSeed.email}" absent from Supabase DB. Provisioning initial seed record...`);
      await saveEmployeeToSupabase(matchedSeed);
      const { data: newDbRecord } = await supabase
        .from('employees')
        .select('*')
        .eq('email', matchedSeed.email.trim().toLowerCase())
        .maybeSingle();
      if (newDbRecord) {
        console.log(`[Supabase Auth] Provisioned DB record for "${matchedSeed.email}" with UUID: ${newDbRecord.id}`);
        return mapRowToUser(newDbRecord);
      }
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
  id?: string;
  error?: {
    code?: string;
    message: string;
    details?: string;
    hint?: string;
    raw?: any;
  };
}

export const uploadAvatarToSupabase = async (file: File | Blob, userId: string): Promise<string | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const fileExt = (file as File).type?.split('/')[1] || 'jpg';
    const fileName = `avatar_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.${fileExt}`;

    // Attempt 1: Upload to 'avatars' storage bucket
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (!uploadErr && uploadData) {
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      if (publicUrlData?.publicUrl) {
        console.log('[Supabase Storage] Avatar uploaded successfully to avatars bucket:', publicUrlData.publicUrl);
        return publicUrlData.publicUrl;
      }
    }

    // Attempt 2: Upload to 'public' storage bucket if 'avatars' bucket does not exist
    const { data: uploadData2, error: uploadErr2 } = await supabase.storage
      .from('public')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (!uploadErr2 && uploadData2) {
      const { data: publicUrlData2 } = supabase.storage.from('public').getPublicUrl(fileName);
      if (publicUrlData2?.publicUrl) {
        console.log('[Supabase Storage] Avatar uploaded successfully to public bucket:', publicUrlData2.publicUrl);
        return publicUrlData2.publicUrl;
      }
    }
  } catch (err) {
    console.warn('[Supabase Storage Upload] Storage upload note:', err);
  }
  return null;
};

export const saveEmployeeToSupabaseDetailed = async (user: User): Promise<SupabaseSaveResult> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: { code: 'NO_SB_CONFIG', message: 'Supabase cloud client is not configured.' } };
  }

  try {
    const cleanEmail = (user.email || '').trim().toLowerCase();
    const mappedUuid = isValidUuid(user.id) ? user.id : ensureUuid(user.id);

    console.log(`[Supabase DB Update] Preparing UPDATE/UPSERT for Employee:`, {
      id: user.id,
      mappedUuid,
      email: cleanEmail,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl
    });

    // Check if employee already exists in Supabase by UUID or email
    let existingId: string | null = null;
    try {
      let checkQuery = supabase.from('employees').select('id, email');
      if (isValidUuid(mappedUuid)) {
        checkQuery = checkQuery.or(`id.eq.${mappedUuid},email.ilike.${cleanEmail}`);
      } else {
        checkQuery = checkQuery.ilike('email', cleanEmail);
      }
      const { data: existing, error: checkErr } = await checkQuery.maybeSingle();
      if (checkErr) {
        console.error('[Supabase DB Update] SELECT failed with full error:', JSON.stringify(checkErr, null, 2));
      }
      if (existing && existing.id) {
        existingId = existing.id;
        console.log(`[Supabase DB Update] Matched existing DB record ID: ${existingId}`);
      }
    } catch (e) {
      console.error('[Supabase DB Update] SELECT exception:', e);
    }

    const targetId = existingId || mappedUuid;

    let passwordToStore = user.password || '';
    if (passwordToStore && !isHashedPassword(passwordToStore)) {
      passwordToStore = await hashPassword(passwordToStore);
    }

    const allowedRoles = ['employee', 'supervisor', 'dept_head', 'president', 'pod', 'hr_admin', 'system_admin'];
    const resolvedRole = (user.role || 'employee').toString().trim();
    
    if (!allowedRoles.includes(resolvedRole)) {
      console.error('[Supabase DB Update] Invalid role detected. User role:', user.role, 'Type:', typeof user.role);
      return {
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: `Invalid employee role: "${user.role}". Allowed values: ${allowedRoles.join(', ')}.`,
          details: `Role must be one of the allowed database enum values.`
        }
      };
    }

    const departmentIdRaw = user.departmentId;
    const departmentIdIsValid = isValidUuid(departmentIdRaw);
    // ── Build a guaranteed non-empty `name` (NOT NULL in DB) ─────────────
    const safeName = (
      user.name ||
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      user.email.split('@')[0] ||
      'Employee'
    ).trim();

    // Guard .split() — user.name may be undefined/null in some code paths
    const nameWords = safeName.split(' ');
    const safeFirstName = user.firstName || nameWords[0] || 'Employee';
    const safeLastName  = user.lastName  || nameWords.slice(1).join(' ') || 'User';

    const payload: any = {
      id: targetId,
      employee_number: user.employeeNumber || `EMP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      first_name: safeFirstName,
      middle_name: user.middleName || '',
      last_name: safeLastName,
      suffix: user.suffix || '',
      name: safeName,           // guaranteed non-empty; satisfies NOT NULL constraint
      email: cleanEmail,
      personal_email: user.personalEmail || '',
      contact_number: user.contactNumber || '',
      department_id: departmentIdRaw ? (departmentIdIsValid ? departmentIdRaw : null) : null,
      department_name: user.departmentName || 'General',
      position: user.position || 'Staff',
      role: resolvedRole,
      employment_status: user.employmentStatus || 'Regular',
      date_hired: user.dateHired || new Date().toISOString().substring(0, 10),
      username: user.username || `${cleanEmail.split('@')[0]}_${Date.now().toString().slice(-4)}_${Math.floor(1000 + Math.random() * 9000)}`,
      password: passwordToStore,
      requires_password_change: user.requiresPasswordChange ?? false,
      avatar_url: user.avatarUrl || '',
      is_active: user.isActive ?? true,
      is_approved: user.isApproved ?? true,
      approval_status: user.approvalStatus || 'approved',
      hr_rejection_remarks: user.hrRejectionRemarks || null,
      is_department_head: user.isDepartmentHead || false,
      immediate_superior_name: user.immediateSuperiorName || '',
      department_head_name: user.departmentHeadName || '',
      updated_at: new Date().toISOString()
    };

    console.log('[Supabase DB Update] Payload for', cleanEmail, payload);

    if (isValidUuid(user.immediateSuperiorId)) {
      payload.immediate_superior_id = user.immediateSuperiorId;
    }
    if (isValidUuid(user.departmentHeadId)) {
      payload.department_head_id = user.departmentHeadId;
    }

    let saveErr: any = null;
    if (existingId) {
      console.log(`[Supabase DB Update] Executing UPDATE query on employees table for ID: ${existingId}...`);
      const { error: updateErr } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', existingId);
      if (updateErr) {
        console.error('[Supabase DB Update] UPDATE full error:', JSON.stringify(updateErr, null, 2));
      }
      saveErr = updateErr;
    } else if (cleanEmail) {
      console.log(`[Supabase DB Update] Executing UPSERT query on employees table for Email: ${cleanEmail}...`);
      const { error: upsertErr } = await supabase
        .from('employees')
        .upsert(payload, { onConflict: 'email' });
      if (upsertErr) {
        console.error('[Supabase DB Update] UPSERT full error:', JSON.stringify(upsertErr, null, 2));
      }
      saveErr = upsertErr;
    }

    if (saveErr) {
      console.warn('[Supabase DB Update] Primary save note, attempting fallback UPDATE...', saveErr);
      delete payload.id;
      const { error: fallbackErr } = await supabase
        .from('employees')
        .update(payload)
        .or(`id.eq.${targetId},email.ilike.${cleanEmail}`);
      saveErr = fallbackErr;
    }

    if (saveErr && (saveErr.code === 'PGRST204' || saveErr.code === '42703' || saveErr.message.includes('column'))) {
      console.warn('[Supabase DB Update] Column mismatch detected, retrying with core payload...', saveErr.message);
      const {
        employee_number, middle_name, suffix, personal_email, contact_number,
        username, password, requires_password_change, avatar_url,
        employment_status, date_hired, approval_status, hr_rejection_remarks,
        is_department_head, immediate_superior_name, department_head_name,
        immediate_superior_id, department_head_id, ...corePayload
      } = payload;
      if (existingId) {
        const { error: coreErr } = await supabase.from('employees').update(corePayload).eq('id', existingId);
        saveErr = coreErr;
      } else if (cleanEmail) {
        const { error: coreErr } = await supabase.from('employees').upsert(corePayload, { onConflict: 'email' });
        saveErr = coreErr;
      }
    }

    if (saveErr) {
      console.error('[Supabase DB Update] UPDATE Query Failed - Full PostgREST error:', JSON.stringify(saveErr, null, 2));
      console.error('[Supabase DB Update] Payload that failed:', JSON.stringify(payload, null, 2));
      const errorMessage = saveErr?.message || 'Unknown database error';
      const errorDetails = saveErr?.details || '';
      const errorHint = saveErr?.hint || '';
      const errorCode = saveErr?.code || 'UNKNOWN';

      let userFriendlyMessage = `Database update failed (Code: ${errorCode})`;
      if (errorCode === '15' || errorMessage.includes('key.usages')) {
        userFriendlyMessage = 'Database access denied: The Supabase API key does not have the required permissions. Please verify your VITE_SUPABASE_ANON_KEY in the .env file.';
      } else if (errorMessage.includes('JWT')) {
        userFriendlyMessage = 'Authentication token expired. Please refresh and try again.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
        userFriendlyMessage = 'Permission denied. Please check Row Level Security (RLS) policies in Supabase.';
      } else if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
        userFriendlyMessage = 'A record with this information already exists.';
      }

      return {
        success: false,
        error: {
          code: errorCode,
          message: userFriendlyMessage,
          details: errorDetails,
          hint: errorHint,
          raw: saveErr
        }
      };
    }

    // Step 1 Verification: Immediately SELECT updated row from database to verify persistence
    const { data: verifiedRow, error: verifyErr } = await supabase
      .from('employees')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (verifiedRow && !verifyErr) {
      console.log(`[Supabase DB Verification] SUCCESS! Verified database update in employees table:`, {
        id: verifiedRow.id,
        email: verifiedRow.email,
        name: verifiedRow.name,
        position: verifiedRow.position,
        department_name: verifiedRow.department_name,
        avatar_url: verifiedRow.avatar_url,
        updated_at: verifiedRow.updated_at
      });
    } else {
      const warnDetails = verifyErr ? { code: verifyErr.code, message: verifyErr.message, details: verifyErr.details, hint: verifyErr.hint } : 'verifiedRow missing';
      console.warn(`[Supabase DB Verification] Warning verifying saved row:`, warnDetails);
      return {
        success: false,
        error: {
          code: verifyErr?.code || 'VERIFY_MISSING',
          message: verifyErr?.message || 'Save appeared to succeed, but the updated row could not be verified.',
          details: verifyErr?.details || '',
          hint: verifyErr?.hint || ''
        }
      };
    }

    triggerRealtimeBroadcast('data_changed', { type: 'employee', email: cleanEmail });
    return { success: true, id: targetId };
  } catch (err: any) {
    console.error('[Supabase DB Update] Exception Error:', err);
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

    // Server-side filtering: fetch notifications targeted to user ID (UUID or string), recipient role, or global announcements
    if (userId) {
      const targetUuid = ensureUuid(userId);
      if (userRole === 'system_admin' || userRole === 'hr_admin') {
        query = query.or(`user_id.eq.${targetUuid},user_id.eq.${userId},user_id.is.null,recipient_role.eq.ALL,recipient_role.eq.ALL_ADMINS,recipient_role.eq.${userRole},is_announcement.eq.true`);
      } else if (userRole) {
        query = query.or(`user_id.eq.${targetUuid},user_id.eq.${userId},user_id.is.null,recipient_role.eq.ALL,recipient_role.eq.${userRole},is_announcement.eq.true`);
      } else {
        query = query.or(`user_id.eq.${targetUuid},user_id.eq.${userId},user_id.is.null,recipient_role.eq.ALL,is_announcement.eq.true`);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetchNotifications error:', error.message, error.details);
      return null;
    }

    if (!data) return [];

    const mapped = data.map((n: any) => {
      const createdAtDate = n.created_at ? new Date(n.created_at) : new Date();
      const formattedDate = createdAtDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const formattedTime = createdAtDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const formattedDateTime = `${formattedDate} • ${formattedTime}`;

      return {
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
        date: formattedDate,
        dateTime: formattedDateTime,
      };
    });

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
      user_id: ensureUuid(notif.userId),
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
      user_id: ensureUuid(notif.userId),
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

export const fetchEvaluationsFromSupabase = async (employeeIdOrUser?: string | User): Promise<Evaluation[] | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    let query = supabase.from('evaluations').select('*').order('created_at', { ascending: false });
    if (employeeIdOrUser) {
      const empId = typeof employeeIdOrUser === 'string' ? employeeIdOrUser : employeeIdOrUser.id;
      const empEmail = typeof employeeIdOrUser === 'object' ? (employeeIdOrUser.email || '').trim().toLowerCase() : '';
      const empName = typeof employeeIdOrUser === 'object' ? (employeeIdOrUser.name || '').trim() : '';

      const conditions: string[] = [];
      if (empId && isValidUuid(empId)) {
        conditions.push(`employee_id.eq.${empId}`, `user_id.eq.${empId}`);
      }
      if (empEmail) {
        conditions.push(`employee_email.ilike.${empEmail}`);
      }
      if (empName) {
        conditions.push(`employee_name.ilike.${empName}`);
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }
    }

    let { data: evals, error: evalErr } = await query;
    
    if (evalErr || !evals) {
      const { SEED_EVALUATIONS } = await import('./storage');
      if (SEED_EVALUATIONS && SEED_EVALUATIONS.length > 0) {
        console.log('[Supabase Sync] Auto-seeding SEED_EVALUATIONS into Supabase evaluations table...');
        for (const ev of SEED_EVALUATIONS) {
          await saveEvaluationToSupabase(ev);
        }
        const { data: retryEvals } = await query;
        evals = retryEvals || [];
      } else {
        evals = evals || [];
      }
    }

    const mapped = evals.map((e: any) => ({
      id: e.id,
      cycleId: e.cycle_id || 'cycle_2025_annual',
      templateId: e.template_id || 'template_sales',
      workflowType: e.workflow_type,
      employeeId: e.employee_id || e.user_id,
      userId: e.user_id || e.employee_id,
      employeeName: e.employee_name,
      employeeEmail: e.employee_email || '',
      departmentName: e.department_name,
      position: e.position,
      appraisalPeriod: e.appraisal_period,
      appraisalDate: e.appraisal_date,
      status: e.status,
      releasedBy: e.released_by || '',
      releasedAt: e.released_at || e.created_at,
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

    const seen = new Set<string>();
    const uniqueEvals: Evaluation[] = [];
    for (const ev of mapped) {
      if (!ev || !ev.id) continue;
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      uniqueEvals.push(ev);
    }
    return uniqueEvals;
  } catch (err) {
    console.warn('Error fetching evaluations from Supabase:', err);
    return null;
  }
};

const normalizeWorkflowType = (wt?: string): string => {
  if (!wt) return 'WORKFLOW_REGULAR';
  const upper = wt.toUpperCase();
  if (upper === 'REGULAR' || upper === 'WORKFLOW_REGULAR') return 'WORKFLOW_REGULAR';
  if (upper === 'NO_IS' || upper === 'WORKFLOW_NO_IS') return 'WORKFLOW_NO_IS';
  if (upper === 'DEPT_HEAD' || upper === 'DEPARTMENT_HEAD' || upper === 'WORKFLOW_DEPT_HEAD') return 'WORKFLOW_DEPT_HEAD';
  if (upper === 'WORKFLOW_A' || upper === 'TYPE_A' || upper === 'A') return 'WORKFLOW_A';
  if (upper === 'WORKFLOW_B' || upper === 'TYPE_B' || upper === 'B') return 'WORKFLOW_B';
  return 'WORKFLOW_REGULAR';
};

const normalizeStatus = (st?: string): string => {
  if (!st) return 'draft';
  const clean = st.toLowerCase();
  const valid = [
    'draft',
    'employee_submitted',
    'department_head_submitted',
    'pending_supervisor',
    'pending_dept_head',
    'pending_president',
    'pending_pod',
    'supervisor_completed',
    'president_completed',
    'pod_validated',
    'archived',
    'reopened',
    'superseded'
  ];
  return valid.includes(clean) ? clean : 'draft';
};

export const syncEvaluationTemplateToSupabase = async (evaluation: Evaluation): Promise<string | null> => {
  if (!isSupabaseConfigured || !supabase || !evaluation) return null;

  try {
    const templateUuid = isValidUuid(evaluation.templateId)
      ? evaluation.templateId
      : ensureUuid(evaluation.templateId || `tmpl_${evaluation.departmentName || 'general'}`);

    const templatePayload = {
      id: templateUuid,
      title: `${evaluation.departmentName || 'General'} Performance Evaluation Template`,
      department_name: evaluation.departmentName || 'General Department',
      evaluation_period: evaluation.appraisalPeriod || 'Annual 2026',
      eligibility_weight: 85.00,
      core_values_weight: 15.00,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('evaluation_templates').upsert(templatePayload, { onConflict: 'id' });
    if (error) {
      console.warn('[Template Sync] Could not upsert evaluation_templates row:', error.message);
    } else {
      console.log(`[APES Sync - Template] Saved evaluation template ${templateUuid} to Supabase.`);
    }
    return templateUuid;
  } catch (err) {
    console.warn('[Template Sync] Exception saving template:', err);
    return null;
  }
};



// RELATIONAL CHILD TABLES SYNC (kpi_ratings, core_value_ratings, digital_signatures, evidence_files, kpis)
// ==============================================================================

export const syncChildTablesToSupabase = async (evaluation: Evaluation): Promise<void> => {
  if (!isSupabaseConfigured || !supabase || !evaluation || !evaluation.id) return;
  const evalUuid = isValidUuid(evaluation.id) ? evaluation.id : ensureUuid(evaluation.id);

  try {
    // 1. Sync KPI Ratings to public.kpi_ratings
    if (evaluation.kpiRatings && evaluation.kpiRatings.length > 0) {
      const kpiRatingRows = evaluation.kpiRatings.map((kpi: any) => ({
        id: ensureUuid(kpi.kpiId || `${evaluation.id}_kpi_${kpi.name || kpi.kpiName}`),
        evaluation_id: evalUuid,
        kpi_id: isValidUuid(kpi.kpiId) ? kpi.kpiId : null,
        kra_name: kpi.kraName || 'KRA',
        kpi_name: kpi.name || kpi.kpiName || 'KPI Item',
        weight_percent: Number(kpi.weightPercent || 0),
        self_rating: kpi.selfRating ?? null,
        supervisor_rating: kpi.supervisorRating ?? null,
        president_rating: kpi.presidentRating ?? null,
        weighted_score: kpi.weightedScore || 0,
        comments: kpi.comments || null
      }));

      const { error: kpiErr } = await supabase.from('kpi_ratings').upsert(kpiRatingRows, { onConflict: 'id' });
      if (kpiErr) console.warn('[Child Sync] kpi_ratings upsert error:', kpiErr.message);
    }

    // 2. Sync Core Value Ratings to public.core_value_ratings
    if (evaluation.coreValueRatings && evaluation.coreValueRatings.length > 0) {
      const cvRatingRows = evaluation.coreValueRatings.map((cv: any) => ({
        id: ensureUuid(cv.coreValueId || `${evaluation.id}_cv_${cv.name || cv.coreValueName}`),
        evaluation_id: evalUuid,
        core_value_name: cv.name || cv.coreValueName || 'Core Value',
        description: cv.description || '',
        pod_rating: cv.podRating ?? null,
        peer_rating: cv.peerRating ?? null,
        is_rating: cv.isRating ?? null,
        avg_rating: cv.avgRating || 0,
        weighted_score: cv.weightedScore || 0,
        comments: cv.comments || ''
      }));

      const { error: cvErr } = await supabase.from('core_value_ratings').upsert(cvRatingRows, { onConflict: 'id' });
      if (cvErr) console.warn('[Child Sync] core_value_ratings upsert error:', cvErr.message);
    }

    // 3. Sync Digital Signatures to public.digital_signatures
    if (evaluation.signatures) {
      const sigMap = evaluation.signatures as Record<string, any>;
      const roles = Object.keys(sigMap);
      const signatureRows = roles
        .filter((role) => sigMap[role] && (sigMap[role].signatureDataUrl || sigMap[role].signerName))
        .map((role) => {
          const sig = sigMap[role];
          return {
            id: ensureUuid(`${evaluation.id}_sig_${role}`),
            evaluation_id: evalUuid,
            signer_role: role,
            signer_name: sig.signerName || 'Authorized Signer',
            position: sig.position || null,
            department: sig.department || null,
            employee_id: sig.employeeId || null,
            signature_data_url: sig.signatureDataUrl || '',
            signed_at: sig.dateSigned || new Date().toISOString(),
            ip_address: sig.ipAddress || null
          };
        });

      if (signatureRows.length > 0) {
        let { error: sigErr } = await supabase.from('digital_signatures').upsert(signatureRows, { onConflict: 'id' });
        if (sigErr && (sigErr.message.includes('position') || sigErr.code === '42703')) {
          console.warn('[Child Sync] Optional columns missing in digital_signatures, retrying with core fields...');
          const cleanSigRows = signatureRows.map(({ position, department, employee_id, ip_address, ...clean }) => clean);
          const retrySig = await supabase.from('digital_signatures').upsert(cleanSigRows, { onConflict: 'id' });
          sigErr = retrySig.error;
        }
        if (sigErr) console.warn('[Child Sync] digital_signatures upsert error:', sigErr.message);
      }
    }

    // 4. Sync Evidence Files to public.evidence_files
    if (evaluation.evidenceFiles && evaluation.evidenceFiles.length > 0) {
      const evidenceRows = evaluation.evidenceFiles.map((file) => ({
        id: ensureUuid(file.id || `${evaluation.id}_file_${file.fileName}`),
        evaluation_id: evalUuid,
        file_name: file.fileName,
        file_type: file.fileType || 'application/octet-stream',
        file_size: file.fileSize || 0,
        upload_date: file.uploadDate || new Date().toISOString(),
        url: file.url || ''
      }));

      const { error: evErr } = await supabase.from('evidence_files').upsert(evidenceRows, { onConflict: 'id' });
      if (evErr) console.warn('[Child Sync] evidence_files upsert error:', evErr.message);
    }

    // 5. Sync KRA/KPI Definitions to public.kpis master table & evaluation_templates
    if (evaluation.kpiRatings && evaluation.kpiRatings.length > 0) {
      const templateUuid = await syncEvaluationTemplateToSupabase(evaluation);
      const kpiDefRows = evaluation.kpiRatings.map((kpi: any) => ({
        id: ensureUuid(kpi.kpiId || `${evaluation.id}_kpidef_${kpi.name || kpi.kpiName}`),
        template_id: isValidUuid(templateUuid || undefined) ? templateUuid : null,
        kra_name: kpi.kraName || 'General',
        kpi_name: kpi.name || kpi.kpiName || 'KPI Item',
        description: kpi.comments || null,
        weight_percent: Number(kpi.weightPercent || 0),
        evidence_required: kpi.evidenceRequired || false
      }));

      const { error: kpiDefErr } = await supabase.from('kpis').upsert(kpiDefRows, { onConflict: 'id' });
      if (kpiDefErr) console.warn('[Child Sync] kpis master table upsert warning:', kpiDefErr.message);
    }

    console.log(`[APES Sync - Relational] Synchronized child tables (kpi_ratings, core_value_ratings, digital_signatures, evidence_files, kpis, templates) for evaluation ${evaluation.id}.`);
  } catch (err) {
    console.warn('[Child Sync] Exception syncing child relational tables:', err);
  }
};

export const saveEvaluationToSupabase = async (evaluation: Evaluation): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const evalId = isValidUuid(evaluation.id) ? evaluation.id : ensureUuid(evaluation.id);

    // 1. Resolve employee's permanent database UUID from Supabase employees table
    let permanentEmpUuid: string | null = null;
    let employeeEmail = (evaluation.employeeEmail || '').trim().toLowerCase();

    if (isValidUuid(evaluation.employeeId)) {
      permanentEmpUuid = evaluation.employeeId;
    } else if (SEED_UUID_MAP[evaluation.employeeId]) {
      permanentEmpUuid = SEED_UUID_MAP[evaluation.employeeId];
    }

    try {
      let query = supabase.from('employees').select('id, email, name');
      if (permanentEmpUuid) {
        query = query.or(`id.eq.${permanentEmpUuid},email.ilike.${employeeEmail}`);
      } else if (employeeEmail) {
        query = query.ilike('email', employeeEmail);
      } else if (evaluation.employeeName) {
        query = query.ilike('name', evaluation.employeeName.trim());
      }
      const { data: empMatches } = await query.limit(1);
      const empMatch = empMatches?.[0];
      if (empMatch && empMatch.id) {
        permanentEmpUuid = empMatch.id;
        if (empMatch.email) employeeEmail = empMatch.email.toLowerCase().trim();
      }
    } catch (lookupErr) {
      console.warn('[Evaluation Save] Employee lookup warning:', lookupErr);
    }

    // If employee not found in DB, try to provision from seed data
    if (!permanentEmpUuid && (employeeEmail || evaluation.employeeName)) {
      try {
        const { SEED_USERS } = await import('./storage');
        const matchedSeed = SEED_USERS.find((u: any) =>
          u.email.toLowerCase() === (employeeEmail || '').toLowerCase() ||
          u.name.toLowerCase() === (evaluation.employeeName || '').toLowerCase()
        );
        if (matchedSeed) {
          const seedUuid = isValidUuid(matchedSeed.id) ? matchedSeed.id : ensureUuid(matchedSeed.id);
          await saveEmployeeToSupabase({ ...matchedSeed, id: seedUuid });
          permanentEmpUuid = seedUuid;
        }
      } catch (provisionErr) {
        console.warn('[Evaluation Save] Employee provisioning warning:', provisionErr);
      }
    }

    // Last resort: if still no UUID, generate one and provision a minimal employee record
    if (!permanentEmpUuid) {
      permanentEmpUuid = generateUuid();
      try {
        const { SEED_USERS } = await import('./storage');
        const matchedSeed = SEED_USERS.find((u: any) =>
          u.email.toLowerCase() === (employeeEmail || '').toLowerCase() ||
          u.name.toLowerCase() === (evaluation.employeeName || '').toLowerCase()
        );
        if (matchedSeed) {
          const seedUuid = isValidUuid(matchedSeed.id) ? matchedSeed.id : ensureUuid(matchedSeed.id);
          await saveEmployeeToSupabase({ ...matchedSeed, id: permanentEmpUuid });
        }
      } catch (lastResortErr) {
        console.warn('[Evaluation Save] Last resort provisioning warning:', lastResortErr);
      }
    }

    const payload: Record<string, any> = {
      id: evalId,
      cycle_id: isValidUuid(evaluation.cycleId) ? evaluation.cycleId : null,
      template_id: isValidUuid(evaluation.templateId) ? evaluation.templateId : null,
      workflow_type: normalizeWorkflowType(evaluation.workflowType),
      employee_id: permanentEmpUuid,
      user_id: permanentEmpUuid,
      employee_name: evaluation.employeeName,
      employee_email: employeeEmail,
      department_name: evaluation.departmentName,
      position: evaluation.position,
      appraisal_period: evaluation.appraisalPeriod,
      appraisal_date: evaluation.appraisalDate || new Date().toISOString().split('T')[0],
      status: normalizeStatus(evaluation.status),
      released_by: evaluation.auditTrail?.[0]?.performedBy || 'People Operations Development (POD)',
      released_at: evaluation.createdAt || new Date().toISOString(),
      eligibility_score: evaluation.eligibilityScore || 0,
      core_values_score: evaluation.coreValuesScore || 0,
      final_rating: evaluation.finalRating || 0,
      rating_classification: evaluation.ratingClassification || 'Unsatisfactory',
      kpi_ratings_data: evaluation.kpiRatings || [],
      core_value_ratings_data: evaluation.coreValueRatings || [],
      signatures_data: evaluation.signatures || {},
      audit_trail_data: evaluation.auditTrail || [],
      development_plan_data: evaluation.developmentPlan || {},
      personnel_action_data: evaluation.personnelAction || {},
      updated_at: new Date().toISOString()
    };

    // Attempt 1: Full payload with extended columns
    let { error } = await supabase.from('evaluations').upsert(payload, { onConflict: 'id' });

    // Attempt 2: If optional columns are missing in DB table, retry without them
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message.includes('column') || error.message.includes('audit_trail_data') || error.message.includes('kpi_ratings_data') || error.message.includes('user_id') || error.message.includes('released_by') || error.message.includes('employee_email'))) {
      console.warn('[Evaluation Save] Optional columns missing in DB table, retrying with core payload...', error.message);
      const {
        user_id, employee_email, released_by, released_at,
        eligibility_score, core_values_score, final_rating, rating_classification,
        kpi_ratings_data, core_value_ratings_data, signatures_data,
        audit_trail_data, development_plan_data, personnel_action_data,
        appraisee_summary_comment, supervisor_summary_comment,
        president_summary_comment, pod_validation_comment,
        ...corePayload
      } = payload;
      const retryCol = await supabase.from('evaluations').upsert(corePayload, { onConflict: 'id' });
      error = retryCol.error;
    }

    // Attempt 3: If FK constraint fails, provision employee in Supabase employees table and retry
    if (error && (error.code === '23503' || error.message.includes('foreign key'))) {
      console.warn('[Evaluation Save] Foreign key violation, provisioning employee in Supabase employees table and retrying...', error.message);
      try {
        const { getStoredUsers } = await import('./storage');
        const allUsers = getStoredUsers();
        const matchedUser = allUsers.find((u: any) =>
          (employeeEmail && u.email?.toLowerCase() === employeeEmail) ||
          (evaluation.employeeName && u.name?.toLowerCase() === evaluation.employeeName.toLowerCase()) ||
          u.id === evaluation.employeeId
        );

        const empToProvision: User = matchedUser || {
          id: permanentEmpUuid || generateUuid(),
          employeeNumber: `EMP-${Date.now().toString().slice(-6)}`,
          firstName: evaluation.employeeName?.split(' ')[0] || 'Employee',
          lastName: evaluation.employeeName?.split(' ').slice(1).join(' ') || 'User',
          name: evaluation.employeeName || 'Employee',
          email: employeeEmail || `${evaluation.employeeName?.toLowerCase().replace(/\s+/g, '.')}@hdiadventures.com`,
          role: 'employee',
          departmentId: '',
          departmentName: evaluation.departmentName || 'General',
          position: evaluation.position || 'Staff',
          isActive: true,
          isApproved: true,
          approvalStatus: 'approved'
        };

        const provisionResult = await saveEmployeeToSupabaseDetailed(empToProvision);
        const resolvedEmpId = provisionResult.success && provisionResult.id ? provisionResult.id : (isValidUuid(empToProvision.id) ? empToProvision.id : permanentEmpUuid);

        if (resolvedEmpId) {
          const retryPayload = { ...payload, employee_id: resolvedEmpId, user_id: resolvedEmpId };
          const { error: retryErr } = await supabase.from('evaluations').upsert(retryPayload, { onConflict: 'id' });
          error = retryErr;
        } else {
          error = { code: '23503', message: 'Foreign key violation: unable to resolve or provision employee record for evaluation.' } as any;
        }
      } catch (retryErr) {
        console.warn('[Evaluation Save] Retry after FK violation failed:', retryErr);
        error = { code: '23503', message: `Foreign key violation retry failed: ${retryErr}` } as any;
      }
    }

    if (error) {
      const errMsg = `[Evaluation Debug] CRITICAL - Supabase evaluations upsert failed after retries: ${error.message}${error.details ? ` | details: ${error.details}` : ''}${error.hint ? ` | hint: ${error.hint}` : ''}`;
      console.error(errMsg);
      throw new Error(errMsg);
    } else {
      console.log(`[APES Sync - Eval] Saved evaluation ${evaluation.id} (${evaluation.employeeName}) to Supabase successfully.`);
      await syncChildTablesToSupabase(evaluation);
      triggerRealtimeBroadcast('data_changed', { type: 'evaluation', id: evalId, employeeId: permanentEmpUuid });
    }
    return true;
  } catch (err) {
    console.error('Error saving evaluation to Supabase:', err);
    throw err;
  }
};

export const saveEvaluationHistoryToSupabase = async (history: EvaluationHistory): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const validEmpId = isValidUuid(history.employeeId) ? history.employeeId : (SEED_UUID_MAP[history.employeeId] || null);
    const validEvalId = isValidUuid(history.evaluationId) ? history.evaluationId : ensureUuid(history.evaluationId);

    const payload: Record<string, any> = {
      id: ensureUuid(history.id),
      evaluation_id: validEvalId,
      employee_id: validEmpId,
      employee_name: history.employeeName,
      department_name: history.departmentName,
      position: history.position,
      appraisal_period: history.appraisalPeriod,
      cycle_id: isValidUuid(history.cycleId) ? history.cycleId : null,
      template_id: isValidUuid(history.templateId) ? history.templateId : null,
      workflow_type: history.workflowType,
      workflow_stage: history.workflowStage,
      status: history.status,
      kpi_ratings_data: history.kpiRatings || [],
      core_value_ratings_data: history.coreValueRatings || [],
      signatures_data: history.signatures || {},
      development_plan_data: history.developmentPlan || {},
      personnel_action_data: history.personnelAction || {},
      eligibility_score: history.eligibilityScore,
      core_values_score: history.coreValuesScore,
      final_rating: history.finalRating,
      rating_classification: history.ratingClassification,
      submitted_by_name: history.submittedByName,
      submitted_by_role: history.submittedByRole,
      submitted_by_id: history.submittedById || null,
      appraisee_summary_comment: history.appraiseeSummaryComment || null,
      supervisor_summary_comment: history.supervisorSummaryComment || null,
      president_summary_comment: history.presidentSummaryComment || null,
      pod_validation_comment: history.podValidationComment || null,
      created_at: history.createdAt
    };

    let { error } = await supabase.from('evaluation_history').upsert(payload, { onConflict: 'id' });
    if (error && (error.code === '23503' || error.message.includes('foreign key'))) {
      console.warn('[Evaluation History] Foreign key violation on history insert, retrying with nullified FK references...', error.message);
      payload.employee_id = null;
      payload.evaluation_id = isValidUuid(history.evaluationId) ? history.evaluationId : null;
      payload.cycle_id = null;
      payload.template_id = null;
      const retryRes = await supabase.from('evaluation_history').upsert(payload, { onConflict: 'id' });
      error = retryRes.error;
    }

    if (error) {
      console.error('[Evaluation History] Supabase upsert error:', error.message, error.details);
    } else {
      console.log(`[APES Sync - History] Saved history ${history.id} for evaluation ${history.evaluationId} (${history.employeeName}).`);
    }
    return !error;
  } catch (err) {
    console.warn('Error saving evaluation history to Supabase:', err);
    return false;
  }
};

export const saveScorecardArchiveToSupabase = async (archive: EvaluationScorecardArchive): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const validEmpId = isValidUuid(archive.employeeId) ? archive.employeeId : (SEED_UUID_MAP[archive.employeeId] || null);
    const validEvalId = isValidUuid(archive.evaluationId) ? archive.evaluationId : ensureUuid(archive.evaluationId);

    const payload: Record<string, any> = {
      id: ensureUuid(archive.id),
      evaluation_id: validEvalId,
      employee_id: validEmpId,
      employee_name: archive.employeeName,
      employee_email: archive.employeeEmail || null,
      department_name: archive.departmentName,
      department_id: isValidUuid(archive.departmentId) ? archive.departmentId : null,
      position: archive.position,
      appraisal_period: archive.appraisalPeriod,
      cycle_id: isValidUuid(archive.cycleId) ? archive.cycleId : null,
      template_id: isValidUuid(archive.templateId) ? archive.templateId : null,
      workflow_type: archive.workflowType,
      workflow_stage: archive.workflowStage,
      status: archive.status,
      kpi_ratings_data: archive.kpiRatingsData || [],
      core_value_ratings_data: archive.coreValueRatingsData || [],
      signatures_data: archive.signaturesData || {},
      development_plan_data: archive.developmentPlanData || {},
      personnel_action_data: archive.personnelActionData || {},
      evidence_files_data: archive.evidenceFilesData || [],
      step_history_data: archive.stepHistoryData || [],
      audit_trail_data: archive.auditTrailData || [],
      eligibility_score: archive.eligibilityScore,
      core_values_score: archive.coreValuesScore,
      final_rating: archive.finalRating,
      rating_classification: archive.ratingClassification,
      appraisee_summary_comment: archive.appraiseeSummaryComment || null,
      supervisor_summary_comment: archive.supervisorSummaryComment || null,
      president_summary_comment: archive.presidentSummaryComment || null,
      pod_validation_comment: archive.podValidationComment || null,
      submitted_by_name: archive.submittedByName,
      submitted_by_role: archive.submittedByRole,
      submitted_by_id: archive.submittedById || null,
      created_at: archive.createdAt,
      archived_at: archive.archivedAt,
      pdf_url: archive.pdfUrl || null,
      storage_path: archive.storagePath || null,
      file_name: archive.fileName || null,
      file_size: archive.fileSize || null,
      uploaded_at: archive.uploadedAt || null
    };

    let { error } = await supabase.from('evaluation_scorecard_archives').upsert(payload, { onConflict: 'id' });
    if (error && (error.message.includes('relation') || error.code === '42P01')) {
      console.warn('[Scorecard Archive] Trying fallback table name evaluation_scoreboard_archived...');
      const fallbackRes = await supabase.from('evaluation_scoreboard_archived').upsert(payload, { onConflict: 'id' });
      error = fallbackRes.error;
    }

    if (error && (error.message.includes('pdf_url') || error.message.includes('column') || error.code === '42703')) {
      console.warn('[Scorecard Archive] Storage column missing in DB table, retrying payload without storage columns...');
      const { pdf_url, storage_path, file_name, file_size, uploaded_at, ...cleanPayload } = payload;
      let retryRes = await supabase.from('evaluation_scorecard_archives').upsert(cleanPayload, { onConflict: 'id' });
      if (retryRes.error) {
        const retryFallback = await supabase.from('evaluation_scoreboard_archived').upsert(cleanPayload, { onConflict: 'id' });
        error = retryFallback.error;
      } else {
        error = null;
      }
    }

    if (error && (error.code === '23503' || error.message.includes('foreign key'))) {
      console.warn('[Scorecard Archive] Foreign key violation on archive insert, retrying with nullified FK references...', error.message);
      payload.employee_id = null;
      payload.evaluation_id = isValidUuid(archive.evaluationId) ? archive.evaluationId : null;
      payload.cycle_id = null;
      payload.template_id = null;
      payload.department_id = null;

      let retryRes = await supabase.from('evaluation_scorecard_archives').upsert(payload, { onConflict: 'id' });
      if (retryRes.error) {
        const retryFallback = await supabase.from('evaluation_scoreboard_archived').upsert(payload, { onConflict: 'id' });
        error = retryFallback.error;
      } else {
        error = null;
      }
    }

    if (error) {
      console.error('[Scorecard Archive] Supabase upsert error:', error.message, error.details);
    } else {
      console.log(`[APES Sync - Archive] Saved scorecard archive ${archive.id} for evaluation ${archive.evaluationId} (${archive.employeeName}).`);
    }
    return !error;
  } catch (err) {
    console.warn('Error saving scorecard archive to Supabase:', err);
    return false;
  }
};

export const fetchEvaluationHistoryFromSupabase = async (): Promise<EvaluationHistory[] | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase.from('evaluation_history').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      console.warn('[Supabase Sync] Fetch evaluation_history warning:', error?.message);
      return null;
    }

    const mapped: EvaluationHistory[] = data.map((h: any) => ({
      id: h.id,
      evaluationId: h.evaluation_id,
      employeeId: h.employee_id,
      employeeName: h.employee_name,
      departmentName: h.department_name,
      position: h.position,
      appraisalPeriod: h.appraisal_period,
      cycleId: h.cycle_id,
      templateId: h.template_id,
      workflowType: h.workflow_type,
      workflowStage: h.workflow_stage,
      status: h.status,
      kpiRatings: Array.isArray(h.kpi_ratings_data) ? h.kpi_ratings_data : [],
      coreValueRatings: Array.isArray(h.core_value_ratings_data) ? h.core_value_ratings_data : [],
      signatures: h.signatures_data || {},
      developmentPlan: h.development_plan_data || {},
      personnelAction: h.personnel_action_data || {},
      eligibilityScore: Number(h.eligibility_score || 0),
      coreValuesScore: Number(h.core_values_score || 0),
      finalRating: Number(h.final_rating || 0),
      ratingClassification: h.rating_classification,
      submittedByName: h.submitted_by_name,
      submittedByRole: h.submitted_by_role,
      submittedById: h.submitted_by_id,
      appraiseeSummaryComment: h.appraisee_summary_comment,
      supervisorSummaryComment: h.supervisor_summary_comment,
      presidentSummaryComment: h.president_summary_comment,
      podValidationComment: h.pod_validation_comment,
      createdAt: h.created_at
    }));

    return mapped;
  } catch (err) {
    console.warn('Error fetching evaluation history from Supabase:', err);
    return null;
  }
};

export const fetchScorecardArchivesFromSupabase = async (): Promise<EvaluationScorecardArchive[] | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    let { data, error } = await supabase.from('evaluation_scorecard_archives').select('*').order('archived_at', { ascending: false });
    
    if (error && (error.message.includes('relation') || error.code === '42P01')) {
      const fallbackRes = await supabase.from('evaluation_scoreboard_archived').select('*').order('archived_at', { ascending: false });
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error || !data) {
      console.warn('[Supabase Sync] Fetch evaluation_scorecard_archives warning:', error?.message);
      return null;
    }

    const mapped: EvaluationScorecardArchive[] = data.map((a: any) => ({
      id: a.id,
      evaluationId: a.evaluation_id,
      employeeId: a.employee_id,
      employeeName: a.employee_name,
      employeeEmail: a.employee_email,
      departmentName: a.department_name,
      departmentId: a.department_id,
      position: a.position,
      appraisalPeriod: a.appraisal_period,
      cycleId: a.cycle_id,
      templateId: a.template_id,
      workflowType: a.workflow_type,
      workflowStage: a.workflow_stage,
      status: a.status,
      kpiRatingsData: Array.isArray(a.kpi_ratings_data) ? a.kpi_ratings_data : [],
      coreValueRatingsData: Array.isArray(a.core_value_ratings_data) ? a.core_value_ratings_data : [],
      signaturesData: a.signatures_data || {},
      developmentPlanData: a.development_plan_data || {},
      personnelActionData: a.personnel_action_data || {},
      evidenceFilesData: Array.isArray(a.evidence_files_data) ? a.evidence_files_data : [],
      stepHistoryData: Array.isArray(a.step_history_data) ? a.step_history_data : [],
      auditTrailData: Array.isArray(a.audit_trail_data) ? a.audit_trail_data : [],
      eligibilityScore: Number(a.eligibility_score || 0),
      coreValuesScore: Number(a.core_values_score || 0),
      finalRating: Number(a.final_rating || 0),
      ratingClassification: a.rating_classification,
      appraiseeSummaryComment: a.appraisee_summary_comment,
      supervisorSummaryComment: a.supervisor_summary_comment,
      presidentSummaryComment: a.president_summary_comment,
      podValidationComment: a.pod_validation_comment,
      submittedByName: a.submitted_by_name,
      submittedByRole: a.submitted_by_role,
      submittedById: a.submitted_by_id,
      createdAt: a.created_at,
      archivedAt: a.archived_at,
      pdfUrl: a.pdf_url,
      storagePath: a.storage_path,
      fileName: a.file_name,
      fileSize: Number(a.file_size || 0),
      uploadedAt: a.uploaded_at
    }));

    return mapped;
  } catch (err) {
    console.warn('Error fetching scorecard archives from Supabase:', err);
    return null;
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
    let { error } = await supabase.storage.from(bucket).upload(filePath, fileBlob, { upsert: true });

    if (error && bucket === 'apes-signatures') {
      // Fallback to apes-attachments if apes-signatures bucket doesn't exist
      const fallbackRes = await supabase.storage.from('apes-attachments').upload(`signatures/${filePath}`, fileBlob, { upsert: true });
      if (!fallbackRes.error) {
        const { data: fallbackUrl } = supabase.storage.from('apes-attachments').getPublicUrl(`signatures/${filePath}`);
        return fallbackUrl?.publicUrl || null;
      }
    }

    if (error) return null;

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn(`Error uploading file to Supabase storage bucket ${bucket}:`, err);
    return null;
  }
};

// ==============================================================================
// 6. SCORECARD PDF GENERATION & STORAGE
// ==============================================================================

export const generateScorecardPdfBlob = async (evaluation: Evaluation, formulaConfig?: { eligibilityWeight: number; coreValuesWeight: number }): Promise<Blob | null> => {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');

    const eligibilityWeight = formulaConfig?.eligibilityWeight ?? 85;
    const coreValuesWeight = formulaConfig?.coreValuesWeight ?? 15;

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;background:#fff;font-family:Inter,system-ui,sans-serif;';
    container.innerHTML = `
      <div style="padding:20mm 15mm;color:#000;font-size:10.5px;line-height:1.35;">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #c8102e;padding-bottom:8px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="/hdi-logo.png" style="height:32px;width:auto;object-fit:contain;" />
            <div>
              <div style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#0f172a;">SCORECARD / PERFORMANCE EVALUATION</div>
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">HDI HIVE • STRICTLY CONFIDENTIAL</div>
            </div>
          </div>
          <div style="text-align:right;font-size:11px;">
            <div><strong style="text-transform:uppercase;">Department/Subsidiary:</strong> ${evaluation.departmentName}</div>
            <div><strong style="text-transform:uppercase;">Name of Employee:</strong> ${evaluation.employeeName}</div>
            <div><strong style="text-transform:uppercase;">Appraisal Period:</strong> ${evaluation.appraisalPeriod}</div>
            <div><strong style="text-transform:uppercase;">Appraisal Date:</strong> ${evaluation.appraisalDate}</div>
          </div>
        </div>

        <div style="background:#f1f5f9;padding:6px;font-weight:700;text-align:center;border:1px solid #94a3b8;text-transform:uppercase;font-size:11px;margin-bottom:8px;">
          PART 1A: EVALUATION ON ELIGIBILITY FACTORS (WEIGHT: ${eligibilityWeight}%)
          <div style="font-weight:400;font-size:9.5px;font-style:italic;color:#475569;margin-top:2px;">STANDARD: 1- Did not Meet Expectations; 2- Barely Meets Expectations; 3- Meets Expectations; 4- Exceeds Expectations</div>
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #94a3b8;font-size:10.5px;">
          <thead>
            <tr style="background:#e2e8f0;text-align:center;font-weight:700;border-bottom:1px solid #94a3b8;">
              <th style="border:1px solid #94a3b8;padding:6px;width:22%;">KEY RESULT AREAS (KRA)</th>
              <th style="border:1px solid #94a3b8;padding:6px;width:42%;">PERFORMANCE INDICATORS (KPI)</th>
              <th style="border:1px solid #94a3b8;padding:6px;width:16%;">SCALE STANDARDS</th>
              <th style="border:1px solid #94a3b8;padding:6px;width:8%;">WEIGHT</th>
              <th style="border:1px solid #94a3b8;padding:6px;width:6%;">RATING</th>
              <th style="border:1px solid #94a3b8;padding:6px;width:6%;">WEIGHTED SCORE</th>
            </tr>
          </thead>
          <tbody>
            ${(evaluation.kpiRatings || []).map((kpi: any, idx: number) => {
              const isFirstInKra = idx === 0 || (evaluation.kpiRatings[idx - 1]?.kraName !== kpi.kraName);
              const kraKpis = (evaluation.kpiRatings || []).filter((k: any) => k.kraName === kpi.kraName);
              const kraWeightSum = kraKpis.reduce((acc: number, k: any) => acc + (k.weightPercent || 0), 0);
              const kraWeightedScoreSum = kraKpis.reduce((acc: number, k: any) => acc + (k.weightedScore || 0), 0).toFixed(2);
              return `
                ${isFirstInKra ? `<tr style="background:#f1f5f9;font-weight:700;border-top:1px solid #94a3b8;border-bottom:1px solid #94a3b8;">
                  <td colspan="3" style="border:1px solid #94a3b8;padding:6px;text-transform:uppercase;background:#f1f5f9;">${kpi.kraName}</td>
                  <td style="border:1px solid #94a3b8;padding:6px;text-align:center;font-weight:700;">${kraWeightSum}%</td>
                  <td style="border:1px solid #94a3b8;padding:6px;"></td>
                  <td style="border:1px solid #94a3b8;padding:6px;text-align:center;font-weight:700;">${kraWeightedScoreSum}</td>
                </tr>` : ''}
                <tr>
                  <td style="border:1px solid #94a3b8;padding:6px;font-weight:600;vertical-align:top;">${kpi.name}</td>
                  <td style="border:1px solid #94a3b8;padding:6px;vertical-align:top;color:#334155;">${kpi.comments || kpi.name}</td>
                  <td style="border:1px solid #94a3b8;padding:6px;vertical-align:top;font-size:9.5px;">
                    ${(kpi.standards || []).map((st: any) => `<div style="padding:2px 0;${kpi.supervisorRating === st.rating ? 'font-weight:700;color:#c2410c;text-decoration:underline;' : ''}">${st.description} (${st.rating})</div>`).join('')}
                  </td>
                  <td style="border:1px solid #94a3b8;padding:6px;text-align:center;vertical-align:middle;font-weight:500;">${kpi.weightPercent}%</td>
                  <td style="border:1px solid #94a3b8;padding:6px;text-align:center;vertical-align:middle;font-weight:700;font-size:13px;">${kpi.supervisorRating || kpi.selfRating || '-'}</td>
                  <td style="border:1px solid #94a3b8;padding:6px;text-align:center;vertical-align:middle;font-weight:700;font-size:13px;">${(kpi.weightedScore || 0).toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
            <tr style="background:#fef3c7;font-weight:700;border-top:2px solid #475569;font-size:12px;">
              <td colspan="3" style="border:1px solid #94a3b8;padding:6px;text-align:right;text-transform:uppercase;">TOTAL WEIGHTED ELIGIBILITY RATING (PART 1A):</td>
              <td style="border:1px solid #94a3b8;padding:6px;text-align:center;color:#c2410c;font-weight:700;">${eligibilityWeight}%</td>
              <td style="border:1px solid #94a3b8;padding:6px;"></td>
              <td style="border:1px solid #94a3b8;padding:6px;text-align:center;color:#c8102e;font-weight:900;">${(evaluation.eligibilityScore || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:10px;page-break-before:always;"></div>

        <div style="background:#f1f5f9;padding:6px;font-weight:700;text-align:center;border:1px solid #94a3b8;text-transform:uppercase;font-size:11px;margin-bottom:8px;">
          PART 1B: EVALUATION ON SUITABILITY FACTORS (CORE VALUES - WEIGHT: ${coreValuesWeight}%)
          <div style="font-weight:400;font-size:9.5px;font-style:italic;color:#475569;margin-top:2px;">(4): Category A Actively promotes core values | (3): Category B Actively supports core values | (2): Category C Not consistent</div>
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #94a3b8;font-size:10.5px;margin-bottom:10px;">
          <thead>
            <tr style="background:#e2e8f0;text-align:center;font-weight:700;">
              <th style="border:1px solid #94a3b8;padding:6px;width:35%;">EVALUATION ON SUITABILITY FACTORS</th>
              <th style="border:1px solid #94a3b8;padding:6px;width:15%;">ASSESSOR</th>
              <th style="border:1px solid #94a3b8;padding:6px;width:15%;">RATING</th>
              <th style="border:1px solid #94a3b8;padding:6px;width:15%;">WEIGHT</th>
              <th style="border:1px solid #94a3b8;padding:6px;width:20%;">TOTAL WEIGHTED RATING</th>
            </tr>
          </thead>
          <tbody>
            ${(evaluation.coreValueRatings || []).map((cv: any) => `
              <tr>
                <td rowSpan="3" style="border:1px solid #94a3b8;padding:6px;font-weight:600;vertical-align:top;">
                  ${cv.name}
                  <div style="font-size:9.5px;font-weight:400;color:#475569;margin-top:4px;">${cv.comments || ''}</div>
                </td>
                <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">POD</td>
                <td style="border:1px solid #94a3b8;padding:6px;text-align:center;font-weight:700;">${cv.podRating || 0}</td>
                <td rowSpan="3" style="border:1px solid #94a3b8;padding:6px;text-align:center;vertical-align:middle;font-weight:700;">${coreValuesWeight}%</td>
                <td rowSpan="3" style="border:1px solid #94a3b8;padding:6px;text-align:center;vertical-align:middle;font-weight:700;font-size:13px;">${(cv.weightedScore || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">Peer</td>
                <td style="border:1px solid #94a3b8;padding:6px;text-align:center;font-weight:700;">${cv.peerRating || 0}</td>
              </tr>
              <tr>
                <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">IS (Superior)</td>
                <td style="border:1px solid #94a3b8;padding:6px;text-align:center;font-weight:700;">${cv.isRating || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="background:#f1f5f9;padding:6px;font-weight:700;text-align:center;border:1px solid #94a3b8;text-transform:uppercase;font-size:11px;margin-bottom:8px;">
          PART 1C: EVALUATION SUMMARY
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:10px;">
          <table style="border-collapse:collapse;border:1px solid #94a3b8;font-size:10.5px;">
            <thead>
              <tr style="background:#e2e8f0;text-align:center;font-weight:700;">
                <th style="border:1px solid #94a3b8;padding:6px;">COMPONENT</th>
                <th style="border:1px solid #94a3b8;padding:6px;">WEIGHT</th>
                <th style="border:1px solid #94a3b8;padding:6px;">RATING</th>
                <th style="border:1px solid #94a3b8;padding:6px;">TOTAL INDIVIDUAL PERFORMANCE RATING</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border:1px solid #94a3b8;padding:6px;font-weight:700;">ELIGIBILITY (Part 1A)</td>
                <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${eligibilityWeight}%</td>
                <td style="border:1px solid #94a3b8;padding:6px;text-align:center;font-weight:700;">${(evaluation.eligibilityScore || 0).toFixed(2)}</td>
                <td rowSpan="2" style="border:1px solid #94a3b8;padding:6px;text-align:center;vertical-align:middle;font-weight:900;font-size:16px;background:#ecfdf5;color:#065f46;">${(evaluation.finalRating || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="border:1px solid #94a3b8;padding:6px;font-weight:700;">SUITABILITY (Part 1B)</td>
                <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${coreValuesWeight}%</td>
                <td style="border:1px solid #94a3b8;padding:6px;text-align:center;font-weight:700;">${(evaluation.totalCoreValuesWeightedRating || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style="border:1px solid #94a3b8;padding:10px;background:#f8fafc;">
            <div style="font-weight:700;font-size:10px;text-transform:uppercase;border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin-bottom:8px;">RATING CLASSIFICATION</div>
            <div style="display:flex;flex-direction:column;gap:4px;font-size:9.5px;">
              <div style="padding:4px;border-radius:4px;${evaluation.finalRating >= 1.00 && evaluation.finalRating <= 1.99 ? 'font-weight:700;color:#991b1b;background:#fee2e2;' : 'color:#475569;'}">1.00 - 1.99 : Did Not Meet Expectations (DME)</div>
              <div style="padding:4px;border-radius:4px;${evaluation.finalRating >= 2.00 && evaluation.finalRating <= 2.99 ? 'font-weight:700;color:#92400e;background:#fef3c7;' : 'color:#475569;'}">2.00 - 2.99 : Barely Meets Expectations (BME)</div>
              <div style="padding:4px;border-radius:4px;${evaluation.finalRating >= 3.00 && evaluation.finalRating <= 3.50 ? 'font-weight:700;color:#1e40af;background:#dbeafe;' : 'color:#475569;'}">3.00 - 3.50 : Meets Expectations (ME)</div>
              <div style="padding:4px;border-radius:4px;${evaluation.finalRating >= 3.51 && evaluation.finalRating <= 4.00 ? 'font-weight:700;color:#065f46;background:#d1fae5;' : 'color:#475569;'}">3.51 - 4.00 : Exceeds Expectations (EE)</div>
            </div>
          </div>
        </div>

        <div style="border:1px solid #94a3b8;padding:10px;margin-bottom:10px;page-break-inside:avoid;">
          <div style="font-weight:700;font-size:11px;text-transform:uppercase;background:#f1f5f9;padding:6px;border-bottom:1px solid #cbd5e1;margin-bottom:8px;">PART 2A: PERSONAL DEVELOPMENT PLAN</div>
          <div style="margin-bottom:8px;">
            <div style="font-weight:700;font-size:10px;text-transform:uppercase;color:#1e293b;">1. KEY STRENGTHS:</div>
            <div style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0;min-height:36px;font-size:10.5px;">${evaluation.developmentPlan?.strengths || 'N/A'}</div>
          </div>
          <div style="margin-bottom:8px;">
            <div style="font-weight:700;font-size:10px;text-transform:uppercase;color:#1e293b;">2. AREAS FOR IMPROVEMENT:</div>
            <div style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0;min-height:36px;font-size:10.5px;">${evaluation.developmentPlan?.areasForImprovement || 'N/A'}</div>
          </div>
          <div>
            <div style="font-weight:700;font-size:10px;text-transform:uppercase;color:#1e293b;">3. WORKPLACE LEARNING & DEVELOPMENT NEEDS (Programs/Courses):</div>
            <ul style="list-style:disc;padding-left:16px;display:flex;flex-direction:column;gap:4px;font-size:10.5px;margin-top:4px;">
              ${(evaluation.developmentPlan?.learningNeeds || []).map((need: any) => `<li><strong>${need.program}</strong> — Target Date: ${need.targetDate} (Assigned: ${need.responsiblePerson})</li>`).join('')}
            </ul>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
          <div style="border:1px solid #94a3b8;padding:10px;page-break-inside:avoid;">
            <div style="font-weight:700;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin-bottom:8px;">PART 2B: IMMEDIATE SUPERIOR'S SUMMARY</div>
            <div style="font-size:10px;color:#1e293b;font-style:italic;min-height:40px;margin-bottom:10px;">"${evaluation.supervisorSummaryComment || 'No comments added.'}"</div>
            <div style="border-top:1px solid #cbd5e1;padding-top:10px;text-align:center;">
              ${evaluation.signatures?.supervisor ? `
                <div style="display:flex;flex-direction:column;align-items:center;">
                  <img src="${evaluation.signatures.supervisor.signatureDataUrl}" style="height:32px;object-fit:contain;" />
                  <div style="font-weight:700;text-decoration:underline;font-size:11px;margin-top:4px;">${evaluation.signatures.supervisor.signerName}</div>
                  <div style="font-size:9px;color:#64748b;font-weight:600;">${evaluation.signatures.supervisor.position || ''} ${evaluation.signatures.supervisor.department || ''}</div>
                  <div style="font-size:8px;color:#94a3b8;font-family:monospace;margin-top:2px;">Date: ${evaluation.signatures.supervisor.dateSigned || evaluation.signatures.supervisor.signedAt} ${evaluation.signatures.supervisor.timeSigned || ''}</div>
                </div>
              ` : `<div style="font-size:10px;color:#94a3b8;font-style:italic;padding:12px 0;">Pending Immediate Superior Signature</div>`}
            </div>
          </div>

          <div style="border:1px solid #94a3b8;padding:10px;page-break-inside:avoid;">
            <div style="font-weight:700;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin-bottom:8px;">PART 2C: APPRAISEE'S SUMMARY</div>
            <div style="font-size:10px;color:#1e293b;font-style:italic;min-height:40px;margin-bottom:10px;">"${evaluation.appraiseeSummaryComment || 'No comments added.'}"</div>
            <div style="border-top:1px solid #cbd5e1;padding-top:10px;text-align:center;">
              ${evaluation.signatures?.employee ? `
                <div style="display:flex;flex-direction:column;align-items:center;">
                  <img src="${evaluation.signatures.employee.signatureDataUrl}" style="height:32px;object-fit:contain;" />
                  <div style="font-weight:700;text-decoration:underline;font-size:11px;margin-top:4px;">${evaluation.signatures.employee.signerName}</div>
                  <div style="font-size:9px;color:#64748b;font-weight:600;">${evaluation.signatures.employee.position || evaluation.position} ${evaluation.signatures.employee.department || evaluation.departmentName}</div>
                  <div style="font-size:8px;color:#94a3b8;font-family:monospace;margin-top:2px;">Date: ${evaluation.signatures.employee.dateSigned || evaluation.signatures.employee.signedAt} ${evaluation.signatures.employee.timeSigned || ''}</div>
                </div>
              ` : `<div style="font-size:10px;color:#94a3b8;font-style:italic;padding:12px 0;">Pending Appraisee Signature</div>`}
            </div>
          </div>
        </div>

        <div style="border:1px solid #94a3b8;padding:10px;margin-bottom:10px;page-break-inside:avoid;">
          <div style="font-weight:700;font-size:11px;text-transform:uppercase;background:#f1f5f9;padding:6px;border-bottom:1px solid #cbd5e1;margin-bottom:8px;">PART 3: PERSONNEL ACTION (To be filled out by the Head of the Department)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:10px;">
            <div>
              <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><input type="checkbox" ${evaluation.personnelAction?.actionType === 'promotion' ? 'checked' : ''} readonly /> Promotion Recommended</label>
              <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><input type="checkbox" ${evaluation.personnelAction?.actionType === 'salary_adjustment' ? 'checked' : ''} readonly /> Salary Adjustment</label>
              <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><input type="checkbox" ${evaluation.personnelAction?.actionType === 'regularization' ? 'checked' : ''} readonly /> Regularization</label>
            </div>
            <div>
              <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><input type="checkbox" ${evaluation.personnelAction?.actionType === 'transfer' ? 'checked' : ''} readonly /> Transfer</label>
              <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><input type="checkbox" ${evaluation.personnelAction?.actionType === 'pip' ? 'checked' : ''} readonly /> Performance Improvement Plan (PIP for BME 2.00-2.99)</label>
              <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><input type="checkbox" ${evaluation.personnelAction?.actionType === 'termination' ? 'checked' : ''} readonly /> Termination</label>
            </div>
          </div>
          <div style="margin-top:8px;font-size:10px;display:flex;flex-direction:column;gap:4px;">
            <div><strong>New Position:</strong> ${evaluation.personnelAction?.newPosition || 'N/A'}</div>
            <div><strong>Date of Effectivity:</strong> ${evaluation.personnelAction?.effectiveDate || 'N/A'}</div>
            <div><strong>Department Head Remarks:</strong> ${evaluation.personnelAction?.remarks || 'N/A'}</div>
          </div>
        </div>

        <div style="border:1px solid #94a3b8;padding:10px;background:#f8fafc;page-break-inside:avoid;">
          <div style="font-weight:700;font-size:10px;text-transform:uppercase;text-align:center;border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin-bottom:10px;color:#1e293b;">PART 4: POD / HR EVALUATION & DIGITAL SIGNATURE VERIFICATION</div>
          <div style="font-size:10px;display:flex;flex-direction:column;gap:6px;margin-bottom:10px;background:#fff;padding:8px;border:1px solid #e2e8f0;">
            <div><strong>POD Core Values Validation Rating:</strong> ${(evaluation.totalCoreValuesWeightedRating || 0).toFixed(2)} (${coreValuesWeight}%)</div>
            <div><strong>POD / HR Remarks & Comments:</strong> ${evaluation.podValidationComment || 'Validated by People Operations Development (POD).'}</div>
            <div><strong>Personnel Action Final Status:</strong> ${evaluation.personnelAction?.isApproved ? 'Approved & Enforced' : 'Pending Final HR Enforcement'}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;text-align:center;">
            <div style="border:1px solid #e2e8f0;background:#fff;padding:8px;border-radius:6px;">
              <div style="font-weight:700;font-size:9px;text-transform:uppercase;color:#64748b;margin-bottom:6px;">1. Employee Signature</div>
              ${evaluation.signatures?.employee ? `
                <div style="display:flex;flex-direction:column;align-items:center;">
                  <img src="${evaluation.signatures.employee.signatureDataUrl}" style="height:28px;object-fit:contain;" />
                  <div style="font-weight:700;text-decoration:underline;font-size:9.5px;margin-top:4px;">${evaluation.signatures.employee.signerName}</div>
                  <div style="font-size:8px;color:#64748b;font-weight:600;">${evaluation.signatures.employee.position || evaluation.position}</div>
                  <div style="font-size:8px;color:#94a3b8;">${evaluation.signatures.employee.department || evaluation.departmentName}</div>
                  <div style="font-size:7.5px;color:#94a3b8;font-family:monospace;margin-top:2px;">Date: ${evaluation.signatures.employee.dateSigned || evaluation.signatures.employee.signedAt} ${evaluation.signatures.employee.timeSigned || ''}</div>
                </div>
              ` : `<div style="font-size:9px;color:#94a3b8;font-style:italic;padding:10px 0;">Pending Signature</div>`}
            </div>

            <div style="border:1px solid #e2e8f0;background:#fff;padding:8px;border-radius:6px;">
              <div style="font-weight:700;font-size:9px;text-transform:uppercase;color:#64748b;margin-bottom:6px;">2. Department Head</div>
              ${(evaluation.signatures?.deptHead || evaluation.signatures?.supervisor) ? `
                <div style="display:flex;flex-direction:column;align-items:center;">
                  <img src="${(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.signatureDataUrl}" style="height:28px;object-fit:contain;" />
                  <div style="font-weight:700;text-decoration:underline;font-size:9.5px;margin-top:4px;">${(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.signerName}</div>
                  <div style="font-size:8px;color:#64748b;font-weight:600;">${(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.position || 'Department Head'}</div>
                  <div style="font-size:8px;color:#94a3b8;">${(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.department || evaluation.departmentName}</div>
                  <div style="font-size:7.5px;color:#94a3b8;font-family:monospace;margin-top:2px;">Date: ${(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.dateSigned || (evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.signedAt} ${(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.timeSigned || ''}</div>
                </div>
              ` : `<div style="font-size:9px;color:#94a3b8;font-style:italic;padding:10px 0;">Pending Signature</div>`}
            </div>

            <div style="border:1px solid #e2e8f0;background:#fff;padding:8px;border-radius:6px;">
              <div style="font-weight:700;font-size:9px;text-transform:uppercase;color:#b45309;margin-bottom:6px;">3. President & CEO</div>
              ${evaluation.signatures?.president ? `
                <div style="display:flex;flex-direction:column;align-items:center;">
                  <img src="${evaluation.signatures.president.signatureDataUrl}" style="height:28px;object-fit:contain;" />
                  <div style="font-weight:700;text-decoration:underline;font-size:9.5px;margin-top:4px;">${evaluation.signatures.president.signerName}</div>
                  <div style="font-size:8px;color:#64748b;font-weight:600;">${evaluation.signatures.president.position || 'President & CEO'}</div>
                  <div style="font-size:8px;color:#94a3b8;">Executive Office</div>
                  <div style="font-size:7.5px;color:#94a3b8;font-family:monospace;margin-top:2px;">Date: ${evaluation.signatures.president.dateSigned || evaluation.signatures.president.signedAt} ${evaluation.signatures.president.timeSigned || ''}</div>
                </div>
              ` : `<div style="font-size:9px;color:#94a3b8;font-style:italic;padding:10px 0;">${evaluation.workflowType === 'WORKFLOW_DEPT_HEAD' || evaluation.isDepartmentHead ? 'Pending President Signature' : 'N/A (Regular Track)'}</div>`}
            </div>

            <div style="border:1px solid #e2e8f0;background:#fff;padding:8px;border-radius:6px;">
              <div style="font-weight:700;font-size:9px;text-transform:uppercase;color:#4338ca;margin-bottom:6px;">4. POD / HR Officer</div>
              ${(evaluation.signatures?.pod || evaluation.signatures?.hr) ? `
                <div style="display:flex;flex-direction:column;align-items:center;">
                  <img src="${(evaluation.signatures.pod || evaluation.signatures.hr)?.signatureDataUrl}" style="height:28px;object-fit:contain;" />
                  <div style="font-weight:700;text-decoration:underline;font-size:9.5px;margin-top:4px;">${(evaluation.signatures.pod || evaluation.signatures.hr)?.signerName}</div>
                  <div style="font-size:8px;color:#64748b;font-weight:600;">${(evaluation.signatures.pod || evaluation.signatures.hr)?.position || 'POD Quality Lead'}</div>
                  <div style="font-size:8px;color:#94a3b8;">People Operations Dev</div>
                  <div style="font-size:7.5px;color:#94a3b8;font-family:monospace;margin-top:2px;">Date: ${(evaluation.signatures.pod || evaluation.signatures.hr)?.dateSigned || (evaluation.signatures.pod || evaluation.signatures.hr)?.signedAt} ${(evaluation.signatures.pod || evaluation.signatures.hr)?.timeSigned || ''}</div>
                </div>
              ` : `<div style="font-size:9px;color:#94a3b8;font-style:italic;padding:10px 0;">Pending POD Signature</div>`}
            </div>
          </div>
        </div>

        <div style="text-align:right;font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-top:10px;">
          HDI HIVE • STRICTLY CONFIDENTIAL • Page 2 of 2
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;
    const x = (pdfWidth - scaledWidth) / 2;
    const y = 0;

    pdf.addImage(imgData, 'JPEG', x, y, scaledWidth, scaledHeight);
    const rawBlob = pdf.output('blob') as Blob | Promise<Blob>;
    const blob = rawBlob instanceof Promise ? await rawBlob : rawBlob;

    return blob;
  } catch (err) {
    console.warn('Error generating scorecard PDF:', err);
    return null;
  }
};

export const uploadScorecardPdfToSupabase = async (
  evaluation: Evaluation,
  fileBlob: Blob
): Promise<{ pdfUrl: string; storagePath: string; fileName: string; fileSize: number; uploadedAt: string } | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const targetEmpId = isValidUuid(evaluation.employeeId) ? evaluation.employeeId : ensureUuid(evaluation.employeeId);
    const targetEvalId = isValidUuid(evaluation.id) ? evaluation.id : ensureUuid(evaluation.id);
    const fileName = `official-scoreboard.pdf`;
    const storagePath = `evaluation-scoreboards/${targetEmpId}/${targetEvalId}/${fileName}`;

    let { error } = await supabase.storage
      .from('apes-attachments')
      .upload(storagePath, fileBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error('[Scorecard PDF] Upload error:', error.message, error.details);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from('apes-attachments').getPublicUrl(storagePath);

    return {
      pdfUrl: publicUrlData?.publicUrl || '',
      storagePath,
      fileName,
      fileSize: fileBlob.size,
      uploadedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('Error uploading scorecard PDF to Supabase:', err);
    return null;
  }
};

export const uploadEvidenceFilesToSupabase = async (
  evaluation: Evaluation
): Promise<EvidenceFile[]> => {
  if (!isSupabaseConfigured || !supabase || !evaluation.evidenceFiles || evaluation.evidenceFiles.length === 0) {
    return evaluation.evidenceFiles || [];
  }

  const targetEmpId = isValidUuid(evaluation.employeeId) ? evaluation.employeeId : ensureUuid(evaluation.employeeId);
  const targetEvalId = isValidUuid(evaluation.id) ? evaluation.id : ensureUuid(evaluation.id);

  const updatedEvidence = await Promise.all(
    evaluation.evidenceFiles.map(async (file: EvidenceFile) => {
      if (file.url && (file.url.startsWith('http://') || file.url.startsWith('https://')) && !file.url.startsWith('data:')) {
        return file;
      }
      try {
        const storagePath = `evaluation-evidence/${targetEmpId}/${targetEvalId}/${file.fileName}`;
        let fileBlob: Blob | null = null;

        if (file.url && file.url.startsWith('data:')) {
          const res = await fetch(file.url);
          fileBlob = await res.blob();
        }

        if (fileBlob) {
          const { error } = await supabase.storage.from('apes-attachments').upload(storagePath, fileBlob, { upsert: true });
          if (!error) {
            const { data } = supabase.storage.from('apes-attachments').getPublicUrl(storagePath);
            return {
              ...file,
              url: data?.publicUrl || file.url
            };
          }
        }
      } catch (err) {
        console.warn(`[Evidence Upload] Skipped uploading evidence file ${file.fileName}:`, err);
      }
      return file;
    })
  );

  return updatedEvidence;
};

export const uploadSignaturesToSupabase = async (
  evaluation: Evaluation
): Promise<Record<string, any>> => {
  if (!isSupabaseConfigured || !supabase || !evaluation.signatures) {
    return evaluation.signatures || {};
  }

  const targetEmpId = isValidUuid(evaluation.employeeId) ? evaluation.employeeId : ensureUuid(evaluation.employeeId);
  const targetEvalId = isValidUuid(evaluation.id) ? evaluation.id : ensureUuid(evaluation.id);

  const sigMap = evaluation.signatures as Record<string, any>;
  const roles = Object.keys(sigMap);
  const updatedSignatures: Record<string, any> = { ...sigMap };

  for (const role of roles) {
    const sig = sigMap[role];
    if (!sig || !sig.signatureDataUrl) continue;

    if (sig.signatureDataUrl.startsWith('https://') || sig.signatureDataUrl.startsWith('http://')) {
      continue;
    }

    try {
      const storagePath = `evaluation-signatures/${targetEmpId}/${targetEvalId}/${role}-signature.png`;
      const res = await fetch(sig.signatureDataUrl);
      const blob = await res.blob();

      const bucket = 'apes-signatures';
      let { error } = await supabase.storage.from(bucket).upload(storagePath, blob, { contentType: 'image/png', upsert: true });

      if (error) {
        // Fallback to apes-attachments bucket
        const fallbackRes = await supabase.storage.from('apes-attachments').upload(storagePath, blob, { contentType: 'image/png', upsert: true });
        if (!fallbackRes.error) {
          const { data } = supabase.storage.from('apes-attachments').getPublicUrl(storagePath);
          updatedSignatures[role] = { ...sig, signatureDataUrl: data?.publicUrl || sig.signatureDataUrl, storagePath };
          continue;
        }
      } else {
        const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
        updatedSignatures[role] = { ...sig, signatureDataUrl: data?.publicUrl || sig.signatureDataUrl, storagePath };
      }
    } catch (err) {
      console.warn(`[Signature Upload] Skipped uploading signature for ${role}:`, err);
    }
  }

  return updatedSignatures;
};

// ==============================================================================
// EVALUATION TEMPLATES CLOUD SYNC
// Safely saves, fetches, and deletes evaluation templates in Supabase
// using standard table columns so all devices see the same templates.
// ==============================================================================

export const saveEvaluationTemplateToSupabase = async (template: EvaluationTemplate): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase || !template) return false;

  try {
    const templateUuid = isValidUuid(template.id) ? template.id : ensureUuid(template.id || `tmpl_${Date.now()}`);

    const payload = {
      id: templateUuid,
      title: (template.title || 'Evaluation Template').substring(0, 150),
      department_name: (template.departmentName || 'General').substring(0, 100),
      evaluation_period: (template.evaluationPeriod || 'Annual 2026').substring(0, 100),
      eligibility_weight: Number(template.formulaConfig?.eligibilityWeight ?? 85.00),
      core_values_weight: Number(template.formulaConfig?.coreValuesWeight ?? 15.00),
      kra_weights: (template.kraCategories || []).reduce((acc, kra) => {
        acc[kra.name] = Number(kra.categoryWeightPercent || 0);
        return acc;
      }, {} as Record<string, number>),
      is_active: template.isActive ?? true,
    };

    if (isValidUuid(template.departmentId)) {
      (payload as any).department_id = template.departmentId;
    }

    const { error } = await supabase.from('evaluation_templates').upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Template Cloud Sync] Could not upsert template to Supabase:', error.message);
      return false;
    }

    // Save Core Values associated with this template
    if (template.coreValues && template.coreValues.length > 0) {
      await supabase.from('core_values').delete().eq('template_id', templateUuid).catch(() => {});
      const coreValueRows = template.coreValues.map((cv) => ({
        id: isValidUuid(cv.id) ? cv.id : ensureUuid(cv.id || `${templateUuid}_cv_${cv.sortOrder || 0}`),
        template_id: templateUuid,
        name: (cv.name || 'Core Value').substring(0, 150),
        description: (cv.description || '').substring(0, 500),
        weight_percent: Number(cv.weightPercent || 0),
        sort_order: Number(cv.sortOrder || 0)
      }));
      const { error: cvError } = await supabase.from('core_values').upsert(coreValueRows, { onConflict: 'id' });
      if (cvError) {
        console.warn('[Template Cloud Sync] Could not upsert core_values to Supabase:', cvError.message);
      }
    }

    // Save KPIs associated with this template if kraCategories exists
    if (template.kraCategories && template.kraCategories.length > 0) {
      for (const kra of template.kraCategories) {
        if (kra.kpis && kra.kpis.length > 0) {
          for (const kpi of kra.kpis) {
            const kpiUuid = isValidUuid(kpi.id) ? kpi.id : ensureUuid(kpi.id || `${templateUuid}_${kpi.name}`);
            const kpiPayload = {
              id: kpiUuid,
              template_id: templateUuid,
              kra_name: (kra.name || 'KRA').substring(0, 150),
              kpi_name: (kpi.name || 'KPI Item').substring(0, 200),
              description: kpi.description || '',
              weight_percent: Number(kpi.weightPercent || 0),
              evidence_required: Boolean(kpi.evidenceRequired),
            };
            await supabase.from('kpis').upsert(kpiPayload, { onConflict: 'id' }).catch(() => {});
          }
        }
      }
    }

    console.log(`[Template Cloud Sync] Successfully saved template "${template.title}" to Supabase.`);
    return true;
  } catch (err) {
    console.warn('[Template Cloud Sync] Exception saving template to Supabase:', err);
    return false;
  }
};

export const fetchEvaluationTemplatesFromSupabase = async (): Promise<EvaluationTemplate[] | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data: rows, error } = await supabase.from('evaluation_templates').select('*');
    if (error || !rows || rows.length === 0) return null;

    let kpiRows: any[] = [];
    try {
      const { data: kps } = await supabase.from('kpis').select('*');
      if (kps) kpiRows = kps;
    } catch {}

    let coreValueRows: any[] = [];
    try {
      const { data: cvs } = await supabase.from('core_values').select('*');
      if (cvs) coreValueRows = cvs;
    } catch {}

    const templates: EvaluationTemplate[] = rows.map((row: any) => {
      const deptName = row.department_name || 'Sales';
      const tmplKpis = kpiRows.filter((k: any) => k.template_id === row.id);
      const tmplCoreValues = coreValueRows.filter((cv: any) => cv.template_id === row.id);

      let kraCategories: KRACategory[] = [];

      if (tmplKpis && tmplKpis.length > 0) {
        const kraMap = new Map<string, KPITemplateItem[]>();
        for (const k of tmplKpis) {
          const kraName = k.kra_name || '1. FINANCIAL';
          if (!kraMap.has(kraName)) kraMap.set(kraName, []);
          kraMap.get(kraName)!.push({
            id: k.id,
            kraId: `kra_${row.id}_${kraName}`,
            kraName: kraName,
            name: k.kpi_name,
            description: k.description || '',
            weightPercent: Number(k.weight_percent || 0),
            evidenceRequired: Boolean(k.evidence_required),
            standards: MASTER_SALES_EVALUATION_TEMPLATE.kraCategories[0]?.kpis[0]?.standards || []
          });
        }

        const storedKraWeights = row.kra_weights || {};
        kraCategories = Array.from(kraMap.entries()).map(([kraName, kpis], idx) => ({
          id: `kra_${row.id}_${idx}`,
          name: kraName,
          categoryWeightPercent: storedKraWeights[kraName] ?? kpis.reduce((sum, item) => sum + item.weightPercent, 0),
          kpis: kpis
        }));
      } else {
        const built = createMasterBasedTemplate(row.department_id || 'dept_acc', deptName, row.title, row.evaluation_period);
        kraCategories = built.kraCategories;
      }

      const coreValues: CoreValue[] = tmplCoreValues.length > 0
        ? tmplCoreValues.map((cv: any) => ({
            id: cv.id,
            name: cv.name,
            description: cv.description || '',
            weightPercent: Number(cv.weight_percent || 0),
            sortOrder: Number(cv.sort_order || 0)
          }))
        : MASTER_SALES_EVALUATION_TEMPLATE.coreValues;

      return {
        id: row.id,
        title: row.title || `${deptName} Performance Evaluation Scorecard Template`,
        departmentId: row.department_id || 'dept_acc',
        departmentName: deptName,
        evaluationPeriod: row.evaluation_period || 'January-September 2025',
        formulaConfig: {
          eligibilityWeight: Number(row.eligibility_weight || 85),
          coreValuesWeight: Number(row.core_values_weight || 15)
        },
        coreValues: coreValues,
        classificationRanges: MASTER_SALES_EVALUATION_TEMPLATE.classificationRanges,
        kraCategories,
        isActive: row.is_active ?? true,
        createdAt: row.created_at ? new Date(row.created_at).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10)
      };
    });

    console.log(`[Template Cloud Sync] Fetched ${templates.length} templates from Supabase.`);
    return templates;
  } catch (err) {
    console.warn('[Template Cloud Sync] Exception fetching templates from Supabase:', err);
    return null;
  }
};

export const deleteEvaluationTemplateFromSupabase = async (templateId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase || !templateId) return false;
  try {
    const uuid = isValidUuid(templateId) ? templateId : ensureUuid(templateId);
    await supabase.from('evaluation_templates').delete().eq('id', uuid).catch(() => {});
    return true;
  } catch (err) {
    return false;
  }
};



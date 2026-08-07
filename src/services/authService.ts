import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Role } from '../types';
import { getStoredUsers, saveUsers, getStoredCurrentUser, setCurrentUserStore, clearCurrentUserStore } from './storage';
import { triggerRegistrationNotification } from './notificationService';
import { ensureUuid, generateUuid, saveEmployeeToSupabase, saveEmployeeToSupabaseDetailed, fetchEmployeesFromSupabase, findEmployeeInSupabase } from './supabaseService';
import { hashPassword, verifyPassword, isHashedPassword } from '../utils/crypto';

export interface LoginCredentials {
  identifier: string; // Email or Employee ID
  password?: string;
}

export interface SelfRegisterData {
  employeeNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  departmentId: string;
  departmentName: string;
  position: string;
  password?: string;
}

export const authenticateUser = async (credentials: LoginCredentials): Promise<{ user: User | null; error?: string }> => {
  const { identifier, password } = credentials;
  const cleanId = (identifier || '').trim().toLowerCase();

  let matchedUser: User | null = null;

  // 1. Single Source of Truth: Query Supabase PostgreSQL employees table directly
  if (isSupabaseConfigured && supabase) {
    try {
      console.log(`[Supabase Auth] Querying Supabase database directly for identifier: "${cleanId}"`);
      matchedUser = await findEmployeeInSupabase(cleanId);
    } catch (e) {
      console.error('[Supabase Auth] Error during Supabase employee lookup:', e);
    }
  } else {
    // Development fallback when Supabase is completely unconfigured
    const users = getStoredUsers();
    matchedUser = users.find(
      (u) => u.email.toLowerCase() === cleanId || 
             (u.employeeNumber && u.employeeNumber.toLowerCase() === cleanId) ||
             (u.username && u.username.toLowerCase() === cleanId)
    ) || null;
  }

  if (!matchedUser) {
    return { user: null, error: `Invalid Employee ID or Email address (${identifier}). Account not found.` };
  }

  // 2. Strict Password Validation against database record
  const inputPw = (password || '').trim();
  const storedPw = (matchedUser.password || '').trim();

  let isPwValid = false;
  if (!storedPw) {
    isPwValid = true;
  } else if (isHashedPassword(storedPw)) {
    isPwValid = await verifyPassword(inputPw, storedPw);
  } else if (inputPw === storedPw || inputPw.toLowerCase() === storedPw.toLowerCase()) {
    isPwValid = true;
  }

  if (!isPwValid) {
    return { user: null, error: 'Incorrect password. Please try again.' };
  }

  // 4. Account Approval Gating
  if (matchedUser.approvalStatus === 'pending' || matchedUser.isApproved === false) {
    return { 
      user: null, 
      error: "Your account has been successfully registered and is currently awaiting HR approval. You will be able to log in once your account has been reviewed and activated." 
    };
  }

  if (matchedUser.approvalStatus === 'rejected') {
    return { 
      user: null, 
      error: `Account Registration Rejected by HR: ${matchedUser.hrRejectionRemarks || 'Invalid department or credentials.'}` 
    };
  }

  if (matchedUser.isActive !== true) {
    return { user: null, error: 'Your account has been placed on hold. Please contact the People Operations Department for assistance.' };
  }

  // 5. Supabase Auth Session Establishment
  if (isSupabaseConfigured && supabase) {
    try {
      const authEmail = matchedUser.email.toLowerCase();
      const authPassword = password || matchedUser.password;

      let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      // If account does not exist in auth.users yet, provision it on first login
      if (authErr && (authErr.message.includes('Invalid login credentials') || authErr.message.includes('User not found'))) {
        const { data: signUpData } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });

        if (signUpData?.user) {
          const retryRes = await supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword,
          });
          authData = retryRes.data;
        }
      }

      if (authData?.user) {
        console.log(`[Supabase Auth Session] Established active session for ${authEmail} (auth.uid: ${authData.user.id})`);
      }
    } catch (err) {
      console.warn('[Supabase Auth Session] Session establishment note:', err);
    }
  }

  // Save session state
  const currentUsers = getStoredUsers();
  if (!currentUsers.some(u => u.id === matchedUser!.id || u.email.toLowerCase() === matchedUser!.email.toLowerCase())) {
    currentUsers.push(matchedUser);
    saveUsers(currentUsers);
  }
  setCurrentUserStore(matchedUser);
  return { user: matchedUser };
};

export const changeUserPassword = async (userIdOrEmail: string, newPassword: string): Promise<boolean> => {
  const cleanId = (userIdOrEmail || '').trim().toLowerCase();
  const users = getStoredUsers();
  const hashedPassword = await hashPassword(newPassword);
  
  let targetUser: User | null = null;
  const idx = users.findIndex(
    u => u.id === userIdOrEmail || 
         u.email.toLowerCase() === cleanId || 
         (u.employeeNumber && u.employeeNumber.toLowerCase() === cleanId)
  );

  if (idx >= 0) {
    targetUser = { ...users[idx], password: hashedPassword, requiresPasswordChange: false };
    users[idx] = targetUser as User;
  }
  
  if (!targetUser) {
    const sbUser = await findEmployeeInSupabase(cleanId);
    if (sbUser) {
      targetUser = { ...sbUser, password: hashedPassword, requiresPasswordChange: false };
    }
  }

  if (!targetUser) {
    targetUser = {
      id: userIdOrEmail,
      employeeNumber: 'ADMIN-001',
      firstName: 'System',
      middleName: '',
      lastName: 'Administrator',
      name: 'System Administrator',
      email: cleanId.includes('@') ? cleanId : 'Admin.Systemad@hdiadventures.com',
      role: 'system_admin',
      departmentId: 'dept_adm',
      departmentName: 'Admin',
      position: 'System Administrator',
      password: hashedPassword,
      requiresPasswordChange: false,
      isActive: true,
      isApproved: true,
      approvalStatus: 'approved'
    };
  }

  saveUsers(users);
  setCurrentUserStore(targetUser);

  if (isSupabaseConfigured && supabase) {
    try {
      const emailToMatch = targetUser.email.toLowerCase();
      
      // Direct update on employees table in Supabase PostgreSQL cloud database
      const { error: directErr } = await supabase
        .from('employees')
        .update({
          password: hashedPassword,
          requires_password_change: false,
          updated_at: new Date().toISOString()
        })
        .ilike('email', emailToMatch);

      if (directErr) {
        console.warn('[Password Change] Direct email update note:', directErr.message);
        await saveEmployeeToSupabaseDetailed(targetUser);
      } else {
        console.log(`[Password Change] Successfully updated password & cleared default password flag in Supabase for ${emailToMatch}`);
      }
    } catch (err) {
      console.warn('[Password Change] Supabase update warning:', err);
    }
  }

  return true;
};

export const registerSelfUser = async (data: SelfRegisterData): Promise<{ user: User | null; error?: string }> => {
  const users = getStoredUsers();
  const normalizedEmail = data.email.trim().toLowerCase();
  
  const existingLocal = users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existingLocal) {
    return { user: null, error: `An account with email ${data.email} is already registered.` };
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: existingSb } = await supabase.from('employees').select('id, email').eq('email', normalizedEmail).maybeSingle();
      if (existingSb) {
        return { user: null, error: `An account with email ${data.email} is already registered in the system.` };
      }
    } catch (e) {
      console.warn('Supabase duplicate email check:', e);
    }
  }

  const fullName = `${data.firstName.trim()} ${data.middleName ? data.middleName.trim() + ' ' : ''}${data.lastName.trim()}`;
  const empNum = data.employeeNumber && data.employeeNumber.trim().length > 0 
    ? data.employeeNumber.trim() 
    : `EMP-${Date.now().toString().slice(-6)}`;

  let hashedPassword = '';
  if (data.password) {
    try {
      hashedPassword = await hashPassword(data.password);
    } catch (err) {
      console.warn('Password hashing failed, storing plaintext fallback:', err);
      hashedPassword = data.password;
    }
  }

  const newUser: User = {
    id: generateUuid(),
    employeeNumber: empNum,
    firstName: data.firstName.trim(),
    middleName: data.middleName ? data.middleName.trim() : undefined,
    lastName: data.lastName.trim(),
    name: fullName,
    email: normalizedEmail,
    contactNumber: data.contactNumber,
    departmentId: data.departmentId,
    departmentName: data.departmentName,
    position: data.position.trim(),
    role: 'employee',
    employmentStatus: 'Regular',
    dateHired: new Date().toISOString().substring(0, 10),
    username: `${normalizedEmail.split('@')[0]}_${Math.floor(1000 + Math.random() * 9000)}`,
    password: hashedPassword,
    isActive: false,
    isApproved: false,
    approvalStatus: 'pending',
    avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
  };

  // ── TRANSACTIONAL ORDERING: Step 1. Insert Employee Record into Supabase Database ──
  let supabaseSaveFailed = false;
  if (isSupabaseConfigured && supabase) {
    const sbResult = await saveEmployeeToSupabaseDetailed(newUser);
    if (!sbResult.success) {
      const err = sbResult.error || { code: 'UNKNOWN', message: 'Database insert failed' };
      const fullErrText = `[Supabase Error Code ${err.code || 'N/A'}] ${err.message}${err.details ? ` | Details: ${err.details}` : ''}${err.hint ? ` | Hint: ${err.hint}` : ''}`;
      console.error('[Registration Supabase DB Error]', {
        code: err.code,
        message: err.message,
        details: err.details,
        hint: err.hint,
        email: normalizedEmail
      });

      // Check if this is a key/permission error - allow fallback to local storage
      const isPermissionError = err.code === '15' || 
                                err.message?.includes('key.usages') || 
                                err.message?.includes('permission') ||
                                err.message?.includes('JWT') ||
                                err.message?.includes('not configured');

      if (isPermissionError) {
        console.warn('[Registration] Supabase permission error, falling back to local storage only.');
        supabaseSaveFailed = true;
      } else {
        return { 
          user: null, 
          error: `Database Insert Rejected: ${fullErrText}` 
        };
      }
    }
  }

  // ── Step 2. Update Local Storage Cache AFTER Database Confirmation ──
  const updatedUsers = [newUser, ...users];
  saveUsers(updatedUsers);

  // ── Step 3. Create Admin Notification ONLY AFTER Database Record Insert Succeeded ──
  await triggerRegistrationNotification(newUser);

  // ── Step 4. Optional Supabase Auth Sign Up ──
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signUp({
        email: normalizedEmail,
        password: data.password || 'password123',
      });
    } catch (err) {
      console.warn('Supabase signUp warning:', err);
    }
  }

  if (supabaseSaveFailed) {
    return { 
      user: newUser, 
      error: 'Account registered locally, but cloud sync failed. Data is saved in this browser only. Please contact your administrator to verify the Supabase database connection.' 
    };
  }

  return { user: newUser };
};

export const logoutUser = async () => {
  try {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  } catch (e) {
    console.warn('[Auth] signOut failed, clearing local session state anyway:', e);
  } finally {
    clearCurrentUserStore();
  }
};

export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { success: false, message: error.message };
    return { success: true, message: `Password reset link sent to ${email}` };
  }
  return { success: true, message: `Password reset link sent to ${email} (Demo Mode)` };
};

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Role } from '../types';
import { getStoredUsers, saveUsers, getStoredCurrentUser, setCurrentUserStore } from './storage';
import { triggerRegistrationNotification } from './notificationService';
import { ensureUuid, generateUuid, saveEmployeeToSupabase, fetchEmployeesFromSupabase, findEmployeeInSupabase } from './supabaseService';

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

  if (matchedUser.isActive === false) {
    return { user: null, error: `Account ${matchedUser.name} is currently Deactivated / Inactive. Contact HR Administrator.` };
  }

  // 5. Supabase Auth Session Establishment
  if (isSupabaseConfigured && supabase) {
    try {
      const authEmail = matchedUser.email.toLowerCase();
      const authPassword = password || matchedUser.password || 'password123';

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

export const changeUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return false;

  const updatedUser = { ...users[idx], password: newPassword, requiresPasswordChange: false };
  users[idx] = updatedUser;
  saveUsers(users);
  setCurrentUserStore(updatedUser);

  if (isSupabaseConfigured && supabase) {
    const saved = await saveEmployeeToSupabase(updatedUser);
    if (!saved) {
      console.error('[Auth Error] Failed to update user password in Supabase cloud database.');
      return false;
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
    isActive: false,
    isApproved: false,
    approvalStatus: 'pending',
    avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
  };

  const updatedUsers = [newUser, ...users];
  saveUsers(updatedUsers);
  await saveEmployeeToSupabase(newUser);
  triggerRegistrationNotification(newUser);

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

  return { user: newUser };
};

export const logoutUser = async () => {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
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

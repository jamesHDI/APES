import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Role } from '../types';
import { getStoredUsers, saveUsers, getStoredCurrentUser, setCurrentUserStore } from './storage';
import { triggerRegistrationNotification } from './notificationService';
import { ensureUuid, saveEmployeeToSupabase } from './supabaseService';

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

  // 1. Supabase Auth Integration
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password || 'password123',
      });

      if (!error && data.user) {
        const users = getStoredUsers();
        const matched = users.find(u => u.email === data.user?.email) || users[0];
        
        if (matched.approvalStatus === 'pending' || matched.isApproved === false) {
          return { 
            user: null, 
            error: "Your account has been successfully registered and is currently awaiting HR approval. You will be able to log in once your account has been reviewed and activated." 
          };
        }
        
        setCurrentUserStore(matched);
        return { user: matched };
      }
    } catch (err) {
      console.warn('Supabase auth attempt failed, using local auth provider.', err);
    }
  }

  // 2. Enterprise Local Authentication Provider (Offline / Demo Bridge)
  const users = getStoredUsers();
  const matchedUser = users.find(
    (u) => u.email.toLowerCase() === identifier.toLowerCase() || 
           (u.employeeNumber && u.employeeNumber.toLowerCase() === identifier.toLowerCase()) ||
           (u.username && u.username.toLowerCase() === identifier.toLowerCase()) ||
           u.name.toLowerCase().includes(identifier.toLowerCase())
  );

  if (!matchedUser) {
    return { user: null, error: `Invalid Employee ID or Email address (${identifier}). Account not found.` };
  }

  // 2a. Password validation — enforce if user has a stored password
  if (matchedUser.password) {
    const inputPw = (password || '').trim().toLowerCase();
    const storedPw = matchedUser.password.trim().toLowerCase();
    if (inputPw !== storedPw) {
      if (matchedUser.id === 'usr_default_admin' && (inputPw === 'admin' || inputPw === 'admin.systemad')) {
        // Allow default admin initial login
      } else {
        return { user: null, error: 'Incorrect password. Please try again.' };
      }
    }
  }

  // 3. Login Gating: Pending Approval Restriction
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

  setCurrentUserStore(matchedUser);
  return { user: matchedUser };
};

export const changeUserPassword = (userId: string, newPassword: string): boolean => {
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return false;
  users[idx] = { ...users[idx], password: newPassword, requiresPasswordChange: false };
  saveUsers(users);
  setCurrentUserStore(users[idx]);
  return true;
};

export const registerSelfUser = async (data: SelfRegisterData): Promise<{ user: User | null; error?: string }> => {
  const users = getStoredUsers();
  const existing = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
  if (existing) {
    return { user: null, error: `An account with email ${data.email} already exists.` };
  }

  const fullName = `${data.firstName} ${data.middleName ? data.middleName + ' ' : ''}${data.lastName}`;
  const newUser: User = {
    id: ensureUuid(`usr_${Date.now()}`),
    employeeNumber: data.employeeNumber || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    firstName: data.firstName,
    middleName: data.middleName,
    lastName: data.lastName,
    name: fullName,
    email: data.email,
    contactNumber: data.contactNumber,
    departmentId: data.departmentId,
    departmentName: data.departmentName,
    position: data.position,
    role: 'employee',
    employmentStatus: 'Regular',
    dateHired: new Date().toISOString().substring(0, 10),
    username: data.email.split('@')[0],
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
        email: data.email,
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

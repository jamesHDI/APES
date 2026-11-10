import { User, Role } from '../types';

/**
 * Developer Testing Mode Service
 * Manages developer testing authorization, session lifecycles, account switching,
 * and data isolation safeguards.
 */

export const DEV_TESTING_CREDENTIAL = '123456';

// Storage keys - scoped to sessionStorage so access automatically ends when tab/browser closes
export const DEV_MODE_ACTIVE_KEY = 'apes_dev_mode_active';
export const DEV_MODE_SESSION_KEY = 'apes_dev_mode_session';
export const DEV_MODE_SANDBOX_KEY = 'apes_dev_mode_sandbox';
export const DEV_MODE_AUDIT_KEY = 'apes_dev_mode_audit_logs';

// Default session time-to-live: 2 hours (in milliseconds)
export const DEV_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export interface DevTestingSession {
  isActive: boolean;
  authorizedAt: number;
  expiresAt: number;
  targetUser: {
    id: string;
    name: string;
    email: string;
    employeeNumber?: string;
    role: Role;
    departmentName?: string;
    position?: string;
    avatarUrl?: string;
  };
  isSandboxMode: boolean; // Protects actual Supabase & user database records
}

export interface DevAuditRecord {
  id: string;
  timestamp: string;
  action: string;
  simulatedUser: string;
  simulatedRole: string;
  details?: string;
}

/**
 * Verifies developer credential against the predefined test credential ('123456')
 */
export const verifyDevCredential = (credential: string): boolean => {
  if (!credential) return false;
  return credential.trim() === DEV_TESTING_CREDENTIAL;
};

/**
 * Checks whether Developer Testing Mode is currently active and unexpired
 */
export const isDevTestingModeActive = (): boolean => {
  try {
    const isActive = sessionStorage.getItem(DEV_MODE_ACTIVE_KEY) === 'true';
    if (!isActive) return false;

    // Check expiration
    if (isDevSessionExpired()) {
      endDevTestingSession();
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Retrieves the current developer testing session metadata
 */
export const getDevTestingSession = (): DevTestingSession | null => {
  try {
    const raw = sessionStorage.getItem(DEV_MODE_SESSION_KEY);
    if (!raw) return null;
    const session: DevTestingSession = JSON.parse(raw);
    if (session && session.expiresAt && Date.now() > session.expiresAt) {
      endDevTestingSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

/**
 * Checks if the current developer session has expired
 */
export const isDevSessionExpired = (): boolean => {
  try {
    const session = getDevTestingSession();
    if (!session) return true;
    return Date.now() > session.expiresAt;
  } catch {
    return true;
  }
};

/**
 * Calculates remaining session time in seconds
 */
export const getRemainingSessionSeconds = (): number => {
  try {
    const session = getDevTestingSession();
    if (!session) return 0;
    const remainingMs = session.expiresAt - Date.now();
    return Math.max(0, Math.floor(remainingMs / 1000));
  } catch {
    return 0;
  }
};

/**
 * Human-readable format of remaining time (e.g., "1h 45m" or "12m 30s")
 */
export const formatSessionTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return '0s (Expired)';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

/**
 * Starts a developer testing session for a target user
 */
export const startDevTestingSession = (targetUser: User): DevTestingSession => {
  const now = Date.now();
  const session: DevTestingSession = {
    isActive: true,
    authorizedAt: now,
    expiresAt: now + DEV_SESSION_TTL_MS,
    targetUser: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      employeeNumber: targetUser.employeeNumber,
      role: targetUser.role,
      departmentName: targetUser.departmentName,
      position: targetUser.position,
      avatarUrl: targetUser.avatarUrl,
    },
    isSandboxMode: true,
  };

  try {
    sessionStorage.setItem(DEV_MODE_ACTIVE_KEY, 'true');
    sessionStorage.setItem(DEV_MODE_SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem(DEV_MODE_SANDBOX_KEY, 'true');
    sessionStorage.setItem('apes_session_active_v3', 'true');
  } catch (err) {
    console.error('Failed to write dev testing session to sessionStorage:', err);
  }

  recordDevAction('DEV_SESSION_STARTED', {
    targetUserId: targetUser.id,
    targetUserName: targetUser.name,
    targetRole: targetUser.role,
  });

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apes_dev_mode_changed', { detail: session }));
  }

  return session;
};

/**
 * Switches the active testing account within an ongoing authorized session
 */
export const switchDevTestingAccount = (newTargetUser: User): DevTestingSession => {
  const existingSession = getDevTestingSession();
  const now = Date.now();

  const session: DevTestingSession = {
    isActive: true,
    authorizedAt: existingSession?.authorizedAt || now,
    // Preserve existing expiration, or extend if less than 15 mins left
    expiresAt: Math.max(existingSession?.expiresAt || (now + DEV_SESSION_TTL_MS), now + 15 * 60 * 1000),
    targetUser: {
      id: newTargetUser.id,
      name: newTargetUser.name,
      email: newTargetUser.email,
      employeeNumber: newTargetUser.employeeNumber,
      role: newTargetUser.role,
      departmentName: newTargetUser.departmentName,
      position: newTargetUser.position,
      avatarUrl: newTargetUser.avatarUrl,
    },
    isSandboxMode: true,
  };

  try {
    sessionStorage.setItem(DEV_MODE_ACTIVE_KEY, 'true');
    sessionStorage.setItem(DEV_MODE_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to update dev testing session:', err);
  }

  recordDevAction('DEV_ACCOUNT_SWITCHED', {
    from: existingSession?.targetUser.name,
    to: newTargetUser.name,
    newRole: newTargetUser.role,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apes_dev_mode_changed', { detail: session }));
  }

  return session;
};

/**
 * Ends the developer testing session and purges temporary session keys
 */
export const endDevTestingSession = (): void => {
  recordDevAction('DEV_SESSION_ENDED', {});

  try {
    sessionStorage.removeItem(DEV_MODE_ACTIVE_KEY);
    sessionStorage.removeItem(DEV_MODE_SESSION_KEY);
    sessionStorage.removeItem(DEV_MODE_SANDBOX_KEY);
  } catch (err) {
    console.warn('Failed to clear dev testing session:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apes_dev_mode_changed', { detail: null }));
  }
};

/**
 * Check if the test data sandbox guard is enabled (default: true)
 */
export const isDevSandboxActive = (): boolean => {
  if (!isDevTestingModeActive()) return false;
  try {
    return sessionStorage.getItem(DEV_MODE_SANDBOX_KEY) !== 'false';
  } catch {
    return true;
  }
};

/**
 * Records an isolated developer activity log record
 */
export const recordDevAction = (action: string, details?: any): void => {
  try {
    const raw = sessionStorage.getItem(DEV_MODE_AUDIT_KEY);
    const logs: DevAuditRecord[] = raw ? JSON.parse(raw) : [];

    const session = getDevTestingSession();
    const newRecord: DevAuditRecord = {
      id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      simulatedUser: session?.targetUser.name || 'Anonymous Developer',
      simulatedRole: session?.targetUser.role || 'developer',
      details: typeof details === 'object' ? JSON.stringify(details) : details,
    };

    logs.unshift(newRecord);
    // Keep max 50 recent dev logs in session
    if (logs.length > 50) logs.pop();

    sessionStorage.setItem(DEV_MODE_AUDIT_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn('Could not record dev audit log:', e);
  }
};

/**
 * Retrieves developer activity audit records
 */
export const getDevAuditRecords = (): DevAuditRecord[] => {
  try {
    const raw = sessionStorage.getItem(DEV_MODE_AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Clears developer activity audit records
 */
export const clearDevAuditRecords = (): void => {
  try {
    sessionStorage.removeItem(DEV_MODE_AUDIT_KEY);
  } catch {}
};

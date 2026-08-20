import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Role, Evaluation, EvaluationTemplate, Department, EvaluationCycle, Notification, isPendingUser, EvaluationScorecardArchive, DevelopmentPlan, PersonnelAction, DirectMessage } from './types';
import { MASTER_SALES_EVALUATION_TEMPLATE } from './constants/masterSalesTemplate';
import { 
  getStoredUsers, 
  saveUsers,
  getStoredCurrentUser, 
  setCurrentUserStore, 
  clearCurrentUserStore,
  getStoredDepartments, 
  saveDepartments,
  getStoredTemplates, 
  saveTemplates, 
  getStoredCycles, 
  getStoredEvaluations, 
  saveEvaluations, 
  saveSingleEvaluation, 
  assignNewEvaluationToEmployee,
  createDraftEvaluationInMemory,
  deduplicateEvaluations,
  getStoredEvaluationHistory,
  getStoredScorecardArchives,
  getStoredAuditLogs,
  getStoredDirectMessages,
  resetToDefaultSeedData,
  SEED_USERS
} from './services/storage';
import { 
  fetchEmployeesFromSupabase, 
  fetchDepartmentsFromSupabase, 
  fetchEvaluationsFromSupabase,
  fetchNotificationsFromSupabase,
  fetchEvaluationHistoryFromSupabase,
  fetchScorecardArchivesFromSupabase,
  saveEmployeeToSupabase,
  saveEmployeeToSupabaseDetailed,
  saveDepartmentToSupabase,
  findEmployeeInSupabase,
  isValidUuid,
  ensureUuid,
  saveEvaluationTemplateToSupabase,
  fetchEvaluationTemplatesFromSupabase,
  deleteEvaluationTemplateFromSupabase,
  deleteEmployeeFromSupabase
} from './services/supabaseService';
import { supabase, isSupabaseConfigured, triggerRealtimeBroadcast } from './services/supabaseClient';
import { 
  getStoredNotifications, 
  getRoleBasedNotifications, 
  markNotificationAsRead,
  mergeRemoteNotifications 
} from './services/notificationService';

import { AnnouncementModal } from './components/common/AnnouncementModal';
import { logoutUser } from './services/authService';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { EvaluationForm } from './components/evaluation/EvaluationForm';
import { PrintableScorecard } from './components/evaluation/PrintableScorecard';
import { TemplateBuilder } from './components/templates/TemplateBuilder';
import { EmployeeDashboard } from './components/dashboards/EmployeeDashboard';
import { SupervisorDashboard } from './components/dashboards/SupervisorDashboard';
import { HRDashboard } from './components/dashboards/HRDashboard';
import { DeptHeadDashboard } from './components/dashboards/DeptHeadDashboard';
import { PresidentDashboard } from './components/dashboards/PresidentDashboard';
import { PODDashboard } from './components/dashboards/PODDashboard';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { ReportsCenter } from './components/reports/ReportsCenter';
import { SystemAdminPanel } from './components/admin/SystemAdminPanel';
import { WorkflowMonitoring } from './components/admin/WorkflowMonitoring';
import { EvaluationDeploymentManager } from './components/admin/EvaluationDeploymentManager';
import { EvaluationHistoryView } from './components/evaluation/EvaluationHistoryView';
import { EmployeeManagement } from './components/admin/EmployeeManagement';
import { DepartmentManagement } from './components/admin/DepartmentManagement';
import { OrgHierarchyViewer } from './components/admin/OrgHierarchyViewer';
import { PendingApprovalsDashboard } from './components/admin/PendingApprovalsDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { MyProfile } from './components/profile/MyProfile';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { CalibrationRequestForm } from './components/calibration/CalibrationRequestForm';
import { CalibrationRequestsManager } from './components/calibration/CalibrationRequestsManager';
import { MessengerModal } from './components/messenger/MessengerModal';
import { ShieldAlert } from 'lucide-react';

import { determineWorkflowType, isUserDepartmentHead, getUserActiveEvaluation, getUserLatestEvaluation, isEvaluationCompleted } from './utils/workflowUtils';

const mergeEvaluationTemplates = (remote: EvaluationTemplate[] | null, local: EvaluationTemplate[]): EvaluationTemplate[] => {
  const result: EvaluationTemplate[] = [];
  const seenIds = new Set<string>();

  // 1. Remote Supabase templates take highest priority
  if (remote && remote.length > 0) {
    for (const r of remote) {
      if (r && r.id && !seenIds.has(r.id)) {
        seenIds.add(r.id);
        result.push(r);
      }
    }
  }

  // 2. Merge local templates that are not yet in remote
  for (const l of local) {
    if (l && l.id && !seenIds.has(l.id)) {
      seenIds.add(l.id);
      result.push(l);
    }
  }

  if (result.length === 0) {
    result.push(MASTER_SALES_EVALUATION_TEMPLATE);
  }

  return result;
};

export const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(getStoredUsers());
  const [currentUser, setCurrentUser] = useState<User>(() => getStoredCurrentUser() || SEED_USERS[0]);
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(true);

  const [departments, setDepartments] = useState<Department[]>(getStoredDepartments());
  const [templates, setTemplates] = useState<EvaluationTemplate[]>(getStoredTemplates());
  const [cycles, setCycles] = useState<EvaluationCycle[]>(getStoredCycles());
  const [evaluations, setEvaluations] = useState<Evaluation[]>(getStoredEvaluations());
  const [auditLogs, setAuditLogs] = useState(getStoredAuditLogs());
  const [notifications, setNotifications] = useState<Notification[]>(() => getRoleBasedNotifications(currentUser));
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);
  const [showMessengerModal, setShowMessengerModal] = useState<boolean>(false);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() => getStoredDirectMessages());

  const pendingAccountCount = useMemo(() => {
    return (users || []).filter(isPendingUser).length;
  }, [users]);

  const unreadDirectMessagesCount = useMemo(() => {
    if (!directMessages || !Array.isArray(directMessages) || !currentUser?.id) return 0;
    return directMessages.filter(
      (m) =>
        m &&
        !m.read &&
        (m.recipientId === currentUser.id || m.recipientId === 'all') &&
        m.senderId !== currentUser.id
    ).length;
  }, [directMessages, currentUser?.id]);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedEvalId, setSelectedEvalId] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('apes_dark_mode_v3');
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [viewMode, setViewMode] = useState<'normal' | 'printable'>('normal');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [evaluationHistory, setEvaluationHistory] = useState<any[]>([]);
  const [scorecardArchives, setScorecardArchives] = useState<EvaluationScorecardArchive[]>([]);
  const [inactiveAccountModal, setInactiveAccountModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const lastAvatarUpdateRef = useRef<{ url: string; timestamp: number } | null>(null);
  const currentUserRef = useRef<User>(currentUser);
  const isAuthenticatedRef = useRef<boolean>(isAuthenticated);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('apes_dark_mode_v3', String(darkMode));
    } catch {}
  }, [darkMode]);

  useEffect(() => {
    console.log(`[Avatar Source] App.tsx currentUser.avatarUrl changed to: ${currentUser.avatarUrl ? currentUser.avatarUrl.substring(0, 40) + '...' : '(empty)'}`);
  }, [currentUser.avatarUrl]);

  useEffect(() => {
    const handleDirectMessagesUpdate = () => {
      setDirectMessages(getStoredDirectMessages());
    };
    window.addEventListener('apes_direct_messages_updated', handleDirectMessagesUpdate);
    window.addEventListener('storage', handleDirectMessagesUpdate);
    return () => {
      window.removeEventListener('apes_direct_messages_updated', handleDirectMessagesUpdate);
      window.removeEventListener('storage', handleDirectMessagesUpdate);
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !isAuthenticated) return;
    if (currentUser.isActive !== true || currentUser.isApproved !== true || currentUser.approvalStatus === 'pending' || currentUser.approvalStatus === 'rejected') {
      setInactiveAccountModal({
        open: true,
        message: 'Your account has been placed on hold by the System Administrator or People Operations. Please contact HR/POD for assistance.'
      });
    }
  }, [currentUser, isAuthenticated]);

  const handleInactiveAccountOk = async () => {
    setInactiveAccountModal({ open: false, message: '' });
    await handleLogout();
  };

  // 1. Session Restoration Effect (On App Mount)
  useEffect(() => {
    let isMounted = true;
    const timeoutGuard = setTimeout(() => {
      if (isMounted) setIsSessionLoading(false);
    }, 2000);

    const initSession = async () => {
      try {
        const savedTab = localStorage.getItem('apes_active_tab_v3');
        let storedUser = getStoredCurrentUser();

        if (storedUser) {
          // Fetch fresh authoritative user profile from Supabase PostgreSQL cloud database on mount/refresh
          if (isSupabaseConfigured) {
            try {
              const freshUser = (await findEmployeeInSupabase(storedUser.id)) || (await findEmployeeInSupabase(storedUser.email));
              if (freshUser) {
                storedUser = freshUser;
                setCurrentUserStore(freshUser);
              }
            } catch (e) {
              console.warn('[App Init] Could not fetch fresh profile from Supabase, using stored fallback:', e);
            }
          }

          if (storedUser && storedUser.isActive === true && storedUser.isApproved === true && storedUser.approvalStatus === 'approved') {
            if (isMounted) {
              setCurrentUser(storedUser);
              setIsAuthenticated(true);
              sessionStorage.setItem('apes_session_active_v3', 'true');
              setNotifications(getRoleBasedNotifications(storedUser));
              if (savedTab) setActiveTab(savedTab);
            }
          } else {
            if (isMounted) setIsAuthenticated(false);
          }
        } else {
          if (isMounted) {
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.warn('Error restoring session:', err);
        if (isMounted) setIsAuthenticated(false);
      } finally {
        if (isMounted) {
          setIsSessionLoading(false);
          clearTimeout(timeoutGuard);
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
      clearTimeout(timeoutGuard);
    };
  }, []);

  // 1.5. Load evaluation history, scorecard archives, and templates
  useEffect(() => {
    const loadHistoryAndArchives = async () => {
      setEvaluationHistory(getStoredEvaluationHistory());
      setScorecardArchives(getStoredScorecardArchives());

      if (isSupabaseConfigured) {
        // Proactively purge deprecated hardcoded accounts from Supabase cloud
        deleteEmployeeFromSupabase('usr_sup_sales_01', 'supervisor.sales@hdiadventures.com', 'SUP-SLS-01').catch(() => {});

        try {
          const sbHistory = await fetchEvaluationHistoryFromSupabase();
          if (sbHistory && sbHistory.length > 0) setEvaluationHistory(sbHistory);
        } catch (e) {}

        try {
          const sbArchives = await fetchScorecardArchivesFromSupabase();
          if (sbArchives && sbArchives.length > 0) setScorecardArchives(sbArchives);
        } catch (e) {}

        try {
          const sbTemplates = await fetchEvaluationTemplatesFromSupabase();
          if (sbTemplates !== null) {
            setTemplates(prev => {
              const result = mergeEvaluationTemplates(sbTemplates, prev);
              saveTemplates(result);
              return result;
            });
          }
        } catch (e) {}
      }
    };
    loadHistoryAndArchives();
  }, []);

  // 2. Real-time Database & Notification Polling (Optimized for Egress & Efficiency)
  useEffect(() => {
    let isMounted = true;
    let lastSyncTimestamp = 0;

    const syncDatabaseAndNotifications = async (force = false) => {
      const now = Date.now();
      // Throttle syncs to at most once every 6 seconds unless forced
      if (!force && now - lastSyncTimestamp < 6000) {
        return;
      }
      lastSyncTimestamp = now;

      if (isSupabaseConfigured) {
        try {
          const currentUser = currentUserRef.current;
          const isAuthenticated = isAuthenticatedRef.current;
          
          const sbUsers = await fetchEmployeesFromSupabase();
          if (!isMounted) return;
          if (sbUsers && sbUsers.length > 0) {
            setUsers(sbUsers);
            
            // Live profile sync across devices for logged-in user
            if (isAuthenticated) {
              setCurrentUser((prevUser: User) => {
                if (!prevUser) return prevUser;
                const updatedSelf = sbUsers.find(
                  (u) => u.email.toLowerCase() === prevUser.email.toLowerCase() || u.id === prevUser.id
                );
                if (updatedSelf) {
                  const tenSecondsAgo = Date.now() - 10000;
                  const hasRecentAvatarUpdate = lastAvatarUpdateRef.current && lastAvatarUpdateRef.current.timestamp > tenSecondsAgo;
                  const mergedSelf: User = {
                    ...updatedSelf,
                    avatarUrl: hasRecentAvatarUpdate
                      ? lastAvatarUpdateRef.current!.url
                      : (prevUser.avatarUrl && prevUser.avatarUrl !== updatedSelf.avatarUrl ? prevUser.avatarUrl : (updatedSelf.avatarUrl || '')),
                    personalEmail: updatedSelf.personalEmail || prevUser.personalEmail || '',
                    requiresPasswordChange: updatedSelf.requiresPasswordChange ?? prevUser.requiresPasswordChange
                  };
                  if (
                    prevUser.avatarUrl === mergedSelf.avatarUrl &&
                    prevUser.name === mergedSelf.name &&
                    prevUser.email === mergedSelf.email &&
                    prevUser.position === mergedSelf.position &&
                    prevUser.departmentName === mergedSelf.departmentName
                  ) {
                    return prevUser;
                  }
                  setCurrentUserStore(mergedSelf);
                  return mergedSelf;
                }
                return prevUser;
              });
            }
          }

          const sbDepts = await fetchDepartmentsFromSupabase();
          if (!isMounted) return;
          if (sbDepts && sbDepts.length > 0) setDepartments(sbDepts);

          const sbTemplates = await fetchEvaluationTemplatesFromSupabase();
          if (!isMounted) return;
          if (sbTemplates && sbTemplates.length > 0) {
            setTemplates(sbTemplates);
            saveTemplates(sbTemplates);
          }

          const privilegedRoles = ['system_admin', 'hr_admin', 'pod', 'dept_head', 'supervisor', 'president'];
          const isPrivileged = currentUser?.role && privilegedRoles.includes(currentUser.role);
          const sbEvals = await fetchEvaluationsFromSupabase(isPrivileged ? undefined : currentUser);
          if (!isMounted) return;
          if (sbEvals) {
            setEvaluations(sbEvals);
            saveEvaluations(sbEvals);
          }

          const sbNotifs = await fetchNotificationsFromSupabase(currentUser?.id, currentUser?.role);
          if (!isMounted) return;
          if (sbNotifs) {
            const computed = getRoleBasedNotifications(sbNotifs, currentUser);
            setNotifications(computed);
          }
        } catch (syncErr) {
          console.warn('[APES Sync] Periodic sync note:', syncErr);
        }
      } else {
        const storedUsers = getStoredUsers();
        setUsers(storedUsers);
        setEvaluations(getStoredEvaluations());
      }
    };

    // Initial sync
    syncDatabaseAndNotifications(true);

    // Refresh when user returns to the tab/window (zero idle egress when backgrounded)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncDatabaseAndNotifications(false);
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Lightweight idle fallback sync (every 60s instead of 3s to save 95%+ egress)
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncDatabaseAndNotifications(false);
      }
    }, 60000);

    // Targeted WebSocket Broadcast Channel (event-driven on mutations only)
    let broadcastChannel: any = null;

    if (isSupabaseConfigured && supabase) {
      try {
        broadcastChannel = supabase
          .channel('apes_broadcast_events')
          .on('broadcast', { event: 'data_changed' }, () => {
            syncDatabaseAndNotifications(true);
            fetchEvaluationTemplatesFromSupabase().then(sbTemplates => {
              if (sbTemplates !== null && isMounted) {
                setTemplates(prev => {
                  const result = mergeEvaluationTemplates(sbTemplates, prev);
                  saveTemplates(result);
                  return result;
                });
              }
            }).catch(() => {});
          })
          .subscribe();
      } catch (e) {
        console.warn('Broadcast channel subscription error:', e);
      }
    }

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      lastAvatarUpdateRef.current = null;
      if (supabase && broadcastChannel) {
        supabase.removeChannel(broadcastChannel);
      }
    };
  }, [currentUser?.id]);

  const handleLoginSuccess = async (authenticatedUser: User) => {
    setCurrentUser(authenticatedUser);
    setCurrentUserStore(authenticatedUser);
    currentUserRef.current = authenticatedUser;
    sessionStorage.setItem('apes_session_active_v3', 'true');
    localStorage.removeItem('apes_session_active_v3');
    setIsAuthenticated(true);
    isAuthenticatedRef.current = true;

    // Fetch all fresh data from Supabase on login
    if (isSupabaseConfigured) {
      try {
        const sbUsers = await fetchEmployeesFromSupabase();
        if (sbUsers && sbUsers.length > 0) {
          setUsers(sbUsers);
          const dbUser = sbUsers.find(
            (u) => u.email.toLowerCase() === authenticatedUser.email.toLowerCase() || u.id === authenticatedUser.id
          );
          if (dbUser) {
            const mergedUser: User = {
              ...dbUser,
              avatarUrl: authenticatedUser.avatarUrl || dbUser.avatarUrl || '',
              personalEmail: dbUser.personalEmail || authenticatedUser.personalEmail || '',
              requiresPasswordChange: dbUser.requiresPasswordChange ?? authenticatedUser.requiresPasswordChange
            };
            setCurrentUser(mergedUser);
            setCurrentUserStore(mergedUser);
            currentUserRef.current = mergedUser;
          }
        }

        const currentUserId = currentUserRef.current?.id || authenticatedUser.id;
        const currentUserRole = currentUserRef.current?.role || authenticatedUser.role;

        const activeUserObj = currentUserRef.current || authenticatedUser;
        const privilegedRoles = ['system_admin', 'hr_admin', 'pod', 'dept_head', 'supervisor', 'president'];
        const isPrivileged = currentUserRole && privilegedRoles.includes(currentUserRole);
        const [sbDepts, sbEvals, sbNotifs, sbTemplates] = await Promise.all([
          fetchDepartmentsFromSupabase(),
          fetchEvaluationsFromSupabase(isPrivileged ? undefined : activeUserObj),
          fetchNotificationsFromSupabase(currentUserId, currentUserRole),
          fetchEvaluationTemplatesFromSupabase()
        ]);

        if (sbDepts && sbDepts.length > 0) setDepartments(sbDepts);
        if (sbTemplates && sbTemplates.length > 0) {
          setTemplates(sbTemplates);
          saveTemplates(sbTemplates);
        }
        if (sbEvals) {
          const cleanEvals = deduplicateEvaluations(sbEvals);
          setEvaluations(cleanEvals);
          saveEvaluations(cleanEvals);
        }
        if (sbNotifs) {
          setNotifications(getRoleBasedNotifications(sbNotifs, activeUserObj));
        }
      } catch (e) {
        console.warn('Login sync note:', e);
      }
    }

    const savedTab = localStorage.getItem('apes_active_tab_v3') || 'dashboard';
    setActiveTab(savedTab);
  };

  const handleLogout = async () => {
    clearCurrentUserStore();
    sessionStorage.removeItem('apes_session_active_v3');
    localStorage.removeItem('apes_session_active_v3');
    localStorage.removeItem('apes_active_tab_v3');
    setCurrentUser(SEED_USERS[0]);
    currentUserRef.current = SEED_USERS[0];
    setIsAuthenticated(false);
    isAuthenticatedRef.current = false;

    try {
      await logoutUser();
    } catch (e) {
      console.warn('[App] Logout cleanup note:', e);
    }
  };

  const checkedAccountStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser || !isAuthenticated) return;
    const statusKey = `${currentUser.id}-${currentUser.isActive}-${currentUser.isApproved}-${currentUser.approvalStatus}`;
    if (checkedAccountStatusRef.current === statusKey) return;
    checkedAccountStatusRef.current = statusKey;

    if (currentUser.isActive !== true || currentUser.isApproved !== true || currentUser.approvalStatus === 'pending' || currentUser.approvalStatus === 'rejected') {
      handleLogout();
    }
  }, [currentUser, isAuthenticated, handleLogout]);

  const handleRegisterNewUser = async (newUser: User) => {
    const updated = [newUser, ...users];
    setUsers(updated);
    await handleSaveUsers(updated);
  };

  const handleApproveUser = async (approvedUser: User) => {
    const updated = users.map(u => u.id === approvedUser.id ? approvedUser : u);
    setUsers(updated);
    await handleSaveUsers(updated);
  };

  const handleRejectUser = async (userId: string, remarks: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        const rejected: User = {
          ...u,
          isApproved: false,
          isActive: false,
          approvalStatus: 'rejected' as const,
          hrRejectionRemarks: remarks
        };
        return rejected;
      }
      return u;
    });
    setUsers(updated);
    await handleSaveUsers(updated);
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    if (!currentUser) return;
    const target = notifications.find(n => n.id === notifId);
    if (target) {
      await markNotificationAsRead(target, currentUser.id);
    }
    if (isSupabaseConfigured) {
      const sbNotifs = await fetchNotificationsFromSupabase(currentUser.id, currentUser.role);
      if (sbNotifs) {
        setNotifications(getRoleBasedNotifications(sbNotifs, currentUser));
      }
    }
  };

  const handleSaveUsers = async (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    saveUsers(updatedUsers);

    let supabaseErrors: string[] = [];
    if (isSupabaseConfigured) {
      for (const u of updatedUsers) {
        const result = await saveEmployeeToSupabaseDetailed(u);
        if (!result.success) {
          const err = (result.error || {}) as Record<string, any>;
          const errorMsg = err.message || err.code || 'Unknown error';
          supabaseErrors.push(`${u.email}: ${errorMsg}`);
          console.warn(`[App] Failed to sync user ${u.email} to Supabase:`, err);
        }
      }
    }

    if (supabaseErrors.length > 0) {
      const errorMessage = `Failed to sync ${supabaseErrors.length} user(s) to cloud database: ${supabaseErrors.join('; ')}`;
      console.error('[App] Cloud sync errors:', errorMessage);
      throw new Error(errorMessage);
    }

    // Sync current logged-in user if their profile was updated
    if (currentUser) {
      const matchMe = updatedUsers.find(u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
      if (matchMe) {
        setCurrentUser(matchMe);
        setCurrentUserStore(matchMe);
      }
    }

    // Sync active evaluations to match updated employee departments & names
    let evalsChanged = false;
    const syncedEvals = evaluations.map(ev => {
      const matchedUser = updatedUsers.find(u => 
        (ev.employeeId && (u.id === ev.employeeId || u.employeeNumber === ev.employeeId)) ||
        (ev.employeeEmail && u.email.toLowerCase() === ev.employeeEmail.toLowerCase())
      );
      if (matchedUser && (ev.departmentName !== matchedUser.departmentName || ev.departmentId !== matchedUser.departmentId)) {
        evalsChanged = true;
        const updatedEv: Evaluation = {
          ...ev,
          departmentName: matchedUser.departmentName,
          departmentId: matchedUser.departmentId || ev.departmentId,
          updatedAt: new Date().toISOString()
        };
        return updatedEv;
      }
      return ev;
    });

    if (evalsChanged) {
      setEvaluations(syncedEvals);
      saveEvaluations(syncedEvals);
    }

    triggerRealtimeBroadcast('data_changed', { type: 'employee' });
  };

  const handleUpdateCurrentUser = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setCurrentUserStore(updatedUser);
    const updatedUsers = users.map(u => (u.id === updatedUser.id || u.email.toLowerCase() === updatedUser.email.toLowerCase()) ? updatedUser : u);
    setUsers(updatedUsers);
    saveUsers(updatedUsers);

    if (isSupabaseConfigured) {
      const saveRes = await saveEmployeeToSupabaseDetailed(updatedUser);
      if (saveRes.success) {
        const freshUser = (saveRes.id ? await findEmployeeInSupabase(saveRes.id) : null) || (await findEmployeeInSupabase(updatedUser.id)) || (await findEmployeeInSupabase(updatedUser.email));
        if (freshUser) {
          const mergedFreshUser: User = {
            ...freshUser,
            password: updatedUser.password || freshUser.password,
            requiresPasswordChange: updatedUser.requiresPasswordChange ?? freshUser.requiresPasswordChange,
            avatarUrl: updatedUser.avatarUrl || freshUser.avatarUrl,
          };
          setCurrentUser(mergedFreshUser);
          setCurrentUserStore(mergedFreshUser);
          setUsers(prev => {
            const list = prev.map(u => (u.id === mergedFreshUser.id || u.email.toLowerCase() === mergedFreshUser.email.toLowerCase()) ? mergedFreshUser : u);
            saveUsers(list);
            return list;
          });
        }
        if (updatedUser.avatarUrl) {
          lastAvatarUpdateRef.current = { url: updatedUser.avatarUrl, timestamp: Date.now() };
        }
      } else if (updatedUser.avatarUrl) {
        console.warn('[Avatar Source] Full save failed, attempting direct avatar fallback update...', saveRes.error);
        const cleanEmail = (updatedUser.email || '').trim().toLowerCase();
        try {
          const targetId = isValidUuid(updatedUser.id) ? updatedUser.id : ensureUuid(updatedUser.id);
          await supabase
            .from('employees')
            .update({ avatar_url: updatedUser.avatarUrl, updated_at: new Date().toISOString() })
            .or(`id.eq.${targetId},email.ilike.${cleanEmail}`);
          lastAvatarUpdateRef.current = { url: updatedUser.avatarUrl, timestamp: Date.now() };
        } catch (e) {
          console.warn('[Avatar Source] Direct avatar fallback update note:', e);
        }
      }
      triggerRealtimeBroadcast('data_changed', { type: 'employee', email: updatedUser.email });
    }
  };

  const handleSaveDepartments = async (updatedDepts: Department[]) => {
    setDepartments(updatedDepts);
    saveDepartments(updatedDepts);

    if (isSupabaseConfigured) {
      try {
        for (const d of updatedDepts) {
          await saveDepartmentToSupabase(d);
        }
      } catch (err) {
        console.warn('[App] Department sync to Supabase note:', err);
      }
    }
  };

  const handleSaveEvaluation = async (updatedEval: Evaluation) => {
    await saveSingleEvaluation(updatedEval, currentUser ? { name: currentUser.name, role: currentUser.role, id: currentUser.id } : undefined);
    const updatedList = evaluations.map((e) => e.id === updatedEval.id ? updatedEval : e);
    if (!updatedList.some((e) => e.id === updatedEval.id)) {
      updatedList.unshift(updatedEval);
    }
    setEvaluations(updatedList);
    setNotifications(getRoleBasedNotifications(currentUser));
  };

  const handleSaveTemplate = async (updatedTemplate: EvaluationTemplate) => {
    const existingIndex = templates.findIndex((t) => t.id === updatedTemplate.id);
    let newTemplates = [...templates];
    if (existingIndex >= 0) {
      newTemplates[existingIndex] = updatedTemplate;
    } else {
      newTemplates.unshift(updatedTemplate);
    }
    setTemplates(newTemplates);
    saveTemplates(newTemplates);

    if (isSupabaseConfigured) {
      try {
        const success = await saveEvaluationTemplateToSupabase(updatedTemplate);
        if (success) {
          triggerRealtimeBroadcast('data_changed', { type: 'template', templateId: updatedTemplate.id });
          const freshTemplates = await fetchEvaluationTemplatesFromSupabase();
          if (freshTemplates && freshTemplates.length > 0) {
            setTemplates(freshTemplates);
            saveTemplates(freshTemplates);
          }
        } else {
          console.warn('[App] Template saved locally but cloud sync failed.');
        }
      } catch (err) {
        console.warn('[App] Template saved locally but cloud sync encountered an error:', err);
      }
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const updated = templates.filter((t) => t.id !== templateId);
    setTemplates(updated);
    saveTemplates(updated);

    if (isSupabaseConfigured) {
      const deleted = await deleteEvaluationTemplateFromSupabase(templateId);
      if (deleted) {
        triggerRealtimeBroadcast('data_changed', { type: 'template_deleted', templateId });
      }
    }
  };

  const handleResetAllData = () => {
    if (window.confirm('Reset all evaluation records, employees, departments, and roles to initial seed state?')) {
      resetToDefaultSeedData();
      setUsers(getStoredUsers());
      setCurrentUser(SEED_USERS[0]);
      setCurrentUserStore(SEED_USERS[0]);
      setDepartments(getStoredDepartments());
      setTemplates(getStoredTemplates());
      setCycles(getStoredCycles());
      setEvaluations(getStoredEvaluations());
      setActiveTab('dashboard');
      setViewMode('normal');
    }
  };

  const currentEvaluation = useMemo(() => {
    if (selectedEvalId) {
      const found = evaluations.find((e) => e.id === selectedEvalId);
      if (found) {
        const isOwner = (found.employeeId && (found.employeeId === currentUser.id || found.employeeId === currentUser.employeeNumber)) ||
                        (found.employeeEmail && found.employeeEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
                        (found.employeeName && found.employeeName.toLowerCase() === currentUser.name.toLowerCase());
        const isPrivileged = currentUser.role === 'system_admin' || currentUser.role === 'hr_admin' || currentUser.role === 'pod' || currentUser.role === 'dept_head' || currentUser.role === 'supervisor' || currentUser.role === 'president';

        if (isOwner || isPrivileged) {
          return found;
        }
      }
    }

    const activeEval = getUserActiveEvaluation(currentUser, evaluations);
    if (activeEval) return activeEval;

    const latestEval = getUserLatestEvaluation(currentUser, evaluations);
    if (latestEval) return latestEval;

    const fallbackTemplate = templates.find(t => t.id === 'template_sales') || MASTER_SALES_EVALUATION_TEMPLATE;
    const currentYear = new Date().getFullYear();
    return createDraftEvaluationInMemory(currentUser, fallbackTemplate, `${currentYear} Annual Performance Evaluation`);
  }, [evaluations, selectedEvalId, currentUser, templates]);

  const printableEvaluation = useMemo(() => {
    if (selectedEvalId) {
      const foundEval = evaluations.find(e => e.id === selectedEvalId);
      if (foundEval) return foundEval;

      const foundArchive = scorecardArchives.find(a => a.id === selectedEvalId || a.evaluationId === selectedEvalId);
      if (foundArchive) {
        const reconstructed: Evaluation = {
          id: foundArchive.evaluationId || foundArchive.id,
          cycleId: foundArchive.cycleId || '',
          templateId: foundArchive.templateId || '',
          workflowType: (foundArchive.workflowType as any) || 'WORKFLOW_REGULAR',
          employeeId: foundArchive.employeeId,
          userId: foundArchive.employeeId,
          employeeName: foundArchive.employeeName,
          employeeEmail: foundArchive.employeeEmail || '',
          departmentName: foundArchive.departmentName || '',
          position: foundArchive.position || '',
          appraisalPeriod: foundArchive.appraisalPeriod,
          appraisalDate: foundArchive.archivedAt ? new Date(foundArchive.archivedAt).toLocaleDateString() : new Date().toLocaleDateString(),
          status: 'archived',
          eligibilityScore: foundArchive.eligibilityScore || 0,
          coreValuesScore: foundArchive.coreValuesScore || 0,
          totalEligibilityWeightedRating: foundArchive.eligibilityScore || 0,
          totalCoreValuesWeightedRating: foundArchive.coreValuesScore || 0,
          finalRating: foundArchive.finalRating || 0,
          ratingClassification: foundArchive.ratingClassification || '',
          kpiRatings: foundArchive.kpiRatingsData || [],
          coreValueRatings: foundArchive.coreValueRatingsData || [],
          developmentPlan: (foundArchive.developmentPlanData as DevelopmentPlan) || { strengths: '', areasForImprovement: '', learningNeeds: [] },
          personnelAction: (foundArchive.personnelActionData as PersonnelAction) || { actionType: 'no_action' },
          signatures: foundArchive.signaturesData || {},
          evidenceFiles: foundArchive.evidenceFilesData || [],
          stepHistory: foundArchive.stepHistoryData || [],
          auditTrail: foundArchive.auditTrailData || [],
          appraiseeSummaryComment: foundArchive.appraiseeSummaryComment || '',
          supervisorSummaryComment: foundArchive.supervisorSummaryComment || '',
          presidentSummaryComment: foundArchive.presidentSummaryComment || '',
          podValidationComment: foundArchive.podValidationComment || '',
          createdAt: foundArchive.createdAt || foundArchive.archivedAt || new Date().toISOString(),
          updatedAt: foundArchive.archivedAt || new Date().toISOString(),
        };
        return reconstructed;
      }
    }
    return currentEvaluation;
  }, [selectedEvalId, evaluations, scorecardArchives, currentEvaluation]);

  const renderMainContent = () => {
    if (viewMode === 'printable') {
      const targetForPrint = printableEvaluation || currentEvaluation;
      if (targetForPrint) {
        const printTemplate = templates.find(t => t.id === targetForPrint.templateId);
        return (
          <PrintableScorecard
            evaluation={targetForPrint}
            formulaConfig={printTemplate?.formulaConfig}
            onBack={() => setViewMode('normal')}
          />
        );
      }
    }

    if (activeTab === 'dept_actions') {
      return (
        <DeptHeadDashboard
          currentUser={currentUser}
          evaluations={evaluations}
          allUsers={users}
          onOpenEvaluation={(id) => {
            setSelectedEvalId(id);
            setActiveTab('evaluations');
          }}
        />
      );
    }

    if (activeTab === 'evaluations' || activeTab === 'team_reviews' || activeTab === 'dept_head_reviews') {
      return (
        <EvaluationForm
          evaluation={currentEvaluation}
          currentUser={currentUser}
          allUsers={users}
          templates={templates}
          onSave={handleSaveEvaluation}
          onViewPrintable={() => setViewMode('printable')}
        />
      );
    }

    if (activeTab === 'pod_validation') {
      return (
        <PODDashboard
          currentUser={currentUser}
          evaluations={evaluations}
          departments={departments}
          onOpenEvaluation={(id) => {
            setSelectedEvalId(id);
            setActiveTab('evaluations');
          }}
          onOpenReports={() => setActiveTab('reports')}
          onOpenWorkflowMonitoring={() => setActiveTab('workflow_monitoring')}
          onOpenDeployment={() => setActiveTab('evaluation_deployment')}
          onOpenTemplateBuilder={() => setActiveTab('template_builder')}
        />
      );
    }

    if (activeTab === 'employee_mgmt') {
      return (
        <EmployeeManagement
          users={users}
          departments={departments}
          onSaveUsers={handleSaveUsers}
        />
      );
    }

    if (activeTab === 'pending_approvals') {
      return (
        <PendingApprovalsDashboard
          users={users}
          departments={departments}
          onApproveUser={handleApproveUser}
          onRejectUser={handleRejectUser}
        />
      );
    }

    if (activeTab === 'dept_mgmt') {
      return (
        <DepartmentManagement
          departments={departments}
          users={users}
          templates={templates}
          onSaveDepartments={handleSaveDepartments}
        />
      );
    }

    if (activeTab === 'org_hierarchy') {
      return (
        <OrgHierarchyViewer
          users={users}
          departments={departments}
        />
      );
    }

    if (activeTab === 'template_builder') {
      return (
        <TemplateBuilder
          currentUser={currentUser}
          templates={templates}
          departments={departments}
          evaluations={evaluations}
          onSaveTemplate={handleSaveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
      );
    }

    // Change 2 — Calibration Request (Employee view)
    if (activeTab === 'calibration_request') {
      return (
        <CalibrationRequestForm
          currentUser={currentUser}
          evaluations={evaluations}
        />
      );
    }

    // Change 2 — Calibration Requests (Dept Head review)
    if (activeTab === 'calibration_requests') {
      return (
        <CalibrationRequestsManager
          currentUser={currentUser}
          evaluations={evaluations}
          onUpdateEvaluation={(updated: Evaluation) => {
            setEvaluations(prev => prev.map(e => e.id === updated.id ? updated : e));
          }}
        />
      );
    }

    // Change 2 — Calibration POD Review (POD / HR Admin)
    if (activeTab === 'calibration_pod_review') {
      return (
        <CalibrationRequestsManager
          currentUser={currentUser}
          evaluations={evaluations}
          onUpdateEvaluation={(updated: Evaluation) => {
            setEvaluations(prev => prev.map(e => e.id === updated.id ? updated : e));
          }}
        />
      );
    }

    if (activeTab === 'reports') {
      return (
        <ReportsCenter
          evaluations={evaluations}
          departments={departments}
          templates={templates}
        />
      );
    }

    if (activeTab === 'my_profile') {
      return (
        <MyProfile
          currentUser={currentUser}
          onUpdateUser={handleUpdateCurrentUser}
        />
      );
    }

    if (activeTab === 'admin_panel') {
      return (
        <SystemAdminPanel
          users={users}
          departments={departments}
          cycles={cycles}
          auditLogs={auditLogs}
          onSaveUsers={handleSaveUsers}
          onSaveDepartments={handleSaveDepartments}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setViewMode('normal');
            localStorage.setItem('apes_active_tab_v3', tab);
          }}
        />
      );
    }

    if (activeTab === 'workflow_monitoring') {
      return (
        <WorkflowMonitoring
          currentUser={currentUser}
          users={users}
          evaluations={evaluations}
          departments={departments}
          templates={templates}
          onOpenEvaluation={(id) => {
            setSelectedEvalId(id);
            setActiveTab('evaluations');
          }}
          onRefreshEvaluations={() => {
            setEvaluations(getStoredEvaluations());
          }}
        />
      );
    }

    if (activeTab === 'evaluation_deployment') {
      return (
        <EvaluationDeploymentManager
          currentUser={currentUser}
          users={users}
          departments={departments}
          templates={templates}
          onRefreshData={() => {
            setEvaluations(getStoredEvaluations());
          }}
        />
      );
    }

    if (activeTab === 'my_history') {
      return (
        <EvaluationHistoryView
          currentUser={currentUser}
          historyRecords={evaluationHistory}
          scorecardArchives={scorecardArchives}
          onOpenEvaluation={(id) => {
            setSelectedEvalId(id);
            setActiveTab('evaluations');
            setViewMode('normal');
          }}
          onViewPrintable={(id) => {
            setSelectedEvalId(id);
            setActiveTab('evaluations');
            setViewMode('printable');
          }}
          onViewArchive={(archiveId) => {
            // Open archive viewer - navigate to printable view of the archived evaluation
            setSelectedEvalId(archiveId);
            setActiveTab('evaluations');
            setViewMode('printable');
          }}
        />
      );
    }

    // Position-Based Access Control (PBAC) Dashboard Router
    switch (currentUser.role) {
      case 'employee':
        return (
          <EmployeeDashboard
            currentUser={currentUser}
            evaluations={evaluations}
            templates={templates}
            onOpenEvaluation={(id) => {
              setSelectedEvalId(id);
              setActiveTab('evaluations');
            }}
          />
        );
      case 'supervisor':
        return (
          <SupervisorDashboard
            currentUser={currentUser}
            evaluations={evaluations}
            onOpenEvaluation={(id) => {
              setSelectedEvalId(id);
              setActiveTab('evaluations');
            }}
          />
        );
      case 'dept_head':
        return (
          <DeptHeadDashboard
            currentUser={currentUser}
            evaluations={evaluations}
            allUsers={users}
            onOpenEvaluation={(id) => {
              setSelectedEvalId(id);
              setActiveTab('evaluations');
            }}
          />
        );
      case 'president':
        return (
          <PresidentDashboard
            currentUser={currentUser}
            evaluations={evaluations}
            onOpenEvaluation={(id) => {
              setSelectedEvalId(id);
              setActiveTab('evaluations');
            }}
          />
        );
      case 'pod':
        return (
          <PODDashboard
            currentUser={currentUser}
            evaluations={evaluations}
            departments={departments}
            onOpenEvaluation={(id) => {
              setSelectedEvalId(id);
              setActiveTab('evaluations');
            }}
            onOpenReports={() => setActiveTab('reports')}
            onOpenWorkflowMonitoring={() => setActiveTab('workflow_monitoring')}
            onOpenDeployment={() => setActiveTab('evaluation_deployment')}
            onOpenTemplateBuilder={() => setActiveTab('template_builder')}
          />
        );
      case 'hr_admin':
        return (
          <HRDashboard
            currentUser={currentUser}
            evaluations={evaluations}
            cycles={cycles}
            departments={departments}
            users={users}
            onOpenEvaluation={(id) => {
              setSelectedEvalId(id);
              setActiveTab('evaluations');
            }}
            onOpenTemplateBuilder={() => setActiveTab('template_builder')}
            onOpenReports={() => setActiveTab('reports')}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setViewMode('normal');
              localStorage.setItem('apes_active_tab_v3', tab);
            }}
          />
        );
      case 'system_admin':
        return (
          <AdminDashboard
            currentUser={currentUser}
            users={users}
            departments={departments}
            auditLogs={auditLogs}
            onOpenAdminPanel={() => setActiveTab('admin_panel')}
            onOpenWorkflowMonitoring={() => setActiveTab('workflow_monitoring')}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setViewMode('normal');
              localStorage.setItem('apes_active_tab_v3', tab);
            }}
          />
        );
      default:
        return (
          <EmployeeDashboard
            currentUser={currentUser}
            evaluations={evaluations}
            templates={templates}
            onOpenEvaluation={(id) => {
              setSelectedEvalId(id);
              setActiveTab('evaluations');
            }}
          />
        );
    }
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/20 shadow-xl backdrop-blur-sm">
            <img src="/hdi-logo.png" alt="HDI APES" className="h-10 w-auto object-contain animate-pulse" />
          </div>
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-300">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span>Restoring Session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'printable') {
    const targetForPrint = printableEvaluation || currentEvaluation;
    return (
      <div id="apes-print-shell" className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 sm:p-6 font-sans">
        <PrintableScorecard
          evaluation={targetForPrint}
          onBack={() => setViewMode('normal')}
        />
      </div>
    );
  }

  return (
    <div id="app-container" className="relative h-screen overflow-hidden bg-gradient-to-br from-[#FFF8F2] via-[#FFF4EA] via-60% to-[#F8FAFC] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Soft Translucent Top-Right Ambient Glow */}
      <div className="no-print fixed top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#F28C28]/12 via-amber-200/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-32 -mt-32 z-0" />
      {/* Subtle Dotted Pattern Overlay */}
      <div className="no-print fixed top-12 right-16 w-80 h-80 bg-[radial-gradient(#F28C28_1px,transparent_1px)] [background-size:18px_18px] opacity-10 pointer-events-none hidden lg:block z-0" />
      
      {/* Login & Create Account Modal Gating */}
      <LoginModal
        isOpen={!isAuthenticated}
        onLoginSuccess={handleLoginSuccess}
        allUsers={users}
        departments={departments}
        onRegisterNewUser={handleRegisterNewUser}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="no-print">
          <Navbar
            currentUser={currentUser}
            onLogout={handleLogout}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            onResetData={handleResetAllData}
            notifications={notifications}
            onMarkNotificationRead={handleMarkNotificationRead}
            onSelectEvaluation={(id) => {
              setSelectedEvalId(id);
              setActiveTab('evaluations');
              setViewMode('normal');
            }}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setViewMode('normal');
              localStorage.setItem('apes_active_tab_v3', tab);
            }}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            onOpenAnnouncementModal={() => setShowAnnouncementModal(true)}
            onOpenMessenger={() => setShowMessengerModal(true)}
            unreadMessagesCount={unreadDirectMessagesCount}
          />
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <Sidebar
            currentRole={currentUser.role}
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setViewMode('normal');
              localStorage.setItem('apes_active_tab_v3', tab);
            }}
            pendingCount={notifications.filter(n => !n.read).length}
            pendingAccountCount={pendingAccountCount}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          <main className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              {renderMainContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Organization Announcement Modal */}
      <div className="no-print">
        <AnnouncementModal
          isOpen={showAnnouncementModal}
          onClose={() => setShowAnnouncementModal(false)}
          senderName={currentUser.name}
          onAnnouncementCreated={() => {
            setNotifications(getRoleBasedNotifications(currentUser));
          }}
        />

        {/* Messenger & Direct Concerns Modal */}
        <MessengerModal
          isOpen={showMessengerModal}
          onClose={() => {
            setShowMessengerModal(false);
            setDirectMessages(getStoredDirectMessages());
          }}
          currentUser={currentUser}
          allUsers={users}
          onMessagesUpdated={() => {
            setDirectMessages(getStoredDirectMessages());
          }}
        />

        {/* Forced Password Change Modal for Default Admin / Flagged Accounts */}
        {isAuthenticated && currentUser.requiresPasswordChange && (
          <ChangePasswordModal
            isOpen={true}
            user={currentUser}
            isForced={true}
            onPasswordChanged={handleUpdateCurrentUser}
          />
        )}

        {/* Inactive Account Modal */}
        {inactiveAccountModal.open && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Account On Hold</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{inactiveAccountModal.message}</p>
              <div className="flex justify-end">
                <button
                  onClick={handleInactiveAccountOk}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

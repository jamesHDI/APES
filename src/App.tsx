import React, { useState, useEffect } from 'react';
import { User, Role, Evaluation, EvaluationTemplate, Department, EvaluationCycle, Notification, isPendingUser } from './types';
import { 
  getStoredUsers, 
  saveUsers,
  getStoredCurrentUser, 
  setCurrentUserStore, 
  getStoredDepartments, 
  saveDepartments,
  getStoredTemplates, 
  saveTemplates, 
  getStoredCycles, 
  getStoredEvaluations, 
  saveEvaluations, 
  saveSingleEvaluation, 
  getStoredAuditLogs,
  resetToDefaultSeedData,
  SEED_USERS
} from './services/storage';
import { 
  fetchEmployeesFromSupabase, 
  fetchDepartmentsFromSupabase, 
  fetchEvaluationsFromSupabase,
  fetchNotificationsFromSupabase,
  saveEmployeeToSupabase,
  saveEmployeeToSupabaseDetailed,
  findEmployeeInSupabase
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

import { determineWorkflowType, isUserDepartmentHead, getUserActiveEvaluation, getUserLatestEvaluation, isEvaluationCompleted } from './utils/workflowUtils';

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

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedEvalId, setSelectedEvalId] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'normal' | 'printable'>('normal');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // 1. Session Restoration Effect (On App Mount)
  useEffect(() => {
    let isMounted = true;
    const timeoutGuard = setTimeout(() => {
      if (isMounted) setIsSessionLoading(false);
    }, 2000);

    const initSession = async () => {
      try {
        // Purge legacy browser-specific local storage cache for pure Supabase cloud single source of truth
        localStorage.removeItem('apes_users_v3');

        const sessionActive = sessionStorage.getItem('apes_session_active_v3') === 'true';
        const savedTab = localStorage.getItem('apes_active_tab_v3');
        let storedUser = getStoredCurrentUser();

        if (sessionActive && storedUser) {
          // Fetch fresh user profile from Supabase PostgreSQL cloud database on mount
          if (isSupabaseConfigured) {
            try {
              const freshUser = await findEmployeeInSupabase(storedUser.email || storedUser.id);
              if (freshUser) {
                storedUser = freshUser;
                setCurrentUserStore(freshUser);
              }
            } catch (e) {
              console.warn('[App Init] Could not fetch fresh profile from Supabase, using stored fallback:', e);
            }
          }

          if (storedUser && storedUser.isActive !== false && storedUser.isApproved !== false && storedUser.approvalStatus !== 'pending') {
            if (isMounted) {
              setCurrentUser(storedUser);
              setIsAuthenticated(true);
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

  // 2. Real-time Database & Notification Polling (Every 3s)
  useEffect(() => {
    const syncDatabaseAndNotifications = async () => {
      if (isSupabaseConfigured) {
        const sbUsers = await fetchEmployeesFromSupabase();
        if (sbUsers && sbUsers.length > 0) {
          setUsers(sbUsers);
          
          // Live profile sync across devices for logged-in user
          setCurrentUser((prevUser: User) => {
            if (!prevUser) return prevUser;
            const updatedSelf = sbUsers.find(
              (u) => u.email.toLowerCase() === prevUser.email.toLowerCase() || u.id === prevUser.id
            );
            if (updatedSelf) {
              setCurrentUserStore(updatedSelf);
              return updatedSelf;
            }
            return prevUser;
          });
        }

        const sbDepts = await fetchDepartmentsFromSupabase();
        if (sbDepts && sbDepts.length > 0) setDepartments(sbDepts);

        const sbEvals = await fetchEvaluationsFromSupabase();
        if (sbEvals && sbEvals.length > 0) setEvaluations(sbEvals);

        const sbNotifs = await fetchNotificationsFromSupabase(currentUser?.id, currentUser?.role);
        if (sbNotifs) {
          const computed = getRoleBasedNotifications(sbNotifs, currentUser);
          setNotifications(computed);
        }

        console.log(`[APES Sync - Dashboard] Synchronized cloud state from Supabase: ${sbUsers?.length || 0} employees, ${sbDepts?.length || 0} departments, ${sbEvals?.length || 0} scorecards, ${sbNotifs?.length || 0} notifications.`);
      } else {
        const storedUsers = getStoredUsers();
        setUsers(storedUsers);
      }
    };

    // Initial sync
    syncDatabaseAndNotifications();

    // Poll every 3 seconds for fast fallback cross-device sync
    const intervalId = setInterval(syncDatabaseAndNotifications, 3000);

    // Dual Supabase Realtime Channels (PostgreSQL WAL changes + WebSocket Broadcast)
    let channel: any = null;
    let broadcastChannel: any = null;

    if (isSupabaseConfigured && supabase) {
      try {
        channel = supabase
          .channel('apes_realtime_channel')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
            syncDatabaseAndNotifications();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
            syncDatabaseAndNotifications();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations' }, () => {
            syncDatabaseAndNotifications();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => {
            syncDatabaseAndNotifications();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
            syncDatabaseAndNotifications();
          })
          .subscribe();

        broadcastChannel = supabase
          .channel('apes_broadcast_events')
          .on('broadcast', { event: 'data_changed' }, () => {
            syncDatabaseAndNotifications();
          })
          .subscribe();
      } catch (e) {
        console.warn('Realtime channel subscription error:', e);
      }
    }

    return () => {
      clearInterval(intervalId);
      if (supabase) {
        if (channel) supabase.removeChannel(channel);
        if (broadcastChannel) supabase.removeChannel(broadcastChannel);
      }
    };
  }, [currentUser?.id]);

  const handleLoginSuccess = async (authenticatedUser: User) => {
    setCurrentUser(authenticatedUser);
    setCurrentUserStore(authenticatedUser);
    sessionStorage.setItem('apes_session_active_v3', 'true');
    localStorage.removeItem('apes_session_active_v3');
    setIsAuthenticated(true);

    // Fetch all fresh data from Supabase on login
    if (isSupabaseConfigured) {
      try {
        const [sbUsers, sbDepts, sbEvals, sbNotifs] = await Promise.all([
          fetchEmployeesFromSupabase(),
          fetchDepartmentsFromSupabase(),
          fetchEvaluationsFromSupabase(),
          fetchNotificationsFromSupabase(authenticatedUser.id, authenticatedUser.role)
        ]);

        if (sbUsers && sbUsers.length > 0) setUsers(sbUsers);
        if (sbDepts && sbDepts.length > 0) setDepartments(sbDepts);
        if (sbEvals && sbEvals.length > 0) setEvaluations(sbEvals);
        if (sbNotifs) {
          setNotifications(getRoleBasedNotifications(sbNotifs, authenticatedUser));
        }
      } catch (e) {
        console.warn('Error syncing Supabase data on login:', e);
      }
    }

    const savedTab = localStorage.getItem('apes_active_tab_v3') || 'dashboard';
    setActiveTab(savedTab);
  };

  const handleLogout = async () => {
    await logoutUser();
    sessionStorage.removeItem('apes_session_active_v3');
    localStorage.removeItem('apes_session_active_v3');
    localStorage.removeItem('apes_active_tab_v3');
    setIsAuthenticated(false);
  };

  const handleRegisterNewUser = (newUser: User) => {
    const updated = [newUser, ...users];
    setUsers(updated);
    saveUsers(updated);
    saveEmployeeToSupabase(newUser);
  };

  const handleApproveUser = (approvedUser: User) => {
    const updated = users.map(u => u.id === approvedUser.id ? approvedUser : u);
    setUsers(updated);
    saveUsers(updated);
    saveEmployeeToSupabase(approvedUser);
  };

  const handleRejectUser = (userId: string, remarks: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        const rejected: User = {
          ...u,
          isApproved: false,
          isActive: false,
          approvalStatus: 'rejected' as const,
          hrRejectionRemarks: remarks
        };
        saveEmployeeToSupabase(rejected);
        return rejected;
      }
      return u;
    });
    setUsers(updated);
    saveUsers(updated);
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

  const handleSaveUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  };

  const handleUpdateCurrentUser = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setCurrentUserStore(updatedUser);
    const updatedUsers = users.map(u => (u.id === updatedUser.id || u.email.toLowerCase() === updatedUser.email.toLowerCase()) ? updatedUser : u);
    setUsers(updatedUsers);
    if (isSupabaseConfigured) {
      await saveEmployeeToSupabaseDetailed(updatedUser);
      triggerRealtimeBroadcast('data_changed', { type: 'employee', email: updatedUser.email });
    }
  };

  const handleSaveDepartments = (updatedDepts: Department[]) => {
    setDepartments(updatedDepts);
    saveDepartments(updatedDepts);
  };

  const handleSaveEvaluation = (updatedEval: Evaluation) => {
    saveSingleEvaluation(updatedEval);
    const updatedList = evaluations.map((e) => e.id === updatedEval.id ? updatedEval : e);
    setEvaluations(updatedList);
    setNotifications(getRoleBasedNotifications(currentUser));
  };

  const handleSaveTemplate = (updatedTemplate: EvaluationTemplate) => {
    const existingIndex = templates.findIndex((t) => t.id === updatedTemplate.id);
    let newTemplates = [...templates];
    if (existingIndex >= 0) {
      newTemplates[existingIndex] = updatedTemplate;
    } else {
      newTemplates.push(updatedTemplate);
    }
    setTemplates(newTemplates);
    saveTemplates(newTemplates);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updated = templates.filter((t) => t.id !== templateId);
    setTemplates(updated);
    saveTemplates(updated);
  };

  const handleResetAllData = () => {
    if (window.confirm('Reset all evaluation records, employees, departments, and roles to initial seed state?')) {
      resetToDefaultSeedData();
      setUsers(getStoredUsers());
      setCurrentUser(SEED_USERS[0]);
      setDepartments(getStoredDepartments());
      setTemplates(getStoredTemplates());
      setCycles(getStoredCycles());
      setEvaluations(getStoredEvaluations());
      setActiveTab('dashboard');
      setViewMode('normal');
    }
  };

  const getCurrentEvaluation = (): Evaluation => {
    if (selectedEvalId) {
      const found = evaluations.find((e) => e.id === selectedEvalId);
      if (found) {
        const isOwner = (found.employeeId && (found.employeeId === currentUser.id || found.employeeId === currentUser.employeeNumber)) || 
                        (found.employeeEmail && found.employeeEmail.toLowerCase() === currentUser.email.toLowerCase());
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

    return {
      id: `eval_${currentUser.id}_${Date.now()}`,
      cycleId: 'cycle_2026_annual',
      templateId: 'template_sales',
      workflowType: determineWorkflowType(currentUser),
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      departmentName: currentUser.departmentName || 'General',
      position: currentUser.position || 'Staff Specialist',
      isDepartmentHead: isUserDepartmentHead(currentUser),
      appraisalPeriod: 'January - December 2026',
      appraisalDate: new Date().toISOString().substring(0, 10),
      status: 'draft',
      eligibilityScore: 0,
      coreValuesScore: 0,
      totalEligibilityWeightedRating: 0,
      totalCoreValuesWeightedRating: 0,
      finalRating: 0,
      ratingClassification: 'Pending Evaluation',
      kpiRatings: [],
      coreValueRatings: [],
      developmentPlan: { strengths: '', areasForImprovement: '', learningNeeds: [] },
      personnelAction: { actionType: 'no_action' },
      signatures: {},
      evidenceFiles: [],
      auditTrail: [],
      createdAt: new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString().substring(0, 10)
    };
  };

  const currentEvaluation = getCurrentEvaluation();

  const renderMainContent = () => {
    if (viewMode === 'printable' && currentEvaluation) {
      return (
        <PrintableScorecard
          evaluation={currentEvaluation}
          onBack={() => setViewMode('normal')}
        />
      );
    }

    if (activeTab === 'evaluations' || activeTab === 'team_reviews' || activeTab === 'dept_head_reviews' || activeTab === 'pod_validation') {
      return (
        <EvaluationForm
          evaluation={currentEvaluation}
          currentUser={currentUser}
          allUsers={users}
          onSave={handleSaveEvaluation}
          onViewPrintable={() => setViewMode('printable')}
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

    if (activeTab === 'reports') {
      return (
        <ReportsCenter
          evaluations={evaluations}
          departments={departments}
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
          evaluations={evaluations}
          onOpenEvaluation={(id) => {
            setSelectedEvalId(id);
            setActiveTab('evaluations');
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
          />
        );
      case 'hr_admin':
        return (
          <HRDashboard
            currentUser={currentUser}
            evaluations={evaluations}
            cycles={cycles}
            departments={departments}
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

  const pendingAccountCount = users.filter(isPendingUser).length;

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      
      {/* Login & Create Account Modal Gating */}
      <LoginModal
        isOpen={!isAuthenticated}
        onLoginSuccess={handleLoginSuccess}
        allUsers={users}
        departments={departments}
        onRegisterNewUser={handleRegisterNewUser}
      />

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
      />

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
        />

        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            {renderMainContent()}
          </div>
        </main>
      </div>

      {/* Organization Announcement Modal */}
      <AnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        senderName={currentUser.name}
        onAnnouncementCreated={() => {
          setNotifications(getRoleBasedNotifications(currentUser));
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
    </div>
  );
};

export default App;

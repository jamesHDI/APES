import React, { useState, useEffect } from 'react';
import { User, Role, Evaluation, EvaluationTemplate, Department, EvaluationCycle, Notification } from './types';
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
  fetchEvaluationsFromSupabase 
} from './services/supabaseService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { getStoredNotifications, markNotificationAsRead } from './services/notificationService';
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
import { EmployeeManagement } from './components/admin/EmployeeManagement';
import { DepartmentManagement } from './components/admin/DepartmentManagement';
import { OrgHierarchyViewer } from './components/admin/OrgHierarchyViewer';
import { PendingApprovalsDashboard } from './components/admin/PendingApprovalsDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { MyProfile } from './components/profile/MyProfile';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';

export const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(getStoredUsers());
  const [currentUser, setCurrentUser] = useState<User>(getStoredCurrentUser());
  
  // Set isAuthenticated to false by default so Login / Create Account modal displays immediately!
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [departments, setDepartments] = useState<Department[]>(getStoredDepartments());
  const [templates, setTemplates] = useState<EvaluationTemplate[]>(getStoredTemplates());
  const [cycles, setCycles] = useState<EvaluationCycle[]>(getStoredCycles());
  const [evaluations, setEvaluations] = useState<Evaluation[]>(getStoredEvaluations());
  const [auditLogs, setAuditLogs] = useState(getStoredAuditLogs());
  const [notifications, setNotifications] = useState<Notification[]>(getStoredNotifications(currentUser.id));

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedEvalId, setSelectedEvalId] = useState<string>(evaluations[0]?.id || 'eval_maritess_2025');
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

  // Load from Supabase PostgreSQL if configured
  useEffect(() => {
    if (isSupabaseConfigured) {
      (async () => {
        const sbUsers = await fetchEmployeesFromSupabase();
        if (sbUsers && sbUsers.length > 0) setUsers(sbUsers);

        const sbDepts = await fetchDepartmentsFromSupabase();
        if (sbDepts && sbDepts.length > 0) setDepartments(sbDepts);

        const sbEvals = await fetchEvaluationsFromSupabase();
        if (sbEvals && sbEvals.length > 0) setEvaluations(sbEvals);
      })();
    }
  }, []);

  const handleLoginSuccess = (authenticatedUser: User) => {
    setCurrentUser(authenticatedUser);
    setCurrentUserStore(authenticatedUser);
    setIsAuthenticated(true);
    setNotifications(getStoredNotifications(authenticatedUser.id));

    if (authenticatedUser.role === 'president') {
      const workflowBEval = evaluations.find(e => e.workflowType === 'WORKFLOW_DEPT_HEAD' || e.workflowType === 'WORKFLOW_B') || evaluations[1];
      if (workflowBEval) setSelectedEvalId(workflowBEval.id);
    } else {
      const workflowAEval = evaluations.find(e => e.workflowType === 'WORKFLOW_REGULAR' || e.workflowType === 'WORKFLOW_A') || evaluations[0];
      if (workflowAEval) setSelectedEvalId(workflowAEval.id);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setIsAuthenticated(false);
  };

  const handleRegisterNewUser = (newUser: User) => {
    const updated = [newUser, ...users];
    setUsers(updated);
    saveUsers(updated);
  };

  const handleApproveUser = (approvedUser: User) => {
    const updated = users.map(u => u.id === approvedUser.id ? approvedUser : u);
    setUsers(updated);
    saveUsers(updated);
  };

  const handleRejectUser = (userId: string, remarks: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          isApproved: false,
          isActive: false,
          approvalStatus: 'rejected' as const,
          hrRejectionRemarks: remarks
        };
      }
      return u;
    });
    setUsers(updated);
    saveUsers(updated);
  };

  const handleMarkNotificationRead = (notifId: string) => {
    markNotificationAsRead(notifId);
    setNotifications(getStoredNotifications(currentUser.id));
  };

  const handleSaveUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  };

  const handleUpdateCurrentUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setCurrentUserStore(updatedUser);
    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  };

  const handleSaveDepartments = (updatedDepts: Department[]) => {
    setDepartments(updatedDepts);
    saveDepartments(updatedDepts);
  };

  const handleSaveEvaluation = (updatedEval: Evaluation) => {
    saveSingleEvaluation(updatedEval);
    const updatedList = evaluations.map((e) => e.id === updatedEval.id ? updatedEval : e);
    setEvaluations(updatedList);
    setNotifications(getStoredNotifications(currentUser.id));
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

  const currentEvaluation = evaluations.find((e) => e.id === selectedEvalId) || evaluations[0];

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
          templates={templates}
          departments={departments}
          onSaveTemplate={handleSaveTemplate}
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      
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
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentRole={currentUser.role}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setViewMode('normal');
          }}
          pendingCount={notifications.filter(n => !n.read).length}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            {renderMainContent()}
          </div>
        </main>
      </div>

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

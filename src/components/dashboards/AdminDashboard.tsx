import React from 'react';
import { User, Department, AuditLog } from '../../types';
import {
  Users,
  Building2,
  ShieldCheck,
  Activity,
  Key,
  SlidersHorizontal,
  ArrowRight,
  RotateCcw,
  GitBranch,
  UserCheck,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  users: User[];
  departments: Department[];
  auditLogs: AuditLog[];
  onOpenAdminPanel: () => void;
  onOpenWorkflowMonitoring?: () => void;
  onSelectTab?: (tab: string) => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  users,
  departments,
  auditLogs,
  onOpenAdminPanel,
  onOpenWorkflowMonitoring,
  onSelectTab,
}) => {
  const activeUsers = users.filter((u) => u.isActive);
  const pendingApprovals = users.filter((u) => u.approvalStatus === 'pending' || u.isApproved === false);

  const quickLinks = [
    { label: 'Pending Approvals', icon: UserCheck, action: () => onSelectTab && onSelectTab('pending_approvals'), badge: pendingApprovals.length },
    { label: 'Workflow Monitoring', icon: GitBranch, action: onOpenWorkflowMonitoring || onOpenAdminPanel },
    { label: 'Manage Users & Roles', icon: Users, action: onOpenAdminPanel },
    { label: 'Departments', icon: Building2, action: () => onSelectTab && onSelectTab('dept_mgmt') },
  ];

  return (
    <div className="space-y-6 pb-12">

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-950 via-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-rose-300 text-sm font-medium">{getGreeting()},</p>
            <h2 className="text-2xl font-extrabold mt-0.5">{currentUser.name}</h2>
            <p className="text-rose-200 text-sm mt-1">
              System Administrator &nbsp;·&nbsp; Full system access
            </p>
          </div>
          <button
            onClick={onOpenAdminPanel}
            className="btn btn-sm bg-rose-600 hover:bg-rose-500 text-white shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            Open Admin Panel
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-brand-100 dark:bg-brand-950">
            <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Registered Users</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{users.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 dark:bg-emerald-950">
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Departments</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{departments.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-rose-100 dark:bg-rose-950">
            <Activity className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Audit Events</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{auditLogs.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple-100 dark:bg-purple-950">
            <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">System Status</p>
            <span className="badge badge-done mt-1">Online</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.label}
                onClick={link.action}
                className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors text-center group"
              >
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                    {link.badge}
                  </span>
                )}
                <Icon className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Audit Log */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Recent System Activity</h3>
          <button
            onClick={onOpenAdminPanel}
            className="btn btn-ghost btn-sm text-brand-600 dark:text-brand-400"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {auditLogs.slice(0, 5).length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No recent activity.</div>
          ) : (
            auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{log.action}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {log.details} &nbsp;·&nbsp; {log.userName}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">{log.timestamp}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

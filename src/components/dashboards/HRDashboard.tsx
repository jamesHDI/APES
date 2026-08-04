import React, { useState } from 'react';
import { User, Evaluation, EvaluationCycle, Department } from '../../types';
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  BarChart3,
  SlidersHorizontal,
  ArrowRight,
  UserCheck,
  Search,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface HRDashboardProps {
  currentUser: User;
  evaluations: Evaluation[];
  cycles: EvaluationCycle[];
  departments: Department[];
  onOpenEvaluation: (evalId: string) => void;
  onOpenTemplateBuilder: () => void;
  onOpenReports: () => void;
  onSelectTab?: (tab: string) => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const HRDashboard: React.FC<HRDashboardProps> = ({
  currentUser,
  evaluations,
  cycles,
  departments,
  onOpenEvaluation,
  onOpenTemplateBuilder,
  onOpenReports,
  onSelectTab,
}) => {
  const [deptFilter, setDeptFilter] = useState('all');
  const activeCycle = cycles[0];
  const completedCount = evaluations.filter(
    (e) => e.status === 'supervisor_completed' || e.status === 'archived',
  ).length;
  const pendingCount = evaluations.length - completedCount;
  const totalAssigned = activeCycle?.totalAssigned ?? 118;
  const completed = activeCycle?.completedCount ?? 94;

  const filteredDepts = deptFilter === 'all'
    ? departments
    : departments.filter((d) => d.id === deptFilter);

  return (
    <div className="space-y-6 pb-12">

      {/* Hero */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF4EA] border border-[#F28C28]/20 flex items-center justify-center shrink-0 shadow-sm">
              <Users className="w-6 h-6 text-[#F28C28]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{getGreeting()}</p>
              <h2 className="text-xl font-bold mt-0.5 text-slate-900 dark:text-white">{currentUser.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                HR Administrator &nbsp;·&nbsp; Enterprise Evaluation Operations
              </p>
            </div>
          </div>
          <button
            onClick={onOpenReports}
            className="btn btn-primary btn-sm shrink-0"
          >
            <BarChart3 className="w-4 h-4" />
            HR Reports & Analytics
          </button>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onOpenTemplateBuilder}
          className="card-hover p-5 flex items-center gap-4 text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0 group-hover:bg-amber-200 dark:group-hover:bg-amber-900 transition-colors">
            <SlidersHorizontal className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white">Manage Evaluation Templates</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Create and edit KPI templates for each department</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
        </button>

        <button
          onClick={() => onSelectTab && onSelectTab('pending_approvals')}
          className="card-hover p-5 flex items-center gap-4 text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center shrink-0 group-hover:bg-purple-200 dark:group-hover:bg-purple-900 transition-colors">
            <UserCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white">Pending Account Approvals</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Review and approve new employee registrations</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-[#FFF4EA]">
            <Users className="w-5 h-5 text-[#F28C28]" />
          </div>
          <div>
            <p className="stat-label">Total Assigned</p>
            <p className="stat-number">{totalAssigned}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{completed}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-100 dark:bg-amber-950">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{totalAssigned - completed}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple-100 dark:bg-purple-950">
            <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Departments</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{departments.length}</p>
          </div>
        </div>
      </div>

      {/* Department Completion Rates */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 dark:text-white">Evaluation Completion by Department</h3>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="form-input py-2 text-xs w-48"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDepts.map((dept) => {
            const pct = dept.code === 'SLS' ? 88 : dept.code === 'ITS' ? 92 : dept.code === 'ACC' ? 75 : 82;
            const barColor = pct >= 90 ? 'from-emerald-500 to-emerald-400' : pct >= 75 ? 'from-brand-500 to-brand-400' : 'from-amber-500 to-amber-400';
            return (
              <div key={dept.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{dept.name}</span>
                    <span className="ml-2 text-xs text-slate-400">({dept.code})</span>
                  </div>
                  <span className={`text-sm font-black ${pct >= 90 ? 'text-emerald-600' : pct >= 75 ? 'text-brand-600' : 'text-amber-600'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Head: {dept.headName} &nbsp;·&nbsp; {dept.employeeCount} staff
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

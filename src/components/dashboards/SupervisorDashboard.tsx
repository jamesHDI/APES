import React, { useState } from 'react';
import { User, Evaluation, EvaluationTemplate } from '../../types';
import { Users, Clock, CheckCircle2, ArrowRight, Search, FileSpreadsheet, Layers, ChevronRight } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface SupervisorDashboardProps {
  currentUser: User;
  evaluations: Evaluation[];
  allUsers?: User[];
  templates?: EvaluationTemplate[];
  onOpenEvaluation: (evalId: string) => void;
  onOpenTemplateBuilder?: () => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  currentUser,
  evaluations,
  allUsers = [],
  templates = [],
  onOpenEvaluation,
  onOpenTemplateBuilder,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Direct reports assigned to this Immediate Supervisor
  const myDirectReports = allUsers.filter(u => 
    u.id !== currentUser.id && 
    (u.immediateSuperiorId === currentUser.id || 
     u.immediateSuperiorId === currentUser.employeeNumber ||
     u.immediateSuperiorName?.toLowerCase() === currentUser.name.toLowerCase())
  );

  // Evaluations for team members where this user is the Immediate Supervisor
  const teamEvaluations = evaluations.filter((e) => {
    if (e.employeeId === currentUser.id) return false;
    const isReport = myDirectReports.some(r => r.id === e.employeeId || r.employeeNumber === e.employeeId);
    const isSameDept = (e.departmentName || '').toLowerCase() === (currentUser.departmentName || '').toLowerCase();
    return isReport || isSameDept;
  });

  // Pending evaluations
  const pendingReviews = teamEvaluations.filter(
    (e) => e.status === 'pending_supervisor' || e.status === 'employee_submitted',
  );

  // Pending template reviews from direct reports
  const pendingTemplateReviews = templates.filter(
    (t) => (t.immediateSupervisorId === currentUser.id || 
            t.immediateSupervisorName?.toLowerCase() === currentUser.name.toLowerCase() ||
            myDirectReports.some(r => r.id === t.createdForEmployeeId || r.name === t.createdForEmployeeName)) &&
           (t.status === 'submitted_to_is' || t.status === 'is_review')
  );

  const completedReviews = teamEvaluations.filter(
    (e) => e.status === 'supervisor_completed' || e.status === 'archived' || e.status === 'pending_pod' || e.status === 'pod_validated',
  );

  const avgTeamScore =
    teamEvaluations.length > 0
      ? (teamEvaluations.reduce((acc, e) => acc + e.finalRating, 0) / teamEvaluations.length).toFixed(2)
      : '—';

  const filtered = teamEvaluations.filter((e) => {
    const matchSearch =
      search === '' ||
      e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase()) ||
      (e.departmentName && e.departmentName.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-12">

      {/* Welcome Hero */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] dark:from-transparent to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{getGreeting()}</p>
            <h2 className="text-xl font-bold mt-0.5 text-slate-900 dark:text-white">{currentUser.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Immediate Supervisor &nbsp;·&nbsp; {currentUser.companyName || 'Adventures'} &nbsp;·&nbsp; {currentUser.departmentName}
            </p>
          </div>
          <div className="bg-[#FFF4EA] dark:bg-brand-950/40 px-5 py-4 rounded-2xl border border-[#F28C28]/20 text-center shrink-0">
            <p className="text-[10px] text-[#F28C28] uppercase font-bold tracking-widest">Team Performance Average</p>
            <p className="text-3xl font-black text-[#E96B1A] mt-1 leading-none">{avgTeamScore}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">out of 4.00</p>
          </div>
        </div>
      </div>

      {/* Alert if there are pending template reviews */}
      {pendingTemplateReviews.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-900 dark:text-amber-200">
                You have {pendingTemplateReviews.length} evaluation template{pendingTemplateReviews.length > 1 ? 's' : ''} awaiting your Immediate Supervisor review.
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Review KRAs, KPIs, and calibrate weights before forwarding to People Operations (POD).
              </p>
            </div>
          </div>
          {onOpenTemplateBuilder && (
            <button
              onClick={onOpenTemplateBuilder}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shrink-0 shadow-sm transition-all"
            >
              Review Templates
            </button>
          )}
        </div>
      )}

      {/* Alert if there are pending evaluation reviews */}
      {pendingReviews.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-[#F28C28]/30">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[#E96B1A]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
              You have {pendingReviews.length} employee evaluation{pendingReviews.length > 1 ? 's' : ''} waiting for your Immediate Supervisor rating review.
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
              Click "Review" on any item below to open the sequential adjustment scoring sheet.
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-indigo-100 dark:bg-indigo-950">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Direct Reports</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{myDirectReports.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-100 dark:bg-amber-950">
            <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Templates</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{pendingTemplateReviews.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-orange-100 dark:bg-orange-950">
            <Clock className="w-5 h-5 text-[#E96B1A]" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Evaluations</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{pendingReviews.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed Reviews</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{completedReviews.length}</p>
          </div>
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="content-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Direct Reports Evaluations</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff, position, dept..."
                className="text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white w-full sm:w-56"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending_supervisor">Pending IS Review</option>
              <option value="employee_submitted">Employee Submitted</option>
              <option value="supervisor_completed">IS Completed</option>
              <option value="pending_pod">Pending POD</option>
              <option value="pod_validated">POD Validated</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No direct reports evaluations found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Employee</th>
                  <th className="pb-3 font-semibold">Company / Dept</th>
                  <th className="pb-3 font-semibold">Period</th>
                  <th className="pb-3 font-semibold text-center">Self</th>
                  <th className="pb-3 font-semibold text-center">IS</th>
                  <th className="pb-3 font-semibold text-center">Final</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 pr-2">
                      <p className="font-bold text-slate-900 dark:text-white">{ev.employeeName}</p>
                      <p className="text-[11px] text-slate-500">{ev.position}</p>
                    </td>
                    <td className="py-3 pr-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{ev.companyName || 'Adventures'}</span>
                      <p className="text-[10px] text-slate-400">{ev.departmentName}</p>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">{ev.appraisalPeriod}</td>
                    <td className="py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                      {ev.eligibilityScore ? ev.eligibilityScore.toFixed(2) : '—'}
                    </td>
                    <td className="py-3 text-center font-bold text-amber-600 dark:text-amber-400">
                      {ev.coreValuesScore ? ev.coreValuesScore.toFixed(2) : '—'}
                    </td>
                    <td className="py-3 text-center font-black text-[#E96B1A]">
                      {ev.finalRating ? ev.finalRating.toFixed(2) : '—'}
                    </td>
                    <td className="py-3 text-center">
                      <StatusBadge status={ev.status} />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onOpenEvaluation(ev.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#E96B1A] hover:bg-[#D45A0E] text-white font-bold text-xs inline-flex items-center space-x-1 shadow-sm transition-all"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { User, Evaluation, Department } from '../../types';
import { ShieldCheck, CheckCircle2, Clock, Archive, BarChart3, ArrowRight, Search, GitBranch } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface PODDashboardProps {
  currentUser: User;
  evaluations: Evaluation[];
  departments: Department[];
  onOpenEvaluation: (evalId: string) => void;
  onOpenReports: () => void;
  onOpenWorkflowMonitoring?: () => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const PODDashboard: React.FC<PODDashboardProps> = ({
  currentUser,
  evaluations,
  departments,
  onOpenEvaluation,
  onOpenReports,
  onOpenWorkflowMonitoring,
}) => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const pendingPODReviews = evaluations.filter(
    (e) => e.status === 'pending_pod' || e.status === 'supervisor_completed' || e.status === 'president_completed',
  );
  const archivedEvaluations = evaluations.filter(
    (e) => e.status === 'archived' || e.status === 'pod_validated',
  );

  const filtered = evaluations.filter((e) => {
    const matchSearch =
      search === '' || e.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'all' || e.departmentName === deptFilter;
    return matchSearch && matchDept;
  });

  const deptNames = [...new Set(evaluations.map((e) => e.departmentName))];

  return (
    <div className="space-y-6 pb-12">

      {/* Hero */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF4EA] border border-[#F28C28]/20 flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-[#F28C28]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{getGreeting()}</p>
              <h2 className="text-xl font-bold mt-0.5 text-slate-900 dark:text-white">{currentUser.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F28C28]" />
                POD Officer &nbsp;·&nbsp; Quality Governance & Validation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenWorkflowMonitoring && (
              <button
                onClick={onOpenWorkflowMonitoring}
                className="btn btn-secondary btn-sm"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Workflow Monitoring
              </button>
            )}
            <button
              onClick={onOpenReports}
              className="btn btn-primary btn-sm"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Core Values Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Alert for pending validations */}
      {pendingPODReviews.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {pendingPODReviews.length} evaluation{pendingPODReviews.length > 1 ? 's' : ''} awaiting your POD validation.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Review, validate computations, and digitally sign to finalize.
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-amber-100 dark:bg-amber-950">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Validation</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {pendingPODReviews.length}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Validated & Archived</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {archivedEvaluations.length}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-brand-100 dark:bg-brand-950">
            <Archive className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Staff Evaluated</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {evaluations.length}
            </p>
          </div>
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900 dark:text-white">All Evaluations</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input pl-9 py-2 text-xs w-44"
                />
              </div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="form-input py-2 text-xs w-44"
              >
                <option value="all">All Departments</option>
                {deptNames.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Department</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Rating</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Signatures</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                    No evaluations match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => {
                  const sigCount = Object.keys(ev.signatures).length;
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{ev.employeeName}</p>
                        <p className="text-xs text-slate-500">{ev.position}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-slate-600 dark:text-slate-400 text-sm">
                        {ev.departmentName}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="font-black text-hdi-red">{ev.finalRating.toFixed(2)}</span>
                        <span className="text-xs text-slate-400"> /4.00</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`badge ${sigCount > 0 ? 'badge-done' : 'badge-pending'}`}>
                          {sigCount} {sigCount === 1 ? 'Signature' : 'Signatures'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ev.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onOpenEvaluation(ev.id)}
                          className="btn btn-success btn-sm"
                        >
                          Validate
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

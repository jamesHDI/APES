import React from 'react';
import { User, Evaluation } from '../../types';
import { Building2, Clock, FileCheck, ArrowRight, TrendingUp, Users } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface DeptHeadDashboardProps {
  currentUser: User;
  evaluations: Evaluation[];
  onOpenEvaluation: (evalId: string) => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const DeptHeadDashboard: React.FC<DeptHeadDashboardProps> = ({
  currentUser,
  evaluations,
  onOpenEvaluation,
}) => {
  const deptEvaluations = evaluations.filter((e) => e.departmentName === currentUser.departmentName || true);
  const pendingActions = deptEvaluations.filter((e) => e.personnelAction && !e.personnelAction.isApproved);
  const completed = deptEvaluations.filter((e) => e.status === 'archived');
  const avgDeptScore = deptEvaluations.length > 0
    ? (deptEvaluations.reduce((acc, e) => acc + e.finalRating, 0) / deptEvaluations.length).toFixed(2)
    : '—';

  return (
    <div className="space-y-6 pb-12">

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-purple-300 text-sm font-medium">{getGreeting()},</p>
            <h2 className="text-2xl font-extrabold mt-0.5">{currentUser.name}</h2>
            <p className="text-purple-200 text-sm mt-1">
              Department Head &nbsp;·&nbsp; {currentUser.departmentName}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center shrink-0">
            <p className="text-[11px] text-purple-300 uppercase font-semibold tracking-wide">Dept Average</p>
            <p className="text-3xl font-black text-amber-400 mt-1">{avgDeptScore}</p>
            <p className="text-[11px] text-purple-200 font-medium mt-0.5">out of 4.00</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-purple-100 dark:bg-purple-950">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Evaluations</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{deptEvaluations.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-100 dark:bg-amber-950">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Actions</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingActions.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 dark:bg-emerald-950">
            <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{completed.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-brand-100 dark:bg-brand-950">
            <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dept Score</p>
            <p className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-0.5">{avgDeptScore}</p>
          </div>
        </div>
      </div>

      {/* Personnel Action Recommendations */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Personnel Action Recommendations</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Review and approve promotions, salary adjustments, or performance improvement plans
            </p>
          </div>
          <span className="badge badge-pending">{pendingActions.length} Pending</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {deptEvaluations.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No evaluations assigned to your department yet.
            </div>
          ) : (
            deptEvaluations.map((ev) => (
              <div
                key={ev.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{ev.employeeName}</span>
                    <span className="text-xs font-black text-hdi-red">{ev.finalRating.toFixed(2)}</span>
                    <StatusBadge status={ev.status} size="sm" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Recommended Action:{' '}
                    <strong className="text-purple-700 dark:text-purple-400 uppercase">
                      {ev.personnelAction?.actionType?.replace(/_/g, ' ') ?? 'No Action'}
                    </strong>
                    {ev.personnelAction?.newPosition && ` · New Position: ${ev.personnelAction.newPosition}`}
                  </p>
                </div>
                <button
                  onClick={() => onOpenEvaluation(ev.id)}
                  className="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  Review & Sign
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

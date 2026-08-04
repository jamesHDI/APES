import React from 'react';
import { User, Evaluation } from '../../types';
import { Crown, Building2, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface PresidentDashboardProps {
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

export const PresidentDashboard: React.FC<PresidentDashboardProps> = ({
  currentUser,
  evaluations,
  onOpenEvaluation,
}) => {
  const deptHeadEvals = evaluations.filter(
    (e) => e.workflowType === 'WORKFLOW_DEPT_HEAD' || e.workflowType === 'WORKFLOW_B' || e.isDepartmentHead,
  );
  const pendingPresidentReviews = deptHeadEvals.filter(
    (e) => e.status === 'pending_president' || e.status === 'department_head_submitted',
  );
  const completedPresidentReviews = deptHeadEvals.filter(
    (e) => e.status === 'pending_pod' || e.status === 'archived',
  );

  return (
    <div className="space-y-6 pb-12">

      {/* Hero */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] dark:from-transparent to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{getGreeting()}</p>
            <h2 className="text-xl font-bold mt-0.5 text-slate-900 dark:text-white">{currentUser.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">President & CEO &nbsp;·&nbsp; Executive Performance Portal</p>
          </div>
          <div className="bg-[#FFF4EA] dark:bg-brand-950/40 px-5 py-4 rounded-2xl border border-[#F28C28]/20 text-center shrink-0">
            <p className="text-[10px] text-[#F28C28] uppercase font-bold tracking-widest">Company Average</p>
            <p className="text-3xl font-black text-[#E96B1A] mt-1 leading-none">3.52</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Outstanding Performance</p>
          </div>
        </div>
      </div>

      {/* Alert for pending reviews */}
      {pendingPresidentReviews.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {pendingPresidentReviews.length} Department Head evaluation{pendingPresidentReviews.length > 1 ? 's' : ''} require your executive review.
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
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Reviews</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {pendingPresidentReviews.length}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Reviewed</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {completedPresidentReviews.length}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple-100 dark:bg-purple-950">
            <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dept Heads Assessed</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {deptHeadEvals.length}
            </p>
          </div>
        </div>
      </div>

      {/* Dept Head Evaluations Table */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white">Department Head Scorecards</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Executive review queue for Workflow B evaluations
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Department Head</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Department</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">KPI Score</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Total Rating</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {deptHeadEvals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                    No department head evaluations assigned yet.
                  </td>
                </tr>
              ) : (
                deptHeadEvals.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{ev.employeeName}</p>
                      <p className="text-xs text-slate-500">{ev.ratingClassification}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-600 dark:text-slate-400">
                      {ev.departmentName}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-bold text-brand-600">
                      {ev.eligibilityScore.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-black text-amber-500 text-base">{ev.finalRating.toFixed(2)}</span>
                      <span className="text-xs text-slate-400"> /4.00</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ev.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onOpenEvaluation(ev.id)}
                        className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Review
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

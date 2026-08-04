import React from 'react';
import { User, Evaluation } from '../../types';
import { isEvaluationCompleted } from '../../utils/workflowUtils';
import { StatusBadge } from '../common/StatusBadge';
import { 
  History, 
  Award, 
  FileCheck, 
  Calendar, 
  ArrowRight,
  Sparkles,
  Search
} from 'lucide-react';

interface EvaluationHistoryViewProps {
  currentUser: User;
  evaluations: Evaluation[];
  onOpenEvaluation: (evalId: string) => void;
}

export const EvaluationHistoryView: React.FC<EvaluationHistoryViewProps> = ({
  currentUser,
  evaluations,
  onOpenEvaluation,
}) => {
  const [search, setSearch] = React.useState('');

  // Get completed / archived evaluations for the user (or all if admin)
  const isPrivileged = currentUser.role === 'system_admin' || currentUser.role === 'hr_admin' || currentUser.role === 'pod';
  
  const historyEvals = evaluations.filter((e) => {
    const belongsToUser = isPrivileged || e.employeeId === currentUser.id;
    const isCompleted = isEvaluationCompleted(e);
    const matchesSearch = search === '' || 
      e.appraisalPeriod.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      e.departmentName.toLowerCase().includes(search.toLowerCase());

    return belongsToUser && isCompleted && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">

      {/* Header Banner */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#FFF4EA] border border-[#F28C28]/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-[#F28C28]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Evaluation History & Past Scorecards</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
                Archive of all completed appraisal cycles, final ratings, and development plans.
              </p>
            </div>
          </div>
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search period or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 border-slate-200 dark:border-slate-700 w-52 focus:ring-2 focus:ring-[#F28C28]/30 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Completed Appraisal Records ({historyEvals.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-750 text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Position</th>
                <th className="py-3 px-4">Appraisal Period</th>
                <th className="py-3 px-4">Final Score</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Completion Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {historyEvals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No completed evaluation history records found.
                  </td>
                </tr>
              ) : (
                historyEvals.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {ev.employeeName}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{ev.position}</p>
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">{ev.departmentName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                      {ev.appraisalPeriod}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-hdi-red text-sm">{ev.finalRating.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400"> / 4.00</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                        {ev.ratingClassification}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {ev.updatedAt || ev.appraisalDate}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onOpenEvaluation(ev.id)}
                        className="btn btn-xs btn-secondary font-semibold"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-brand-500" />
                        <span>View Details</span>
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

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
  Search,
  Printer
} from 'lucide-react';

interface EvaluationHistoryViewProps {
  currentUser: User;
  evaluations: Evaluation[];
  onOpenEvaluation: (evalId: string) => void;
  onViewPrintable?: (evalId: string) => void;
}

export const EvaluationHistoryView: React.FC<EvaluationHistoryViewProps> = ({
  currentUser,
  evaluations,
  onOpenEvaluation,
  onViewPrintable,
}) => {
  const [search, setSearch] = React.useState('');

  // Get completed / submitted evaluations for the user (or all if admin/pod)
  const isPrivileged = currentUser.role === 'system_admin' || currentUser.role === 'hr_admin' || currentUser.role === 'pod';
  
  const historyEvals = evaluations.filter((e) => {
    const cleanEmail = (currentUser.email || '').trim().toLowerCase();
    const cleanName = (currentUser.name || '').trim().toLowerCase();
    
    const belongsToUser = isPrivileged || 
      (e.employeeId && (e.employeeId === currentUser.id || e.employeeId === currentUser.employeeNumber)) || 
      (cleanEmail && e.employeeEmail && e.employeeEmail.trim().toLowerCase() === cleanEmail) ||
      (cleanName && e.employeeName && e.employeeName.trim().toLowerCase() === cleanName);

    // Show completed evaluations OR any evaluation that has been submitted by the employee (status !== 'draft')
    const isSubmittedOrCompleted = isEvaluationCompleted(e) || e.status !== 'draft';
    const matchesSearch = search === '' || 
      e.appraisalPeriod.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      e.departmentName.toLowerCase().includes(search.toLowerCase());

    return belongsToUser && isSubmittedOrCompleted && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">

      {/* Header Banner */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Evaluation History & Past Scorecards</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
              Archive of all submitted and completed appraisal cycles, self ratings, final scores, and downloadable PDFs.
            </p>
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
            Submitted & Completed Evaluation History ({historyEvals.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Position</th>
                <th className="py-3 px-4">Appraisal Period</th>
                <th className="py-3 px-4">Workflow Status</th>
                <th className="py-3 px-4">Score & Rating</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {historyEvals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No submitted or completed evaluation records found.
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
                      <span className="text-[10px] font-bold text-[#E96B1A] dark:text-brand-300">{ev.departmentName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                      {ev.appraisalPeriod}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={ev.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-hdi-red text-sm">{ev.finalRating > 0 ? ev.finalRating.toFixed(2) : (ev.eligibilityScore || 0).toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400"> / 4.00</span>
                      <p className="text-[10px] font-bold text-slate-500">{ev.ratingClassification}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onOpenEvaluation(ev.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition-colors"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-brand-500" />
                          <span>View Form</span>
                        </button>
                        <button
                          onClick={() => onViewPrintable ? onViewPrintable(ev.id) : onOpenEvaluation(ev.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Official Scorecard PDF</span>
                        </button>
                      </div>
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

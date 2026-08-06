import React from 'react';
import { User, EvaluationHistory } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { 
  History, 
  FileCheck, 
  Calendar,
  Search,
  Printer,
  Eye
} from 'lucide-react';

interface EvaluationHistoryViewProps {
  currentUser: User;
  historyRecords: EvaluationHistory[];
  onOpenEvaluation: (evalId: string) => void;
  onViewPrintable?: (evalId: string) => void;
}

export const EvaluationHistoryView: React.FC<EvaluationHistoryViewProps> = ({
  currentUser,
  historyRecords,
  onOpenEvaluation,
  onViewPrintable,
}) => {
  const [search, setSearch] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterCycle, setFilterCycle] = React.useState('');

  const isPrivileged = currentUser.role === 'pod' || currentUser.role === 'hr_admin';
  const isPresident = currentUser.role === 'president';

  const filteredHistory = historyRecords.filter((h) => {
    const cleanEmail = (currentUser.email || '').trim().toLowerCase();
    const cleanName = (currentUser.name || '').trim().toLowerCase();

    const belongsToUser = isPrivileged || isPresident ||
      (h.employeeId === currentUser.id || h.employeeId === currentUser.employeeNumber) ||
      (cleanEmail && h.employeeName.trim().toLowerCase() === cleanName);

    const matchesSearch = search === '' || 
      h.appraisalPeriod.toLowerCase().includes(search.toLowerCase()) ||
      h.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      h.departmentName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === '' || h.status === filterStatus;
    const matchesCycle = filterCycle === '' || h.appraisalPeriod === filterCycle;

    return belongsToUser && matchesSearch && matchesStatus && matchesCycle;
  });

  const uniqueCycles = Array.from(new Set(historyRecords.map(h => h.appraisalPeriod)));

  const getWorkflowLabel = (stage: string) => {
    const labels: Record<string, string> = {
      'draft': 'Draft',
      'employee_submitted': 'Self Evaluation Submitted',
      'pending_dept_head': 'Pending Dept Head Review',
      'pending_supervisor': 'Pending Supervisor Review',
      'pending_president': 'Pending President Review',
      'pending_pod': 'Pending POD Validation',
      'department_head_submitted': 'Dept Head Review Completed',
      'supervisor_completed': 'Supervisor Review Completed',
      'president_completed': 'President Review Completed',
      'pod_validated': 'POD Validated & Archived',
      'archived': 'Archived',
      'reopened': 'Returned for Revision'
    };
    return labels[stage] || stage;
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Header Banner */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] dark:from-transparent to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Evaluation History & Audit Trail</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
              Permanent immutable record of every evaluation submission. Confidential and tamper-proof.
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

      {/* Filters */}
      {(isPrivileged || isPresident) && (
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">All Statuses</option>
            <option value="employee_submitted">Employee Submitted</option>
            <option value="pending_dept_head">Pending Dept Head</option>
            <option value="pending_supervisor">Pending Supervisor</option>
            <option value="pending_president">Pending President</option>
            <option value="pending_pod">Pending POD</option>
            <option value="supervisor_completed">Supervisor Completed</option>
            <option value="president_completed">President Completed</option>
            <option value="pod_validated">POD Validated</option>
            <option value="archived">Archived</option>
            <option value="reopened">Returned for Revision</option>
          </select>
          <select
            value={filterCycle}
            onChange={(e) => setFilterCycle(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">All Cycles</option>
            {uniqueCycles.map(cycle => (
              <option key={cycle} value={cycle}>{cycle}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table Card */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Permanent Evaluation History ({filteredHistory.length})
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Immutable Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Position</th>
                <th className="py-3 px-4">Appraisal Period</th>
                <th className="py-3 px-4">Workflow Stage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Score & Rating</th>
                <th className="py-3 px-4">Submitted By</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No evaluation history records found.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {h.employeeName}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{h.position}</p>
                      <span className="text-[10px] font-bold text-[#E96B1A] dark:text-brand-300">{h.departmentName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                      {h.appraisalPeriod}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{getWorkflowLabel(h.workflowStage)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={h.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-hdi-red text-sm">{h.finalRating > 0 ? h.finalRating.toFixed(2) : (h.eligibilityScore || 0).toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400"> / 4.00</span>
                      <p className="text-[10px] font-bold text-slate-500">{h.ratingClassification}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{h.submittedByName}</p>
                      <p className="text-[10px] text-slate-400">{h.submittedByRole}</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                      {new Date(h.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onOpenEvaluation(h.evaluationId)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-500" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => onViewPrintable ? onViewPrintable(h.evaluationId) : onOpenEvaluation(h.evaluationId)}
                          className="px-3 py-1.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
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

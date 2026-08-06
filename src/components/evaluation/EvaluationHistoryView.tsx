import React from 'react';
import { User, EvaluationHistory, EvaluationScorecardArchive } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { 
  History, 
  FileCheck, 
  Calendar,
  Search,
  Printer,
  Eye,
  Download,
  FileText
} from 'lucide-react';

interface EvaluationHistoryViewProps {
  currentUser: User;
  historyRecords: EvaluationHistory[];
  scorecardArchives: EvaluationScorecardArchive[];
  onOpenEvaluation: (evalId: string) => void;
  onViewPrintable?: (evalId: string) => void;
  onViewArchive?: (archiveId: string) => void;
}

export const EvaluationHistoryView: React.FC<EvaluationHistoryViewProps> = ({
  currentUser,
  historyRecords,
  scorecardArchives,
  onOpenEvaluation,
  onViewPrintable,
  onViewArchive,
}) => {
  const [search, setSearch] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterCycle, setFilterCycle] = React.useState('');
  const [viewingArchiveId, setViewingArchiveId] = React.useState<string | null>(null);

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

  const getArchiveForHistory = (historyId: string): EvaluationScorecardArchive | undefined => {
    return scorecardArchives.find(a => a.evaluationId === historyId);
  };

  const handleViewArchive = (evaluationId: string) => {
    const archive = getArchiveForHistory(evaluationId);
    if (archive) {
      setViewingArchiveId(archive.id);
    } else if (onViewArchive) {
      onViewArchive(evaluationId);
    }
  };

  const handleDownloadArchive = (archive: EvaluationScorecardArchive) => {
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scorecard-${archive.employeeName.replace(/\s+/g, '-')}-${archive.appraisalPeriod}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewingArchive = viewingArchiveId ? scorecardArchives.find(a => a.id === viewingArchiveId) : null;

  if (viewingArchive) {
    return (
      <div className="space-y-6 pb-12">
        <div className="hero-card">
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Official Scorecard Archive</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
                Immutable official record. This document cannot be modified.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewingArchiveId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Back to History
              </button>
              <button
                onClick={() => handleDownloadArchive(viewingArchive)}
                className="px-4 py-2 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Download Archive
              </button>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employee</p>
              <p className="font-bold text-slate-900 dark:text-white">{viewingArchive.employeeName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department & Position</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{viewingArchive.departmentName} • {viewingArchive.position}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Appraisal Period</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{viewingArchive.appraisalPeriod}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Workflow Stage</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{getWorkflowLabel(viewingArchive.workflowStage)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Rating</p>
              <p className="font-black text-hdi-red text-lg">{viewingArchive.finalRating.toFixed(2)} / 4.00</p>
              <p className="text-xs font-bold text-slate-500">{viewingArchive.ratingClassification}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Archived</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{new Date(viewingArchive.archivedAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">KPI Ratings</p>
            <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl overflow-auto max-h-48 text-slate-700 dark:text-slate-300">
              {JSON.stringify(viewingArchive.kpiRatingsData, null, 2)}
            </pre>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Core Values Ratings</p>
            <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl overflow-auto max-h-48 text-slate-700 dark:text-slate-300">
              {JSON.stringify(viewingArchive.coreValueRatingsData, null, 2)}
            </pre>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Development Plan</p>
            <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl overflow-auto max-h-48 text-slate-700 dark:text-slate-300">
              {JSON.stringify(viewingArchive.developmentPlanData, null, 2)}
            </pre>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Personnel Action</p>
            <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl overflow-auto max-h-48 text-slate-700 dark:text-slate-300">
              {JSON.stringify(viewingArchive.personnelActionData, null, 2)}
            </pre>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Signatures</p>
            <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl overflow-auto max-h-48 text-slate-700 dark:text-slate-300">
              {JSON.stringify(viewingArchive.signaturesData, null, 2)}
            </pre>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Evidence Files</p>
            <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl overflow-auto max-h-48 text-slate-700 dark:text-slate-300">
              {JSON.stringify(viewingArchive.evidenceFilesData, null, 2)}
            </pre>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Audit Trail</p>
            <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl overflow-auto max-h-48 text-slate-700 dark:text-slate-300">
              {JSON.stringify(viewingArchive.auditTrailData, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

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
                <th className="py-3 px-4 text-right">Actions</th>
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
                filteredHistory.map((h) => {
                  const archive = getArchiveForHistory(h.evaluationId);
                  const hasArchive = !!archive;
                  return (
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
                          {hasArchive && (
                            <>
                              <button
                                onClick={() => handleViewArchive(h.evaluationId)}
                                className="px-3 py-1.5 rounded-xl bg-[#FFF4EA] hover:bg-[#FFE8D1] dark:bg-brand-950 dark:hover:bg-brand-900 text-[#E96B1A] dark:text-brand-300 font-bold text-xs flex items-center space-x-1.5 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View Official Scorecard</span>
                              </button>
                              <button
                                onClick={() => handleDownloadArchive(archive!)}
                                className="px-3 py-1.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </button>
                            </>
                          )}
                          {!hasArchive && (
                            <button
                              onClick={() => onViewPrintable ? onViewPrintable(h.evaluationId) : onOpenEvaluation(h.evaluationId)}
                              className="px-3 py-1.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print</span>
                            </button>
                          )}
                        </div>
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

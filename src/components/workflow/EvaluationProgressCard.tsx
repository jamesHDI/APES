import React from 'react';
import { Evaluation, User } from '../../types';
import { getCurrentReviewerInfo } from '../../utils/workflowUtils';
import { 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  Calendar, 
  ArrowRight, 
  CheckCircle2,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface EvaluationProgressCardProps {
  evaluation: Evaluation;
  allUsers?: User[];
  onOpenEvaluation?: (evalId: string) => void;
  showActions?: boolean;
}

export const EvaluationProgressCard: React.FC<EvaluationProgressCardProps> = ({
  evaluation,
  allUsers = [],
  onOpenEvaluation,
  showActions = true,
}) => {
  const info = getCurrentReviewerInfo(evaluation, allUsers);
  const isDeptHeadTrack = evaluation.workflowType === 'WORKFLOW_DEPT_HEAD' || evaluation.isDepartmentHead;

  // Status badge styling
  const getStatusBadge = () => {
    switch (evaluation.status) {
      case 'draft':
      case 'reopened':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500',
          label: evaluation.status === 'reopened' ? 'Returned for Revision' : 'Draft / In Progress'
        };
      case 'pending_dept_head':
      case 'employee_submitted':
      case 'pending_supervisor':
        return {
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          dot: 'bg-blue-500 animate-pulse',
          label: 'Under Department Head Review'
        };
      case 'pending_president':
      case 'department_head_submitted':
        return {
          bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          dot: 'bg-purple-500 animate-pulse',
          label: 'Under President Review'
        };
      case 'pending_pod':
      case 'supervisor_completed':
      case 'president_completed':
        return {
          bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          dot: 'bg-indigo-500 animate-pulse',
          label: 'Under POD Review'
        };
      case 'pod_validated':
      case 'archived':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500',
          label: 'Evaluation Completed'
        };
      default:
        return {
          bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
          dot: 'bg-slate-500',
          label: info.currentStatusLabel
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="card p-6 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-lg rounded-2xl relative overflow-hidden transition-all hover:shadow-xl">
      {/* Accent Header Glow */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
        isDeptHeadTrack 
          ? 'bg-gradient-to-r from-purple-500 via-amber-500 to-indigo-500'
          : 'bg-gradient-to-r from-brand-500 via-blue-500 to-emerald-500'
      }`} />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
              My Evaluation
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isDeptHeadTrack
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                : 'bg-brand-100 text-brand-800 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
            }`}>
              {isDeptHeadTrack ? 'Department Head Workflow' : 'Regular Employee Workflow'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personal Evaluation Status & Scorecard Tracking
          </p>
        </div>

        {/* Status Pill */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${badge.bg}`}>
          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
          {badge.label}
        </div>
      </div>

      {/* Main Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        
        {/* Current Reviewer */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750/50 border border-slate-200/80 dark:border-slate-700/60 flex items-start space-x-3">
          <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Current Reviewer
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
              {info.reviewerName}
            </p>
            <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mt-0.5">
              {info.reviewerRole}
            </p>
          </div>
        </div>

        {/* Estimated Next Step */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750/50 border border-slate-200/80 dark:border-slate-700/60 flex items-start space-x-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Next Step
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
              {info.nextStepLabel}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automatic Hierarchy Routing
            </p>
          </div>
        </div>

        {/* Timestamps */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750/50 border border-slate-200/80 dark:border-slate-700/60 flex items-start space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Date Submitted
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {info.dateSubmitted}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Last Updated
              </p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {info.lastUpdated}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Action Footer */}
      {showActions && onOpenEvaluation && (
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Assigned position: <strong className="text-slate-700 dark:text-slate-300">{evaluation.position}</strong>
          </p>
          <button
            onClick={() => onOpenEvaluation(evaluation.id)}
            className="btn btn-primary btn-sm font-semibold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
          >
            <span>View Evaluation & Timeline</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

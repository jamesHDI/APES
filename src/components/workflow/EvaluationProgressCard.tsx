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
          bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          dot: 'bg-slate-400',
          label: evaluation.status === 'reopened' ? 'Returned for Revision' : 'Draft / Pending'
        };
      case 'pending_dept_head':
      case 'employee_submitted':
      case 'pending_supervisor':
      case 'pending_president':
      case 'department_head_submitted':
      case 'pending_pod':
      case 'supervisor_completed':
      case 'president_completed':
        return {
          bg: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800/60',
          dot: 'bg-[#F28C28] animate-pulse',
          label: 'In Progress / Under Review'
        };
      case 'pod_validated':
      case 'archived':
        return {
          bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
          dot: 'bg-emerald-500',
          label: 'Evaluation Completed'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          dot: 'bg-slate-400',
          label: info.currentStatusLabel
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl relative overflow-hidden transition-all hover:shadow-md">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
              My Evaluation
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#FFF4EA] text-[#E96B1A] dark:bg-brand-950/60 dark:text-brand-300 border border-[#F28C28]/20">
              {isDeptHeadTrack ? 'Dept Head Workflow' : 'Regular Employee Workflow'}
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
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-start space-x-3">
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

        {/* Next Step */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Next Step
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">
            {info.nextStepLabel}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automatic Hierarchy Routing
          </p>
        </div>

        {/* Timestamps */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Submitted: <span className="font-bold text-slate-700 dark:text-slate-200 normal-case">{info.dateSubmitted}</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Updated: <span className="font-medium text-slate-600 dark:text-slate-300 normal-case">{info.lastUpdated}</span>
            </p>
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

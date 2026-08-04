import React from 'react';
import { EvaluationStatus } from '../../types';

interface StatusBadgeProps {
  status: EvaluationStatus | string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // Gray — Pending / Draft / Reopened
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  },
  reopened: {
    label: 'Reopened',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  },
  pending_supervisor: {
    label: 'Awaiting Supervisor',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  },
  pending_dept_head: {
    label: 'Pending Dept Head',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  },
  pending_president: {
    label: 'Awaiting President',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  },
  pending_pod: {
    label: 'Awaiting POD Review',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  },

  // Orange — In Progress / Submitted / Under Review
  employee_submitted: {
    label: 'Submitted',
    className: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60',
  },
  department_head_submitted: {
    label: 'Dept Head Submitted',
    className: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60',
  },
  supervisor_completed: {
    label: 'Supervisor Reviewed',
    className: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60',
  },
  president_completed: {
    label: 'President Reviewed',
    className: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60',
  },

  // Green — Approved / Completed / Validated
  pod_validated: {
    label: 'POD Validated',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
  },
  archived: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
  },

  // Red — Rejected / Action Required
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
};

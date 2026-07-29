import React from 'react';
import { EvaluationStatus, EvaluationWorkflowType, EvaluationStepHistory } from '../../types';
import { CheckCircle2, Clock, FileEdit, Send, ShieldCheck, Archive, Crown } from 'lucide-react';

interface WorkflowProgressBarProps {
  status: EvaluationStatus;
  workflowType?: EvaluationWorkflowType;
  stepHistory?: EvaluationStepHistory[];
}

export const WorkflowProgressBar: React.FC<WorkflowProgressBarProps> = ({
  status,
  workflowType = 'WORKFLOW_REGULAR',
  stepHistory = [],
}) => {
  const stepsRegular = [
    { id: 'draft', label: 'Self-Evaluation', role: 'Employee', icon: FileEdit },
    { id: 'pending_supervisor', label: 'Supervisor Review', role: 'Immediate Superior', icon: Clock },
    { id: 'pending_pod', label: 'POD Review', role: 'POD Officer', icon: ShieldCheck },
    { id: 'archived', label: 'Completed', role: 'Archived', icon: Archive },
  ];

  const stepsNoIS = [
    { id: 'draft', label: 'Self-Evaluation', role: 'Employee', icon: FileEdit },
    { id: 'pending_dept_head', label: 'Dept Head Review', role: 'Department Head', icon: Clock },
    { id: 'pending_pod', label: 'POD Review', role: 'POD Officer', icon: ShieldCheck },
    { id: 'archived', label: 'Completed', role: 'Archived', icon: Archive },
  ];

  const stepsDeptHead = [
    { id: 'draft', label: 'Self-Evaluation', role: 'Department Head', icon: FileEdit },
    { id: 'pending_president', label: 'President Review', role: 'President & CEO', icon: Crown },
    { id: 'pending_pod', label: 'POD Review', role: 'POD Officer', icon: ShieldCheck },
    { id: 'archived', label: 'Completed', role: 'Archived', icon: Archive },
  ];

  const steps =
    workflowType === 'WORKFLOW_DEPT_HEAD'
      ? stepsDeptHead
      : workflowType === 'WORKFLOW_NO_IS'
      ? stepsNoIS
      : stepsRegular;

  const getActiveStepIndex = (st: EvaluationStatus) => {
    switch (st) {
      case 'draft':
      case 'reopened':
        return 0;
      case 'employee_submitted':
      case 'department_head_submitted':
      case 'pending_supervisor':
      case 'pending_dept_head':
      case 'pending_president':
        return 1;
      case 'supervisor_completed':
      case 'president_completed':
      case 'pending_pod':
      case 'pod_validated':
        return 2;
      case 'archived':
        return 3;
      default:
        return 0;
    }
  };

  const STATUS_PLAIN: Partial<Record<EvaluationStatus, string>> = {
    draft: 'In Progress',
    reopened: 'Returned for Revision',
    employee_submitted: 'Submitted',
    pending_supervisor: 'Waiting for Supervisor',
    pending_dept_head: 'Waiting for Dept Head',
    pending_president: 'Waiting for President',
    department_head_submitted: 'Dept Head Submitted',
    supervisor_completed: 'Supervisor Reviewed',
    president_completed: 'President Reviewed',
    pending_pod: 'Awaiting POD Review',
    pod_validated: 'POD Validated',
    archived: 'Completed & Archived',
  };

  const currentIndex = getActiveStepIndex(status);
  const plainStatus = STATUS_PLAIN[status] ?? status.replace(/_/g, ' ');

  const workflowLabel: Record<string, string> = {
    WORKFLOW_REGULAR: 'Standard Workflow',
    WORKFLOW_NO_IS: 'Direct to Dept Head',
    WORKFLOW_DEPT_HEAD: 'Department Head Track',
    WORKFLOW_B: 'Department Head Track',
  };

  return (
    <div className="card p-5 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            workflowType === 'WORKFLOW_DEPT_HEAD' || workflowType === 'WORKFLOW_B'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
              : workflowType === 'WORKFLOW_NO_IS'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300'
          }`}>
            {workflowLabel[workflowType] ?? workflowType}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
            Evaluation Workflow
          </span>
        </div>
        <span className="text-xs px-3 py-1 rounded-full font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
          {plainStatus}
        </span>
      </div>

      {/* Stepper */}
      <div className="relative flex items-start justify-between mt-2 px-2">
        {/* Connecting Line Background */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
        {/* Active Line Fill */}
        <div
          className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-brand-500 via-purple-500 to-emerald-500 z-0 transition-all duration-500"
          style={{ width: `calc(${(currentIndex / (steps.length - 1)) * 100}% - 4rem)` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;
          const history = stepHistory.find((h) => h.stepId === step.id);

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
              {/* Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : isCurrent
                    ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-950 shadow-lg scale-110'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-600'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Labels */}
              <div className="mt-2.5 text-center px-1">
                <p
                  className={`text-xs font-semibold leading-tight ${
                    isCurrent
                      ? 'text-brand-700 dark:text-brand-300'
                      : isCompleted
                      ? 'text-slate-700 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.label}
                </p>

                {isCompleted && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    ✓ {history?.approverName ?? step.role}
                  </p>
                )}

                {isCurrent && (
                  <p className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold mt-0.5">
                    {step.role}
                  </p>
                )}

                {!isCompleted && !isCurrent && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {step.role}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

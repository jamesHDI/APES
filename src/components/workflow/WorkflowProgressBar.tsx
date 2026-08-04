import React from 'react';
import { EvaluationStatus, EvaluationWorkflowType, EvaluationStepHistory } from '../../types';
import { CheckCircle2, Clock, FileEdit, ShieldCheck, Archive, Crown, UserCheck } from 'lucide-react';

interface WorkflowProgressBarProps {
  status: EvaluationStatus;
  workflowType?: EvaluationWorkflowType;
  stepHistory?: EvaluationStepHistory[];
  isDepartmentHead?: boolean;
}

export const WorkflowProgressBar: React.FC<WorkflowProgressBarProps> = ({
  status,
  workflowType = 'WORKFLOW_REGULAR',
  stepHistory = [],
  isDepartmentHead = false,
}) => {
  const isDeptHeadTrack = workflowType === 'WORKFLOW_DEPT_HEAD' || workflowType === 'WORKFLOW_B' || isDepartmentHead;

  const stepsRegular = [
    { id: 'draft', label: 'Self Evaluation', role: 'Employee', icon: FileEdit },
    { id: 'pending_dept_head', label: 'Department Head Review', role: 'Department Head', icon: UserCheck },
    { id: 'pending_pod', label: 'POD Review', role: 'POD Officer', icon: ShieldCheck },
    { id: 'archived', label: 'Evaluation Completed', role: 'Completed', icon: Archive },
  ];

  const stepsDeptHead = [
    { id: 'draft', label: 'Self Evaluation', role: 'Department Head', icon: FileEdit },
    { id: 'pending_president', label: 'President Review', role: 'President & CEO', icon: Crown },
    { id: 'pending_pod', label: 'POD Review', role: 'POD Officer', icon: ShieldCheck },
    { id: 'archived', label: 'Evaluation Completed', role: 'Completed', icon: Archive },
  ];

  const steps = isDeptHeadTrack ? stepsDeptHead : stepsRegular;

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
        return 2;
      case 'pod_validated':
      case 'archived':
        return 3;
      default:
        return 0;
    }
  };

  const getStatusText = (st: EvaluationStatus, isDeptHead: boolean) => {
    switch (st) {
      case 'draft':
        return 'Self Evaluation In Progress';
      case 'reopened':
        return 'Returned for Revision';
      case 'employee_submitted':
      case 'pending_supervisor':
      case 'pending_dept_head':
        return isDeptHead ? 'Under Department Head Review' : 'Under Department Head Review';
      case 'department_head_submitted':
      case 'pending_president':
        return 'Under President Review';
      case 'supervisor_completed':
      case 'president_completed':
      case 'pending_pod':
        return 'Under POD Review';
      case 'pod_validated':
      case 'archived':
        return 'Evaluation Completed';
      default:
        return String(st).replace(/_/g, ' ');
    }
  };

  const currentIndex = getActiveStepIndex(status);
  const statusText = getStatusText(status, isDeptHeadTrack);

  return (
    <div className="card p-5 mb-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FFF4EA] text-[#E96B1A] dark:bg-brand-950 dark:text-brand-300 border border-[#F28C28]/20">
            {isDeptHeadTrack ? 'Workflow 2 – Department Head Pipeline' : 'Workflow 1 – Regular Employee Pipeline'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            currentIndex === 3 ? 'bg-emerald-500' : 'bg-[#F28C28] animate-pulse'
          }`} />
          <span className="text-xs px-3 py-1 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {statusText}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="relative flex items-start justify-between mt-2 px-2">
        {/* Connecting Line Background */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
        {/* Active Line Fill */}
        <div
          className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-[#F28C28] to-[#E96B1A] z-0 transition-all duration-500"
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
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-[#F28C28] text-white ring-4 ring-[#FFF4EA] dark:ring-brand-950 shadow-sm scale-105'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isCurrent ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4 opacity-50" />
                )}
              </div>

              {/* Labels */}
              <div className="mt-2.5 text-center px-1">
                <p
                  className={`text-xs font-bold leading-tight ${
                    isCurrent
                      ? 'text-[#E96B1A] dark:text-brand-300'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {isCompleted
                    ? `${step.label} Completed`
                    : isCurrent
                    ? `Under ${step.label}`
                    : `Pending ${step.label}`}
                </p>

                {isCompleted && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    {history?.approverName ?? step.role}
                  </p>
                )}

                {isCurrent && (
                  <p className="text-[10px] text-[#E96B1A] dark:text-brand-400 font-semibold mt-0.5">
                    Assigned: {step.role}
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

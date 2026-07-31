import React from 'react';
import { Evaluation, User } from '../../types';
import { getEvaluationTimelineEvents } from '../../utils/workflowUtils';
import { CheckCircle2, Clock, ArrowDown, UserCheck, Crown, ShieldCheck, FileCheck } from 'lucide-react';

interface EvaluationTimelineProps {
  evaluation: Evaluation;
  allUsers?: User[];
}

export const EvaluationTimeline: React.FC<EvaluationTimelineProps> = ({
  evaluation,
  allUsers = [],
}) => {
  const events = getEvaluationTimelineEvents(evaluation, allUsers);

  return (
    <div className="card p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight flex items-center gap-2">
            <span>Workflow Timeline</span>
            <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-0.5 rounded-full border border-brand-200 dark:border-brand-800">
              Real-Time Hierarchy Trail
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit history and completed routing steps
          </p>
        </div>
      </div>

      <div className="mt-6 relative px-2 sm:px-4">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;

          return (
            <div key={event.id} className="relative pb-8 last:pb-0">
              {/* Connecting vertical line */}
              {!isLast && (
                <div
                  className={`absolute top-6 left-5 -ml-px w-0.5 h-full ${
                    event.isCompleted
                      ? 'bg-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              )}

              <div className="relative flex items-start space-x-4">
                {/* Status Indicator Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                    event.isCompleted
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : event.isCurrent
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-950 shadow-lg scale-105'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {event.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : event.isCurrent ? (
                    <Clock className="w-5 h-5 animate-pulse" />
                  ) : (
                    <FileCheck className="w-4 h-4" />
                  )}
                </div>

                {/* Event Content */}
                <div className="flex-1 bg-slate-50/80 dark:bg-slate-750/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4
                      className={`text-sm font-bold ${
                        event.isCurrent
                          ? 'text-brand-600 dark:text-brand-400'
                          : event.isCompleted
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {event.title}
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 w-fit">
                      {event.date}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {event.description}
                  </p>

                  {event.actorName && (
                    <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {event.actorName}
                      </span>
                      {event.actorRole && (
                        <span className="text-slate-400">({event.actorRole})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Down Arrow indicator between steps */}
              {!isLast && (
                <div className="my-2 ml-4 pl-0.5 text-slate-300 dark:text-slate-600">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

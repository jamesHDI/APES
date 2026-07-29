import React from 'react';
import { User, Evaluation } from '../../types';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  Paperclip,
  TrendingUp,
  CalendarDays,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface EmployeeDashboardProps {
  currentUser: User;
  evaluations: Evaluation[];
  onOpenEvaluation: (evalId: string) => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  currentUser,
  evaluations,
  onOpenEvaluation,
}) => {
  const myEvaluation = evaluations.find((e) => e.employeeId === currentUser.id) || evaluations[0];

  const statusMessages: Partial<Record<string, string>> = {
    draft: 'Your evaluation is ready. Please complete and submit it.',
    pending_dept_head: 'Your evaluation has been submitted and is waiting for your Department Head\'s review.',
    pending_supervisor: 'Your evaluation has been submitted and is waiting for review.',
    pending_pod: 'Your Department Head has reviewed your evaluation. It is now with the POD team for final review.',
    archived: 'Your evaluation is complete and has been archived.',
    reopened: 'Your evaluation has been returned for revision. Please update and resubmit.',
  };

  const nextActionMessage = statusMessages[myEvaluation?.status] ?? 'No pending actions at this time.';
  const needsAction = myEvaluation?.status === 'draft' || myEvaluation?.status === 'reopened';

  return (
    <div className="space-y-6 pb-12">

      {/* Welcome Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-8 w-56 h-56 bg-brand-400/10 rounded-full blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-brand-300 text-sm font-medium">{getGreeting()},</p>
            <h2 className="text-2xl font-extrabold mt-0.5 tracking-tight">{currentUser.name}</h2>
            <p className="text-brand-200 text-sm mt-1">
              {currentUser.position} &nbsp;·&nbsp; {currentUser.departmentName}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center shrink-0">
            <p className="text-[11px] text-brand-300 uppercase font-semibold tracking-wide">Current Rating</p>
            <p className="text-3xl font-black text-amber-400 mt-1">
              {myEvaluation?.finalRating.toFixed(2) ?? '—'}
            </p>
            <p className="text-[11px] text-brand-200 font-medium mt-0.5">
              {myEvaluation?.ratingClassification ?? 'Not yet rated'}
            </p>
          </div>
        </div>
      </div>

      {/* Next Action Banner */}
      <div className={`flex items-start sm:items-center gap-4 p-4 rounded-2xl border ${
        needsAction
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          needsAction ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-slate-200 dark:bg-slate-700'
        }`}>
          {needsAction
            ? <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            : <CheckCircle2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${needsAction ? 'text-amber-900 dark:text-amber-200' : 'text-slate-700 dark:text-slate-300'}`}>
            {nextActionMessage}
          </p>
          {myEvaluation && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Period: <strong>{myEvaluation.appraisalPeriod}</strong>
            </p>
          )}
        </div>
        {needsAction && myEvaluation && (
          <button
            onClick={() => onOpenEvaluation(myEvaluation.id)}
            className="btn-primary btn btn-sm shrink-0"
          >
            Open <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-brand-100 dark:bg-brand-950">
            <FileSpreadsheet className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Appraisal Period</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 leading-tight">
              {myEvaluation?.appraisalPeriod ?? '—'}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 dark:bg-emerald-950">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">KPI Score (85%)</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {myEvaluation?.eligibilityScore.toFixed(2) ?? '—'}
              <span className="text-xs text-slate-400 font-normal"> / 3.40</span>
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple-100 dark:bg-purple-950">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Core Values (15%)</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {myEvaluation?.totalCoreValuesWeightedRating.toFixed(2) ?? '—'}
              <span className="text-xs text-slate-400 font-normal"> / 0.60</span>
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-100 dark:bg-amber-950">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status</p>
            <div className="mt-1">
              {myEvaluation && <StatusBadge status={myEvaluation.status} size="sm" />}
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Card */}
      {myEvaluation && (
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Active Evaluation
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {myEvaluation.appraisalPeriod}
              </p>
            </div>
            <button
              onClick={() => onOpenEvaluation(myEvaluation.id)}
              className="btn btn-primary btn-sm"
            >
              Open Evaluation
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* KPI Highlights */}
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              KPI Performance Highlights
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myEvaluation.kpiRatings.slice(0, 4).map((kpi) => {
                const rating = kpi.supervisorRating || kpi.selfRating || 0;
                const ratingColors = [
                  '',
                  'text-rose-600',
                  'text-amber-600',
                  'text-brand-600',
                  'text-emerald-600',
                ];
                return (
                  <div
                    key={kpi.kpiId}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {kpi.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Weight: {kpi.weightPercent}%</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={`text-lg font-black ${ratingColors[rating] ?? 'text-slate-600'}`}>
                        {rating || '—'}
                        <span className="text-xs font-normal text-slate-400">/4</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Score: {kpi.weightedScore.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => onOpenEvaluation(myEvaluation.id)}
              className="btn btn-secondary btn-sm"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Upload Evidence
            </button>
            <button
              onClick={() => onOpenEvaluation(myEvaluation.id)}
              className="btn btn-secondary btn-sm"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              View History
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

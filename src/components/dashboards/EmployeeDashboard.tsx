import React from 'react';
import { User, Evaluation, EvaluationTemplate } from '../../types';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  Paperclip,
  TrendingUp,
  CalendarDays,
  Lock,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { EvaluationProgressCard } from '../workflow/EvaluationProgressCard';
import { getUserActiveEvaluation, getUserLatestEvaluation, isEvaluationCompleted } from '../../utils/workflowUtils';
import { checkEvaluationAccess } from '../../utils/deploymentRules';

interface EmployeeDashboardProps {
  currentUser: User;
  evaluations: Evaluation[];
  templates?: EvaluationTemplate[];
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
  templates,
  onOpenEvaluation,
}) => {
  const activeEvaluation = getUserActiveEvaluation(currentUser, evaluations);
  const latestEvaluation = getUserLatestEvaluation(currentUser, evaluations);
  const displayEvaluation = activeEvaluation || latestEvaluation;

  const currentTemplate = templates?.find(t => t.id === displayEvaluation?.templateId);
  const eligibilityWeight = currentTemplate?.formulaConfig?.eligibilityWeight ?? 85;
  const coreValuesWeight = currentTemplate?.formulaConfig?.coreValuesWeight ?? 15;

  const statusMessages: Partial<Record<string, string>> = {
    draft: 'Your evaluation is ready. Please complete and submit it.',
    pending_dept_head: 'Your evaluation has been submitted and is waiting for your Department Head\'s review.',
    pending_supervisor: 'Your evaluation has been submitted and is waiting for review.',
    pending_pod: 'Your Department Head has reviewed your evaluation. It is now with the POD team for final review.',
    archived: 'Your current evaluation has been completed and archived.',
    pod_validated: 'Your evaluation has been validated and archived.',
    reopened: 'Your evaluation has been returned for revision. Please update and resubmit.',
  };

  const activeAccess = checkEvaluationAccess(activeEvaluation, currentUser);
  const isCampaignBlocked = activeAccess.isBlocked;

  let nextActionMessage = activeEvaluation 
    ? (statusMessages[activeEvaluation.status] ?? 'No pending actions at this time.') 
    : 'Your evaluation cycle is completed. Please wait for POD/Admin to assign your next evaluation.';

  if (activeEvaluation && isCampaignBlocked) {
    if (activeAccess.reason === 'overdue') {
      nextActionMessage = `Campaign deadline expired (${activeAccess.deadline || 'Overdue'}). Access is locked until POD reactivates it.`;
    } else {
      nextActionMessage = 'Campaign is closed by POD. Access and editing are locked until reactivated.';
    }
  }

  const needsAction = !isCampaignBlocked && (activeEvaluation?.status === 'draft' || activeEvaluation?.status === 'reopened');

  return (
    <div className="space-y-6 pb-12">

      {/* Welcome Hero */}
      <div className="hero-card">
        {/* Decorative ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] dark:from-transparent to-transparent pointer-events-none rounded-r-2xl" />
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#F28C28]/8 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{getGreeting()}</p>
            <h2 className="text-xl font-bold mt-0.5 tracking-tight text-slate-900 dark:text-white">{currentUser.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {currentUser.position} &nbsp;·&nbsp; {currentUser.departmentName}
            </p>
          </div>

          <div className="bg-[#FFF4EA] dark:bg-brand-950/40 px-5 py-4 rounded-2xl border border-[#F28C28]/20 text-center shrink-0">
            <p className="text-[10px] text-[#F28C28] uppercase font-bold tracking-widest">Latest Rating</p>
            <p className="text-3xl font-black text-[#E96B1A] mt-1 leading-none">
              {displayEvaluation?.finalRating ? displayEvaluation.finalRating.toFixed(2) : '—'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              {displayEvaluation?.ratingClassification ?? 'Not yet rated'}
            </p>
          </div>
        </div>
      </div>

      {/* My Evaluation Panel or Clean No Active Evaluation Assigned State */}
      {activeEvaluation ? (
        <EvaluationProgressCard 
          evaluation={activeEvaluation} 
          onOpenEvaluation={onOpenEvaluation}
        />
      ) : (
        <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">My Evaluation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Personal Evaluation Status & Scorecard Tracking</p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Status</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Waiting
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">No active evaluation assigned.</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Waiting for POD or System Administrator to deploy an evaluation form for your account.
            </p>

            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-700 dark:text-slate-300">Workflow Routing:</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400">Employee</span>
              <span>→</span>
              <span>Department Head</span>
              <span>→</span>
              <span>POD</span>
              <span>→</span>
              <span>Completed</span>
            </div>
          </div>
          {latestEvaluation && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onOpenEvaluation(latestEvaluation.id)}
                className="btn btn-secondary btn-sm shrink-0 font-semibold flex items-center gap-1.5"
              >
                <span>View My Past Completed Scorecard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Next Action Banner */}
      <div className={`relative overflow-hidden flex items-start sm:items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
        needsAction
          ? 'bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-amber-950/40 border-amber-300 dark:border-amber-700 shadow-md shadow-amber-500/10 ring-2 ring-amber-400/30'
          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
      }`}>
        {/* Subtle continuous shimmer beam for immediate visibility */}
        {needsAction && (
          <div 
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/40 dark:via-amber-400/15 to-transparent pointer-events-none"
            style={{
              animation: 'shimmerSweep 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
        )}

        {/* Action Icon with pulsing ping indicator */}
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            needsAction ? 'bg-amber-100 dark:bg-amber-900/60 shadow-sm' : 'bg-slate-200 dark:bg-slate-700'
          }`}>
            {needsAction
              ? <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
              : <CheckCircle2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            }
          </div>
          {needsAction && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E96B1A]"></span>
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-semibold ${needsAction ? 'text-amber-900 dark:text-amber-200' : 'text-slate-700 dark:text-slate-300'}`}>
              {nextActionMessage}
            </p>
            {needsAction && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#E96B1A] dark:bg-orange-950/60 dark:text-orange-300 border border-[#F28C28]/30 animate-pulse">
                Action Required
              </span>
            )}
          </div>
          {displayEvaluation && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Period: <strong>{displayEvaluation.appraisalPeriod}</strong>
            </p>
          )}
        </div>

        {needsAction && activeEvaluation && (
          <button
            onClick={() => onOpenEvaluation(activeEvaluation.id)}
            className="btn-primary btn btn-sm shrink-0 z-10 shadow-md hover:shadow-lg transition-all group relative overflow-hidden"
            style={{
              animation: 'openButtonNudge 2s ease-in-out infinite'
            }}
          >
            <span>Open</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        )}

        {isCampaignBlocked && activeEvaluation && (
          <button
            onClick={() => onOpenEvaluation(activeEvaluation.id)}
            className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold shrink-0 z-10 flex items-center gap-1.5 shadow-sm transition-all"
            title="Campaign closed or overdue. Click for details."
          >
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{activeAccess.reason === 'overdue' ? 'Overdue (Locked)' : 'Campaign Closed'}</span>
          </button>
        )}

        <style>{`
          @keyframes shimmerSweep {
            0% { transform: translateX(-100%); }
            45%, 100% { transform: translateX(200%); }
          }
          @keyframes openButtonNudge {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(5px); }
            40% { transform: translateX(0); }
            60% { transform: translateX(3px); }
            80% { transform: translateX(0); }
          }
        `}</style>
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
              {displayEvaluation?.appraisalPeriod ?? '—'}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 dark:bg-emerald-950">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">KPI Score ({eligibilityWeight}%)</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {displayEvaluation?.eligibilityScore ? displayEvaluation.eligibilityScore.toFixed(2) : '0.00'}
              <span className="text-xs text-slate-400 font-normal"> / 3.40</span>
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple-100 dark:bg-purple-950">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Core Values ({coreValuesWeight}%)</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {displayEvaluation?.totalCoreValuesWeightedRating ? displayEvaluation.totalCoreValuesWeightedRating.toFixed(2) : '0.00'}
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
              {displayEvaluation ? <StatusBadge status={displayEvaluation.status} size="sm" /> : <span className="text-xs text-slate-400">Completed</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Card */}
      {displayEvaluation && (
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {activeEvaluation ? 'Active Evaluation' : 'Completed Evaluation Scorecard'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {displayEvaluation.appraisalPeriod}
              </p>
            </div>
            <button
              onClick={() => onOpenEvaluation(displayEvaluation.id)}
              className="btn btn-primary btn-sm"
            >
              {activeEvaluation ? 'Open Evaluation' : 'View Scorecard'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* KPI Highlights */}
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              KPI Performance Highlights
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {displayEvaluation.kpiRatings.slice(0, 4).map((kpi) => {
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
              onClick={() => onOpenEvaluation(displayEvaluation.id)}
              className="btn btn-secondary btn-sm"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Upload Evidence
            </button>
            <button
              onClick={() => onOpenEvaluation(displayEvaluation.id)}
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

import React, { useState } from 'react';
import { User, Evaluation, Department } from '../../types';
import { ShieldCheck, CheckCircle2, Clock, Archive, BarChart3, ArrowRight, Search, GitBranch, Rocket, SlidersHorizontal, Crown } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface PODDashboardProps {
  currentUser: User;
  evaluations: Evaluation[];
  departments: Department[];
  onOpenEvaluation: (evalId: string) => void;
  onOpenReports: () => void;
  onOpenWorkflowMonitoring?: () => void;
  onOpenDeployment?: () => void;
  onOpenTemplateBuilder?: () => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const PODDashboard: React.FC<PODDashboardProps> = ({
  currentUser,
  evaluations,
  departments,
  onOpenEvaluation,
  onOpenReports,
  onOpenWorkflowMonitoring,
  onOpenDeployment,
  onOpenTemplateBuilder,
}) => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  const pendingPODReviews = evaluations.filter(
    (e) => e.status === 'pending_pod' || e.status === 'supervisor_completed' || e.status === 'president_completed',
  );
  const archivedEvaluations = evaluations.filter(
    (e) => e.status === 'archived' || e.status === 'pod_validated',
  );

  const filtered = evaluations.filter((e) => {
    const query = search.toLowerCase().trim();
    const matchSearch =
      query === '' ||
      e.employeeName.toLowerCase().includes(query) ||
      e.position.toLowerCase().includes(query) ||
      e.departmentName.toLowerCase().includes(query);

    const matchDept = deptFilter === 'all' || e.departmentName === deptFilter;

    let matchStage = true;
    if (stageFilter === 'self') {
      matchStage = e.status === 'draft' || e.status === 'reopened';
    } else if (stageFilter === 'dept_head') {
      matchStage = e.status === 'pending_dept_head' || e.status === 'employee_submitted' || e.status === 'pending_supervisor';
    } else if (stageFilter === 'president') {
      matchStage = e.status === 'pending_president' || e.status === 'department_head_submitted';
    } else if (stageFilter === 'pod') {
      matchStage = e.status === 'pending_pod' || e.status === 'supervisor_completed' || e.status === 'president_completed';
    } else if (stageFilter === 'completed') {
      matchStage = e.status === 'pod_validated' || e.status === 'archived';
    }

    return matchSearch && matchDept && matchStage;
  });

  const deptNames = [...new Set(evaluations.map((e) => e.departmentName))];

  const getStageStepBadge = (status: string) => {
    switch (status) {
      case 'draft':
      case 'reopened':
        return { step: 'Step 1/4', label: 'Self Evaluation In Progress', color: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'pending_dept_head':
      case 'employee_submitted':
      case 'pending_supervisor':
        return { step: 'Step 2/4', label: 'Pending Dept Head Review', color: 'bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800' };
      case 'pending_president':
      case 'department_head_submitted':
        return { step: 'Step 3/4', label: 'Pending Executive Review', color: 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'pending_pod':
      case 'supervisor_completed':
      case 'president_completed':
        return { step: 'Step 4/4', label: 'Ready for POD Final Review', color: 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'pod_validated':
      case 'archived':
        return { step: 'Complete', label: 'Validated & Archived', color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      default:
        return { step: 'In Progress', label: status, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Hero */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] dark:from-transparent to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{getGreeting()}</p>
            <h2 className="text-xl font-bold mt-0.5 text-slate-900 dark:text-white">{currentUser.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              People & Organization Development &nbsp;·&nbsp; Enterprise Evaluation Control & Live Audit Monitor
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenDeployment && (
              <button
                onClick={onOpenDeployment}
                className="btn btn-primary btn-sm"
              >
                <Rocket className="w-3.5 h-3.5" />
                Deploy Campaign
              </button>
            )}
            {onOpenTemplateBuilder && (
              <button
                onClick={onOpenTemplateBuilder}
                className="btn btn-secondary btn-sm"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Templates
              </button>
            )}
            {onOpenWorkflowMonitoring && (
              <button
                onClick={onOpenWorkflowMonitoring}
                className="btn btn-secondary btn-sm"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Monitoring
              </button>
            )}
            <button
              onClick={onOpenReports}
              className="btn btn-secondary btn-sm"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Alert for pending validations */}
      {pendingPODReviews.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {pendingPODReviews.length} evaluation{pendingPODReviews.length > 1 ? 's' : ''} awaiting your POD final validation.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Review full scorecards, validate computations, and digitally sign to complete the process.
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-amber-100 dark:bg-amber-950">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Final POD Validation</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {pendingPODReviews.length}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Validated & Archived</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {archivedEvaluations.length}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple-100 dark:bg-purple-950">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Executive Review</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
              {evaluations.filter(e => e.status === 'pending_president' || e.status === 'department_head_submitted').length}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-brand-100 dark:bg-brand-950">
            <Archive className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Staff Tracked</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {evaluations.length}
            </p>
          </div>
        </div>
      </div>

      {/* 1. SECTION: Evaluations Waiting for POD Review */}
      <div className="card space-y-4 p-5 border-l-4 border-l-blue-500">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Evaluations Waiting for POD Final Review ({pendingPODReviews.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Evaluations completed by Department Heads / Supervisors awaiting final POD validation & archiving.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
            Stage 4 of 4
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Employee Name</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Department Head / Reviewer</th>
                <th className="px-4 py-3 text-left">Date Submitted</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingPODReviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                    No evaluations currently waiting for POD review.
                  </td>
                </tr>
              ) : (
                pendingPODReviews.map((ev) => {
                  const dateSub = ev.signatures?.deptHead?.signedAt || ev.signatures?.supervisor?.signedAt || ev.updatedAt || ev.createdAt;
                  const formattedDate = dateSub ? new Date(dateSub).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-slate-900 dark:text-white text-xs">{ev.employeeName}</p>
                        <p className="text-[11px] text-slate-400">{ev.position}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {ev.departmentName}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {ev.signatures?.deptHead?.signerName || ev.signatures?.supervisor?.signerName || 'Department Head'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        {formattedDate}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={ev.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onOpenEvaluation(ev.id)}
                          className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          <span>Validate & Archive</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. SECTION: Evaluations Forwarded to Executive Review (President) */}
      <div className="card space-y-4 p-5 border-l-4 border-l-purple-500">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Evaluations Forwarded to Executive Review ({evaluations.filter(e => e.status === 'pending_president' || e.status === 'department_head_submitted').length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Department Head scorecards currently under President & CEO executive review before returning to POD.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
            Stage 3 of 4
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Department Head Name</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Date Forwarded</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {evaluations.filter(e => e.status === 'pending_president' || e.status === 'department_head_submitted').length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-400">
                    No Department Head evaluations currently under Executive Review.
                  </td>
                </tr>
              ) : (
                evaluations.filter(e => e.status === 'pending_president' || e.status === 'department_head_submitted').map((ev) => {
                  const dateFwd = ev.signatures?.deptHead?.signedAt || ev.updatedAt || ev.createdAt;
                  const formattedDate = dateFwd ? new Date(dateFwd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-slate-900 dark:text-white text-xs">{ev.employeeName}</p>
                        <p className="text-[11px] text-slate-400">{ev.position}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {ev.departmentName}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        {formattedDate}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={ev.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onOpenEvaluation(ev.id)}
                          className="btn btn-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
                        >
                          <span>View Executive Status</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POD Live Employee Search & Monitor Card */}
      <div className="card space-y-4 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center space-x-2">
              <Search className="w-5 h-5 text-brand-500" />
              <span>POD Live Employee Evaluation Monitor & Status Search</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Search any employee name to inspect real-time progress, review complete scorecard forms, or perform final validation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Type employee name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 font-medium"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
            >
              <option value="all">All Departments</option>
              {deptNames.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stage Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <button
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              stageFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All Stages ({evaluations.length})
          </button>
          <button
            onClick={() => setStageFilter('self')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              stageFilter === 'self'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            Self Evaluation ({evaluations.filter(e => e.status === 'draft' || e.status === 'reopened').length})
          </button>
          <button
            onClick={() => setStageFilter('dept_head')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              stageFilter === 'dept_head'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 hover:bg-orange-100'
            }`}
          >
            Dept Head Review ({evaluations.filter(e => e.status === 'pending_dept_head' || e.status === 'employee_submitted' || e.status === 'pending_supervisor').length})
          </button>
          <button
            onClick={() => setStageFilter('president')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              stageFilter === 'president'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
            }`}
          >
            Executive Review ({evaluations.filter(e => e.status === 'pending_president' || e.status === 'department_head_submitted').length})
          </button>
          <button
            onClick={() => setStageFilter('pod')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              stageFilter === 'pod'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
            }`}
          >
            Ready for POD ({pendingPODReviews.length})
          </button>
          <button
            onClick={() => setStageFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              stageFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            Completed ({archivedEvaluations.length})
          </button>
        </div>

        {/* Live Employee Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Employee Name</th>
                <th className="px-4 py-3 text-left">Department & Position</th>
                <th className="px-4 py-3 text-left">Live Process Stage</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-center">Signatures</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                    No employee evaluations matched your search or stage criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => {
                  const sigCount = Object.keys(ev.signatures || {}).length;
                  const badgeInfo = getStageStepBadge(ev.status);
                  const isReadyForPOD = ev.status === 'pending_pod' || ev.status === 'supervisor_completed' || ev.status === 'president_completed';

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-slate-900 dark:text-white text-xs">{ev.employeeName}</p>
                        <p className="text-[11px] text-slate-400">{ev.appraisalPeriod}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{ev.departmentName}</p>
                        <p className="text-[11px] text-slate-500">{ev.position}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeInfo.color}`}>
                            <span className="font-black mr-1">{badgeInfo.step}:</span> {badgeInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-brand-600 dark:text-brand-400 text-xs">
                          {ev.finalRating ? ev.finalRating.toFixed(2) : '0.00'}
                        </span>
                        <span className="text-[10px] text-slate-400"> /4.00</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          sigCount >= 3 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {sigCount} Signed
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => onOpenEvaluation(ev.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm inline-flex items-center space-x-1.5 transition-all ${
                            isReadyForPOD
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/30'
                              : 'bg-brand-500 hover:bg-brand-600 text-white'
                          }`}
                          title="Open Complete Employee Scorecard Form"
                        >
                          <span>{isReadyForPOD ? 'Validate & Archive' : 'View Complete Form'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
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

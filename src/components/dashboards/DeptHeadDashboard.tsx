import React, { useState } from 'react';
import { User, Evaluation } from '../../types';
import { Building2, Clock, FileCheck, ArrowRight, TrendingUp, Users, AlertCircle, Search, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { EvaluationProgressCard } from '../workflow/EvaluationProgressCard';
import { getUserActiveEvaluation } from '../../utils/workflowUtils';

interface DeptHeadDashboardProps {
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

export const DeptHeadDashboard: React.FC<DeptHeadDashboardProps> = ({
  currentUser,
  evaluations,
  onOpenEvaluation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('PENDING');

  // Find active personal Department Head evaluation strictly for current user
  const mySelfEvaluation = getUserActiveEvaluation(currentUser, evaluations);

  // Filter evaluations belonging strictly to the department head's department
  const deptEvaluations = evaluations.filter(
    (e) => e.employeeId !== currentUser.id && e.departmentName === currentUser.departmentName
  );

  const pendingDeptHeadReviews = deptEvaluations.filter(
    (e) => e.status === 'pending_dept_head' || e.status === 'employee_submitted' || e.status === 'pending_supervisor'
  );

  const completedOrPod = deptEvaluations.filter(
    (e) => e.status === 'pending_pod' || e.status === 'pod_validated' || e.status === 'archived'
  );

  const avgDeptScore = deptEvaluations.length > 0
    ? (deptEvaluations.reduce((acc, e) => acc + e.finalRating, 0) / deptEvaluations.length).toFixed(2)
    : '—';

  const filteredEvaluations = deptEvaluations.filter((ev) => {
    const matchesSearch = 
      ev.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.appraisalPeriod.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'PENDING') {
      return ev.status === 'pending_dept_head' || ev.status === 'employee_submitted' || ev.status === 'pending_supervisor';
    }
    if (statusFilter === 'COMPLETED') {
      return ev.status === 'pending_pod' || ev.status === 'pod_validated' || ev.status === 'archived';
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-purple-300 text-sm font-medium">{getGreeting()},</p>
            <h2 className="text-2xl font-extrabold mt-0.5">{currentUser.name}</h2>
            <p className="text-purple-200 text-sm mt-1">
              Department Head &nbsp;·&nbsp; <strong className="text-amber-300">{currentUser.departmentName}</strong>
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center shrink-0">
            <p className="text-[11px] text-purple-300 uppercase font-semibold tracking-wide">Dept Average Score</p>
            <p className="text-3xl font-black text-amber-400 mt-1">{avgDeptScore}</p>
            <p className="text-[11px] text-purple-200 font-medium mt-0.5">out of 4.00</p>
          </div>
        </div>
      </div>

      {/* Personal Dept Head Self-Evaluation Progress */}
      {mySelfEvaluation && (
        <EvaluationProgressCard 
          evaluation={mySelfEvaluation} 
          onOpenEvaluation={onOpenEvaluation} 
        />
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-purple-100 dark:bg-purple-950">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Department Roster</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{deptEvaluations.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-100 dark:bg-amber-950">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Dept Review</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingDeptHeadReviews.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-teal-100 dark:bg-teal-950">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Submitted to POD</p>
            <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-0.5">{completedOrPod.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-brand-100 dark:bg-brand-950">
            <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Performance Avg</p>
            <p className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-0.5">{avgDeptScore}</p>
          </div>
        </div>
      </div>

      {/* Pending Evaluations Table & Filter Toolbar */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Pending Evaluations & Department Review Approvals
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review employee self-evaluations, add Department Head ratings & comments, sign digitally, and submit to POD.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
            >
              <option value="PENDING">Pending Dept Review ({pendingDeptHeadReviews.length})</option>
              <option value="COMPLETED">Submitted to POD / Done ({completedOrPod.length})</option>
              <option value="ALL">All Department Scorecards ({deptEvaluations.length})</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-750 text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Evaluation Period</th>
                <th className="py-3 px-4">Submission Date</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No evaluations match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((ev) => {
                  const isPending = ev.status === 'pending_dept_head' || ev.status === 'employee_submitted' || ev.status === 'pending_supervisor';
                  const priorityLabel = ev.finalRating > 3.5 ? 'High' : isPending ? 'Urgent' : 'Normal';
                  const priorityColor = priorityLabel === 'Urgent' 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300' 
                    : priorityLabel === 'High'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';

                  return (
                    <tr 
                      key={ev.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {ev.employeeName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                        {ev.employeeId ? `EMP-${ev.employeeId.substring(0, 6)}` : 'EMP-1001'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          {ev.departmentName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {ev.appraisalPeriod}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {ev.appraisalDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={ev.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${priorityColor}`}>
                          {priorityLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onOpenEvaluation(ev.id)}
                          className={`btn btn-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-xs ${
                            isPending
                              ? 'bg-purple-600 hover:bg-purple-700 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'
                          }`}
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          {isPending ? 'Open & Review' : 'View Scorecard'}
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

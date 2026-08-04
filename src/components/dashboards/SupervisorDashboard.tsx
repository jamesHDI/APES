import React, { useState } from 'react';
import { User, Evaluation } from '../../types';
import { Users, Clock, CheckCircle2, ArrowRight, Search } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface SupervisorDashboardProps {
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

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  currentUser,
  evaluations,
  onOpenEvaluation,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const pendingReviews = evaluations.filter(
    (e) => e.status === 'pending_supervisor' || e.status === 'employee_submitted',
  );
  const completedReviews = evaluations.filter(
    (e) => e.status === 'supervisor_completed' || e.status === 'archived',
  );

  const avgTeamScore =
    evaluations.length > 0
      ? (evaluations.reduce((acc, e) => acc + e.finalRating, 0) / evaluations.length).toFixed(2)
      : '—';

  const filtered = evaluations.filter((e) => {
    const matchSearch =
      search === '' ||
      e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-12">

      {/* Welcome Hero */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{getGreeting()}</p>
            <h2 className="text-xl font-bold mt-0.5 text-slate-900 dark:text-white">{currentUser.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Supervisor &nbsp;·&nbsp; {currentUser.departmentName}
            </p>
          </div>
          <div className="bg-[#FFF4EA] dark:bg-brand-950/40 px-5 py-4 rounded-2xl border border-[#F28C28]/20 text-center shrink-0">
            <p className="text-[10px] text-[#F28C28] uppercase font-bold tracking-widest">Team Average</p>
            <p className="text-3xl font-black text-[#E96B1A] mt-1 leading-none">{avgTeamScore}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">out of 4.00</p>
          </div>
        </div>
      </div>

      {/* Alert if there are pending reviews */}
      {pendingReviews.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              You have {pendingReviews.length} evaluation{pendingReviews.length > 1 ? 's' : ''} waiting for your review.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Click "Review" on any item below to get started.
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
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Reviews</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{pendingReviews.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{completedReviews.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-brand-100 dark:bg-brand-950">
            <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Team</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{evaluations.length}</p>
          </div>
        </div>
      </div>

      {/* Team Evaluations Table */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900 dark:text-white">Team Evaluations</h3>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input pl-9 py-2 text-xs w-48"
                />
              </div>
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input py-2 text-xs w-44"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_supervisor">Awaiting Review</option>
                <option value="supervisor_completed">Reviewed</option>
                <option value="archived">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Period</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Rating</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    No evaluations match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{ev.employeeName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{ev.position}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-600 dark:text-slate-400 text-sm">
                      {ev.appraisalPeriod}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-black text-base text-hdi-red">{ev.finalRating.toFixed(2)}</span>
                      <span className="text-xs text-slate-400"> /4.00</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ev.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onOpenEvaluation(ev.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Review
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

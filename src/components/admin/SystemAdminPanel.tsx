import React, { useState } from 'react';
import { User, Department, EvaluationCycle, AuditLog } from '../../types';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { 
  saveEmployeeToSupabase, 
  saveDepartmentToSupabase, 
  saveEvaluationToSupabase 
} from '../../services/supabaseService';
import { getStoredEvaluations } from '../../services/storage';
import { 
  ShieldCheck, 
  Database, 
  Users, 
  Building2, 
  Calendar, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles,
  Cloud,
  CloudOff,
  UserCheck,
} from 'lucide-react';

interface SystemAdminPanelProps {
  users: User[];
  departments: Department[];
  cycles: EvaluationCycle[];
  auditLogs: AuditLog[];
  onSaveUsers: (users: User[]) => void;
  onSaveDepartments: (depts: Department[]) => void;
  onSelectTab?: (tab: string) => void;
}

export const SystemAdminPanel: React.FC<SystemAdminPanelProps> = ({
  users,
  departments,
  cycles,
  auditLogs,
  onSelectTab,
}) => {
  const pendingApprovalsCount = users.filter((u) => u.approvalStatus === 'pending' || u.isApproved === false).length;
  const [syncing, setSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSyncSupabase = async () => {
    setSyncing(true);
    showToast('Pushing reference data to Supabase PostgreSQL...');

    try {
      // 1. Sync Employees
      for (const u of users) {
        await saveEmployeeToSupabase(u);
      }

      // 2. Sync Departments
      for (const d of departments) {
        await saveDepartmentToSupabase(d);
      }

      // 3. Sync Evaluations
      const evals = getStoredEvaluations();
      for (const e of evals) {
        await saveEvaluationToSupabase(e);
      }

      showToast('Successfully synced all employees, departments, and scorecards to Supabase PostgreSQL!');
    } catch (err) {
      showToast('Sync error. Verify your Supabase VITE_SUPABASE_URL keys in .env');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500 flex items-center space-x-3 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-brand-400" />
            <h2 className="text-xl font-black tracking-tight">System Admin & Supabase Control Panel</h2>
          </div>
          <p className="text-xs text-brand-200 mt-1">
            System health metrics, database connection status, RLS policies, and PostgreSQL synchronization controls.
          </p>
        </div>

        {/* Supabase Status Indicator */}
        <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 border shadow-lg ${
          isSupabaseConfigured 
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500' 
            : 'bg-amber-950/80 text-amber-300 border-amber-500'
        }`}>
          {isSupabaseConfigured ? <Cloud className="w-4 h-4 text-emerald-400" /> : <CloudOff className="w-4 h-4 text-amber-400" />}
          <span>
            {isSupabaseConfigured ? 'Supabase PostgreSQL Connected' : 'Local Persistence (Demo Mode)'}
          </span>
        </div>
      </div>

      {/* Live System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onSelectTab && onSelectTab('pending_approvals')}
          className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-center justify-between text-left hover:scale-[1.01] transition-transform"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-amber-500 text-slate-950 font-black">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">Pending Approvals</p>
              <p className="text-xl font-black text-amber-950 dark:text-amber-100">{pendingApprovalsCount} Requests</p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline">Review &rarr;</span>
        </button>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Total User Accounts</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{users.length}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Departments</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{departments.length}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Active Cycles</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{cycles.length}</p>
          </div>
        </div>
      </div>

      {/* Supabase Database Operations Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Supabase Database Sync Engine
            </h3>
            <p className="text-xs text-slate-500">
              Synchronize employees, departments, scorecards, and audit logs with your Supabase cloud database.
            </p>
          </div>

          <button
            onClick={handleSyncSupabase}
            disabled={syncing}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing PostgreSQL...' : 'Seed & Sync Supabase DB'}</span>
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
          <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-brand-500" />
            Supabase Connection Credentials Check:
          </p>
          <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
            VITE_SUPABASE_URL: {isSupabaseConfigured ? 'Configured ✓ (Cloud Sync Active)' : 'Unconfigured (Missing in Vercel Environment Variables)'}
          </p>
          {!isSupabaseConfigured && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-[11px] font-medium space-y-1">
              <p className="font-bold">⚠️ To enable Supabase Cloud Database on Vercel:</p>
              <p>1. Open your Vercel Project Settings &rarr; Environment Variables.</p>
              <p>2. Add <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b>.</p>
              <p>3. Redeploy your Vercel project to activate 100% cloud synchronization across all devices.</p>
            </div>
          )}
          <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
            SQL Migration Directory: <span className="font-bold text-brand-600">supabase/migrations/</span>
          </p>
        </div>
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { User, Department, EvaluationCycle, AuditLog, isPendingUser } from '../../types';
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
  const pendingApprovalsCount = users.filter(isPendingUser).length;
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
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">System Admin & Supabase Control Panel</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              System health metrics, database connection status, and synchronization controls.
            </p>
          </div>

          <div className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border shrink-0 ${
            isSupabaseConfigured 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
          }`}>
            <span>
              {isSupabaseConfigured ? 'Supabase Connected' : 'Local Persistence (Demo Mode)'}
            </span>
          </div>
        </div>
      </div>

      {/* Live System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onSelectTab && onSelectTab('pending_approvals')}
          className="stat-card hover:border-[#F28C28]/40 text-left transition-all"
        >
          <div>
            <p className="stat-label">Pending Approvals</p>
            <p className="stat-number text-orange-600 dark:text-orange-400">{pendingApprovalsCount}</p>
          </div>
        </button>

        <div className="stat-card">
          <div>
            <p className="stat-label">Total User Accounts</p>
            <p className="stat-number">{users.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Departments</p>
            <p className="stat-number">{departments.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Active Cycles</p>
            <p className="stat-number text-emerald-600 dark:text-emerald-400">{cycles.length}</p>
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

import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types';
import {
  getRemainingSessionSeconds,
  formatSessionTimeRemaining,
  endDevTestingSession,
  getDevAuditRecords,
  clearDevAuditRecords,
  DevAuditRecord
} from '../../services/devTestingService';
import {
  Terminal,
  ShieldCheck,
  Users,
  LogOut,
  Clock,
  Sparkles,
  ChevronDown,
  Info,
  History,
  X,
  AlertTriangle
} from 'lucide-react';

interface DeveloperTestingBarProps {
  currentUser: User;
  onSwitchAccount: () => void;
  onExitDevMode: () => void;
}

const ROLE_DISPLAY: Record<Role, { label: string; badgeClass: string }> = {
  employee: { label: 'Employee', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
  supervisor: { label: 'Supervisor', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-400/30' },
  dept_head: { label: 'Department Head', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-400/30' },
  pod: { label: 'POD Officer', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
  hr_admin: { label: 'HR Admin', badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' },
  system_admin: { label: 'System Admin', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-400/30' },
  president: { label: 'President & CEO', badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-400/30' },
};

export const DeveloperTestingBar: React.FC<DeveloperTestingBarProps> = ({
  currentUser,
  onSwitchAccount,
  onExitDevMode,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => getRemainingSessionSeconds());
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<DevAuditRecord[]>([]);

  // Update timer countdown every 5 seconds
  useEffect(() => {
    const updateCountdown = () => {
      const secs = getRemainingSessionSeconds();
      setRemainingSeconds(secs);
      if (secs <= 0) {
        // Session expired
        onExitDevMode();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 5000);
    return () => clearInterval(interval);
  }, [onExitDevMode]);

  const handleOpenAuditModal = () => {
    setAuditLogs(getDevAuditRecords());
    setShowAuditModal(true);
  };

  const handleClearAuditLogs = () => {
    clearDevAuditRecords();
    setAuditLogs([]);
  };

  const roleInfo = ROLE_DISPLAY[currentUser.role] || {
    label: currentUser.role,
    badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
  };

  return (
    <>
      <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-950 via-[#1e1b4b] to-slate-950 border-b-2 border-indigo-500/60 shadow-xl text-white px-3 sm:px-6 py-2.5 transition-colors">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">

          {/* Left: Indicator & Simulated Account info */}
          <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
            {/* Pulsing Dev Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/30 border border-indigo-400/50 text-indigo-200 text-xs font-black tracking-wide shadow-sm">
              <Terminal className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="uppercase">DEVELOPER TESTING MODE</span>
            </div>

            {/* Currently Simulated Account Details */}
            <div className="flex items-center gap-2 bg-white/10 px-2.5 py-1 rounded-xl border border-white/15">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-white/30"
              />
              <div className="flex items-center gap-2 text-xs">
                <span className="font-extrabold text-white truncate max-w-[140px] sm:max-w-[200px]">
                  {currentUser.name}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleInfo.badgeClass}`}>
                  {roleInfo.label}
                </span>
                <span className="text-slate-300 text-[11px] hidden md:inline truncate max-w-[160px]">
                  ({currentUser.departmentName || 'No Department'})
                </span>
              </div>
            </div>

            {/* Data Safeguard Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 px-2.5 py-1 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Sandbox Isolation Active — Real User Credentials & DB Protected</span>
            </div>
          </div>

          {/* Right: Timer + Switch Account + Exit */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Session Remaining Timer */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 text-xs font-mono"
              title="Temporary session duration before auto-logout"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline text-slate-400">Expires:</span>
              <span className="font-bold text-amber-300">{formatSessionTimeRemaining(remainingSeconds)}</span>
            </div>

            {/* Audit Logs button */}
            <button
              onClick={handleOpenAuditModal}
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-colors flex items-center gap-1"
              title="Inspect simulated testing activities"
            >
              <History className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden md:inline">Test Log</span>
            </button>

            {/* Quick Account Switcher Button */}
            <button
              onClick={onSwitchAccount}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-black shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
              title="Switch to another user account to test different dashboards and roles"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Switch Account</span>
            </button>

            {/* Exit Dev Mode */}
            <button
              onClick={onExitDevMode}
              className="px-3 py-1 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              title="Safely exit Developer Testing Mode and clear test session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit Dev Mode</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dev Audit Logs Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Developer Testing Activity Log
                  </h4>
                  <p className="text-xs text-slate-400">
                    Isolated session records — actions here do NOT affect real user audit trails.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2">
              {auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No simulated actions recorded in this testing session yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {log.action}
                      </span>
                      <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      As: <strong className="text-slate-800 dark:text-slate-100">{log.simulatedUser}</strong> ({log.simulatedRole})
                    </p>
                    {log.details && (
                      <pre className="text-[10px] font-mono bg-white dark:bg-slate-900 p-2 rounded-lg text-slate-600 dark:text-slate-400 overflow-x-auto">
                        {log.details}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleClearAuditLogs}
                disabled={auditLogs.length === 0}
                className="text-xs text-rose-600 font-bold hover:underline disabled:opacity-40"
              >
                Clear Log
              </button>
              <button
                onClick={() => setShowAuditModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

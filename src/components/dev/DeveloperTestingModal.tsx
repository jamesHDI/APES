import React, { useState, useMemo, useEffect } from 'react';
import { User, Role } from '../../types';
import { verifyDevCredential, DEV_TESTING_CREDENTIAL, isDevTestingModeActive } from '../../services/devTestingService';
import {
  Terminal,
  ShieldAlert,
  Search,
  CheckCircle2,
  X,
  UserCheck,
  Building,
  Key,
  Eye,
  EyeOff,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface DeveloperTestingModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  currentUserId?: string;
  isAlreadyAuthorized?: boolean;
}

const ROLE_INFO: Record<Role, { label: string; color: string; bg: string; border: string }> = {
  employee: {
    label: 'Employee',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  supervisor: {
    label: 'Supervisor',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    border: 'border-blue-200 dark:border-blue-800',
  },
  dept_head: {
    label: 'Department Head',
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    border: 'border-purple-200 dark:border-purple-800',
  },
  pod: {
    label: 'POD Officer',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    border: 'border-amber-200 dark:border-amber-800',
  },
  hr_admin: {
    label: 'HR Admin',
    color: 'text-indigo-700 dark:text-indigo-300',
    bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  system_admin: {
    label: 'System Admin',
    color: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    border: 'border-rose-200 dark:border-rose-800',
  },
  president: {
    label: 'President & CEO',
    color: 'text-teal-700 dark:text-teal-300',
    bg: 'bg-teal-50 dark:bg-teal-950/60',
    border: 'border-teal-200 dark:border-teal-800',
  },
};

export const DeveloperTestingModal: React.FC<DeveloperTestingModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  onSelectUser,
  currentUserId,
  isAlreadyAuthorized = false,
}) => {
  const [credential, setCredential] = useState('');
  const [showCredential, setShowCredential] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => isAlreadyAuthorized || isDevTestingModeActive());
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Keep authorized state synchronized if already active in session
  useEffect(() => {
    if (isOpen) {
      if (isAlreadyAuthorized || isDevTestingModeActive()) {
        setIsAuthorized(true);
      }
      setAuthError(null);
    }
  }, [isOpen, isAlreadyAuthorized]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const u of allUsers) {
      if (u.departmentName) set.add(u.departmentName);
    }
    return Array.from(set).sort();
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      // Role filter
      if (selectedRoleFilter !== 'all' && u.role !== selectedRoleFilter) {
        return false;
      }
      // Department filter
      if (selectedDeptFilter !== 'all' && u.departmentName !== selectedDeptFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = (u.name || '').toLowerCase().includes(term);
        const matchesEmail = (u.email || '').toLowerCase().includes(term);
        const matchesEmpNum = (u.employeeNumber || '').toLowerCase().includes(term);
        const matchesPosition = (u.position || '').toLowerCase().includes(term);
        const matchesDept = (u.departmentName || '').toLowerCase().includes(term);
        const matchesCompany = (u.companyName || '').toLowerCase().includes(term);
        return matchesName || matchesEmail || matchesEmpNum || matchesPosition || matchesDept || matchesCompany;
      }
      return true;
    });
  }, [allUsers, selectedRoleFilter, selectedDeptFilter, searchTerm]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allUsers.length };
    for (const u of allUsers) {
      counts[u.role] = (counts[u.role] || 0) + 1;
    }
    return counts;
  }, [allUsers]);

  if (!isOpen) return null;

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (verifyDevCredential(credential)) {
      setIsAuthorized(true);
      setCredential('');
    } else {
      setAuthError('Invalid developer testing credential. Predefined key is required.');
    }
  };

  const handleSelectAccount = (user: User) => {
    onSelectUser(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">

        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-900/40 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Developer Testing Mode
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 border border-amber-400/40 text-amber-300">
                  DEVELOPMENT ONLY
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAuthorized
                  ? 'Select any user account to test interface behavior, permissions & dashboards'
                  : 'Enter predefined testing credential to unlock developer tools'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {!isAuthorized ? (
          /* Step 1: Predefined Credential Authorization */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Key className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Developer Authorization Required
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Developer Testing Mode grants temporary diagnostic access to system interfaces without affecting real credentials or production data.
              </p>
            </div>

            {authError && (
              <div className="w-full p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthorize} className="w-full space-y-4">
              <div className="text-left">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Predefined Testing Credential
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showCredential ? 'text' : 'password'}
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    required
                    placeholder="Enter credential (123456)"
                    className="form-input pl-9 pr-10 font-mono tracking-wider"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowCredential(!showCredential)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showCredential ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Predefined passkey: <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">123456</code></span>
                  <button
                    type="button"
                    onClick={() => setCredential(DEV_TESTING_CREDENTIAL)}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Auto-fill
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Authorize & Unlock Account Selector</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2.5 text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Credential Preservation Guarantee:</strong> This mode will never modify, overwrite, or reset any user's real password or login credentials.
              </span>
            </div>
          </div>
        ) : (
          /* Step 2: Account Selection Matrix */
          <div className="flex flex-col flex-1 min-h-0">

            {/* Filter & Search Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
              {/* Search + Department row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-8 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search accounts by name, employee ID, role, position, or email..."
                    className="form-input pl-9 text-xs"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="sm:col-span-4">
                  <select
                    value={selectedDeptFilter}
                    onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    className="form-input text-xs"
                  >
                    <option value="all">All Departments ({uniqueDepartments.length})</option>
                    {uniqueDepartments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                <button
                  onClick={() => setSelectedRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    selectedRoleFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  All Accounts ({roleCounts.all || 0})
                </button>
                {(Object.keys(ROLE_INFO) as Role[]).map((role) => {
                  const info = ROLE_INFO[role];
                  const count = roleCounts[role] || 0;
                  const isSelected = selectedRoleFilter === role;
                  return (
                    <button
                      key={role}
                      onClick={() => setSelectedRoleFilter(role)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                        isSelected
                          ? `${info.bg} ${info.color} ${info.border} ring-2 ring-indigo-500/30`
                          : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {info.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account List Grid */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-slate-800 space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No accounts match your filter</p>
                  <p className="text-xs text-slate-400 mt-1">Try resetting the role or search query.</p>
                  <button
                    onClick={() => {
                      setSelectedRoleFilter('all');
                      setSelectedDeptFilter('all');
                      setSearchTerm('');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {filteredUsers.map((user) => {
                    const roleMeta = ROLE_INFO[user.role] || {
                      label: user.role,
                      color: 'text-slate-700 dark:text-slate-300',
                      bg: 'bg-slate-100 dark:bg-slate-800',
                      border: 'border-slate-200 dark:border-slate-700',
                    };
                    const isCurrentlyActive = currentUserId === user.id;

                    return (
                      <div
                        key={user.id}
                        className={`p-3.5 rounded-2xl border transition-all duration-150 flex flex-col justify-between ${
                          isCurrentlyActive
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-sm'
                            : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={user.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                            alt={user.name}
                            className="w-11 h-11 rounded-2xl object-cover shrink-0 ring-2 ring-slate-100 dark:ring-slate-700"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                                {user.name}
                              </h5>
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border shrink-0 ${roleMeta.bg} ${roleMeta.color} ${roleMeta.border}`}>
                                {roleMeta.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                              {user.position || 'Employee'}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                              <span>{user.departmentName}</span>
                              {user.employeeNumber && <span>• {user.employeeNumber}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[170px]" title={user.email}>
                            {user.email}
                          </span>
                          <button
                            onClick={() => handleSelectAccount(user)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                              isCurrentlyActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-500 dark:hover:text-white'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{isCurrentlyActive ? 'Active (Re-enter)' : 'Test Account'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Summary & Safeguards */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Showing {filteredUsers.length} of {allUsers.length} accounts
                </span>
                <span>• Predefined Key: <code className="font-mono text-indigo-600 dark:text-indigo-400">123456</code></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Credentials & Database Protected
                </span>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

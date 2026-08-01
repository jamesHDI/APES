import React, { useState, useRef, useEffect } from 'react';
import { User, Notification } from '../../types';
import {
  Bell,
  Moon,
  Sun,
  ChevronDown,
  CheckCircle2,
  LogOut,
  Menu,
  X,
  CheckCheck,
  FileText,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onResetData: () => void;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onSelectEvaluation?: (evalId: string) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  darkMode,
  onToggleDarkMode,
  onResetData,
  notifications,
  onMarkNotificationRead,
  onSelectEvaluation,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkAllRead = () => {
    notifications.filter((n) => !n.read).forEach((n) => onMarkNotificationRead(n.id));
  };

  const roleLabel: Record<string, string> = {
    employee: 'Employee',
    supervisor: 'Supervisor',
    dept_head: 'Department Head',
    president: 'President & CEO',
    pod: 'POD Officer',
    hr_admin: 'HR Administrator',
    system_admin: 'System Admin',
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors shrink-0">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Left: Hamburger + Brand */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="shrink-0 bg-white dark:bg-slate-800 rounded-xl p-1.5 flex items-center justify-center border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <img
                  src="/hdi-logo.png"
                  alt="HDI Hive"
                  className="h-8 sm:h-9 w-auto object-contain max-h-9"
                />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                    PERFORMANCE EVALUATION SYSTEM
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    APES v3.0
                  </span>
                </div>
                <p className="text-xs text-brand-600 dark:text-brand-400 font-extrabold tracking-wider uppercase mt-0.5 hidden md:block">
                  HDI Hive
                </p>
              </div>
            </div>

          </div>

          {/* Right: Notifications + Dark Mode + User */}
          <div className="flex items-center gap-1.5">

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserDropdown(false);
                }}
                className="relative p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-hdi-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Notifications
                    </h4>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark all read
                        </button>
                      )}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {unreadCount} new
                      </span>
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            onMarkNotificationRead(n.id);
                            setShowNotifications(false);
                            if (n.evaluationId && onSelectEvaluation) {
                              onSelectEvaluation(n.evaluationId);
                            }
                          }}
                          className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-750 ${
                            !n.read ? 'bg-brand-50/60 dark:bg-brand-950/30' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-brand-500' : 'bg-transparent'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1">{n.date}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative ml-1" ref={userRef}>
              <button
                onClick={() => {
                  setShowUserDropdown(!showUserDropdown);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all"
                aria-label="User account menu"
              >
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-brand-500/30 shrink-0"
                />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight max-w-[120px] truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold leading-tight">
                    {roleLabel[currentUser.role] ?? currentUser.role}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* User Dropdown Panel */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                  {/* Profile Info */}
                  <div className="p-4 flex items-center gap-3">
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                      alt={currentUser.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-500/30 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
                        {roleLabel[currentUser.role] ?? currentUser.role}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {currentUser.departmentName} • {currentUser.employeeNumber || 'EMP-1001'}
                      </p>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Account active & approved
                    </span>
                  </div>

                  {/* Position info */}
                  <div className="mx-4 mb-3 text-xs text-slate-600 dark:text-slate-300">
                    <p className="font-medium">{currentUser.position}</p>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-100 dark:border-slate-700 p-3 space-y-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-sm transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

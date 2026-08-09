import React, { useState, useRef, useEffect } from 'react';
import { User, Notification } from '../../types';
import { isSupabaseConfigured } from '../../services/supabaseClient';
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
  User as UserIcon,
  Wifi,
  WifiOff,
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
  onSelectTab?: (tab: string) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onOpenAnnouncementModal?: () => void;
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
  onSelectTab,
  onToggleSidebar,
  isSidebarOpen,
  onOpenAnnouncementModal,
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
    <header className="sticky top-0 z-40 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border-b border-[#EFE4D6] dark:border-slate-800 shadow-[0_1px_12px_rgba(15,23,42,0.06)] transition-colors shrink-0">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-6">
        <div className="flex items-center justify-between h-20 sm:h-24 gap-4">

          {/* Left: Hamburger + Logo + Half-Hexagon Connector + Title */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Mobile hamburger */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-[#FFF4EA] hover:text-[#E96B1A] dark:hover:bg-slate-800 transition-all duration-150 lg:hidden"
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Brand Logo */}
            <div className="shrink-0 flex items-center justify-start py-1">
              {/* Light Mode Logo */}
              <img
                src="/hdi-logo.png"
                alt="HDI Hive"
                className="h-10 sm:h-12 md:h-14 w-auto object-contain transition-all duration-200 dark:hidden"
              />
              {/* Dark Mode Logo: Original Red Beehive Icon + Solid White Text */}
              <div className="hidden dark:inline-flex relative h-10 sm:h-12 md:h-14 items-center overflow-hidden">
                <img
                  src="/hdi-logo.png"
                  alt="HDI Beehive Emblem"
                  className="h-full w-auto object-contain max-w-none"
                  style={{ clipPath: 'inset(0 68% 0 0)' }}
                />
                <img
                  src="/hdi-logo.png"
                  alt="HDI Text"
                  className="h-full w-auto object-contain max-w-none absolute top-0 left-0 brightness-0 invert"
                  style={{ clipPath: 'inset(0 0 0 32%)' }}
                />
              </div>
            </div>

            {/* True 3-Segment Half-Hexagon Connector SVG */}
            <div className="hidden sm:flex items-center text-[#F28C28] dark:text-brand-400 shrink-0 mx-0.5">
              <svg viewBox="0 0 24 44" className="h-9 sm:h-11 w-5 sm:w-6 stroke-current fill-none stroke-[2.75] stroke-linecap-round stroke-linejoin-round">
                <path d="M 3,5 L 18,14 L 18,30 L 3,39" />
              </svg>
            </div>

            {/* System Title */}
            <div className="hidden sm:flex items-center pl-1">
              <h1 className="font-black text-xs sm:text-sm md:text-base lg:text-lg text-slate-900 dark:text-white tracking-wider uppercase whitespace-nowrap">
                AUTOMATED PERFORMANCE EVALUATION SYSTEM
              </h1>
            </div>
          </div>

          {/* Right: Sync + Dark Mode + Notifications + User */}
          <div className="flex items-center gap-1">

            {/* Cloud Sync Status Badge */}
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
              isSupabaseConfigured
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isSupabaseConfigured ? 'Cloud Sync' : 'Offline'}</span>
            </div>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-[#FFF4EA] hover:text-[#E96B1A] dark:hover:bg-slate-800 rounded-xl transition-all duration-150"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserDropdown(false);
                }}
                className="relative p-2 text-slate-500 dark:text-slate-400 hover:bg-[#FFF4EA] hover:text-[#E96B1A] dark:hover:bg-slate-800 rounded-xl transition-all duration-150"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[#F28C28] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm shadow-orange-500/30">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200/80 dark:border-slate-700 z-50 overflow-hidden animate-slide-up">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-[#FFFAF6] dark:bg-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#FFF4EA] flex items-center justify-center">
                        <Bell className="w-3.5 h-3.5 text-[#F28C28]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">
                          Notifications
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{roleLabel[currentUser.role] || currentUser.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-[#F28C28] dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark all read
                        </button>
                      )}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FFF4EA] text-[#E96B1A] border border-[#F28C28]/20">
                        {unreadCount} new
                      </span>
                    </div>
                  </div>

                  {/* Announcement Trigger for Admins & POD */}
                  {(currentUser.role === 'system_admin' || currentUser.role === 'hr_admin' || currentUser.role === 'pod') && onOpenAnnouncementModal && (
                    <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-900/50 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        Broadcast Company Announcement
                      </span>
                      <button
                        onClick={() => {
                          setShowNotifications(false);
                          onOpenAnnouncementModal();
                        }}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold shadow-sm transition-colors flex items-center gap-1"
                      >
                        + Create
                      </button>
                    </div>
                  )}

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/80">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                          No notifications yet
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          Evaluations & role alerts will appear here
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            onMarkNotificationRead(n.id);
                            setShowNotifications(false);
                            if (n.category === 'account' || n.status === 'pending_approval' || n.title.includes('Registration')) {
                              if (onSelectTab) onSelectTab('pending_approvals');
                            } else if (n.evaluationId && onSelectEvaluation) {
                              onSelectEvaluation(n.evaluationId);
                            }
                          }}
                          className={`w-full text-left px-4 py-3 transition-colors hover:bg-[#FFFAF6] dark:hover:bg-slate-750 ${
                            !n.read ? 'bg-[#FFF8F3]/60 dark:bg-brand-950/20' : ''
                          } ${n.isAnnouncement ? 'border-l-2 border-amber-400' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.read ? (n.isAnnouncement ? 'bg-amber-500' : 'bg-[#F28C28]') : 'bg-transparent'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                                  n.isAnnouncement ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                                  n.category === 'account' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                                  n.category === 'approval' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                  {n.isAnnouncement ? 'Announcement' : (n.category || 'Notification')}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium shrink-0">{n.dateTime || n.date}</span>
                              </div>
                              <p className={`text-xs leading-snug ${!n.read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                                {n.message}
                              </p>
                              {n.senderName && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 italic">
                                  From: {n.senderName}
                                </p>
                              )}
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
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl bg-[#FFFAF6] dark:bg-slate-800 hover:bg-[#FFF4EA] dark:hover:bg-slate-700 border border-[#EFE4D6] dark:border-slate-700 transition-all duration-150 shadow-sm"
                aria-label="User account menu"
              >
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-[#F28C28]/25 shrink-0"
                />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight max-w-[120px] truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-[#F28C28] dark:text-brand-400 font-semibold leading-tight">
                    {roleLabel[currentUser.role] ?? currentUser.role}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* User Dropdown Panel */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200/80 dark:border-slate-700 z-50 overflow-hidden animate-slide-up">
                  {/* Warm User Identity Header */}
                  <div className="p-4 bg-gradient-to-br from-[#FFFAF6] to-[#FFF4EA] dark:from-slate-800 dark:to-slate-800 border-b border-[#EFE4D6] dark:border-slate-700 flex items-center gap-3">
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                      alt={currentUser.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-[#F28C28]/25 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate leading-snug">
                        {currentUser.name}
                      </p>
                      <p className="text-[11px] text-[#F28C28] dark:text-brand-400 font-semibold mt-0.5">
                        {roleLabel[currentUser.role] ?? currentUser.role}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-400 mt-0.5">
                        {currentUser.employeeNumber || 'EMP-001'}
                      </p>
                    </div>
                  </div>

                  {/* Navigation & Logout Actions */}
                  <div className="p-2 space-y-0.5">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        if (onSelectTab) onSelectTab('my_profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-[#FFF4EA] hover:text-[#E96B1A] dark:hover:bg-slate-700/60 font-medium text-sm transition-colors text-left"
                    >
                      <UserIcon className="w-4 h-4 shrink-0" />
                      <span>My Profile</span>
                    </button>

                    <div className="border-t border-slate-100 dark:border-slate-700 my-1" />

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium text-sm transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Sign Out</span>
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

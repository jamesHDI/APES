import React, { useState } from 'react';
import { Role } from '../../types';
import {
  LayoutDashboard,
  FileSpreadsheet,
  BarChart3,
  Users,
  Building2,
  SlidersHorizontal,
  CheckSquare,
  FileCheck,
  Crown,
  ShieldCheck,
  GitBranch,
  UserCheck,
  ChevronDown,
  ChevronRight,
  X,
  History,
  Settings,
  UserCircle,
  Rocket,
  Menu,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavItem[];
}

interface SidebarProps {
  currentRole: Role;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount?: number;
  pendingAccountCount?: number;
  isOpen: boolean;
  onClose: () => void;
  onToggleSidebar?: () => void;
  userName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeTab,
  onSelectTab,
  pendingCount = 0,
  pendingAccountCount = 0,
  isOpen,
  onClose,
  onToggleSidebar,
  userName,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['management', 'config']));

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getNavItems = (): NavItem[] => {
    const common: NavItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      {
        id: 'evaluations',
        label: 'My Evaluations',
        icon: FileSpreadsheet,
        badge: pendingCount > 0 ? pendingCount : undefined,
      },
    ];

    let items: NavItem[];

    if (currentRole === 'employee') {
      items = [
        ...common,
        { id: 'my_history', label: 'Evaluation History', icon: History },
        { id: 'my_profile', label: 'My Profile', icon: UserCircle },
      ];
    } else if (currentRole === 'supervisor') {
      items = [
        ...common,
        { id: 'team_reviews', label: 'Team Reviews', icon: CheckSquare, badge: pendingCount > 0 ? pendingCount : undefined },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'my_history', label: 'Evaluation History', icon: History },
        { id: 'my_profile', label: 'My Profile', icon: UserCircle },
      ];
    } else if (currentRole === 'dept_head') {
      items = [
        ...common,
        { id: 'dept_actions', label: 'Personnel Actions', icon: FileCheck },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'my_history', label: 'Evaluation History', icon: History },
        { id: 'my_profile', label: 'My Profile', icon: UserCircle },
      ];
    } else if (currentRole === 'president') {
      items = [
        ...common,
        { id: 'dept_head_reviews', label: 'Dept Head Reviews', icon: Crown },
        { id: 'reports', label: 'Executive Reports', icon: BarChart3 },
        { id: 'my_history', label: 'Evaluation History', icon: History },
        { id: 'my_profile', label: 'My Profile', icon: UserCircle },
      ];
    } else if (currentRole === 'pod') {
      items = [
        ...common,
        { id: 'pod_validation', label: 'POD Governance', icon: ShieldCheck },
        {
          id: 'pod_people',
          label: 'People Management',
          icon: Users,
          children: [
            { id: 'employee_mgmt', label: 'Employee Directory', icon: Users },
            { id: 'pending_approvals', label: 'Pending Approvals', icon: UserCheck, badge: pendingAccountCount },
          ],
        },
        { id: 'workflow_monitoring', label: 'Workflow Monitoring', icon: GitBranch },
        { id: 'evaluation_deployment', label: 'Evaluation Deployment', icon: Rocket },
        { id: 'template_builder', label: 'Evaluation Templates', icon: SlidersHorizontal },
        { id: 'my_history', label: 'Evaluation History', icon: History },
        { id: 'reports', label: 'Analytics', icon: BarChart3 },
        { id: 'my_profile', label: 'My Profile', icon: UserCircle },
      ];
    } else if (currentRole === 'hr_admin') {
      items = [
        ...common,
        {
          id: 'management',
          label: 'Employee Management',
          icon: Users,
          children: [
            { id: 'employee_mgmt', label: 'Employee Directory', icon: Users },
            { id: 'pending_approvals', label: 'Pending Approvals', icon: UserCheck, badge: pendingAccountCount },
            { id: 'dept_mgmt', label: 'Departments', icon: Building2 },
            { id: 'org_hierarchy', label: 'Org Chart', icon: GitBranch },
          ],
        },
        {
          id: 'config',
          label: 'Configuration',
          icon: Settings,
          children: [
            { id: 'workflow_monitoring', label: 'Workflow Monitoring', icon: GitBranch },
            { id: 'evaluation_deployment', label: 'Evaluation Deployment', icon: Rocket },
            { id: 'template_builder', label: 'Evaluation Templates', icon: SlidersHorizontal },
            { id: 'admin_panel', label: 'Evaluation Cycles', icon: Settings },
          ],
        },
        { id: 'my_history', label: 'Evaluation History', icon: History },
        { id: 'reports', label: 'HR Reports', icon: BarChart3 },
        { id: 'my_profile', label: 'My Profile', icon: UserCircle },
      ];
    } else if (currentRole === 'system_admin') {
      items = [
        ...common,
        {
          id: 'management',
          label: 'User Management',
          icon: Users,
          children: [
            { id: 'employee_mgmt', label: 'Employee Directory', icon: Users },
            { id: 'pending_approvals', label: 'Pending Approvals', icon: UserCheck, badge: pendingAccountCount },
            { id: 'dept_mgmt', label: 'Departments', icon: Building2 },
            { id: 'org_hierarchy', label: 'Org Chart', icon: GitBranch },
          ],
        },
        {
          id: 'config',
          label: 'System Configuration',
          icon: Settings,
          children: [
            { id: 'workflow_monitoring', label: 'Workflow Monitoring', icon: GitBranch },
            { id: 'evaluation_deployment', label: 'Evaluation Deployment', icon: Rocket },
            { id: 'template_builder', label: 'Evaluation Templates', icon: SlidersHorizontal },
            { id: 'admin_panel', label: 'Users, Roles & Config', icon: Settings },
          ],
        },
        { id: 'my_history', label: 'Evaluation History', icon: History },
        { id: 'reports', label: 'Audit & Reports', icon: BarChart3 },
        { id: 'my_profile', label: 'My Profile', icon: UserCircle },
      ];
    } else {
      items = common;
    }

    return items;
  };

  const navItems = getNavItems();

  const handleSelectTab = (tab: string) => {
    onSelectTab(tab);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const isDeptOrEmp = currentRole === 'dept_head' || currentRole === 'employee';

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const isGroup = !!item.children?.length;
    const isExpanded = expandedGroups.has(item.id);
    const hasActiveChild = item.children?.some((c) => c.id === activeTab);

    // Render for Collapsed Mode (Icon Only)
    if (!isOpen) {
      if (isGroup) {
        return (
          <div key={item.id} className="flex flex-col items-center py-1">
            <button
              onClick={() => toggleGroup(item.id)}
              title={item.label}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 ${
                hasActiveChild
                  ? 'bg-[#FFF4EA] text-[#E96B1A]'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-[#FFF8F3] dark:hover:bg-slate-800 hover:text-[#E96B1A]'
              }`}
            >
              <Icon className={`w-5 h-5 ${hasActiveChild ? 'text-[#F28C28]' : 'text-slate-400'}`} />
            </button>
            {isExpanded && item.children && (
              <div className="mt-1 space-y-1">
                {item.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => handleSelectTab(child.id)}
                    title={child.label}
                    className={`w-9 h-9 mx-auto rounded-lg flex items-center justify-center transition-all duration-150 relative ${
                      activeTab === child.id
                        ? 'bg-[#F28C28]/20 text-[#E96B1A] font-bold'
                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <child.icon className={`w-4 h-4 ${activeTab === child.id ? 'text-[#F28C28]' : 'text-slate-400'}`} />
                    {child.badge !== undefined && child.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 text-[8px] font-extrabold rounded-full bg-[#F28C28] text-white flex items-center justify-center">
                        {child.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      return (
        <button
          key={item.id}
          onClick={() => handleSelectTab(item.id)}
          title={item.label}
          className={`w-11 h-11 mx-auto my-0.5 flex items-center justify-center rounded-xl transition-all duration-150 relative ${
            isActive
              ? 'bg-[#FFF4EA] text-[#E96B1A] font-bold ring-2 ring-[#F28C28]/40'
              : 'text-slate-500 dark:text-slate-400 hover:bg-[#FFF8F3] dark:hover:bg-slate-800 hover:text-[#E96B1A]'
          }`}
        >
          <Icon className={`w-5 h-5 ${isActive ? 'text-[#F28C28]' : 'text-slate-400 dark:text-slate-500'}`} />
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 text-[9px] font-extrabold rounded-full bg-[#F28C28] text-white flex items-center justify-center shadow-sm">
              {item.badge}
            </span>
          )}
        </button>
      );
    }

    // Render for Expanded Mode (Icon + Text)
    if (isGroup) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleGroup(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all duration-150 ${
              isDeptOrEmp ? 'text-[15px]' : 'text-sm'
            } ${
              hasActiveChild
                ? 'bg-[#FFF4EA] text-[#E96B1A]'
                : 'text-slate-500 dark:text-slate-400 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/80 hover:text-[#E96B1A]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                hasActiveChild ? 'bg-[#F28C28]/15' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-[#FFF4EA]'
              }`}>
                <Icon className={`w-3.5 h-3.5 ${hasActiveChild ? 'text-[#F28C28]' : 'text-slate-400'}`} />
              </div>
              <span className="whitespace-normal break-words">{item.label}</span>
            </div>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
              isExpanded ? 'bg-slate-100 dark:bg-slate-800' : ''
            }`}>
              {isExpanded
                ? <ChevronDown className="w-3 h-3 text-slate-400" />
                : <ChevronRight className="w-3 h-3 text-slate-400" />
              }
            </div>
          </button>
          {isExpanded && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-[#F28C28]/20 pl-3">
              {item.children!.map((child) => renderItem(child))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => handleSelectTab(item.id)}
        className={`w-full flex items-center justify-between rounded-xl transition-all duration-150 ${
          isDeptOrEmp ? 'px-3.5 py-2.5 text-[15px]' : 'px-3 py-2 text-sm'
        } ${
          isActive
            ? 'bg-gradient-to-r from-[#FFF4EA] via-[#FFF8F3] to-transparent text-[#E96B1A] font-bold border-l-[3px] border-[#F28C28] pl-[10px]'
            : 'font-semibold text-slate-500 dark:text-slate-400 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/80 hover:text-[#E96B1A] dark:hover:text-brand-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isDeptOrEmp ? 'w-8 h-8' : 'w-7 h-7'
          } ${
            isActive ? 'bg-[#F28C28]/15' : 'bg-slate-100/70 dark:bg-slate-800'
          }`}>
            <Icon className={`${isDeptOrEmp ? 'w-4 h-4' : 'w-3.5 h-3.5'} ${isActive ? 'text-[#F28C28]' : 'text-slate-400 dark:text-slate-500'}`} />
          </div>
          <span className="whitespace-normal break-words leading-tight">{item.label}</span>
        </div>
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={`shrink-0 min-w-[20px] h-[20px] px-1 text-[11px] font-extrabold rounded-full flex items-center justify-center ${
              isActive ? 'bg-[#F28C28] text-white shadow-sm' : 'bg-[#F28C28]/15 text-[#E96B1A]'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`no-print fixed top-16 left-0 bottom-0 z-40
          bg-gradient-to-b from-[#FFFAF6] via-[#FFF8F3] to-[#FFF6EF]
          dark:from-slate-900 dark:via-slate-900 dark:to-slate-900
          border-r border-[#EFE4D6] dark:border-slate-800
          flex flex-col transition-all duration-300 ease-in-out overflow-hidden
          lg:static lg:top-0 lg:left-0 lg:h-full
          ${isOpen 
            ? 'w-64 translate-x-0 opacity-100' 
            : '-translate-x-full opacity-0 w-0 lg:translate-x-0 lg:opacity-100 lg:w-[72px]'}
        `}
      >
        {/* Navigation Panel Top Header with 3 Parallel Lines Toggle Button */}
        <div className="px-3.5 py-3 border-b border-[#EFE4D6] dark:border-slate-800">
          {isOpen ? (
            <div className="flex items-center justify-between w-full">
              <p className={`uppercase tracking-widest font-black text-slate-400 dark:text-slate-500 ${
                isDeptOrEmp ? 'text-xs' : 'text-[11px]'
              }`}>
                Navigation
              </p>
              {onToggleSidebar && (
                <button
                  onClick={onToggleSidebar}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#E96B1A] hover:bg-[#FFF4EA] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Collapse navigation menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-center w-full">
              {onToggleSidebar && (
                <button
                  onClick={onToggleSidebar}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-[#E96B1A] hover:bg-[#FFF4EA] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Expand navigation menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Close Button (Visible on Mobile overlay) */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#EFE4D6] dark:border-slate-800 lg:hidden">
          <div className="flex items-center gap-2">
            <img src="/hdi-logo.png" alt="HDI Hive" className="h-5 w-auto object-contain dark:hidden" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">APES v3.0</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#FFF4EA] dark:hover:bg-slate-800 text-slate-400 hover:text-[#E96B1A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {navItems.map(renderItem)}
        </nav>

        {/* Footer with HDI HIVE APES 3.0 adjusted upwards for clear visibility */}
        <div className="px-3 pt-3 pb-5 border-t border-[#EFE4D6] dark:border-slate-800 bg-[#FFF4EA]/60 dark:bg-slate-800/50 shrink-0">
          {isOpen ? (
            <div className="flex flex-col items-center text-center gap-0.5">
              <p className="text-xs font-black text-[#E96B1A] dark:text-brand-400 tracking-wider uppercase whitespace-nowrap">
                HDI HIVE · APES 3.0
              </p>
              <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                Strictly Confidential
              </p>
            </div>
          ) : (
            <div className="flex justify-center text-center">
              <span className="text-[8px] font-black text-[#E96B1A] dark:text-brand-400 uppercase tracking-widest leading-tight">
                APES 3.0
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

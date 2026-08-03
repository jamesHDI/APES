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
  userName,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['management', 'config']));

  // My Profile item — shown for all roles at bottom of nav
  const profileItem: NavItem = { id: 'my_profile', label: 'My Profile', icon: UserCircle };

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
      ];
    } else if (currentRole === 'supervisor') {
      items = [
        ...common,
        { id: 'team_reviews', label: 'Team Reviews', icon: CheckSquare, badge: pendingCount > 0 ? pendingCount : undefined },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
      ];
    } else if (currentRole === 'dept_head') {
      items = [
        ...common,
        { id: 'dept_actions', label: 'Personnel Actions', icon: FileCheck },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
      ];
    } else if (currentRole === 'president') {
      items = [
        ...common,
        { id: 'dept_head_reviews', label: 'Dept Head Reviews', icon: Crown },
        { id: 'reports', label: 'Executive Reports', icon: BarChart3 },
      ];
    } else if (currentRole === 'pod') {
      items = [
        ...common,
        { id: 'pod_validation', label: 'POD Governance', icon: ShieldCheck },
        { id: 'workflow_monitoring', label: 'Workflow Monitoring', icon: GitBranch },
        { id: 'evaluation_deployment', label: 'Evaluation Deployment', icon: Rocket },
        { id: 'my_history', label: 'Evaluation History', icon: History },
        { id: 'reports', label: 'Analytics', icon: BarChart3 },
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
      ];
    } else {
      items = common;
    }

    // Append My Profile for every role
    return [...items, profileItem];
  };

  const navItems = getNavItems();

  const handleSelectTab = (tab: string) => {
    onSelectTab(tab);
    onClose(); // close on mobile after selection
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const isGroup = !!item.children?.length;
    const isExpanded = expandedGroups.has(item.id);
    const hasActiveChild = item.children?.some((c) => c.id === activeTab);

    if (isGroup) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleGroup(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              hasActiveChild
                ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 ${hasActiveChild ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{item.label}</span>
            </div>
            {isExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            }
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-700 pl-3">
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
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          isActive
            ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={`shrink-0 min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full flex items-center justify-center ${
              isActive ? 'bg-white text-brand-700' : 'bg-hdi-red text-white'
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
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`
          fixed top-16 left-0 bottom-0 z-40 w-64 bg-white dark:bg-slate-900
          border-r border-slate-200 dark:border-slate-800
          flex flex-col transition-transform duration-250 ease-out
          lg:sticky lg:top-0 lg:translate-x-0 lg:shrink-0 lg:h-[calc(100vh-4rem)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >

        {/* Mobile Close Button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 lg:hidden">
          <div className="flex items-center gap-2">
            <img src="/hdi-logo.png" alt="HDI Hive" className="h-6 w-auto object-contain" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">APES v3.0</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 pt-4">
          <p className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Navigation
          </p>
          {navItems.map(renderItem)}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">HDI Hive</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Strictly Confidential</p>
        </div>
      </aside>
    </>
  );
};

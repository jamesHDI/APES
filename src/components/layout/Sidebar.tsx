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
    onClose();
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
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-base font-semibold transition-all duration-150 ${
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
              <span className="font-semibold">{item.label}</span>
            </div>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
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
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-base transition-all duration-150 ${
          isActive
            ? 'bg-gradient-to-r from-[#FFF4EA] via-[#FFF8F3] to-transparent text-[#E96B1A] font-bold border-l-[3px] border-[#F28C28] pl-[10px]'
            : 'font-semibold text-slate-500 dark:text-slate-400 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/80 hover:text-[#E96B1A] dark:hover:text-brand-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isActive ? 'bg-[#F28C28]/15' : 'bg-slate-100/70 dark:bg-slate-800'
          }`}>
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#F28C28]' : 'text-slate-400 dark:text-slate-500'}`} />
          </div>
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={`shrink-0 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center ${
              isActive ? 'bg-[#F28C28] text-white' : 'bg-[#F28C28]/15 text-[#E96B1A]'
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

      {/* Sidebar Panel */}
      <aside
        className={`
          fixed top-16 left-4 bottom-0 z-40 w-64
          bg-gradient-to-b from-[#FFFAF6] via-[#FFF8F3] to-[#FFF6EF]
          dark:from-slate-900 dark:via-slate-900 dark:to-slate-900
          border-r border-[#EFE4D6] dark:border-slate-800
          flex flex-col transition-transform duration-250 ease-out
          lg:sticky lg:top-0 lg:left-5 lg:translate-x-0 lg:shrink-0 lg:h-[calc(100vh-4rem)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EFE4D6] dark:border-slate-800 lg:hidden">
          <div className="flex items-center gap-2">
            <img src="/hdi-logo.png" alt="HDI Hive" className="h-6 w-auto object-contain dark:hidden" />
            <div className="hidden dark:inline-flex relative h-6 items-center overflow-hidden">
              <img src="/hdi-logo.png" alt="HDI Icon" className="h-full w-auto object-contain max-w-none" style={{ clipPath: 'inset(0 68% 0 0)' }} />
              <img src="/hdi-logo.png" alt="HDI Text" className="h-full w-auto object-contain max-w-none absolute top-0 left-0 brightness-0 invert" style={{ clipPath: 'inset(0 0 0 32%)' }} />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">APES v3.0</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#FFF4EA] dark:hover:bg-slate-800 text-slate-400 hover:text-[#E96B1A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
            Navigation
          </p>
          {navItems.map(renderItem)}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#EFE4D6] dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#F28C28]/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F28C28]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">HDI Hive · APES v3.0</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Strictly Confidential</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

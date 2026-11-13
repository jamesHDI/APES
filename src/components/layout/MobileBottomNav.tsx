import React from 'react';
import { Role } from '../../types';
import {
  LayoutDashboard,
  FileSpreadsheet,
  SlidersHorizontal,
  Layers,
  History,
  CheckSquare,
  BarChart3,
  ShieldCheck,
  Rocket,
  Users,
  Crown,
  GitBranch,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentRole: Role;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount?: number;
  pendingTemplateCount?: number;
  pendingAccountCount?: number;
  onOpenMenu: () => void;
}

interface BottomTabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  isAction?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRole,
  activeTab,
  onSelectTab,
  pendingCount = 0,
  pendingTemplateCount = 0,
  pendingAccountCount = 0,
  onOpenMenu,
}) => {
  const getTabsForRole = (): BottomTabItem[] => {
    switch (currentRole) {
      case 'employee':
        return [
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'evaluations', label: 'Evaluate', icon: FileSpreadsheet, badge: pendingCount },
          { id: 'my_template', label: 'Template', icon: SlidersHorizontal, badge: pendingTemplateCount },
          { id: 'my_history', label: 'History', icon: History },
          { id: '__menu', label: 'Menu', icon: Menu, isAction: true },
        ];

      case 'supervisor':
        return [
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'team_reviews', label: 'Reviews', icon: CheckSquare, badge: pendingCount },
          { id: 'template_builder', label: 'Templates', icon: Layers, badge: pendingTemplateCount },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
          { id: '__menu', label: 'Menu', icon: Menu, isAction: true },
        ];

      case 'dept_head':
        return [
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'evaluations', label: 'Reviews', icon: CheckSquare, badge: pendingCount },
          { id: 'template_builder', label: 'Templates', icon: Layers, badge: pendingTemplateCount },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
          { id: '__menu', label: 'Menu', icon: Menu, isAction: true },
        ];

      case 'pod':
        return [
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'evaluations', label: 'Validate', icon: ShieldCheck, badge: pendingCount },
          { id: 'template_builder', label: 'Templates', icon: SlidersHorizontal, badge: pendingTemplateCount },
          { id: 'evaluation_deployment', label: 'Deploy', icon: Rocket },
          { id: '__menu', label: 'Menu', icon: Menu, isAction: true },
        ];

      case 'hr_admin':
      case 'system_admin':
        return [
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'employee_mgmt', label: 'Directory', icon: Users, badge: pendingAccountCount },
          { id: 'template_builder', label: 'Templates', icon: SlidersHorizontal, badge: pendingTemplateCount },
          { id: 'evaluation_deployment', label: 'Deploy', icon: Rocket },
          { id: '__menu', label: 'Menu', icon: Menu, isAction: true },
        ];

      case 'president':
        return [
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'evaluations', label: 'Approvals', icon: Crown, badge: pendingCount },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
          { id: 'org_hierarchy', label: 'Org Chart', icon: GitBranch },
          { id: '__menu', label: 'Menu', icon: Menu, isAction: true },
        ];

      default:
        return [
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'evaluations', label: 'Evaluate', icon: FileSpreadsheet, badge: pendingCount },
          { id: '__menu', label: 'Menu', icon: Menu, isAction: true },
        ];
    }
  };

  const tabs = getTabsForRole();

  return (
    <nav
      className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-[#EFE4D6] dark:border-slate-800 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] px-1 pt-1 pb-[max(env(safe-area-inset-bottom),0.35rem)] transition-colors"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = !tab.isAction && activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.isAction) {
                  onOpenMenu();
                } else {
                  onSelectTab(tab.id);
                }
              }}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-[46px] rounded-xl transition-all duration-150 select-none active:scale-95 ${
                isActive
                  ? 'text-[#E96B1A] dark:text-[#F28C28] font-black'
                  : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Icon Container with subtle background on active */}
              <div
                className={`relative flex items-center justify-center w-8 h-7 rounded-lg transition-colors ${
                  isActive ? 'bg-[#FFF4EA] dark:bg-orange-950/40 text-[#E96B1A] dark:text-[#F28C28]' : ''
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />

                {/* Notification / Alert Badge */}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 bg-[#F28C28] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[10px] tracking-tight leading-tight mt-0.5 whitespace-nowrap ${
                isActive ? 'font-black' : 'font-medium'
              }`}>
                {tab.label}
              </span>

              {/* Active Dot Indicator */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#E96B1A] dark:bg-[#F28C28] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};


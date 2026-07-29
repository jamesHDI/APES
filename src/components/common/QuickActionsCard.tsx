import React from 'react';
import { LucideIcon } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  onClick: () => void;
  disabled?: boolean;
}

interface QuickActionsCardProps {
  title?: string;
  actions: QuickAction[];
  layout?: 'row' | 'grid';
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  title = 'Quick Actions',
  actions,
  layout = 'row',
}) => {
  const variantMap = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-600/20',
    secondary: 'bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-sm',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20',
  };

  return (
    <div className="card p-5 space-y-4">
      {title && (
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {title}
        </h3>
      )}
      <div
        className={
          layout === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-4 gap-3'
            : 'flex flex-wrap gap-3'
        }
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const variant = action.variant ?? 'secondary';
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none
                ${variantMap[variant]}
                ${layout === 'grid' ? 'flex-col justify-center h-20 text-xs' : ''}
              `}
            >
              <Icon className={`shrink-0 ${layout === 'grid' ? 'w-5 h-5' : 'w-4 h-4'}`} />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

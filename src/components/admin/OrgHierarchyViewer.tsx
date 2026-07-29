import React from 'react';
import { User, Department } from '../../types';
import { Crown, Building2, UserCheck, Users, ChevronRight, ShieldCheck } from 'lucide-react';

interface OrgHierarchyViewerProps {
  users: User[];
  departments: Department[];
}

export const OrgHierarchyViewer: React.FC<OrgHierarchyViewerProps> = ({ users, departments }) => {
  const president = users.find(u => u.role === 'president') || users[3];
  const deptHeads = users.filter(u => u.role === 'dept_head' || u.isDepartmentHead);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Crown className="w-6 h-6 text-amber-300" />
            <h2 className="text-xl font-black tracking-tight">Organizational Hierarchy & Workflow Routing Matrix</h2>
          </div>
          <p className="text-xs text-amber-200 mt-1">
            Visual reporting structure. The evaluation workflow is automatically determined by position and reporting hierarchy without manual user selection.
          </p>
        </div>
      </div>

      {/* Tree Visualizer */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        
        {/* Tier 1: President */}
        <div className="flex flex-col items-center">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg flex items-center space-x-3 border-2 border-amber-300 max-w-sm w-full">
            <Crown className="w-8 h-8 text-white shrink-0" />
            <div>
              <span className="text-[10px] font-extrabold uppercase bg-black/20 px-2 py-0.5 rounded text-amber-100">
                Top Executive Evaluator
              </span>
              <h3 className="font-black text-sm tracking-tight">{president.name}</h3>
              <p className="text-xs text-amber-100">{president.position}</p>
            </div>
          </div>
          
          <div className="w-0.5 h-8 bg-amber-400 my-1" />
        </div>

        {/* Tier 2: Department Heads */}
        <div className="space-y-4">
          <h4 className="text-center font-extrabold text-xs text-slate-400 uppercase tracking-wider">
            Department Heads (Workflow B: Self-Assessment → President Review → POD)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const headUser = users.find(u => u.name === dept.headName || u.departmentName === dept.name && (u.role === 'dept_head' || u.isDepartmentHead));
              const deptStaff = users.filter(u => u.departmentName === dept.name && u.id !== headUser?.id);

              return (
                <div key={dept.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <span>{dept.name}</span>
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      {dept.code}
                    </span>
                  </div>

                  {/* Dept Head Card */}
                  <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 text-xs flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{dept.headName}</p>
                      <p className="text-[10px] text-purple-600">Department Head</p>
                    </div>
                  </div>

                  {/* Staff List */}
                  <div className="pl-3 border-l-2 border-purple-300 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Staff ({deptStaff.length}):</p>
                    {deptStaff.slice(0, 3).map(s => (
                      <div key={s.id} className="flex items-center space-x-1.5 text-[11px]">
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                        <span>{s.name} ({s.position})</span>
                      </div>
                    ))}
                    {deptStaff.length > 3 && (
                      <p className="text-[10px] text-brand-600 font-bold pl-4">+{deptStaff.length - 3} more staff...</p>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

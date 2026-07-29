import React from 'react';
import { User, Department } from '../../types';
import { Building2, ChevronRight, ShieldCheck, UserCheck, Hexagon } from 'lucide-react';

interface OrgHierarchyViewerProps {
  users: User[];
  departments: Department[];
}

export const OrgHierarchyViewer: React.FC<OrgHierarchyViewerProps> = ({ users, departments }) => {
  const president = users.find(u => u.role === 'president' || u.name.includes('Emman Buenaventura') || u.id === 'usr_dh_fop') || {
    name: 'Emman Buenaventura',
    position: 'President & Department Head - Finance / Office of the President'
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Banner with Hexagon Background Pattern */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex items-center justify-between border border-amber-500/20">
        
        {/* Subtle Honeycomb SVG Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 rounded-2xl border border-amber-400/30 text-amber-400">
              <Hexagon className="w-6 h-6 fill-amber-400/20 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black tracking-tight">HDI Hive Organizational Matrix</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Hexagon Hive Workflow
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-1 max-w-2xl">
                Structured reporting hierarchy and automated multi-tier evaluation routing for all HDI Department Heads and staff.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tree Visualizer with Honeycomb Styling */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-8 relative overflow-hidden">
        
        {/* Tier 1: President (Centered HDI Hive Hexagon Card) */}
        <div className="flex flex-col items-center">
          <div className="relative group max-w-md w-full">
            {/* Ambient Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
            
            <div className="relative p-6 rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white shadow-2xl border-2 border-amber-300/40 text-center space-y-2">
              
              {/* Top Hexagon Icon Badge */}
              <div className="inline-flex items-center justify-center space-x-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-300/30 text-amber-200 text-[10px] font-black uppercase tracking-wider mb-1">
                <Hexagon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Executive Office</span>
              </div>

              <h3 className="font-black text-xl tracking-tight text-white leading-snug">{president.name}</h3>
              <p className="text-xs text-amber-100 font-semibold">{president.position}</p>
            </div>
          </div>
          
          {/* Honeycomb Connector Line */}
          <div className="flex flex-col items-center my-2">
            <div className="w-0.5 h-8 bg-gradient-to-b from-amber-500 to-amber-300" />
            <div className="w-3 h-3 rotate-45 border-2 border-amber-400 bg-amber-500" />
          </div>
        </div>

        {/* Tier 2: Department Heads (HDI Hive Grid) */}
        <div className="space-y-5">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
            <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-widest px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center space-x-1.5">
              <Hexagon className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              <span>Department Heads Routing Nodes</span>
            </span>
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments.map((dept) => {
              const headUser = users.find(u => u.name === dept.headName || (u.departmentName === dept.name && (u.role === 'dept_head' || u.isDepartmentHead)));
              const deptStaff = users.filter(u => u.departmentName === dept.name && u.id !== headUser?.id);

              return (
                <div key={dept.id} className="group relative p-5 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-300 space-y-4 shadow-sm hover:shadow-md">
                  
                  {/* Department Title Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-amber-500" />
                      <span>{dept.name}</span>
                    </span>
                    
                    {/* Hexagon Department Code Badge */}
                    <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 font-black text-[10px] border border-amber-500/20">
                      <Hexagon className="w-3 h-3 text-amber-500 fill-amber-500/30" />
                      <span>{dept.code}</span>
                    </div>
                  </div>

                  {/* Dept Head Card with Hexagon Node Styling */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300/40 dark:border-amber-800 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-white text-xs">{dept.headName}</p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-0.5">Department Head</p>
                    </div>
                    <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow-sm">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Staff List */}
                  <div className="pl-3 border-l-2 border-amber-400/50 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Staff ({deptStaff.length}):</p>
                    {deptStaff.slice(0, 3).map(s => (
                      <div key={s.id} className="flex items-center space-x-1.5 text-[11px]">
                        <ChevronRight className="w-3 h-3 text-amber-500" />
                        <span className="font-medium">{s.name} <span className="text-[10px] text-slate-400">({s.position})</span></span>
                      </div>
                    ))}
                    {deptStaff.length > 3 && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold pl-4">+{deptStaff.length - 3} more staff...</p>
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

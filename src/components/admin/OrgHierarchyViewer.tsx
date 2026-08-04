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
      
      {/* Banner */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] dark:from-transparent to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">HDI Hive Organizational Matrix</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
              Structured reporting hierarchy and automated evaluation routing for HDI Department Heads and staff.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFF4EA] text-[#E96B1A] border border-[#F28C28]/20 shrink-0">
            Reporting Structure
          </span>
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
                <div key={dept.id} className="group relative p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-300 space-y-4 shadow-sm hover:shadow-md">
                  
                  {/* Department Title Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-3">
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
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/60 border border-amber-300/40 dark:border-amber-800/80 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-amber-100 text-xs">{dept.headName}</p>
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

import React, { useState } from 'react';
import { User, Department } from '../../types';
import { MASTER_COMPANIES } from '../../constants/masterOrganization';
import { 
  ChevronRight, 
  Hexagon, 
  Building2, 
  Users, 
  Crown, 
  UserCheck, 
  ShieldCheck, 
  Briefcase,
  Layers,
  ChevronDown
} from 'lucide-react';

interface OrgHierarchyViewerProps {
  users: User[];
  departments: Department[];
}

export const OrgHierarchyViewer: React.FC<OrgHierarchyViewerProps> = ({ users, departments }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [expandedSupervisors, setExpandedSupervisors] = useState<Set<string>>(new Set());

  const toggleSupervisor = (isName: string) => {
    setExpandedSupervisors(prev => {
      const next = new Set(prev);
      if (next.has(isName)) next.delete(isName);
      else next.add(isName);
      return next;
    });
  };

  // Find CEO Brandon Chia
  const ceo = users.find(u => u.name === 'Brandon Chia' || u.id === 'usr_ceo_brandon') || {
    name: 'Brandon Chia',
    position: 'Chief Executive Officer',
    departmentName: 'Executive Office',
    companyName: 'HDI Organization',
    employeeNumber: 'CEO-001'
  };

  // Companies list (derived dynamically from MASTER_COMPANIES + existing users)
  const availableCompanies = MASTER_COMPANIES.map(c => {
    const companyUsers = users.filter(u => u.companyName === c.name || u.companyId === c.id);
    return {
      ...c,
      employeeCount: companyUsers.length,
      departmentsCount: new Set(companyUsers.map(u => u.departmentName)).size
    };
  });

  const displayedCompanies = selectedCompanyId === 'all'
    ? availableCompanies
    : availableCompanies.filter(c => c.id === selectedCompanyId);

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] dark:from-transparent to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              APES Multi-Company Organizational Hierarchy
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
              Enterprise reporting hierarchy and automated Immediate Supervisor (IS) routing across all HDI companies, departments, and branches.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFF4EA] text-[#E96B1A] border border-[#F28C28]/20 shrink-0">
            Excel Master Source of Truth ({users.length} Employees)
          </span>
        </div>
      </div>

      {/* Company Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setSelectedCompanyId('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedCompanyId === 'all'
              ? 'bg-[#E96B1A] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          All Companies ({users.length})
        </button>
        {availableCompanies.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCompanyId(c.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5 ${
              selectedCompanyId === c.id
                ? 'bg-[#E96B1A] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <span>{c.name}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {c.employeeCount}
            </span>
          </button>
        ))}
      </div>

      {/* Main Hierarchy Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden space-y-8">
        
        {/* Tier 1: CEO (Brandon Chia) */}
        <div className="flex flex-col items-center">
          <div className="relative group max-w-md w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
            
            <div className="relative p-6 rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white shadow-2xl border-2 border-amber-300/40 text-center space-y-2">
              <div className="inline-flex items-center justify-center space-x-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-300/30 text-amber-200 text-[10px] font-black uppercase tracking-wider mb-1">
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Executive Office ΓÇó HDI Organization</span>
              </div>

              <h3 className="font-black text-2xl tracking-tight text-white leading-snug">{ceo.name}</h3>
              <p className="text-xs text-amber-100 font-bold">{ceo.position}</p>
            </div>
          </div>

          {/* Connector Line */}
          <div className="flex flex-col items-center my-1">
            <div className="w-0.5 h-8 bg-gradient-to-b from-amber-500 to-amber-400" />
            <div className="w-3.5 h-3.5 rotate-45 border-2 border-amber-400 bg-amber-500 shadow-md z-10 -my-0.5" />
            <div className="w-0.5 h-8 bg-amber-400" />
          </div>
        </div>

        {/* Tier 2: Companies & Groups */}
        <div className="space-y-10">
          {displayedCompanies.map(company => {
            const companyEmployees = users.filter(u => u.companyName === company.name || u.companyId === company.id);

            // Group by Department
            const deptNames = Array.from(new Set(companyEmployees.map(u => u.departmentName || 'General'))).sort();

            return (
              <div key={company.id} className="p-6 rounded-3xl bg-slate-50/80 dark:bg-slate-900/60 border-2 border-slate-200 dark:border-slate-700 space-y-6">
                
                {/* Company Header */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 flex-wrap gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FFF4EA] dark:bg-brand-950/50 flex items-center justify-center border border-[#F28C28]/30">
                      <Building2 className="w-5 h-5 text-[#E96B1A]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {company.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {companyEmployees.length} Active Employees ΓÇó {deptNames.length} Departments/Branches
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#E96B1A] font-extrabold text-xs border border-[#F28C28]/30">
                    Code: {company.code}
                  </span>
                </div>

                {/* Departments Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {deptNames.map(deptName => {
                    const deptEmployees = companyEmployees.filter(u => (u.departmentName || 'General') === deptName);
                    
                    // Group by Immediate Supervisor
                    const supervisorGroups: Record<string, User[]> = {};
                    deptEmployees.forEach(emp => {
                      const isName = emp.immediateSuperiorName || 'Immediate Supervisor';
                      if (!supervisorGroups[isName]) {
                        supervisorGroups[isName] = [];
                      }
                      supervisorGroups[isName].push(emp);
                    });

                    return (
                      <div key={deptName} className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {deptName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {deptEmployees.length} staff
                          </span>
                        </div>

                        {/* Supervisor Routing Nodes */}
                        <div className="space-y-3">
                          {Object.entries(supervisorGroups).map(([supName, staffList]) => (
                            <div key={supName} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1.5">
                                  <UserCheck className="w-3.5 h-3.5 text-[#E96B1A]" />
                                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                    IS: {supName}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">
                                  {staffList.length} direct report{staffList.length > 1 ? 's' : ''}
                                </span>
                              </div>

                              {/* Staff List */}
                              <div className="space-y-1 pl-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                                {staffList.map(s => (
                                  <div key={s.id} className="flex items-start space-x-1.5 text-xs py-0.5">
                                    <ChevronRight className="w-3 h-3 text-[#E96B1A] shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                                        {s.name}
                                      </p>
                                      <p className="text-[10px] text-slate-500">
                                        {s.position || 'Staff'} ΓÇó <span className="font-semibold">{s.employeeNumber}</span>
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

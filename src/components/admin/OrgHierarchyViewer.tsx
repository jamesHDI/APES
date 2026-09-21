import React, { useState, useEffect } from 'react';
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
    const companyUsers = users.filter(u => {
      if (!u) return false;
      if (u.companyId && (u.companyId === c.id || u.companyId.toLowerCase() === c.id.toLowerCase())) return true;
      if (u.companyName && (u.companyName.trim().toLowerCase() === c.name.trim().toLowerCase())) return true;
      return false;
    });
    return {
      ...c,
      employeeCount: companyUsers.length,
      departmentsCount: new Set(companyUsers.map(u => u.departmentName)).size
    };
  });

  const displayedCompanies = selectedCompanyId === 'all'
    ? availableCompanies
    : availableCompanies.filter(c => c.id === selectedCompanyId);

  // Active company tracked by scroll position
  const [activeCompanyId, setActiveCompanyId] = useState<string>(displayedCompanies[0]?.id || '');

  // Keep activeCompanyId synchronized when selectedCompanyId changes
  useEffect(() => {
    if (displayedCompanies.length > 0) {
      setActiveCompanyId(displayedCompanies[0].id);
    }
  }, [selectedCompanyId]);

  // Scroll spy to highlight the company currently on the screen in real-time
  useEffect(() => {
    if (displayedCompanies.length === 0) return;

    const mainEl = document.querySelector('main');

    const updateActive = () => {
      const focalY = window.innerHeight * 0.45;
      let bestId = displayedCompanies[0]?.id;
      let minDistance = Infinity;

      for (const comp of displayedCompanies) {
        const el = document.getElementById(`company-section-${comp.id}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();

        // If the card spans across the focal line, it is actively in view
        if (rect.top <= focalY && rect.bottom >= focalY) {
          bestId = comp.id;
          break;
        }

        const dist = Math.abs(rect.top - focalY);
        if (dist < minDistance) {
          minDistance = dist;
          bestId = comp.id;
        }
      }

      if (bestId) {
        setActiveCompanyId(bestId);
      }
    };

    updateActive();

    // Use capture: true so window intercepts scroll events from <main> or any scrollable container in real time
    window.addEventListener('scroll', updateActive, { capture: true, passive: true });
    window.addEventListener('resize', updateActive, { passive: true });
    if (mainEl) {
      mainEl.addEventListener('scroll', updateActive, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', updateActive, true);
      window.removeEventListener('resize', updateActive);
      if (mainEl) {
        mainEl.removeEventListener('scroll', updateActive);
      }
    };
  }, [displayedCompanies]);

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
        {availableCompanies.map(c => {
          const isScrollActive = selectedCompanyId === 'all' && activeCompanyId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                if (selectedCompanyId === 'all') {
                  const el = document.getElementById(`company-section-${c.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                } else {
                  setSelectedCompanyId(c.id);
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5 ${
                selectedCompanyId === c.id || isScrollActive
                  ? 'bg-[#E96B1A] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <span>{c.name}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {c.employeeCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Hierarchy Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
        
        {/* Tier 1: CEO (Brandon Chia) */}
        <div className="flex flex-col items-center">
          <div className="relative group max-w-md w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
            
            <div className="relative p-6 rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white shadow-2xl border-2 border-amber-300/40 text-center space-y-2">
              <div className="inline-flex items-center justify-center space-x-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-300/30 text-amber-200 text-[10px] font-black uppercase tracking-wider mb-1">
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Executive Office • HDI Organization</span>
              </div>

              <h3 className="font-black text-2xl tracking-tight text-white leading-snug">{ceo.name}</h3>
              <p className="text-xs text-amber-100 font-bold">{ceo.position}</p>
            </div>
          </div>

          {/* Continuous Connector Line from CEO Node */}
          <div className="flex flex-col items-center my-0 relative">
            <div className="w-0.5 h-8 bg-gradient-to-b from-amber-500 to-amber-400" />
            {/* CEO Branching Node Diamond */}
            <div className="relative flex items-center justify-center -my-0.5 z-10">
              <span className="animate-ping absolute inline-flex h-4 w-4 rounded-sm bg-amber-400 opacity-60"></span>
              <div className="w-3.5 h-3.5 rotate-45 border-2 border-amber-300 bg-amber-500 shadow-md relative z-10" />
            </div>
            <div className="w-0.5 h-8 bg-gradient-to-b from-amber-400 to-[#E96B1A]" />

            {/* Enterprise Distribution Junction Hub */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 via-amber-500/20 to-orange-500/10 dark:from-orange-950/60 dark:via-amber-950/70 dark:to-orange-950/60 border border-[#F28C28]/40 text-[#E96B1A] dark:text-orange-300 text-xs font-black uppercase tracking-wider shadow-sm z-10 backdrop-blur-sm">
              <Building2 className="w-3.5 h-3.5 text-[#E96B1A]" />
              <span>Enterprise Subsidiaries & Operating Units</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#E96B1A] animate-bounce" />
            </div>
          </div>
        </div>

        {/* Tier 2: Companies & Groups - Completely Connected without gaps */}
        <div className="flex flex-col items-center w-full">
          {displayedCompanies.map((company, index) => {
            const isActive = company.id === activeCompanyId;

            const companyEmployees = users.filter(u => {
              if (!u) return false;
              if (u.companyId && (u.companyId === company.id || u.companyId.toLowerCase() === company.id.toLowerCase())) return true;
              if (u.companyName && (u.companyName.trim().toLowerCase() === company.name.trim().toLowerCase())) return true;
              return false;
            });

            // Group by Department
            const deptNames = Array.from(new Set(companyEmployees.map(u => u.departmentName || 'General'))).sort();

            return (
              <div key={company.id} className="w-full flex flex-col items-center">
                {/* Visual Hierarchical Connector into this Company Card */}
                {index === 0 ? (
                  // Direct unbroken line from Enterprise Subsidiaries junction into Unit 1
                  <div className="flex flex-col items-center w-full my-0 py-0">
                    <div className="w-0.5 h-10 bg-gradient-to-b from-[#E96B1A] to-amber-500" />
                  </div>
                ) : (
                  // Continuous connector line from previous company card bottom into this company card top
                  <div className="flex flex-col items-center w-full my-0 py-0">
                    {/* Line coming from bottom of previous card */}
                    <div className={`w-0.5 h-7 transition-colors duration-300 ${
                      isActive ? 'bg-[#E96B1A]' : 'bg-slate-300 dark:bg-slate-700'
                    }`} />
                    
                    {/* Branch Node Diamond */}
                    <div className={`w-4 h-4 rotate-45 border-2 transition-all duration-300 flex items-center justify-center ${
                      isActive
                        ? 'border-[#E96B1A] bg-[#E96B1A] shadow-lg shadow-orange-500/50 ring-4 ring-orange-400/30 scale-125'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`} />
                    
                    {/* Line going straight down and touching the UNIT badge */}
                    <div className={`w-0.5 h-7 transition-colors duration-300 ${
                      isActive ? 'bg-[#E96B1A]' : 'bg-slate-300 dark:bg-slate-700'
                    }`} />
                  </div>
                )}

                {/* Company Card */}
                <div 
                  id={`company-section-${company.id}`}
                  className={`w-full p-6 rounded-3xl border-2 transition-all duration-300 space-y-6 relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-b from-orange-50/70 via-white to-orange-50/30 dark:from-orange-950/30 dark:via-slate-900 dark:to-orange-950/20 border-[#E96B1A] ring-4 ring-[#E96B1A]/20 shadow-2xl shadow-orange-500/15 -translate-y-1 scale-[1.008]'
                      : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm translate-y-0 scale-100'
                  }`}
                >
                  {/* Sliding highlight beam across top border on the active card */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden pointer-events-none z-10">
                      <div 
                        className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#E96B1A] to-transparent"
                        style={{
                          animation: 'railSweep 2s ease-in-out infinite'
                        }}
                      />
                    </div>
                  )}

                  {/* Top Tree Node Junction on Company Card (Touching the line directly!) */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                    <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all duration-300 ${
                      isActive
                        ? 'bg-[#E96B1A] text-white border-[#E96B1A] shadow-md shadow-orange-500/40 scale-105'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 scale-100'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white animate-ping' : 'bg-slate-400'}`} />
                      <span>Unit {index + 1}</span>
                    </div>
                  </div>

                  {/* Company Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 flex-wrap gap-2 pt-1">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                        isActive
                          ? 'bg-[#E96B1A] text-white border-[#E96B1A] shadow-md shadow-orange-500/30 scale-105 ring-2 ring-orange-300'
                          : 'bg-[#FFF4EA] dark:bg-brand-950/50 text-[#E96B1A] border-[#F28C28]/30'
                      }`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className={`text-base font-black transition-colors duration-300 ${
                          isActive ? 'text-[#E96B1A] dark:text-orange-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {company.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {companyEmployees.length} Active Employees • {deptNames.length} Departments/Branches
                        </p>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-xl font-extrabold text-xs border transition-colors duration-300 ${
                      isActive
                        ? 'bg-[#E96B1A] text-white border-[#E96B1A] shadow-sm'
                        : 'bg-orange-100 dark:bg-orange-950/60 text-[#E96B1A] border-[#F28C28]/30'
                    }`}>
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
                                          {s.position || 'Staff'} • <span className="font-semibold">{s.employeeNumber}</span>
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
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes railSweep {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(200%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    </div>
  );
};

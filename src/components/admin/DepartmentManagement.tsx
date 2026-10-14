import React, { useState, useEffect, useMemo } from 'react';
import { Department, User, EvaluationTemplate } from '../../types';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  CheckCircle2, 
  X, 
  UserPlus, 
  UserMinus, 
  Search,
  Briefcase,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

import { isSameDepartment } from '../dashboards/DeptHeadDashboard';

interface DepartmentManagementProps {
  departments: Department[];
  users: User[];
  templates: EvaluationTemplate[];
  onSaveDepartments: (updatedDepartments: Department[]) => void;
  onSaveUsers?: (updatedUsers: User[]) => Promise<void> | void;
  currentUser?: User;
}

export const DepartmentManagement: React.FC<DepartmentManagementProps> = ({
  departments,
  users,
  templates,
  onSaveDepartments,
  onSaveUsers,
  currentUser,
}) => {
  const [deptList, setDeptList] = useState<Department[]>(departments);
  const [localUsers, setLocalUsers] = useState<User[]>(users);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Staff Roster Modal State
  const [selectedEmployeeToAdd, setSelectedEmployeeToAdd] = useState<string>('');
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const [isSubmittingStaff, setIsSubmittingStaff] = useState<boolean>(false);

  // Synchronize local state with props when updated
  useEffect(() => {
    setDeptList(departments);
  }, [departments]);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  // Form State for Add / Edit Department
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    headId: string;
    headName: string;
    defaultTemplateId: string;
  }>({
    name: '',
    code: '',
    headId: '',
    headName: '',
    defaultTemplateId: templates[0]?.id || ''
  });

  const getDepartmentEmployees = (dept: Department, userList: User[] = localUsers): User[] => {
    if (!dept) return [];
    const deptEmployees = userList.filter(u => {
      if (!u || u.isActive === false || u.isApproved === false || u.approvalStatus === 'pending') return false;

      // 1. Direct departmentId match
      if (u.departmentId && dept.id && u.departmentId === dept.id) return true;

      const empDeptName = (u.departmentName || '').trim().toLowerCase();
      const targetDeptName = (dept.name || '').trim().toLowerCase();

      if (!empDeptName || !targetDeptName) return false;

      // 2. If department has companyName, check company match first
      if (dept.companyName && u.companyName) {
        const empComp = u.companyName.trim().toLowerCase();
        const targetComp = dept.companyName.trim().toLowerCase();
        if (empComp === targetComp) {
          return empDeptName === targetDeptName || isSameDepartment(empDeptName, targetDeptName);
        }
        return false;
      }

      return empDeptName === targetDeptName || isSameDepartment(empDeptName, targetDeptName);
    });

    // Deduplicate strictly by employeeNumber, email, or id
    const deduped: User[] = [];
    const seen = new Set<string>();
    for (const emp of deptEmployees) {
      const key = (emp.employeeNumber || emp.id || emp.email || emp.name).toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(emp);
      }
    }
    return deduped;
  };

  const getEmployeeCount = (dept: Department): number => {
    return getDepartmentEmployees(dept, localUsers).length;
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({
      name: '',
      code: '',
      headId: '',
      headName: '',
      defaultTemplateId: templates[0]?.id || ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      headId: dept.headId || '',
      headName: dept.headName,
      defaultTemplateId: dept.defaultTemplateId || templates[0]?.id || ''
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code) {
      alert('Please fill in Department Name and Code');
      return;
    }

    const headUser = localUsers.find(u => u.id === formData.headId);
    const headName = headUser ? headUser.name : formData.headName || 'Unassigned';

    if (editingDept) {
      const updated = deptList.map((d) => {
        if (d.id === editingDept.id) {
          return {
            ...d,
            name: formData.name,
            code: formData.code.toUpperCase(),
            headId: formData.headId,
            headName,
            defaultTemplateId: formData.defaultTemplateId,
            employeeCount: getEmployeeCount({ ...d, name: formData.name, code: formData.code.toUpperCase() })
          };
        }
        return d;
      });
      setDeptList(updated);
      onSaveDepartments(updated);
      showToast('Department updated successfully');
    } else {
      const newDept: Department = {
        id: `dept_${Date.now()}`,
        name: formData.name,
        code: formData.code.toUpperCase(),
        headId: formData.headId,
        headName,
        defaultTemplateId: formData.defaultTemplateId,
        employeeCount: 0,
        isActive: true
      };
      const updated = [...deptList, newDept];
      setDeptList(updated);
      onSaveDepartments(updated);
      showToast('Department created successfully');
    }

    setShowModal(false);
  };

  const handleToggleActive = (id: string) => {
    const updated = deptList.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d);
    setDeptList(updated);
    onSaveDepartments(updated);
    showToast('Department status updated');
  };

  // ── ADD EMPLOYEE TO DEPARTMENT ──────────────────────────────────────────────
  const handleAddEmployeeToDepartment = async (employeeId: string, dept: Department) => {
    if (!employeeId) return;
    const empToUpdate = localUsers.find(u => u.id === employeeId);
    if (!empToUpdate) return;

    setIsSubmittingStaff(true);
    try {
      const updatedEmp: User = {
        ...empToUpdate,
        departmentId: dept.id,
        departmentName: dept.name,
        companyId: dept.companyName ? (dept.companyId || empToUpdate.companyId) : empToUpdate.companyId,
        companyName: dept.companyName ? dept.companyName : empToUpdate.companyName,
        departmentHeadId: dept.headId || empToUpdate.departmentHeadId,
        departmentHeadName: dept.headName || empToUpdate.departmentHeadName,
      };

      const nextUsers = localUsers.map(u => u.id === employeeId ? updatedEmp : u);
      setLocalUsers(nextUsers);

      // Recalculate employee count for this department
      const newCount = getDepartmentEmployees(dept, nextUsers).length;
      const nextDepts = deptList.map(d => d.id === dept.id ? { ...d, employeeCount: newCount } : d);
      setDeptList(nextDepts);
      onSaveDepartments(nextDepts);

      if (onSaveUsers) {
        await onSaveUsers(nextUsers);
      }

      setSelectedEmployeeToAdd('');
      showToast(`${empToUpdate.name} assigned to ${dept.name} department successfully!`);
    } catch (err) {
      console.error('[DepartmentManagement] Failed to add employee:', err);
      showToast('Failed to assign employee to department.');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // ── REMOVE EMPLOYEE FROM DEPARTMENT ─────────────────────────────────────────
  const handleRemoveEmployeeFromDepartment = async (employeeId: string, dept: Department) => {
    const empToUpdate = localUsers.find(u => u.id === employeeId);
    if (!empToUpdate) return;

    if (!window.confirm(`Are you sure you want to remove ${empToUpdate.name} from the ${dept.name} department?`)) {
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const updatedEmp: User = {
        ...empToUpdate,
        departmentId: '',
        departmentName: 'Unassigned',
        departmentHeadId: undefined,
        departmentHeadName: undefined,
      };

      const nextUsers = localUsers.map(u => u.id === employeeId ? updatedEmp : u);
      setLocalUsers(nextUsers);

      // Recalculate employee count for this department
      const newCount = getDepartmentEmployees(dept, nextUsers).length;
      const nextDepts = deptList.map(d => d.id === dept.id ? { ...d, employeeCount: newCount } : d);
      setDeptList(nextDepts);
      onSaveDepartments(nextDepts);

      if (onSaveUsers) {
        await onSaveUsers(nextUsers);
      }

      showToast(`${empToUpdate.name} removed from ${dept.name} department.`);
    } catch (err) {
      console.error('[DepartmentManagement] Failed to remove employee:', err);
      showToast('Failed to remove employee from department.');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Currently selected department's staff roster
  const currentDeptStaff = useMemo(() => {
    return selectedDept ? getDepartmentEmployees(selectedDept, localUsers) : [];
  }, [selectedDept, localUsers]);

  const currentDeptStaffIds = useMemo(() => {
    return new Set(currentDeptStaff.map(u => u.id));
  }, [currentDeptStaff]);

  // Candidates available to add (active employees not in this department)
  const availableEmployeesToAdd = useMemo(() => {
    return localUsers
      .filter(u => {
        if (!u || u.isActive === false || u.isApproved === false || u.approvalStatus === 'pending') return false;
        if (u.role === 'system_admin') return false;
        return !currentDeptStaffIds.has(u.id);
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [localUsers, currentDeptStaffIds]);

  // Search filtered staff roster
  const filteredDeptStaff = useMemo(() => {
    if (!staffSearchQuery.trim()) return currentDeptStaff;
    const q = staffSearchQuery.toLowerCase().trim();
    return currentDeptStaff.filter(u => (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.position && u.position.toLowerCase().includes(q)) ||
      (u.employeeNumber && u.employeeNumber.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    ));
  }, [currentDeptStaff, staffSearchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Department Management</h2>
          <p className="text-xs text-slate-500">Configure departments, assign Department Heads, link evaluation templates, and manage staff members.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#E96B1A] text-white font-bold text-xs hover:bg-[#D35A0F] shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deptList.map((d) => {
          const deptStaffCount = getEmployeeCount(d);
          return (
            <div
              key={d.id}
              className={`p-5 rounded-2xl border transition-all ${
                d.isActive 
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm' 
                  : 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/50 flex items-center justify-center text-[#E96B1A]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{d.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                        {d.code}
                      </span>
                      {d.companyName && (
                        <span className="text-[10px] font-semibold text-slate-500">
                          {d.companyName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  d.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-600'
                }`}>
                  {d.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p><strong>Department Head:</strong> {d.headName || 'Unassigned'}</p>
                <p><strong>Assigned Staff:</strong> {deptStaffCount} Employees</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDept(d);
                    setStaffSearchQuery('');
                    setSelectedEmployeeToAdd('');
                  }}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#E96B1A] hover:text-[#d35a0f] hover:underline"
                  title="View and manage staff roster in pop-up modal"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>View Roster ({deptStaffCount})</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(d)}
                    className="p-1.5 text-slate-400 hover:text-[#E96B1A] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Department"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleToggleActive(d.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Toggle Active Status"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── STAFF ROSTER MODAL POP-UP (FLOATING POPUP, NOT IN THE BOTTOM!) ── */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
            
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200/60 flex items-center justify-center text-[#E96B1A] shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base truncate">
                      {selectedDept.name} — Staff Roster
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                      {selectedDept.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    {selectedDept.companyName && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
                        {selectedDept.companyName}
                      </span>
                    )}
                    <span>Head: <strong className="text-slate-700 dark:text-slate-300">{selectedDept.headName || 'Unassigned'}</strong></span>
                    <span>•</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {currentDeptStaff.length} Assigned Staff
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDept(null);
                  setStaffSearchQuery('');
                  setSelectedEmployeeToAdd('');
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-all shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Add Staff + Search + Current Staff List */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Add Staff Control */}
              <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-800/40 space-y-3">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-[#E96B1A]" />
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Add Staff Member to {selectedDept.name}
                  </span>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={selectedEmployeeToAdd}
                    onChange={(e) => setSelectedEmployeeToAdd(e.target.value)}
                    disabled={isSubmittingStaff}
                    className="flex-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E96B1A]"
                  >
                    <option value="">Select an employee to add to this department...</option>
                    {availableEmployeesToAdd.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.employeeNumber ? `(${emp.employeeNumber})` : ''} — {emp.position || 'Staff'} {emp.departmentName ? `[Current: ${emp.departmentName}]` : '[Unassigned]'}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    type="button"
                    onClick={() => handleAddEmployeeToDepartment(selectedEmployeeToAdd, selectedDept)}
                    disabled={!selectedEmployeeToAdd || isSubmittingStaff}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#E96B1A] hover:bg-[#D45A0E] disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1.5 shrink-0 active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Staff</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select an active company employee to assign them to {selectedDept.name}.
                </p>
              </div>

              {/* Search filter for roster */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff by name, position, or employee ID..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E96B1A]"
                />
              </div>

              {/* Staff List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>Assigned Personnel ({currentDeptStaff.length})</span>
                </div>

                {currentDeptStaff.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                    No staff members are currently assigned to this department. Use the selector above to assign staff.
                  </div>
                ) : filteredDeptStaff.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No staff members match "{staffSearchQuery}".
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredDeptStaff.map((u) => {
                      const isHead = selectedDept.headId === u.id || (selectedDept.headName && selectedDept.headName.toLowerCase() === (u.name || '').toLowerCase());
                      return (
                        <div
                          key={u.id}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-sm hover:border-slate-300 transition-all"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <img
                              src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={u.name}
                              className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-600"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{u.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{u.position || 'Staff'}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {u.employeeNumber && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    {u.employeeNumber}
                                  </span>
                                )}
                                {isHead && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                    Dept Head
                                  </span>
                                )}
                                {u.role === 'supervisor' && !isHead && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                    Supervisor
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveEmployeeFromDepartment(u.id, selectedDept)}
                            disabled={isSubmittingStaff}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 active:scale-95"
                            title={`Remove ${u.name} from ${selectedDept.name} department`}
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 shrink-0">
              <span className="text-xs text-slate-500 font-semibold">
                Total: <strong className="text-slate-700 dark:text-slate-300">{currentDeptStaff.length}</strong> personnel assigned
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedDept(null);
                  setStaffSearchQuery('');
                  setSelectedEmployeeToAdd('');
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── ADD / EDIT DEPARTMENT MODAL ────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  DEPARTMENT NAME *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="e.g. Accounting"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  DEPARTMENT CODE *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 uppercase focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="e.g. ACC"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  ASSIGNED DEPARTMENT HEAD
                </label>
                <select
                  value={formData.headId}
                  onChange={(e) => {
                    const u = localUsers.find(usr => usr.id === e.target.value);
                    setFormData({ ...formData, headId: e.target.value, headName: u ? u.name : formData.headName });
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="">Select Department Head...</option>
                  {localUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  DEFAULT KPI EVALUATION TEMPLATE
                </label>
                <select
                  value={formData.defaultTemplateId}
                  onChange={(e) => setFormData({ ...formData, defaultTemplateId: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="">Select KPI Template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.departmentName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Staff Roster shortcut when editing existing department */}
              {editingDept && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      DEPARTMENT STAFF
                    </label>
                    <p className="text-xs text-slate-500">
                      {getDepartmentEmployees(editingDept, localUsers).length} staff members currently assigned
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const d = editingDept;
                      setShowModal(false);
                      setSelectedDept(d);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#E96B1A] border border-orange-200 dark:border-orange-800 text-xs font-bold hover:bg-orange-100 flex items-center space-x-1.5 transition-all shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Manage Staff ({getDepartmentEmployees(editingDept, localUsers).length})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-3 rounded-2xl bg-[#8B3DFF] hover:bg-[#7b2cff] text-white text-xs font-bold shadow-lg shadow-purple-500/25 flex items-center space-x-2 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Department Info</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

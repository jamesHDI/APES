import React, { useState } from 'react';
import { Department, User, EvaluationTemplate } from '../../types';
import { Building2, Plus, Edit3, Trash2, Users, FileSpreadsheet, CheckCircle2, X, Sparkles } from 'lucide-react';

import { isSameDepartment } from '../dashboards/DeptHeadDashboard';

interface DepartmentManagementProps {
  departments: Department[];
  users: User[];
  templates: EvaluationTemplate[];
  onSaveDepartments: (updatedDepartments: Department[]) => void;
}

export const DepartmentManagement: React.FC<DepartmentManagementProps> = ({
  departments,
  users,
  templates,
  onSaveDepartments,
}) => {
  const [deptList, setDeptList] = useState<Department[]>(departments);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State
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

  const getDepartmentEmployees = (dept: Department): User[] => {
    if (!dept) return [];
    const deptEmployees = users.filter(u => {
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
    return getDepartmentEmployees(dept).length;
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
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

    const headUser = users.find(u => u.id === formData.headId);
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Department Management</h2>
          <p className="text-xs text-slate-500">Configure departments, assign Department Heads, and link evaluation templates.</p>
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
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2">
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
                <p><strong>Department Head:</strong> {d.headName}</p>
                <p><strong>Assigned Staff:</strong> {deptStaffCount} Employees</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedDept(d)}
                  className="text-xs font-bold text-[#E96B1A] hover:underline"
                >
                  View Roster ({deptStaffCount})
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

      {/* Staff Roster Drawer */}
      {selectedDept && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Assigned Personnel in {selectedDept.name} Department ({getEmployeeCount(selectedDept)})
              </h3>
              {selectedDept.companyName && (
                <p className="text-xs text-slate-500 font-semibold">{selectedDept.companyName}</p>
              )}
            </div>
            <button onClick={() => setSelectedDept(null)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {getDepartmentEmployees(selectedDept).map((u) => (
              <div key={u.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                <img src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-white">{u.name}</p>
                  <p className="text-[10px] text-slate-500">{u.position}</p>
                  {u.companyName && (
                    <span className="text-[9px] font-semibold text-slate-400">{u.companyName}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Department Modal */}
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
                    const u = users.find(usr => usr.id === e.target.value);
                    setFormData({ ...formData, headId: e.target.value, headName: u ? u.name : formData.headName });
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="">Select Department Head...</option>
                  {users.map((u) => (
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

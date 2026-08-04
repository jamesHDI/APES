import React, { useState } from 'react';
import { Department, User, EvaluationTemplate } from '../../types';
import { Building2, Plus, Edit3, Trash2, Users, FileSpreadsheet, CheckCircle2, X, Sparkles } from 'lucide-react';

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
            defaultTemplateId: formData.defaultTemplateId
          };
        }
        return d;
      });
      setDeptList(updated);
      onSaveDepartments(updated);
      showToast(`Updated department settings for ${formData.name}`);
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
      showToast(`New department ${formData.name} created!`);
    }

    setShowModal(false);
  };

  const handleToggleActive = (deptId: string) => {
    const updated = deptList.map((d) => {
      if (d.id === deptId) {
        const nextState = !d.isActive;
        showToast(`Department ${d.name} is now ${nextState ? 'Active' : 'Archived'}`);
        return { ...d, isActive: nextState };
      }
      return d;
    });
    setDeptList(updated);
    onSaveDepartments(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500 flex items-center space-x-3 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Department & Unit Management</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure company departments, assign Department Heads, and review staff rosters.
            </p>
          </div>

          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm shrink-0">
            <Plus className="w-4 h-4" />
            Add New Department
          </button>
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deptList.map((d) => {
          const deptStaff = users.filter(u => u.departmentName === d.name);
          return (
            <div key={d.id} className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-slate-900 dark:text-white">{d.name}</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-[#FFF4EA] text-[#E96B1A] dark:bg-brand-950 dark:text-brand-300 border border-[#F28C28]/20">
                  {d.code}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p><strong>Department Head:</strong> {d.headName}</p>
                <p><strong>Assigned Staff:</strong> {deptStaff.length} Employees</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedDept(d)}
                  className="text-xs font-bold text-[#E96B1A] hover:underline"
                >
                  View Roster ({deptStaff.length})
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
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Assigned Personnel in {selectedDept.name} Department ({users.filter(u => u.departmentName === selectedDept.name).length})
            </h3>
            <button onClick={() => setSelectedDept(null)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {users.filter(u => u.departmentName === selectedDept.name).map((u) => (
              <div key={u.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                <img src={u.avatarUrl} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-white">{u.name}</p>
                  <p className="text-[10px] text-slate-500">{u.position}</p>
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

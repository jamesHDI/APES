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
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-purple-300" />
            <h2 className="text-xl font-black tracking-tight">Department & Unit Management</h2>
          </div>
          <p className="text-xs text-purple-200 mt-1">
            Configure company departments, assign Department Heads, default KPI evaluation templates, and review staff rosters.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Department</span>
        </button>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deptList.map((d) => {
          const deptStaff = users.filter(u => u.departmentName === d.name);
          return (
            <div key={d.id} className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-slate-900 dark:text-white">{d.name}</span>
                <span className="px-2.5 py-0.5 rounded font-black text-xs bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  {d.code}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <p><strong>Department Head:</strong> {d.headName}</p>
                <p><strong>Assigned Staff:</strong> {deptStaff.length} Employees</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <button
                  onClick={() => setSelectedDept(d)}
                  className="text-xs font-bold text-brand-600 hover:underline flex items-center space-x-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>View Roster ({deptStaff.length})</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEdit(d)}
                    className="p-1.5 text-slate-500 hover:text-purple-600 rounded"
                    title="Edit Department"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleToggleActive(d.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border text-xs"
                placeholder="e.g. Creatives"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border text-xs uppercase"
                placeholder="e.g. CRT"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assigned Department Head</label>
              <select
                value={formData.headId}
                onChange={(e) => {
                  const u = users.find(usr => usr.id === e.target.value);
                  setFormData({ ...formData, headId: e.target.value, headName: u ? u.name : formData.headName });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium"
              >
                <option value="">Select Department Head...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.position})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Default KPI Evaluation Template</label>
              <select
                value={formData.defaultTemplateId}
                onChange={(e) => setFormData({ ...formData, defaultTemplateId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium"
              >
                <option value="">Select KPI Template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.title} ({t.departmentName})</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg flex items-center space-x-1.5"
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

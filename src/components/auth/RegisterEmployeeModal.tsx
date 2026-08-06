import React, { useState } from 'react';
import { User, Department, Role, EmploymentStatus } from '../../types';
import { X, UserPlus, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface RegisterEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterUser: (newUser: User) => void;
  departments: Department[];
  users: User[];
}

export const RegisterEmployeeModal: React.FC<RegisterEmployeeModalProps> = ({
  isOpen,
  onClose,
  onRegisterUser,
  departments,
  users,
}) => {
  const [formData, setFormData] = useState({
    employeeNumber: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    email: '',
    contactNumber: '',
    departmentId: departments[0]?.id || 'dept_sales',
    position: '',
    role: 'employee' as Role,
    employmentStatus: 'Regular' as EmploymentStatus,
    dateHired: new Date().toISOString().substring(0, 10),
    immediateSuperiorId: '',
    departmentHeadId: '',
    username: '',
    password: '',
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Strict Department and Position Pre-Validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setValidationError('Please complete mandatory personal fields: First Name, Last Name, and Email.');
      return;
    }

    if (!formData.departmentId) {
      setValidationError('DEPARTMENT ASSIGNMENT REQUIRED: Account cannot be created or activated without a valid Department.');
      return;
    }

    if (!formData.position || formData.position.trim().length === 0) {
      setValidationError('POSITION ASSIGNMENT REQUIRED: Account cannot be created or activated without a designated Position.');
      return;
    }

    const dept = departments.find(d => d.id === formData.departmentId);
    const fullName = `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName} ${formData.suffix || ''}`.trim();

    const isUser = users.find(u => u.id === formData.immediateSuperiorId);
    const deptHeadUser = users.find(u => u.id === formData.departmentHeadId);

    const newUser: User = {
      id: `usr_${Date.now()}`,
      employeeNumber: formData.employeeNumber,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      name: fullName,
      email: formData.email,
      contactNumber: formData.contactNumber,
      departmentId: formData.departmentId,
      departmentName: dept?.name || 'Sales',
      position: formData.position,
      role: formData.role,
      employmentStatus: formData.employmentStatus,
      dateHired: formData.dateHired,
      immediateSuperiorId: formData.immediateSuperiorId || undefined,
      immediateSuperiorName: isUser?.name,
      departmentHeadId: formData.departmentHeadId || undefined,
      departmentHeadName: deptHeadUser?.name,
      username: formData.username || formData.email.split('@')[0],
      isActive: true,
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
    };

    onRegisterUser(newUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Register New Employee Account
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {validationError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Section 1: Personal Info */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider">
              1. Personal Information
            </h4>
            
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Suffix</label>
                <input
                  type="text"
                  placeholder="Jr, III"
                  value={formData.suffix}
                  onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Company Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Employment & Workflow Hierarchy */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider">
              2. Employment Info (Workflow & PBAC Permissions Binding)
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                <label className="block text-[10px] font-bold text-purple-900 uppercase mb-1">
                  Department (Required) *
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border bg-white font-bold"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                <label className="block text-[10px] font-bold text-purple-900 uppercase mb-1">
                  Position Title (Required) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Officer"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border bg-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Immediate Supervisor (IS)</label>
                <select
                  value={formData.immediateSuperiorId}
                  onChange={(e) => setFormData({ ...formData, immediateSuperiorId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border"
                >
                  <option value="">Select Supervisor...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.position})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">System Role & PBAC Level</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3 py-1.5 rounded-lg border font-bold"
                >
                  <option value="employee">Employee (Appraisee)</option>
                  <option value="supervisor">Immediate Supervisor (IS)</option>
                  <option value="dept_head">Department Head</option>
                  <option value="president">President</option>
                  <option value="pod">POD Reviewer</option>
                  <option value="hr_admin">HR Administrator</option>
                  <option value="system_admin">System Administrator</option>
                </select>
              </div>
            </div>

          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-slate-500">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-brand-600 text-white font-bold shadow-md">
              Complete Employee Account Registration
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

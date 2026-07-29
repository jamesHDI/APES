import React, { useState } from 'react';
import { Department, User } from '../../types';
import { registerSelfUser } from '../../services/authService';
import { X, UserPlus, ShieldAlert, Sparkles, CheckCircle2, Lock } from 'lucide-react';

interface SelfRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  onRegisterSuccess: (newUser: User) => void;
}

export const SelfRegisterModal: React.FC<SelfRegisterModalProps> = ({
  isOpen,
  onClose,
  departments,
  onRegisterSuccess,
}) => {
  const [formData, setFormData] = useState({
    employeeNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    departmentId: departments[0]?.id || 'dept_sales',
    position: '',
    password: '',
    confirmPassword: '',
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setErrorMsg('Please enter First Name, Last Name, and Email.');
      return;
    }

    if (!formData.departmentId) {
      setErrorMsg('Department selection is required.');
      return;
    }

    if (!formData.position || formData.position.trim().length === 0) {
      setErrorMsg('Position title is required.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const dept = departments.find(d => d.id === formData.departmentId);

    const result = await registerSelfUser({
      employeeNumber: formData.employeeNumber || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      email: formData.email,
      contactNumber: formData.contactNumber,
      departmentId: formData.departmentId,
      departmentName: dept?.name || 'Sales',
      position: formData.position,
      password: formData.password,
    });

    if (result.error || !result.user) {
      setErrorMsg(result.error || 'Registration failed.');
      return;
    }

    setSuccessMsg('Account registered successfully! Your profile is pending HR approval and activation before you can log in.');
    onRegisterSuccess(result.user);

    setTimeout(() => {
      onClose();
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-hdi-red" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              New Employee Account Registration
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Registration Submitted!</p>
              <p className="mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Personal Info */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-[10px] uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                1. Personal Information
              </h4>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Company Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="email@hdiadventures.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Employee ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="EMP-1005"
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Requested Department & Position */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-[10px] uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                2. Employment Information Request
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800">
                  <label className="block text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase mb-1">
                    Department (Required) *
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="form-input font-bold"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800">
                  <label className="block text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase mb-1">
                    Position Title (Required) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Specialist"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="form-input font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-[10px] uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                3. Security Password
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-slate-500">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-hdi-red text-white font-extrabold shadow-md">
                Register & Submit for HR Approval
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

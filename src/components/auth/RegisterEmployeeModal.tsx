import React, { useState } from 'react';
import { User, Department, Role, EmploymentStatus, ApprovalStatus } from '../../types';
import { X, UserPlus, ShieldAlert, Building2, Lock, User2 } from 'lucide-react';

interface RegisterEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterUser: (newUser: User) => void;
  departments: Department[];
  users: User[];
}

const INPUT_CLS =
  'w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition';
const LABEL_CLS = 'block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide';
const SELECT_CLS = `${INPUT_CLS} cursor-pointer`;
const SECTION_TITLE_CLS =
  'flex items-center gap-1.5 font-extrabold text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2';

export const RegisterEmployeeModal: React.FC<RegisterEmployeeModalProps> = ({
  isOpen,
  onClose,
  onRegisterUser,
  departments,
  users,
}) => {
  const [formData, setFormData] = useState({
    // ── Personal ──────────────────────────────────────────────────────────
    employeeNumber: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    email: '',
    personalEmail: '',
    contactNumber: '',
    // ── Employment & Hierarchy ────────────────────────────────────────────
    departmentId: departments[0]?.id || '',
    position: '',
    role: 'employee' as Role,
    employmentStatus: 'Regular' as EmploymentStatus,
    dateHired: new Date().toISOString().substring(0, 10),
    immediateSuperiorId: '',
    departmentHeadId: '',
    isDepartmentHead: false,
    // ── Account & Credentials ─────────────────────────────────────────────
    username: '',
    password: '',
    requiresPasswordChange: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved' as ApprovalStatus,
    hrRejectionRemarks: '',
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const set = (field: string, value: unknown) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setValidationError('Please fill in all required personal fields: First Name, Last Name, and Company Email.');
      return;
    }

    if (!formData.departmentId) {
      setValidationError('DEPARTMENT REQUIRED: An employee account must be assigned to a department.');
      return;
    }

    if (!formData.position.trim()) {
      setValidationError('POSITION REQUIRED: An employee account must have a designated position title.');
      return;
    }

    const dept = departments.find((d) => d.id === formData.departmentId);
    const fullName = [
      formData.firstName.trim(),
      formData.middleName.trim(),
      formData.lastName.trim(),
      formData.suffix.trim(),
    ]
      .filter(Boolean)
      .join(' ');

    const isUser = users.find((u) => u.id === formData.immediateSuperiorId);
    const deptHeadUser = users.find((u) => u.id === formData.departmentHeadId);

    const newUser: User = {
      // ── Identity ──────────────────────────────────────────────────────
      id: `usr_${Date.now()}`,
      employeeNumber: formData.employeeNumber.trim(),
      firstName: formData.firstName.trim(),
      middleName: formData.middleName.trim() || undefined,
      lastName: formData.lastName.trim(),
      suffix: formData.suffix.trim() || undefined,
      name: fullName,
      // ── Contact ───────────────────────────────────────────────────────
      email: formData.email.trim().toLowerCase(),
      personalEmail: formData.personalEmail.trim() || undefined,
      contactNumber: formData.contactNumber.trim() || undefined,
      // ── Org ───────────────────────────────────────────────────────────
      departmentId: formData.departmentId,
      departmentName: dept?.name || '',
      position: formData.position.trim(),
      role: formData.role,
      employmentStatus: formData.employmentStatus,
      dateHired: formData.dateHired,
      isDepartmentHead: formData.isDepartmentHead,
      immediateSuperiorId: formData.immediateSuperiorId || undefined,
      immediateSuperiorName: isUser?.name || undefined,
      departmentHeadId: formData.departmentHeadId || undefined,
      departmentHeadName: deptHeadUser?.name || undefined,
      // ── Account ───────────────────────────────────────────────────────
      username: formData.username.trim() || formData.email.split('@')[0],
      password: formData.password || undefined,
      requiresPasswordChange: formData.requiresPasswordChange,
      isActive: formData.isActive,
      isApproved: formData.isApproved,
      approvalStatus: formData.approvalStatus,
      hrRejectionRemarks: formData.hrRejectionRemarks.trim() || undefined,
      avatarUrl: undefined,
    };

    onRegisterUser(newUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Register New Employee Account
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-5 text-xs">

          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* ══ Section 1: Personal Information ══════════════════════════════ */}
          <div className="space-y-3">
            <p className={SECTION_TITLE_CLS}>
              <User2 className="w-3.5 h-3.5" />
              1. Personal Information
            </p>

            {/* Name row */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className={LABEL_CLS}>First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Juan"
                  value={formData.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Middle Name</label>
                <input
                  type="text"
                  placeholder="Santos"
                  value={formData.middleName}
                  onChange={(e) => set('middleName', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="dela Cruz"
                  value={formData.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Suffix</label>
                <input
                  type="text"
                  placeholder="Jr, III…"
                  value={formData.suffix}
                  onChange={(e) => set('suffix', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* Contact row */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={LABEL_CLS}>Company Email *</label>
                <input
                  type="email"
                  required
                  placeholder="juan@company.com"
                  value={formData.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Personal Email</label>
                <input
                  type="email"
                  placeholder="juan@gmail.com"
                  value={formData.personalEmail}
                  onChange={(e) => set('personalEmail', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Contact Number</label>
                <input
                  type="text"
                  placeholder="09XX-XXX-XXXX"
                  value={formData.contactNumber}
                  onChange={(e) => set('contactNumber', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
            </div>
          </div>

          {/* ══ Section 2: Employment & Hierarchy ════════════════════════════ */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className={SECTION_TITLE_CLS}>
              <Building2 className="w-3.5 h-3.5" />
              2. Employment & Org Hierarchy
            </p>

            {/* Emp# / Employment Status / Date Hired */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={LABEL_CLS}>Employee Number</label>
                <input
                  type="text"
                  value={formData.employeeNumber}
                  onChange={(e) => set('employeeNumber', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Employment Status</label>
                <select
                  value={formData.employmentStatus}
                  onChange={(e) => set('employmentStatus', e.target.value as EmploymentStatus)}
                  className={SELECT_CLS}
                >
                  <option value="Regular">Regular</option>
                  <option value="Probationary">Probationary</option>
                  <option value="Contractual">Contractual</option>
                  <option value="Project-based">Project-based</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Date Hired</label>
                <input
                  type="date"
                  value={formData.dateHired}
                  onChange={(e) => set('dateHired', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* Dept / Position */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800">
                <label className="block text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase mb-1">
                  Department *
                </label>
                <select
                  required
                  value={formData.departmentId}
                  onChange={(e) => set('departmentId', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                >
                  <option value="">Select Department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800">
                <label className="block text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase mb-1">
                  Position Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Officer"
                  value={formData.position}
                  onChange={(e) => set('position', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                />
              </div>
            </div>

            {/* Role / IS / Dept Head */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={LABEL_CLS}>System Role & PBAC Level</label>
                <select
                  value={formData.role}
                  onChange={(e) => set('role', e.target.value as Role)}
                  className={`${SELECT_CLS} font-bold`}
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
              <div>
                <label className={LABEL_CLS}>Immediate Superior (IS)</label>
                <select
                  value={formData.immediateSuperiorId}
                  onChange={(e) => set('immediateSuperiorId', e.target.value)}
                  className={SELECT_CLS}
                >
                  <option value="">— None —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.position})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Department Head</label>
                <select
                  value={formData.departmentHeadId}
                  onChange={(e) => set('departmentHeadId', e.target.value)}
                  className={SELECT_CLS}
                >
                  <option value="">— None —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.position})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Is Department Head flag */}
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={formData.isDepartmentHead}
                onChange={(e) => set('isDepartmentHead', e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-purple-600"
              />
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Mark as Department Head
              </span>
            </label>
          </div>

          {/* ══ Section 3: Account & Credentials ═════════════════════════════ */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className={SECTION_TITLE_CLS}>
              <Lock className="w-3.5 h-3.5" />
              3. Account & Credentials
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={LABEL_CLS}>Username</label>
                <input
                  type="text"
                  placeholder="Auto-generated from email if blank"
                  value={formData.username}
                  onChange={(e) => set('username', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Default Password</label>
                <input
                  type="text"
                  placeholder="Leave blank for system default"
                  value={formData.password}
                  onChange={(e) => set('password', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={LABEL_CLS}>Approval Status</label>
                <select
                  value={formData.approvalStatus}
                  onChange={(e) => set('approvalStatus', e.target.value as ApprovalStatus)}
                  className={SELECT_CLS}
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending (Awaiting HR Review)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>HR Rejection Remarks</label>
                <input
                  type="text"
                  placeholder="Fill in only if rejected"
                  value={formData.hrRejectionRemarks}
                  onChange={(e) => set('hrRejectionRemarks', e.target.value)}
                  className={INPUT_CLS}
                  disabled={formData.approvalStatus !== 'rejected'}
                />
              </div>
            </div>

            {/* Boolean flags */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => set('isActive', e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-emerald-600"
                />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isApproved}
                  onChange={(e) => set('isApproved', e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-blue-600"
                />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Mark as Approved</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requiresPasswordChange}
                  onChange={(e) => set('requiresPasswordChange', e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-amber-600"
                />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Force Password Change on First Login
                </span>
              </label>
            </div>
          </div>

        </form>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md transition text-xs"
          >
            Register Employee Account
          </button>
        </div>

      </div>
    </div>
  );
};

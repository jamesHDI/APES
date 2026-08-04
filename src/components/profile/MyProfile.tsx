import React, { useState, useRef } from 'react';
import { User } from '../../types';
import { changeUserPassword } from '../../services/authService';
import {
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  Briefcase,
  ShieldCheck,
  Calendar,
  CreditCard,
  Lock,
  Camera,
  Save,
  Eye,
  EyeOff,
  Key,
  AlertCircle,
  CheckCircle2,
  Info,
  BadgeCheck,
  UserCheck,
} from 'lucide-react';

interface MyProfileProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
}

const ROLE_LABELS: Record<string, string> = {
  employee: 'Employee',
  supervisor: 'Supervisor',
  dept_head: 'Department Head',
  president: 'President / CEO',
  pod: 'POD Governance',
  hr_admin: 'HR Administrator',
  system_admin: 'System Administrator',
};

export const MyProfile: React.FC<MyProfileProps> = ({ currentUser, onUpdateUser }) => {
  // Editable fields
  const [firstName, setFirstName] = useState(currentUser.firstName || '');
  const [lastName, setLastName] = useState(currentUser.lastName || '');
  const [contactNumber, setContactNumber] = useState(currentUser.contactNumber || '');
  const [personalEmail, setPersonalEmail] = useState(currentUser.personalEmail || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatarUrl || '');

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Feedback states
  const [profileToast, setProfileToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [passwordToast, setPasswordToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showProfileFeedback = (type: 'success' | 'error', msg: string) => {
    setProfileToast({ type, msg });
    setTimeout(() => setProfileToast(null), 3500);
  };

  const showPasswordFeedback = (type: 'success' | 'error', msg: string) => {
    setPasswordToast({ type, msg });
    setTimeout(() => setPasswordToast(null), 3500);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showProfileFeedback('error', 'Image must be smaller than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    if (!firstName.trim() || !lastName.trim()) {
      showProfileFeedback('error', 'First name and last name are required.');
      return;
    }
    setIsSaving(true);

    const updatedUser: User = {
      ...currentUser,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      contactNumber: contactNumber.trim(),
      personalEmail: personalEmail.trim(),
      avatarUrl: avatarPreview || currentUser.avatarUrl,
    };

    setTimeout(() => {
      onUpdateUser(updatedUser);
      setIsSaving(false);
      showProfileFeedback('success', 'Profile information updated successfully!');
    }, 400);
  };

  const handleChangePassword = async () => {
    if (currentUser.password && currentPassword !== currentUser.password) {
      showPasswordFeedback('error', 'Current password is incorrect.');
      return;
    }
    if (newPassword.length < 6) {
      showPasswordFeedback('error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showPasswordFeedback('error', 'New password and confirmation do not match.');
      return;
    }

    const ok = await changeUserPassword(currentUser.id, newPassword);
    if (ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      const updatedUser: User = { ...currentUser, password: newPassword, requiresPasswordChange: false };
      onUpdateUser(updatedUser);
      showPasswordFeedback('success', 'Password updated successfully!');
    } else {
      showPasswordFeedback('error', 'Failed to update password. Please try again.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3.5 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="w-11 h-11 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <UserIcon className="w-5.5 h-5.5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Account Profile</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">View employment credentials, update personal details, and manage password security.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: PROFILE CARD (col-span-4) ───────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            {/* Avatar Container */}
            <div className="relative group mb-3">
              <div className="w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-slate-100 dark:ring-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                    <span className="text-white font-extrabold text-3xl">
                      {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-xl bg-slate-900 hover:bg-brand-600 text-white flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95"
                title="Change profile photo"
              >
                <Camera className="w-4.5 h-4.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name & Role Badge */}
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{currentUser.name}</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{currentUser.position || 'Employee'}</p>
            
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                <BadgeCheck className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                <UserCheck className="w-3 h-3" />
                Active Account
              </span>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-slate-100 dark:border-slate-800 my-5" />

            {/* Metadata Grid */}
            <div className="w-full space-y-3 text-left">
              <div className="flex items-center justify-between py-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Employee ID
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{currentUser.employeeNumber || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Department
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px] text-right">{currentUser.departmentName || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Date Hired
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentUser.dateHired ? new Date(currentUser.dateHired).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                </span>
              </div>
            </div>

            <div className="w-full mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-left flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Info className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
              <span>Click camera button to upload a custom profile avatar (JPG, PNG, max 2MB).</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: INFO & SECURITY (col-span-8) ────────────────────── */}
        <div className="lg:col-span-8 space-y-6">

          {/* 1. HR-Managed Employment Information */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Lock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">HR Employment Records (Read-Only)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[
                { label: 'Company Email', value: currentUser.email, icon: Mail },
                { label: 'Employee ID', value: currentUser.employeeNumber || 'N/A', icon: CreditCard },
                { label: 'Department', value: currentUser.departmentName, icon: Building2 },
                { label: 'Position', value: currentUser.position, icon: Briefcase },
                { label: 'Employment Status', value: currentUser.employmentStatus || 'Regular', icon: ShieldCheck },
                { label: 'System Role', value: ROLE_LABELS[currentUser.role] || currentUser.role, icon: ShieldCheck },
                { label: 'Immediate Superior', value: currentUser.immediateSuperiorName || 'N/A', icon: UserIcon },
                { label: 'Department Head', value: currentUser.departmentHeadName || 'N/A', icon: UserIcon },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
                  <div className="w-8.5 h-8.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Personal Information (Editable Form) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <UserIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Personal Information</h3>
            </div>

            {profileToast && (
              <div className={`flex items-center gap-2.5 p-3.5 rounded-xl text-xs font-semibold border ${
                profileToast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              }`}>
                {profileToast.type === 'success' ? <CheckCircle2 className="w-4.5 h-4.5 shrink-0" /> : <AlertCircle className="w-4.5 h-4.5 shrink-0" />}
                {profileToast.msg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">First Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  placeholder="First name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Last Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  placeholder="Last name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Contact Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    className="w-full h-10 pl-10 pr-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Personal Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={personalEmail}
                    onChange={e => setPersonalEmail(e.target.value)}
                    className="w-full h-10 pl-10 pr-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                    placeholder="personal@email.com"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-wider bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white shadow-md shadow-brand-500/10 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* 3. Security & Change Password */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Key className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Security & Password</h3>
            </div>

            {passwordToast && (
              <div className={`flex items-center gap-2.5 p-3.5 rounded-xl text-xs font-semibold border ${
                passwordToast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              }`}>
                {passwordToast.type === 'success' ? <CheckCircle2 className="w-4.5 h-4.5 shrink-0" /> : <AlertCircle className="w-4.5 h-4.5 shrink-0" />}
                {passwordToast.msg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Current Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="w-full h-10 pl-10 pr-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">New Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full h-10 pl-10 pr-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full h-10 pl-10 pr-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={!newPassword || !confirmPassword}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white transition-all cursor-pointer disabled:opacity-40"
              >
                <ShieldCheck className="w-4 h-4" />
                Update Password
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

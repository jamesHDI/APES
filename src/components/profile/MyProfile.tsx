import React, { useState, useRef } from 'react';
import { User } from '../../types';
import { changeUserPassword } from '../../services/authService';
import {
  Camera,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
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
  const [showConfirmPw, setShowConfirmPw] = useState(false);

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
    <div className="max-w-6xl mx-auto space-y-6 pb-12 p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-[#FFF9F3] via-slate-50 to-slate-100/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 transition-colors">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 rounded-full bg-brand-500 shrink-0" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Profile</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 pl-4">
          Manage your personal information, view official HR records, and update security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
            {/* Top Orange Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-amber-500" />

            <div className="relative mb-4 mt-1">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-brand-600 dark:text-brand-400 font-bold text-2xl">
                    {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7.5 h-7.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                title="Change photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{currentUser.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentUser.position || 'Staff'}</p>

            <div className="mt-3">
              <span className="px-3 py-1 rounded-md text-xs font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </span>
            </div>

            <div className="w-full border-t border-slate-100 dark:border-slate-800 my-5" />

            <div className="w-full space-y-2.5 text-left text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Employee ID</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{currentUser.employeeNumber || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Department</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{currentUser.departmentName || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Date Hired</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {currentUser.dateHired ? new Date(currentUser.dateHired).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: HR Records, Personal Info, Security */}
        <div className="lg:col-span-8 space-y-8">
          {/* HR Information (Read-Only Grid) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4 rounded-full bg-brand-500 shrink-0" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Employment Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 pt-2">
              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Company Email</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{currentUser.email}</p>
              </div>

              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Employee ID</p>
                <p className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100 mt-1">{currentUser.employeeNumber || '—'}</p>
              </div>

              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Department</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{currentUser.departmentName || '—'}</p>
              </div>

              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Position</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{currentUser.position || '—'}</p>
              </div>

              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Employment Status</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{currentUser.employmentStatus || 'Regular'}</p>
              </div>

              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">System Role</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{ROLE_LABELS[currentUser.role] || currentUser.role}</p>
              </div>

              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Immediate Superior</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{currentUser.immediateSuperiorName || '—'}</p>
              </div>

              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Department Head</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{currentUser.departmentHeadName || '—'}</p>
              </div>
            </div>
          </div>

          {/* Personal Information Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4 rounded-full bg-brand-500 shrink-0" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Personal Information</h3>
            </div>

            {profileToast && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium ${
                profileToast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}>
                {profileToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {profileToast.msg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={e => setContactNumber(e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Personal Email
                </label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={e => setPersonalEmail(e.target.value)}
                  placeholder="personal@email.com"
                  className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="h-9 px-4 rounded-lg font-medium text-sm bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white shadow-sm shadow-brand-500/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4 rounded-full bg-brand-500 shrink-0" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Change Password</h3>
            </div>

            {passwordToast && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium ${
                passwordToast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}>
                {passwordToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {passwordToast.msg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="w-full h-9 pl-3 pr-9 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full h-9 pl-3 pr-9 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full h-9 pl-3 pr-9 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={!newPassword || !confirmPassword}
                className="h-9 px-4 rounded-lg font-medium text-sm bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white shadow-sm shadow-brand-500/10 transition-colors cursor-pointer disabled:opacity-40"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


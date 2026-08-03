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
      showProfileFeedback('success', 'Profile updated successfully!');
    }, 500);
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
      showPasswordFeedback('success', 'Password changed successfully!');
    } else {
      showPasswordFeedback('error', 'Failed to update password. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">My Profile</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage your personal information and account settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Avatar Card */}
        <div className="lg:col-span-1">
          <div className="card flex flex-col items-center text-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-brand-100 dark:ring-brand-900 shadow-lg">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center">
                    <span className="text-white font-black text-2xl">
                      {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow-md transition-colors"
                title="Change photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div>
              <p className="font-black text-slate-900 dark:text-white text-lg leading-tight">{currentUser.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{currentUser.position}</p>
              <span className="inline-block mt-2 text-[11px] px-2.5 py-1 rounded-full font-semibold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </span>
            </div>

            <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2.5 text-left">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono font-semibold">{currentUser.employeeNumber || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{currentUser.departmentName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Hired: {currentUser.dateHired ? new Date(currentUser.dateHired).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-start gap-1.5 text-left bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5">
              <Info className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
              Click the camera icon to upload a new profile photo (max 2MB).
            </p>
          </div>
        </div>

        {/* Right: Info & Password */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal Information Card */}
          <div className="card space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
              <UserIcon className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">Personal Information</h3>
            </div>

            {profileToast && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
                profileToast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              }`}>
                {profileToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {profileToast.msg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label form-label-required">First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="form-input" placeholder="First name" />
              </div>
              <div>
                <label className="form-label form-label-required">Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="form-input" placeholder="Last name" />
              </div>
              <div>
                <label className="form-label">
                  <Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                  Contact Number
                </label>
                <input type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="form-input" placeholder="+63 9XX XXX XXXX" />
              </div>
              <div>
                <label className="form-label">
                  <Mail className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                  Personal Email
                </label>
                <input type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} className="form-input" placeholder="personal@email.com" />
              </div>
            </div>

            {/* Read-Only HR Fields */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5 mb-3">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  HR-Managed Fields (Read Only)
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Company Email', value: currentUser.email, icon: Mail },
                  { label: 'Employee ID', value: currentUser.employeeNumber || 'N/A', icon: CreditCard },
                  { label: 'Department', value: currentUser.departmentName, icon: Building2 },
                  { label: 'Position', value: currentUser.position, icon: Briefcase },
                  { label: 'Employment Status', value: currentUser.employmentStatus || 'N/A', icon: ShieldCheck },
                  { label: 'System Role', value: ROLE_LABELS[currentUser.role] || currentUser.role, icon: ShieldCheck },
                  { label: 'Immediate Superior', value: currentUser.immediateSuperiorName || 'N/A', icon: UserIcon },
                  { label: 'Department Head', value: currentUser.departmentHeadName || 'N/A', icon: UserIcon },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="btn btn-primary btn-sm"
              >
                {isSaving ? (
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Password Card */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
              <Key className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">Change Password</h3>
            </div>

            {passwordToast && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
                passwordToast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              }`}>
                {passwordToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {passwordToast.msg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Current Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="form-input pl-9 pr-10"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label form-label-required">New Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="form-input pl-9 pr-10"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label form-label-required">Confirm Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="form-input pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleChangePassword}
                disabled={!newPassword || !confirmPassword}
                className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Update Password
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { User, EmploymentStatus } from '../../types';
import { changeUserPassword } from '../../services/authService';
import {
  Camera,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Mail,
  Building2,
  Briefcase,
  ShieldCheck,
  Calendar,
  CreditCard,
  User as UserIcon,
  Users,
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
  const [position, setPosition] = useState(currentUser.position || '');
  const [departmentName, setDepartmentName] = useState(currentUser.departmentName || '');
  const [employeeNumber, setEmployeeNumber] = useState(currentUser.employeeNumber || '');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(currentUser.employmentStatus || 'Regular');
  const [immediateSuperiorName, setImmediateSuperiorName] = useState(currentUser.immediateSuperiorName || '');
  const [departmentHeadName, setDepartmentHeadName] = useState(currentUser.departmentHeadName || '');
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

  // Track initial user ID to prevent background polling re-renders from overwriting active form edits
  const activeUserIdRef = useRef(currentUser.id);

  // Sync local form state ONLY when switching to a different user account or initial mount
  React.useEffect(() => {
    if (activeUserIdRef.current !== currentUser.id) {
      console.log(`[Avatar Source] User switched to ${currentUser.id}. Initializing profile form state...`);
      activeUserIdRef.current = currentUser.id;
      setFirstName(currentUser.firstName || currentUser.name?.split(' ')[0] || '');
      setLastName(currentUser.lastName || currentUser.name?.split(' ').slice(1).join(' ') || '');
      setPosition(currentUser.position || '');
      setDepartmentName(currentUser.departmentName || '');
      setEmployeeNumber(currentUser.employeeNumber || '');
      setEmploymentStatus(currentUser.employmentStatus || 'Regular');
      setImmediateSuperiorName(currentUser.immediateSuperiorName || '');
      setDepartmentHeadName(currentUser.departmentHeadName || '');
      setContactNumber(currentUser.contactNumber || '');
      setPersonalEmail(currentUser.personalEmail || '');
      setAvatarPreview(currentUser.avatarUrl || '');
    }
  }, [currentUser.id]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showProfileFeedback('error', 'Image file must be smaller than 5MB.');
      return;
    }

    console.log(`[Avatar Source] Step 1: User selected image "${file.name}" (${file.size} bytes). Processing preview...`);

    let finalAvatarUrl: string | null = null;

    // Try cloud storage bucket upload first
    try {
      const { uploadAvatarToSupabase } = await import('../../services/supabaseService');
      const publicUrl = await uploadAvatarToSupabase(file, currentUser.id);
      if (publicUrl) {
        console.log(`[Avatar Source] Step 2: Cloud storage upload SUCCESS. Public URL: ${publicUrl}`);
        finalAvatarUrl = publicUrl;
      }
    } catch (err) {
      console.warn('[Avatar Source] Storage upload note, falling back to data URL:', err);
    }

    if (!finalAvatarUrl) {
      // Compressed image data URL fallback
      finalAvatarUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const rawDataUrl = ev.target?.result as string;
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 250;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_DIM) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.82));
            } else {
              resolve(rawDataUrl);
            }
          };
          img.onerror = () => resolve(rawDataUrl);
          img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
      });
    }

    console.log(`[Avatar Source] Step 3: Avatar URL ready: ${finalAvatarUrl.substring(0, 40)}... Setting preview and auto-saving to DB...`);
    setAvatarPreview(finalAvatarUrl);

    // Auto-save updated avatar directly to Supabase DB & user state
    const autoSavedUser: User = {
      ...currentUser,
      avatarUrl: finalAvatarUrl
    };
    onUpdateUser(autoSavedUser);
    showProfileFeedback('success', 'Profile picture updated and saved to database successfully!');
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
      position: position.trim(),
      departmentName: departmentName.trim(),
      employeeNumber: employeeNumber.trim(),
      employmentStatus: employmentStatus as EmploymentStatus,
      immediateSuperiorName: immediateSuperiorName.trim(),
      departmentHeadName: departmentHeadName.trim(),
      contactNumber: contactNumber.trim(),
      personalEmail: personalEmail.trim(),
      avatarUrl: avatarPreview || currentUser.avatarUrl,
    };

    onUpdateUser(updatedUser);
    setIsSaving(false);
    showProfileFeedback('success', 'Profile and Employment Information updated successfully!');
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
    <div className="relative overflow-hidden min-h-screen max-w-6xl mx-auto bg-gradient-to-br from-[#FFF8F2] via-[#FFF4EC] via-60% to-[#F8FAFC] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-8 rounded-3xl transition-colors">
      {/* Soft Translucent Top-Right Warm Ambient Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#F28C28]/15 via-amber-200/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      {/* Subtle Dotted Pattern Overlay */}
      <div className="absolute top-8 right-12 w-64 h-64 bg-[radial-gradient(#F28C28_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none hidden sm:block" />

      {/* Page Header */}
      <div className="relative z-10 pb-6 mb-2">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-7 rounded-full bg-gradient-to-b from-[#F28C28] to-[#E96B1A] shrink-0 shadow-xs" />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            My Profile
          </h1>
        </div>
        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 pl-4.5">
          Manage your personal information, update employment details, and manage security credentials.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-[18px] p-6 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden flex flex-col items-center text-center">
            <div className="relative mb-3 mt-1">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 ring-4 ring-white dark:ring-slate-800 shadow-md flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#E96B1A] dark:text-brand-400 font-extrabold text-3xl">
                    {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#F28C28] hover:bg-[#E96B1A] text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
                title="Change photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{firstName} {lastName}</h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">{position || 'Staff'}</p>

            <div className="mt-3">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/60 text-[#E96B1A] dark:text-brand-300 border border-brand-200/70 dark:border-brand-800/70 shadow-sm">
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </span>
            </div>

            <div className="w-full border-t border-slate-100 dark:border-slate-800/80 my-5" />

            <div className="w-full space-y-3 text-left text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#F28C28] shrink-0" />
                  Employee ID
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{employeeNumber || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#F28C28] shrink-0" />
                  Department
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[150px] text-right">{departmentName || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#F28C28] shrink-0" />
                  Date Hired
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {currentUser.dateHired ? new Date(currentUser.dateHired).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: HR Records, Personal Info, Security */}
        <div className="lg:col-span-8 space-y-6">
          {/* HR & Employment Information Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-[18px] p-6 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300 hover:-translate-y-0.5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F28C28]/10 text-[#E96B1A] dark:text-brand-400 flex items-center justify-center shrink-0 shadow-sm">
                  <Briefcase className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Employment Information</h3>
                  <p className="text-xs text-slate-400">Update position, department, and employment details</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="h-9 px-4 rounded-xl font-bold text-xs bg-[#F28C28] hover:bg-[#E96B1A] text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>

            {profileToast && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold ${
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Position / Job Title
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="e.g. Accounting Department Head"
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={e => setDepartmentName(e.target.value)}
                  placeholder="e.g. Accounting"
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Employee ID Number
                </label>
                <input
                  type="text"
                  value={employeeNumber}
                  onChange={e => setEmployeeNumber(e.target.value)}
                  placeholder="e.g. EMP-2025-010"
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Employment Status
                </label>
                <select
                  value={employmentStatus}
                  onChange={e => setEmploymentStatus(e.target.value as EmploymentStatus)}
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                >
                  <option value="Regular">Regular</option>
                  <option value="Probationary">Probationary</option>
                  <option value="Contractual">Contractual</option>
                  <option value="Project-based">Project-based</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Immediate Superior
                </label>
                <input
                  type="text"
                  value={immediateSuperiorName}
                  onChange={e => setImmediateSuperiorName(e.target.value)}
                  placeholder="e.g. President & CEO"
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Department Head
                </label>
                <input
                  type="text"
                  value={departmentHeadName}
                  onChange={e => setDepartmentHeadName(e.target.value)}
                  placeholder="e.g. Self / Department Head"
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Personal Information Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-[18px] p-6 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300 hover:-translate-y-0.5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F28C28]/10 text-[#E96B1A] dark:text-brand-400 flex items-center justify-center shrink-0 shadow-sm">
                <UserIcon className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Personal Information</h3>
            </div>

            {profileToast && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold ${
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={e => setContactNumber(e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Personal Email
                </label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={e => setPersonalEmail(e.target.value)}
                  placeholder="personal@email.com"
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="h-10 px-5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-[#F28C28] to-[#E96B1A] hover:from-[#E96B1A] hover:to-[#D85A09] text-white shadow-md shadow-brand-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-[18px] p-6 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300 hover:-translate-y-0.5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F28C28]/10 text-[#E96B1A] dark:text-brand-400 flex items-center justify-center shrink-0 shadow-sm">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Change Password</h3>
            </div>

            {passwordToast && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold ${
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="w-full h-10 pl-3.5 pr-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full h-10 pl-3.5 pr-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full h-10 pl-3.5 pr-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/12 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
                className="h-10 px-5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-[#F28C28] to-[#E96B1A] hover:from-[#E96B1A] hover:to-[#D85A09] text-white shadow-md shadow-brand-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Lock className="w-4 h-4" />
                <span>Update Password</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { Key, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { changeUserPassword } from '../../services/authService';
import { verifyPassword } from '../../utils/crypto';
import { User } from '../../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  user: User;
  isForced?: boolean; // true = first-login forced change
  onPasswordChanged: (updatedUser: User) => void;
  onClose?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  user,
  isForced = false,
  onPasswordChanged,
  onClose,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate current password if not a forced change from the default
    if (!isForced && user.password) {
      const isCurrentValid = await verifyPassword(currentPassword, user.password);
      if (!isCurrentValid) {
        setError('Current password is incorrect.');
        return;
      }
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (isForced && newPassword.toUpperCase() === 'ADMIN') {
      setError('You must choose a different password than the default.');
      return;
    }

    const ok = await changeUserPassword(user.id, newPassword);
    if (ok) {
      setSuccess(true);
      const updatedUser: User = { ...user, password: newPassword, requiresPasswordChange: false };
      setTimeout(() => {
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onPasswordChanged(updatedUser);
      }, 1800);
    } else {
      setError('Failed to update password. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 ${isForced ? 'bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isForced ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-brand-100 dark:bg-brand-950'}`}>
              <ShieldCheck className={`w-5 h-5 ${isForced ? 'text-amber-600 dark:text-amber-400' : 'text-brand-600 dark:text-brand-400'}`} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {isForced ? 'Change Default Password' : 'Change Password'}
              </h3>
              {isForced && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  For security, you must change the default admin password before continuing.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Password changed successfully!</span>
            </div>
          )}

          {/* Current password — skip for forced first-login */}
          {!isForced && (
            <div>
              <label className="form-label">Current Password</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="form-input pl-9 pr-10"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="form-label form-label-required">New Password</label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="form-input pl-9 pr-10"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="form-label form-label-required">Confirm New Password</label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter new password"
                className="form-input pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {!isForced && onClose && (
              <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isForced ? 'Set New Password & Continue' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

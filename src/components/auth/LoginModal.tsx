import React, { useState } from 'react';
import { User, Department } from '../../types';
import { authenticateUser, requestPasswordReset } from '../../services/authService';
import { SelfRegisterModal } from './SelfRegisterModal';
import { 
  Lock, 
  Mail, 
  Key, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  UserPlus, 
  Eye,
  EyeOff
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (authenticatedUser: User) => void;
  allUsers: User[];
  departments: Department[];
  onRegisterNewUser: (newUser: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  allUsers,
  departments,
  onRegisterNewUser,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showSelfRegister, setShowSelfRegister] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotToast, setForgotToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const result = await authenticateUser({ identifier, password });
    setIsLoading(false);
    if (result.error || !result.user) {
      setErrorMsg(result.error || 'Authentication failed.');
      return;
    }

    onLoginSuccess(result.user);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await requestPasswordReset(forgotEmail);
    setForgotToast(res.message);
    setTimeout(() => {
      setForgotToast(null);
      setShowForgotModal(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        
        {/* Left Branding Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-8 text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-48 h-48 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-6 flex flex-col items-center">
            {/* Logo */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-6 py-5 shadow-2xl inline-block border border-white/20">
              <img
                src="/hdi-logo-full.png"
                onError={(e) => {
                  (e.target as HTMLElement).setAttribute('src', '/hdi-logo.png');
                }}
                alt="HDI Adventures"
                className="h-16 max-w-full w-auto object-contain mx-auto"
              />
            </div>

            {/* Welcome text */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-widest font-extrabold text-orange-400 bg-orange-950/60 px-3 py-1 rounded-full border border-orange-500/30">
                HDI ADVENTURES
              </span>
              <h2 className="text-xl font-black leading-snug tracking-tight text-center">
                Welcome to HDI Adventures<br />
                <span className="text-orange-400">Performance Evaluation System</span>
              </h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Empowering employees through continuous feedback and core values alignment.
              </p>
            </div>

            {/* Core Motto Chips */}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {['Live', 'Learn', 'Love'].map((motto) => (
                <span key={motto} className="text-xs font-bold px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-orange-300 shadow-sm">
                  {motto}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-8 space-y-6 flex flex-col justify-between bg-white dark:bg-slate-900">
          
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Employee Sign In
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Use your Employee ID or Company Email
                </p>
              </div>
              <button
                onClick={() => setShowSelfRegister(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold text-xs hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors flex items-center gap-1.5 shadow-sm border border-purple-200 dark:border-purple-800"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register Account
              </button>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="form-label">Employee ID or Company Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="EMP-1001 or your@email.com"
                    className="form-input pl-9"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label mb-0">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="form-input pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-black shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-1">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">HDI FAMILY OF COMPANIES</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Performance Evaluation System v3.0 &nbsp;·&nbsp; Strictly Confidential
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Reset Password</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Enter your company email to receive a password reset link.</p>

            {forgotToast && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800">
                {forgotToast}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="email@hdiadventures.com"
                className="form-input"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForgotModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SelfRegisterModal
        isOpen={showSelfRegister}
        onClose={() => setShowSelfRegister(false)}
        departments={departments}
        onRegisterSuccess={onRegisterNewUser}
      />
    </div>
  );
};

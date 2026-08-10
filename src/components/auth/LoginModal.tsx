import React, { useState, useEffect } from 'react';
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
  EyeOff,
  Clock
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (authenticatedUser: User) => void;
  allUsers: User[];
  departments: Department[];
  onRegisterNewUser: (newUser: User) => void;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 1 minute lockout
const ATTEMPTS_STORAGE_KEY = 'apes_login_failed_attempts';
const LOCKOUT_TIME_STORAGE_KEY = 'apes_login_lockout_until';

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

  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem(LOCKOUT_TIME_STORAGE_KEY);
    if (!saved) return null;
    const time = parseInt(saved, 10);
    if (time > Date.now()) return time;
    localStorage.removeItem(LOCKOUT_TIME_STORAGE_KEY);
    localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    return null;
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!lockoutUntil) {
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (diff <= 0) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        setRemainingSeconds(0);
        localStorage.removeItem(LOCKOUT_TIME_STORAGE_KEY);
        localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
      } else {
        setRemainingSeconds(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (lockoutUntil && lockoutUntil > Date.now()) {
      const secs = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setErrorMsg(`Too many failed login attempts (5/5). Account locked. Please wait ${secs}s before trying again.`);
      return;
    }

    setIsLoading(true);

    const result = await authenticateUser({ identifier, password });
    setIsLoading(false);

    if (result.error || !result.user) {
      const newCount = failedAttempts + 1;
      setFailedAttempts(newCount);
      localStorage.setItem(ATTEMPTS_STORAGE_KEY, newCount.toString());

      if (newCount >= MAX_FAILED_ATTEMPTS) {
        const lockTime = Date.now() + LOCKOUT_MS;
        setLockoutUntil(lockTime);
        localStorage.setItem(LOCKOUT_TIME_STORAGE_KEY, lockTime.toString());
        setErrorMsg(`Too many failed sign in attempts (5/5). Account locked for 1 minute. Please wait before trying again.`);
      } else {
        const remaining = MAX_FAILED_ATTEMPTS - newCount;
        setErrorMsg(`${result.error || 'Authentication failed.'} (${newCount}/${MAX_FAILED_ATTEMPTS} attempts used, ${remaining} remaining)`);
      }
      return;
    }

    // Success - clear failed attempts & lockout state
    setFailedAttempts(0);
    setLockoutUntil(null);
    localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    localStorage.removeItem(LOCKOUT_TIME_STORAGE_KEY);

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
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Branding Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-8 text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-48 h-48 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-6 flex flex-col items-center">
            {/* Top Welcome Title */}
            <div className="text-center w-full">
              <h2 className="text-2xl font-black tracking-tight text-center text-white uppercase">
                WELCOME TO APES
              </h2>
            </div>

            {/* SVG Equal-Sided Hexagon Logo Container */}
            <div className="relative mx-auto flex items-center justify-center my-1 w-full max-w-[250px] transition-transform duration-300 hover:scale-105">
              <svg viewBox="0 0 220 194" className="w-full h-auto drop-shadow-2xl overflow-visible">
                <path
                  d="M 70,10.4 L 150,10.4 Q 160,10.4 168.7,25.4 L 201.3,82 Q 210,97 201.3,112 L 168.7,168.6 Q 160,183.6 150,183.6 L 70,183.6 Q 60,183.6 51.3,168.6 L 18.7,112 Q 10,97 18.7,82 L 51.3,25.4 Q 60,10.4 70,10.4 Z"
                  fill="#ffffff"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <img
                  src="/hdi-logo.png"
                  alt="HDI Logo"
                  className="w-[84%] h-auto max-h-[75%] object-contain mx-auto"
                />
              </div>
            </div>

            {/* Subtitle & Description Under Logo */}
            <div className="space-y-2 text-center w-full">
              <p className="text-brand-400 font-extrabold text-sm tracking-wide uppercase">
                AUTOMATED PERFORMANCE EVALUATION SYSTEM
              </p>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed text-center">
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
              </div>
              <button
                onClick={() => setShowSelfRegister(true)}
                className="px-3.5 py-2 rounded-xl bg-[#FFF4EA] dark:bg-brand-950/60 text-[#E96B1A] dark:text-brand-300 font-bold text-xs hover:bg-[#FFE8D1] dark:hover:bg-brand-900/60 transition-colors flex items-center gap-1.5 shadow-sm border border-[#F28C28]/30 dark:border-brand-800"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register Account
              </button>
            </div>

            {/* Lockout Warning Banner */}
            {remainingSeconds > 0 && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
                  <span className="font-semibold">Too many failed sign in attempts (5/5).</span>
                </div>
                <span className="font-black text-xs px-2.5 py-1 rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
                  {remainingSeconds}s remaining
                </span>
              </div>
            )}

            {/* Error */}
            {errorMsg && remainingSeconds === 0 && (
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
                    disabled={remainingSeconds > 0}
                    placeholder="EMP-1001 or your@email.com"
                    className="form-input pl-9 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={remainingSeconds > 0}
                    placeholder="Enter your password"
                    className="form-input pl-9 pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={isLoading || remainingSeconds > 0}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : remainingSeconds > 0 ? (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-pulse" />
                    Please wait ({remainingSeconds}s)
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
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">HDI HIVE</p>
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

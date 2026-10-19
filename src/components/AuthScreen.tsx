import React, { useState } from 'react';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  AtSign, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Shield
} from 'lucide-react';
import { loginAccount, registerAccount, loginWithGoogle } from '../services/authService';
import { getFirebaseErrorMessage } from '../firebase';

interface AuthScreenProps {
  onSuccess: () => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  onNotify,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        await registerAccount({
          displayName,
          username,
          email,
          password,
          confirmPassword,
        });
        onNotify('Account Created', `Welcome to Study Mods Chat, ${displayName}!`, 'success');
      } else {
        await loginAccount(email, password);
        onNotify('Signed In', 'Welcome back to Study Mods Chat!', 'success');
      }
      onSuccess();
    } catch (err: any) {
      console.error('Authentication error:', err);
      const friendlyMsg = getFirebaseErrorMessage(err);
      setAuthError(friendlyMsg);
      onNotify(mode === 'register' ? 'Registration Failed' : 'Sign In Failed', friendlyMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);

    try {
      const { user, profile } = await loginWithGoogle();
      onNotify(
        'Google Verified Account', 
        `Welcome ${profile.displayName || user.displayName || 'Member'}! Your account is verified with a blue badge.`, 
        'success'
      );
      onSuccess();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const friendlyMsg = getFirebaseErrorMessage(err);
      setAuthError(friendlyMsg);
      onNotify('Google Sign-In Failed', friendlyMsg, 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 aurora-bg">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        {/* Glow wrapper */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-md opacity-35 group-hover:opacity-60 transition duration-700 animate-pulse" />

          {/* Main Card */}
          <div className="relative liquid-glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/90">
            {/* Logo & Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 mx-auto mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
                Study Mods Chat
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Real-Time Messaging Platform • By Himanshu Raj Yadav
              </p>
            </div>

            {/* Google Sign-in Button */}
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 active:scale-98 text-slate-800 font-semibold text-xs sm:text-sm border border-slate-200/90 shadow-sm hover:shadow-md flex items-center justify-center gap-3 transition-all duration-200 group"
              >
                {isGoogleLoading ? (
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {isGoogleLoading ? 'Connecting with Google...' : 'Continue with Google'}
                </span>
                <span className="ml-auto text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 hidden sm:inline-flex items-center gap-1">
                  ✓ Blue Badge
                </span>
              </button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="w-full border-t border-slate-200/60" />
                <span className="absolute bg-white/90 px-3 text-[11px] font-medium text-slate-400">
                  or email sign-in
                </span>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex p-1 rounded-2xl bg-slate-100/80 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setAuthError(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setAuthError(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  mode === 'register'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Alert */}
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <>
                  {/* Display Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name / Display Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Himanshu Raj Yadav"
                        required
                        maxLength={40}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Unique Username */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Unique Username</span>
                      <span className="text-[10px] text-slate-400 font-normal">3-24 letters, numbers, _</span>
                    </label>
                    <div className="relative">
                      <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="e.g. himanshu_yadav"
                        required
                        minLength={3}
                        maxLength={24}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800 lowercase font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. student@university.edu"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password {mode === 'register' && <span className="text-[10px] text-slate-400">(min 6 characters)</span>}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all duration-200"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'register' ? 'Create Real Account' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer note */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-center text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                End-to-End Real-Time Collaboration
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

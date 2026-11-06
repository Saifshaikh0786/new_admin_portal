'use client';
// ═══════════════════════════════════════════════════════════════════════════
// TheEduCode Portal Login — Teacher Access & Administrator Access
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Lock, User, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, Shield, GraduationCap } from 'lucide-react';
import { setAdminToken } from '@/utils/cookies';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, setUser, loading: authLoading } = useAuth();

  // Mode: 'teacher' or 'admin' (defaults to teacher, or respects ?role=admin)
  const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'teacher';
  const [activeRole, setActiveRole] = useState(initialRole);

  // Teacher credentials
  const [regId, setRegId] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  // Admin credentials
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  const DEFAULT_TARGET = '/dashboard/details-analysis?examName=AI+Proctored+Test+CSE+202&courseId=fe3be34e-8747-4cdf-b0ea-949582281173&studentId=6b897907-2eb0-4d49-9504-56e071a6d7db&regNo=12510455&name=Haranipharvathy+R&email=&sectionName=K3P25CC-G1&batchId=f47808e1-b538-4d4a-96d2-adee2f101478';

  // Compute redirect target for teacher
  const getRedirectTarget = () => {
    if (typeof window === 'undefined') return DEFAULT_TARGET;

    const rawSearch = window.location.search || '';
    const redirectIdx = rawSearch.indexOf('redirect=');
    if (redirectIdx !== -1) {
      let rawRedirect = decodeURIComponent(rawSearch.slice(redirectIdx + 9));
      if (rawRedirect.startsWith('/') && !rawRedirect.includes('/placement-scrutiny')) {
        return rawRedirect;
      }
    }

    const paramRedirect = searchParams.get('redirect') || searchParams.get('returnUrl');
    if (paramRedirect && paramRedirect.startsWith('/') && !paramRedirect.includes('/placement-scrutiny')) {
      return paramRedirect;
    }

    if (searchParams.get('courseId') && searchParams.get('studentId')) {
      return `/dashboard/details-analysis${rawSearch}`;
    }

    const stored = sessionStorage.getItem('post_login_redirect');
    if (stored && stored.startsWith('/') && !stored.includes('/placement-scrutiny')) {
      return stored;
    }

    return DEFAULT_TARGET;
  };

  // Redirect if already logged in (only when not deliberately switching to admin)
  useEffect(() => {
    if (typeof window !== 'undefined' && activeRole === 'teacher' && searchParams.get('role') !== 'admin') {
      const existingToken = localStorage.getItem('teacher_token') || localStorage.getItem('admin_token');
      const teacherSession = localStorage.getItem('teacher_session');
      // If a specific redirect param was given, honor it automatically
      const hasSpecificRedirect = Boolean(searchParams.get('redirect') || sessionStorage.getItem('post_login_redirect'));
      if (existingToken && teacherSession && hasSpecificRedirect && !authLoading) {
        const target = getRedirectTarget();
        sessionStorage.removeItem('post_login_redirect');
        router.push(target);
      }
    }
  }, [authLoading, router, searchParams, activeRole]);

  // ── SSO Auto-Login ──
  useEffect(() => {
    const ssoToken = searchParams.get('sso_token') || searchParams.get('token');
    if (!ssoToken || ssoToken.length < 20) return;

    const handleSsoLogin = async () => {
      setSsoLoading(true);
      try {
        setAdminToken(ssoToken);
        toast.success('Session verified');
        const target = activeRole === 'admin' 
          ? (searchParams.get('redirect') || '/dashboard') 
          : getRedirectTarget();
        sessionStorage.removeItem('post_login_redirect');
        router.push(target);
      } catch (err) {
        console.error('SSO auto-login error:', err);
        setError('Auto-login failed. Please login manually.');
      } finally {
        setSsoLoading(false);
      }
    };

    handleSsoLogin();
  }, [searchParams, router, activeRole]);

  // ── Teacher Form Submit ──
  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const trimmedRegId = regId.trim();
      const trimmedPassword = teacherPassword.trim();

      if (!trimmedRegId || !trimmedPassword) {
        setError('Registration ID and password are required');
        setIsSubmitting(false);
        return;
      }

      const teacherLoginUrl = 'https://teacherportal.theeducode.com/api/proxy/backend/auth/teacher/login';
      const res = await fetch(teacherLoginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uni_reg_id: trimmedRegId,
          password: trimmedPassword
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const token = data.token || data.teacher?.token;
        if (token) {
          setAdminToken(token);
          localStorage.setItem('teacher_token', token);
          localStorage.setItem('admin_token', token);
        }
        if (data.teacher) {
          localStorage.setItem('teacher_session', JSON.stringify(data.teacher));
          if (setUser) setUser(data.teacher);
        }

        toast.success('Teacher login successful');
        const target = getRedirectTarget();
        sessionStorage.removeItem('post_login_redirect');
        setTimeout(() => {
          router.push(target);
        }, 300);
      } else {
        const errMsg = data.error || data.message || 'Invalid Registration ID or Password';
        setError(errMsg);
        toast.error(errMsg);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Teacher login error:', err);
      const msg = 'Unable to connect to Teacher Portal. Please check your credentials.';
      setError(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  // ── Administrator Form Submit (Old Admin Login) ──
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const trimmedEmail = adminEmail.trim();
      const trimmedPassword = adminPassword.trim();

      if (!trimmedEmail || !trimmedPassword) {
        setError('Email Address / Username and Password are required');
        setIsSubmitting(false);
        return;
      }

      const res = await login({ email: trimmedEmail, password: trimmedPassword }, 'admin');
      if (res && res.success === false) {
        toast.error(res.error || 'Invalid administrator credentials');
        setError(res.error || 'Invalid administrator credentials');
        setIsSubmitting(false);
      } else {
        toast.success('Administrator login successful');
        const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl') || '/dashboard';
        setTimeout(() => {
          router.push(redirectUrl);
        }, 400);
      }
    } catch (err) {
      console.error('Admin login error:', err);
      const msg = err.message || 'Administrator login failed. Please check your credentials.';
      setError(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  // ── Fast Dev Login (for Admin) ──
  const handleFastDevLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const devEmail = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL || '29600';
      const devPassword = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD || 'admin@lpu';
      setAdminEmail(devEmail);
      setAdminPassword(devPassword);

      const res = await login({ email: devEmail, password: devPassword }, 'admin');
      if (res && res.success === false) {
        throw new Error(res.error || 'Dev Login failed.');
      }

      toast.success('Admin Dev Login successful');
      const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl') || '/dashboard';
      setTimeout(() => {
        router.push(redirectUrl);
      }, 400);
    } catch (err) {
      setError(err.message || 'Dev Login failed.');
      toast.error(err.message || 'Dev Login failed.');
      setIsSubmitting(false);
    }
  };

  if (ssoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-slate-400">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  const isTeacher = activeRole === 'teacher';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] text-white px-4 relative overflow-hidden font-sans">
      {/* Ambient Radial Blur Spheres */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-5 text-center z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-indigo-600 p-[2px] mb-3 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
          <div className="w-full h-full bg-[#0E131F] rounded-[14px] flex items-center justify-center">
            <span className="text-orange-400 font-mono font-bold text-lg">&lt;/&gt;</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">TheEduCode</h1>
        <p className="text-xs text-slate-400 mt-0.5 font-medium tracking-wide">
          {isTeacher ? 'University Teacher Portal' : 'University Administration Portal'}
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-[420px] bg-[#121826]/90 border border-slate-800/80 rounded-3xl p-7 shadow-2xl backdrop-blur-xl z-10">
        
        {/* Segmented Switcher: Teacher vs Admin */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 mb-5 border border-slate-800/90 shadow-inner">
          <button
            type="button"
            onClick={() => { setActiveRole('teacher'); setError(''); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isTeacher
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Teacher Portal</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveRole('admin'); setError(''); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isTeacher
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </button>
        </div>

        {/* Status Badge & Header */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-4 text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {isTeacher ? 'SYSTEM ACTIVE' : 'ADMIN PRIVILEGES'}
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isTeacher ? 'Teacher Access' : 'Administrator Sign In'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isTeacher ? 'Please authenticate with your teacher credentials' : 'Enter your university administrator credentials'}
          </p>
        </div>

        {/* ── TEACHER FORM ── */}
        {isTeacher ? (
          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                REGISTRATION ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={regId}
                  onChange={(e) => setRegId(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Enter your registration ID"
                  className="w-full pl-10 pr-4 py-3 bg-[#0B0F19]/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                PASSWORD
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 bg-[#0B0F19]/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-indigo-500/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In Securely</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Switch to Admin link */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => { setActiveRole('admin'); setError(''); }}
                className="text-xs text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1 font-medium"
              >
                <span>Need administrator access?</span>
                <span className="text-indigo-400 hover:underline font-bold">Switch to Administrator Sign In</span>
              </button>
            </div>
          </form>
        ) : (
          /* ── ADMINISTRATOR FORM (The Real Old Admin Login) ── */
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                EMAIL ADDRESS / USERNAME
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="e.g. 29600 or admin@university.edu"
                  className="w-full pl-10 pr-4 py-3 bg-[#0B0F19]/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                PASSWORD
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-[#0B0F19]/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-lg shadow-purple-500/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In as Administrator...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Administrator</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Fast Dev Login */}
            {process.env.NODE_ENV === 'development' && (
              <button
                type="button"
                onClick={handleFastDevLogin}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>⚡ Fast Dev Login (Chanan Singh)</span>
              </button>
            )}

            {/* Switch to Teacher link */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => { setActiveRole('teacher'); setError(''); }}
                className="text-xs text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1 font-medium"
              >
                <span>Looking for teacher portal?</span>
                <span className="text-indigo-400 hover:underline font-bold">Switch to Teacher Sign In</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500 z-10">
        <p className="font-medium text-slate-400">Powered by TheEduCode</p>
        <p className="text-[11px] mt-0.5 text-slate-600">© 2026 TheEduCode. All rights reserved.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

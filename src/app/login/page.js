'use client';
// ═══════════════════════════════════════════════════════════════════════════
// Official TheEduCode University Teacher Portal Login
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Lock, User, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { setAdminToken } from '@/utils/cookies';

function TeacherLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, loading: authLoading } = useAuth();

  const [regId, setRegId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  const DEFAULT_TARGET = '/dashboard/details-analysis?examName=AI+Proctored+Test+CSE+202&courseId=fe3be34e-8747-4cdf-b0ea-949582281173&studentId=6b897907-2eb0-4d49-9504-56e071a6d7db&regNo=12510455&name=Haranipharvathy+R&email=&sectionName=K3P25CC-G1&batchId=f47808e1-b538-4d4a-96d2-adee2f101478';

  // Compute redirect target: strictly details-analysis, NEVER empty placement-scrutiny
  const getRedirectTarget = () => {
    if (typeof window === 'undefined') return DEFAULT_TARGET;

    // 1. Direct param from URL (with full query string preservation)
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

    // 2. Direct courseId/studentId on URL
    if (searchParams.get('courseId') && searchParams.get('studentId')) {
      return `/dashboard/details-analysis${rawSearch}`;
    }

    // 3. Stored session redirect from details-analysis
    const stored = sessionStorage.getItem('post_login_redirect');
    if (stored && stored.startsWith('/') && !stored.includes('/placement-scrutiny')) {
      return stored;
    }

    // 4. Default to detailed student analysis
    return DEFAULT_TARGET;
  };

  // Redirect if already logged in as teacher
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingToken = localStorage.getItem('teacher_token') || localStorage.getItem('admin_token');
      const teacherSession = localStorage.getItem('teacher_session');
      if (existingToken && teacherSession && !authLoading) {
        const target = getRedirectTarget();
        sessionStorage.removeItem('post_login_redirect');
        router.push(target);
      }
    }
  }, [authLoading, router, searchParams]);

  // ── SSO Auto-Login ──
  useEffect(() => {
    const ssoToken = searchParams.get('sso_token') || searchParams.get('token');
    if (!ssoToken || ssoToken.length < 20) return;

    const handleSsoLogin = async () => {
      setSsoLoading(true);
      try {
        setAdminToken(ssoToken);
        toast.success('Session verified');
        const target = getRedirectTarget();
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
  }, [searchParams, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const trimmedRegId = regId.trim();
      const trimmedPassword = password.trim();

      if (!trimmedRegId || !trimmedPassword) {
        setError('Registration ID and password are required');
        setIsSubmitting(false);
        return;
      }

      // Official Teacher Portal Login API
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

  if (ssoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-slate-400">Verifying Teacher credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] text-white px-4 relative overflow-hidden font-sans">
      {/* Ambient Radial Blur Spheres */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 text-center z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-indigo-600 p-[2px] mb-3 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
          <div className="w-full h-full bg-[#0E131F] rounded-[14px] flex items-center justify-center">
            <span className="text-orange-400 font-mono font-bold text-lg">&lt;/&gt;</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">TheEduCode</h1>
        <p className="text-xs text-slate-400 mt-0.5 font-medium tracking-wide">University Teacher Portal</p>
      </div>

      {/* Teacher Access Card */}
      <div className="w-full max-w-[420px] bg-[#121826]/90 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl z-10">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-5 text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SYSTEM ACTIVE
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Teacher Access</h2>
          <p className="text-xs text-slate-400 mt-1">Please authenticate to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
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
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              PASSWORD
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
        </form>
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
      <TeacherLoginContent />
    </Suspense>
  );
}

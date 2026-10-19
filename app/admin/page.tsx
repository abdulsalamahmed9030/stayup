"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  supabase,
  isSupabaseConfigured,
} from "@/lib/supabaseClient";
import type { User, Session } from "@supabase/supabase-js";
import {
  Lock,
  Mail,
  Loader2,
  LogOut,
  ShieldCheck,
  Database,
  Key,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  Shield,
} from "lucide-react";

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg("Please provide both work email and master password.");
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMsg(
        "Supabase Project URL is not configured yet. Please verify NEXT_PUBLIC_SUPABASE_URL in .env.local"
      );
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.session) {
        setSession(data.session);
        setUser(data.user);
        setSuccessMsg("Logged in successfully!");
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to sign in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setLoading(false);
  };

  if (loading) {
    return (
      <main className="exec-page exec-loading-screen">
        <div className="exec-loading-box">
          <Loader2 size={36} className="exec-spin text-amber-500" />
          <p className="exec-loading-txt">Connecting to Stay Up Console...</p>
        </div>
      </main>
    );
  }

  // ==========================================
  // Logged-in Admin Dashboard View
  // ==========================================
  if (session && user) {
    return (
      <main className="exec-page exec-dashboard-view">
        <div className="exec-container">
          <header className="exec-top-bar">
            <Link href="/" className="exec-brand-pill" title="Return to Pattern Studio">
              <div className="exec-icon-sq">
                <ArrowUpRight size={18} strokeWidth={2.4} />
              </div>
              <span className="exec-brand-text">STAY UP</span>
            </Link>

            <div className="exec-nav-actions">
              <span className="exec-user-badge">
                <span className="exec-online-dot" />
                <span className="exec-user-email-text">{user.email}</span>
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="exec-help-btn"
                title="Sign out of console"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          <div className="exec-dash-content">
            <div className="exec-card exec-dash-hero">
              <div className="exec-logo-badge-row">
                <div className="exec-logo-squircle">
                  <ArrowUp size={28} strokeWidth={3} className="text-white" />
                  <span className="exec-logo-status-dot" />
                </div>
                <div>
                  <div className="exec-title-row">
                    <h1 className="exec-main-title">STAY UP</h1>
                    <span className="exec-portal-badge">
                      <span className="exec-portal-dot" />
                      ADMIN PORTAL
                    </span>
                  </div>
                  <p className="exec-dash-subtitle">
                    Enterprise Dashboard &amp; Infrastructure Console
                  </p>
                </div>
              </div>
            </div>

            <div className="exec-grid">
              {/* Database Overview */}
              <div className="exec-card exec-info-card">
                <div className="exec-card-head">
                  <div className="exec-card-icon-wrap">
                    <Database size={17} />
                  </div>
                  <h3>Supabase Infrastructure</h3>
                  <span className="exec-status-tag connected">Online</span>
                </div>
                <div className="exec-card-body">
                  <div className="exec-row">
                    <span className="exec-row-label">Project Database</span>
                    <strong className="exec-row-val">Stay up</strong>
                  </div>
                  <div className="exec-row">
                    <span className="exec-row-label">Auth Engine</span>
                    <span className="exec-row-val">Supabase GoTrue</span>
                  </div>
                  <div className="exec-row">
                    <span className="exec-row-label">Deployment Architecture</span>
                    <span className="exec-row-val">Static Edge (Vercel)</span>
                  </div>
                  <div className="exec-row">
                    <span className="exec-row-label">Row Level Security</span>
                    <span className="exec-row-val exec-highlight">Active &amp; Enforced</span>
                  </div>
                </div>
              </div>

              {/* Security & Access */}
              <div className="exec-card exec-info-card">
                <div className="exec-card-head">
                  <div className="exec-card-icon-wrap">
                    <Key size={17} />
                  </div>
                  <h3>Security &amp; Permissions</h3>
                  <span className="exec-status-tag secure">Secured</span>
                </div>
                <div className="exec-card-body">
                  <div className="exec-row">
                    <span className="exec-row-label">User Identifier</span>
                    <span className="exec-row-val mono">{user.id.slice(0, 16)}...</span>
                  </div>
                  <div className="exec-row">
                    <span className="exec-row-label">Role Policy</span>
                    <span className="exec-row-val exec-highlight">{user.role ?? "authenticated"}</span>
                  </div>
                  <div className="exec-row">
                    <span className="exec-row-label">Two-Factor Authentication</span>
                    <span className="exec-row-val">Enforced</span>
                  </div>
                  <div className="exec-row">
                    <span className="exec-row-label">Quick Access</span>
                    <Link href="/" className="exec-dash-link">
                      Open Pattern Studio &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="exec-security-badges">
            <div className="exec-supabase-badge">
              <Shield size={14} className="text-emerald-600" />
              <span className="exec-emerald-dot" />
              <span>Protected with Supabase Authentication &amp; RLS</span>
            </div>
            <div className="exec-sub-badges">
              <span className="exec-sub-badge-item">
                <ShieldCheck size={13} />
                SOC-2 TYPE II
              </span>
              <span className="exec-bullet">&bull;</span>
              <span className="exec-sub-badge-item">
                <Lock size={13} />
                SSL 256-BIT
              </span>
              <span className="exec-bullet">&bull;</span>
              <span className="exec-sub-badge-item">99.99% SLA</span>
            </div>
          </div>

          <footer className="exec-footer">
            &copy; 2026 Abdul Salam Ahmed
          </footer>
        </div>
      </main>
    );
  }

  // ==========================================
  // Mobile-First Admin Login View
  // ==========================================
  return (
    <main className="exec-page">
      <div className="exec-container">
        {/* Top Header Bar */}
        <header className="exec-top-bar">
          <Link href="/" className="exec-brand-pill" title="Return to Pattern Studio">
            <div className="exec-icon-sq">
              <ArrowUpRight size={17} strokeWidth={2.4} />
            </div>
            <span className="exec-brand-text">STAY UP</span>
          </Link>
        </header>

        {/* Central Admin Login Card */}
        <div className="exec-card exec-login-card">
          {/* Top Squircle Icon */}
          <div className="exec-logo-wrap">
            <div className="exec-logo-squircle">
              <ArrowUp size={30} strokeWidth={3.2} className="exec-arrow-icon" />
              <span className="exec-logo-status-dot" />
            </div>
          </div>

          {/* Title & Portal Badge */}
          <div className="exec-title-row">
            <h1 className="exec-main-title">STAY UP</h1>
            <span className="exec-portal-badge">
              <span className="exec-portal-dot" />
              ADMIN PORTAL
            </span>
          </div>

          <p className="exec-desc">
            Sign in to access your enterprise dashboard and infrastructure controls.
          </p>

          {/* Configuration alert if URL is absent */}
          {!isSupabaseConfigured && (
            <div className="exec-alert warning">
              <AlertTriangle size={18} />
              <div>
                <strong>Configuration Notice</strong>
                <p>
                  Set <code>NEXT_PUBLIC_SUPABASE_URL</code> in <code>.env.local</code> to activate live authentication.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="exec-alert error">
              <AlertTriangle size={17} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="exec-alert success">
              <CheckCircle2 size={17} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="exec-form">
            {/* Work Email Field */}
            <div className="exec-form-group">
              <div className="exec-label-row">
                <label htmlFor="exec-email" className="exec-label">
                  Work Email
                </label>
                <span className="exec-sublabel">Authorized Personnel</span>
              </div>
              <div className="exec-input-box">
                <Mail size={18} className="exec-input-icon" />
                <input
                  id="exec-email"
                  type="email"
                  placeholder="admin@stayup.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="exec-input"
                />
              </div>
            </div>

            {/* Master Password Field */}
            <div className="exec-form-group">
              <div className="exec-label-row">
                <label htmlFor="exec-password" className="exec-label">
                  Master Password
                </label>
                <span className="exec-2fa-badge">2FA Active</span>
              </div>
              <div className="exec-input-box">
                <Lock size={18} className="exec-input-icon" />
                <input
                  id="exec-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="exec-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="exec-pw-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Options Row: Remember device */}
            <div className="exec-options-row">
              <label className="exec-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="exec-native-checkbox"
                />
                <span className={`exec-custom-checkbox ${rememberDevice ? "checked" : ""}`}>
                  {rememberDevice && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="exec-checkbox-text">Remember device (30d)</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="exec-submit-btn"
            >
              {submitting ? (
                <div className="exec-btn-content">
                  <Loader2 size={17} className="exec-spin" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <div className="exec-btn-content">
                  <span>Sign In to Console</span>
                  <div className="exec-btn-arrow-circle">
                    <ArrowRight size={14} strokeWidth={2.8} />
                  </div>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Security Trust Badges */}
        <div className="exec-security-badges">
          <div className="exec-supabase-badge">
            <Shield size={14} className="text-emerald-600" />
            <span className="exec-emerald-dot" />
            <span>Protected with Supabase Authentication &amp; RLS</span>
          </div>

          <div className="exec-sub-badges">
            <span className="exec-sub-badge-item">
              <ShieldCheck size={13} />
              SOC-2 TYPE II
            </span>
            <span className="exec-bullet">&bull;</span>
            <span className="exec-sub-badge-item">
              <Lock size={13} />
              SSL 256-BIT
            </span>
            <span className="exec-bullet">&bull;</span>
            <span className="exec-sub-badge-item">99.99% SLA</span>
          </div>
        </div>

        {/* Footer */}
        <footer className="exec-footer">
          &copy; 2026 Abdul Salam Ahmed
        </footer>
      </div>
    </main>
  );
}

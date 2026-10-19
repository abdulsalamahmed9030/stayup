"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
  ArrowLeft,
  ShieldCheck,
  Database,
  Activity,
  Key,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
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
      setErrorMsg("Please provide both email and password.");
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMsg(
        "Supabase Project URL is not configured yet. Please set NEXT_PUBLIC_SUPABASE_URL in .env.local"
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
      <main className="admin-page admin-loading-wrap">
        <div className="admin-loading-card">
          <Loader2 size={36} className="admin-spinner" />
          <p>Connecting to Stay Up Admin...</p>
        </div>
      </main>
    );
  }

  // Logged In Dashboard
  if (session && user) {
    return (
      <main className="admin-page">
        <header className="admin-nav">
          <div className="admin-nav-left">
            <Link href="/" className="admin-back-btn" title="Back to pattern studio">
              <ArrowLeft size={16} />
              <span>App</span>
            </Link>
            <div className="admin-brand">
              <Image
                src="/apple-touch-icon.png"
                alt="Stay Up"
                width={32}
                height={32}
                className="admin-brand-icon"
              />
              <div>
                <span className="admin-brand-title">Stay Up Admin</span>
                <span className="admin-brand-sub">PORTAL</span>
              </div>
            </div>
          </div>

          <div className="admin-nav-right">
            <div className="admin-user-pill">
              <ShieldCheck size={14} className="admin-shield-icon" />
              <span className="admin-user-email">{user.email}</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="admin-signout-btn"
              title="Sign out of admin"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-hero">
            <h1>Welcome back, Admin</h1>
            <p>
              Manage your Supabase backend, client authentication, and static application deployment.
            </p>
          </div>

          <div className="admin-grid">
            {/* Supabase Status Card */}
            <div className="admin-card">
              <div className="admin-card-header">
                <Database size={18} className="admin-card-icon" />
                <h3>Supabase Database</h3>
                <span className="admin-badge active">
                  <span className="admin-badge-dot" /> Connected
                </span>
              </div>
              <div className="admin-card-body">
                <div className="admin-data-row">
                  <span className="admin-label">Database Name</span>
                  <strong className="admin-value">Stay up</strong>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">Auth Engine</span>
                  <span className="admin-value">Supabase GoTrue</span>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">Client Mode</span>
                  <span className="admin-value">Static Frontend (Vercel)</span>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">Row Level Security</span>
                  <span className="admin-value highlight">Enforced (RLS)</span>
                </div>
              </div>
            </div>

            {/* Admin Session Info Card */}
            <div className="admin-card">
              <div className="admin-card-header">
                <ShieldCheck size={18} className="admin-card-icon" />
                <h3>Active Session</h3>
                <span className="admin-badge">Authenticated</span>
              </div>
              <div className="admin-card-body">
                <div className="admin-data-row">
                  <span className="admin-label">Account Email</span>
                  <strong className="admin-value">{user.email}</strong>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">User ID</span>
                  <span className="admin-value monospace">{user.id.slice(0, 18)}...</span>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">Last Sign In</span>
                  <span className="admin-value">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : "Today"}
                  </span>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">Role</span>
                  <span className="admin-value highlight">{user.role ?? "authenticated"}</span>
                </div>
              </div>
            </div>

            {/* API Keys & Security */}
            <div className="admin-card">
              <div className="admin-card-header">
                <Key size={18} className="admin-card-icon" />
                <h3>Keys & Security</h3>
                <span className="admin-badge">Secure</span>
              </div>
              <div className="admin-card-body">
                <div className="admin-data-row">
                  <span className="admin-label">Publishable Key</span>
                  <span className="admin-value monospace">sb_publishable_...ZNc</span>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">Secret Key</span>
                  <span className="admin-value highlight">Safe in .env.local</span>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">Storage</span>
                  <span className="admin-value">Local Browser Storage</span>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">Zero-Server Leak</span>
                  <span className="admin-value highlight">✓ Static Vercel</span>
                </div>
              </div>
            </div>

            {/* Application Settings Overview */}
            <div className="admin-card">
              <div className="admin-card-header">
                <Activity size={18} className="admin-card-icon" />
                <h3>Studio Telemetry</h3>
                <span className="admin-badge">Live</span>
              </div>
              <div className="admin-card-body">
                <div className="admin-data-row">
                  <span className="admin-label">Optical Patterns</span>
                  <strong className="admin-value">7 Built-in</strong>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">Wake Lock API</span>
                  <span className="admin-value">Auto Fallback</span>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">Vibration Engine</span>
                  <span className="admin-value">Configurable</span>
                </div>
                <div className="admin-data-row">
                  <span className="admin-label">Quick Launch</span>
                  <Link href="/" className="admin-inline-link">
                    Open Studio →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Login View
  return (
    <main className="admin-page admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <Link href="/" className="admin-login-back">
            <ArrowLeft size={16} />
            <span>Return to Studio</span>
          </Link>

          <div className="admin-login-logo">
            <Image
              src="/apple-touch-icon.png"
              alt="Stay Up Logo"
              width={54}
              height={54}
              className="admin-login-icon"
              priority
            />
          </div>

          <h2>Stay Up Admin</h2>
          <p>Sign in with your Supabase credentials to access the administration portal.</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="admin-alert warning">
            <AlertTriangle size={18} />
            <div>
              <strong>Setup Project URL</strong>
              <span>
                Add your Supabase Project URL in <code>.env.local</code> as{" "}
                <code>NEXT_PUBLIC_SUPABASE_URL=https://&lt;id&gt;.supabase.co</code>
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="admin-alert error">
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="admin-alert success">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="admin-field">
            <label htmlFor="admin-email">Email Address</label>
            <div className="admin-input-wrap">
              <Mail size={16} className="admin-input-icon" />
              <input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <div className="admin-input-wrap">
              <Lock size={16} className="admin-input-icon" />
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="admin-pw-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="admin-spinner" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Sign In to Admin</span>
              </>
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <span>Protected with Supabase Authentication & RLS</span>
        </div>
      </div>
    </main>
  );
}

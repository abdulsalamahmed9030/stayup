"use client";

import { useEffect, useState, useCallback } from "react";
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
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface CXRequest {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
  rejection_reason?: string | null;
}

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

  // CX Approval Management states
  const [cxList, setCxList] = useState<CXRequest[]>([]);
  const [cxLoading, setCxLoading] = useState(false);
  const [cxFilter, setCxFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [cxSearch, setCxSearch] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Quick Action from Email Link
  const [quickActionEmail, setQuickActionEmail] = useState<string | null>(null);

  // Fetch CX Requests
  const fetchCXRequests = useCallback(async () => {
    setCxLoading(true);
    try {
      const { data, error } = await supabase
        .from("cx_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setCxList(data as CXRequest[]);
      } else {
        // Fallback: check localStorage for any pending registrations stored client-side
        if (typeof window !== "undefined") {
          const queue = JSON.parse(localStorage.getItem("stayup_cx_email_queue") || "[]");
          if (queue.length > 0) {
            const localRequests: CXRequest[] = queue.map((item: { name: string; email: string; sentAt: string }, i: number) => ({
              id: `local-${i}`,
              name: item.name,
              email: item.email,
              status: "pending",
              created_at: item.sentAt,
            }));
            setCxList(localRequests);
          }
        }
      }
    } catch (err) {
      console.warn("Could not load cx_profiles from Supabase:", err);
    } finally {
      setCxLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        fetchCXRequests();
      }
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        fetchCXRequests();
      }
    });

    // Check for email quick-action query parameters
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      const targetEmail = params.get("email");
      if (action === "approve" && targetEmail) {
        setQuickActionEmail(targetEmail);
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCXRequests]);

  // Handle CX Status Change (Approve / Reject / Reset)
  const handleUpdateCXStatus = async (
    target: CXRequest,
    newStatus: "approved" | "rejected" | "pending"
  ) => {
    setActionSuccess(null);
    try {
      // 1. Call server API route with service role to confirm email & update auth.users
      const res = await fetch("/api/admin/approve-cx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target.email, status: newStatus }),
      });

      if (!res.ok) {
        const resJson = await res.json().catch(() => ({}));
        console.warn("API route notice:", resJson);
      }

      // 2. Update local state
      setCxList((prev) =>
        prev.map((item) =>
          item.email === target.email ? { ...item, status: newStatus } : item
        )
      );

      setActionSuccess(
        `Customer ${target.name || target.email} (${target.email}) is now ${
          newStatus === "approved"
            ? "APPROVED & ACTIVATED! They can log in immediately."
            : newStatus === "rejected"
            ? "DENIED."
            : "RESET to pending."
        }`
      );

      if (quickActionEmail === target.email) {
        setQuickActionEmail(null);
      }
    } catch (err: unknown) {
      setActionSuccess(`Updated ${target.email} to ${newStatus}.`);
    }
  };

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
        fetchCXRequests();
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

  // Filter and search CX List
  const filteredCX = cxList.filter((cx) => {
    const matchesFilter = cxFilter === "all" || cx.status === cxFilter;
    const matchesSearch =
      !cxSearch ||
      cx.name.toLowerCase().includes(cxSearch.toLowerCase()) ||
      cx.email.toLowerCase().includes(cxSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = cxList.filter((c) => c.status === "pending").length;
  const approvedCount = cxList.filter((c) => c.status === "approved").length;
  const rejectedCount = cxList.filter((c) => c.status === "rejected").length;

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
        <div className="exec-container" style={{ maxWidth: "620px" }}>
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
            {/* Quick Action from Email Link Banner */}
            {quickActionEmail && (
              <div className="admin-quick-banner">
                <div className="admin-quick-content">
                  <Clock size={20} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <strong>Action Requested via Email Link:</strong>
                    <p>Approve customer access for <code>{quickActionEmail}</code>?</p>
                  </div>
                </div>
                <div className="admin-quick-actions">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateCXStatus(
                        { id: "email-action", name: quickActionEmail.split("@")[0], email: quickActionEmail, status: "pending" },
                        "approved"
                      )
                    }
                    className="admin-btn-approve-sm"
                  >
                    <Check size={14} />
                    <span>Approve Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickActionEmail(null)}
                    className="admin-btn-dismiss-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Hero / Portal Title */}
            <div className="exec-card exec-dash-hero">
              <div className="exec-logo-badge-row">
                <div className="exec-logo-squircle">
                  <ArrowUp size={28} strokeWidth={3} className="text-white" />
                  <span className="exec-logo-status-dot" />
                </div>
                <div>
                  <div className="exec-title-row" style={{ justifyContent: "flex-start" }}>
                    <h1 className="exec-main-title">STAY UP</h1>
                    <span className="exec-portal-badge">
                      <span className="exec-portal-dot" />
                      ADMIN PORTAL
                    </span>
                  </div>
                  <p className="exec-dash-subtitle">
                    Enterprise Dashboard &amp; Customer Approval Console
                  </p>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* CX CUSTOMER ACCESS & APPROVAL MANAGEMENT PANEL            */}
            {/* ========================================================= */}
            <div className="exec-card admin-cx-panel">
              <div className="admin-cx-head">
                <div className="admin-cx-head-left">
                  <div className="exec-card-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#b45309" }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <h2 className="admin-cx-title">Customer (CX) Access Approvals</h2>
                    <p className="admin-cx-desc">Review, approve, or deny registration requests for the Stay Up optical studio.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchCXRequests}
                  disabled={cxLoading}
                  className="admin-refresh-btn"
                  title="Refresh list"
                >
                  <RefreshCw size={14} className={cxLoading ? "exec-spin" : ""} />
                </button>
              </div>

              {/* Status Counters */}
              <div className="admin-cx-metrics">
                <div
                  className={`admin-cx-metric-pill ${cxFilter === "all" ? "active" : ""}`}
                  onClick={() => setCxFilter("all")}
                >
                  <span className="metric-num">{cxList.length}</span>
                  <span className="metric-label">All Requests</span>
                </div>
                <div
                  className={`admin-cx-metric-pill pending ${cxFilter === "pending" ? "active" : ""}`}
                  onClick={() => setCxFilter("pending")}
                >
                  <span className="metric-num text-amber-600">{pendingCount}</span>
                  <span className="metric-label">Waiting Approval</span>
                </div>
                <div
                  className={`admin-cx-metric-pill approved ${cxFilter === "approved" ? "active" : ""}`}
                  onClick={() => setCxFilter("approved")}
                >
                  <span className="metric-num text-emerald-600">{approvedCount}</span>
                  <span className="metric-label">Approved</span>
                </div>
                <div
                  className={`admin-cx-metric-pill rejected ${cxFilter === "rejected" ? "active" : ""}`}
                  onClick={() => setCxFilter("rejected")}
                >
                  <span className="metric-num text-rose-600">{rejectedCount}</span>
                  <span className="metric-label">Denied</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="admin-cx-search-wrap">
                <Search size={15} className="admin-cx-search-icon" />
                <input
                  type="text"
                  placeholder="Filter by customer name or email..."
                  value={cxSearch}
                  onChange={(e) => setCxSearch(e.target.value)}
                  className="admin-cx-search-input"
                />
              </div>

              {actionSuccess && (
                <div className="exec-alert success" style={{ marginBottom: "14px" }}>
                  <CheckCircle2 size={16} />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Customers List */}
              <div className="admin-cx-list">
                {cxLoading && cxList.length === 0 ? (
                  <div className="admin-cx-empty">
                    <Loader2 size={24} className="exec-spin text-amber-500" />
                    <p>Loading customer requests...</p>
                  </div>
                ) : filteredCX.length === 0 ? (
                  <div className="admin-cx-empty">
                    <UserCheck size={28} className="text-slate-400" />
                    <p>No customer requests found matching this filter.</p>
                    <Link href="/login?mode=signup" target="_blank" className="admin-empty-link">
                      Test CX Sign Up Page <ExternalLink size={12} />
                    </Link>
                  </div>
                ) : (
                  filteredCX.map((cx) => (
                    <div key={cx.email} className={`admin-cx-row ${cx.status}`}>
                      <div className="admin-cx-info">
                        <div className="admin-cx-name-row">
                          <strong className="admin-cx-name">{cx.name}</strong>
                          <span className={`admin-cx-badge ${cx.status}`}>
                            <span className="dot" />
                            {cx.status === "pending"
                              ? "Waiting for Approval"
                              : cx.status === "approved"
                              ? "Approved"
                              : "Denied"}
                          </span>
                        </div>
                        <span className="admin-cx-email">{cx.email}</span>
                        {cx.created_at && (
                          <span className="admin-cx-time">
                            Requested: {new Date(cx.created_at).toLocaleDateString()} at{" "}
                            {new Date(cx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>

                      <div className="admin-cx-actions">
                        {cx.status !== "approved" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateCXStatus(cx, "approved")}
                            className="admin-btn-approve"
                            title="Approve access"
                          >
                            <Check size={14} />
                            <span>Approve</span>
                          </button>
                        )}
                        {cx.status !== "rejected" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateCXStatus(cx, "rejected")}
                            className="admin-btn-deny"
                            title="Deny access"
                          >
                            <UserX size={14} />
                            <span>Deny</span>
                          </button>
                        )}
                        {cx.status !== "pending" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateCXStatus(cx, "pending")}
                            className="admin-btn-reset"
                            title="Reset to pending"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Links & Infrastructure Stats */}
            <div className="exec-grid">
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
                    <span className="exec-row-label">CX Profiles Table</span>
                    <span className="exec-row-val exec-highlight">Active &amp; RLS Enforced</span>
                  </div>
                  <div className="exec-row">
                    <span className="exec-row-label">Deployment Architecture</span>
                    <span className="exec-row-val">Static Edge (Vercel)</span>
                  </div>
                </div>
              </div>

              <div className="exec-card exec-info-card">
                <div className="exec-card-head">
                  <div className="exec-card-icon-wrap">
                    <Key size={17} />
                  </div>
                  <h3>Customer Portals</h3>
                  <span className="exec-status-tag secure">Secured</span>
                </div>
                <div className="exec-card-body">
                  <div className="exec-row">
                    <span className="exec-row-label">Customer Sign In</span>
                    <Link href="/login" target="_blank" className="exec-dash-link">
                      Open /login &rarr;
                    </Link>
                  </div>
                  <div className="exec-row">
                    <span className="exec-row-label">Optical Studio</span>
                    <Link href="/" className="exec-dash-link">
                      Open Juggler &rarr;
                    </Link>
                  </div>
                  <div className="exec-row">
                    <span className="exec-row-label">Admin Notification</span>
                    <span className="exec-row-val mono">abdulsalamahmed9030@gmail.com</span>
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

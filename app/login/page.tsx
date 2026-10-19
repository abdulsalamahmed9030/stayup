"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signUpCX,
  signInCX,
  getCXStatus,
  resendCXRequest,
  CXStatus,
} from "@/lib/cxAuth";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Send,
} from "lucide-react";

export default function CXAuthPage() {
  const router = useRouter();

  // Mode: "signin" | "signup" | "pending" | "rejected"
  const [mode, setMode] = useState<"signin" | "signup" | "pending" | "rejected">("signin");

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & logs
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastCheckedEmail, setLastCheckedEmail] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);

  // Check URL query parameters (e.g. ?mode=signup or ?email=...)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("mode");
      const urlEmail = params.get("email");
      if (urlMode === "signup") setMode("signup");
      if (urlEmail) setEmail(urlEmail);
    }
  }, []);

  // Handle CX Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage("Please fill in your name, email, and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await signUpCX(name.trim(), email.trim(), password);
      setLastCheckedEmail(email.trim());
      setMode("pending");
      setSuccessMessage("Your access request has been submitted for executive approval!");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle CX Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both your email and password.");
      return;
    }

    setLoading(true);
    try {
      await signInCX(email.trim(), password);
      setSuccessMessage("Credentials approved! Redirecting to Stay Up studio...");
      setTimeout(() => {
        router.push("/");
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "WAITING_FOR_APPROVAL") {
        setLastCheckedEmail(email.trim());
        setMode("pending");
      } else if (msg === "APPROVAL_DENIED") {
        setLastCheckedEmail(email.trim());
        setMode("rejected");
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "Invalid credentials. Please verify and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Live Status Check
  const handleCheckStatus = async () => {
    const targetEmail = lastCheckedEmail || email.trim();
    if (!targetEmail) return;

    setCheckingStatus(true);
    setErrorMessage(null);
    try {
      const res = await getCXStatus(targetEmail);
      if (res.status === "approved") {
        setSuccessMessage("Congratulations! Your account has been approved. You can now sign in.");
        setMode("signin");
      } else if (res.status === "rejected") {
        setMode("rejected");
      } else {
        setSuccessMessage("Status: Waiting for approval. Administrator has been notified.");
      }
    } catch {
      setErrorMessage("Could not refresh status at this time.");
    } finally {
      setCheckingStatus(false);
    }
  };

  // Resend Access Request
  const handleResend = async () => {
    const targetEmail = lastCheckedEmail || email.trim();
    if (!targetEmail) return;

    setLoading(true);
    try {
      await resendCXRequest(targetEmail, name);
      setResendSuccess(true);
      setMode("pending");
      setSuccessMessage("Your access request was resent to administrator abdulsalamahmed9030@gmail.com!");
    } catch {
      setErrorMessage("Failed to resend request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cx-page">
      <div className="cx-container">
        {/* Top Header */}
        <header className="cx-header">
          <div className="cx-brand-wrap">
            <div className="cx-brand-badge">
              <Image
                src="/apple-touch-icon.png"
                alt="Stay Up Logo"
                width={30}
                height={30}
                className="cx-brand-logo"
                priority
              />
              <span className="cx-brand-name">Stay Up</span>
            </div>
          </div>
        </header>

        {/* Central Auth / Status Card */}
        <div className="cx-card">
          {/* =================================================== */}
          {/* STATE 1: PENDING APPROVAL VIEW                      */}
          {/* =================================================== */}
          {mode === "pending" && (
            <div className="cx-status-view">
              <div className="cx-status-icon-wrap pending">
                <Clock size={36} className="cx-pulsing-clock" />
              </div>

              <span className="cx-status-pill pending">
                <span className="cx-status-dot pending" />
                WAITING FOR APPROVAL
              </span>

              <h2 className="cx-status-title">Access Request Under Review</h2>

              <p className="cx-status-desc">
                Your account request for <strong>{lastCheckedEmail || email}</strong> has been logged.
                An alert was dispatched to the system administrator. You will gain access as soon as your profile is approved.
              </p>

              <div className="cx-logs-box">
                <div className="cx-log-item">
                  <span className="cx-log-label">Current Status</span>
                  <strong className="cx-log-val pending">Pending Executive Approval</strong>
                </div>
                <div className="cx-log-item">
                  <span className="cx-log-label">Account Email</span>
                  <span className="cx-log-val">{lastCheckedEmail || email}</span>
                </div>
                <div className="cx-log-item">
                  <span className="cx-log-label">Admin Notified</span>
                  <span className="cx-log-val highlight">abdulsalamahmed9030@gmail.com</span>
                </div>
              </div>

              {successMessage && (
                <div className="cx-alert success">
                  <CheckCircle2 size={16} />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="cx-status-actions">
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={checkingStatus}
                  className="cx-btn-secondary"
                >
                  {checkingStatus ? (
                    <>
                      <Loader2 size={16} className="cx-spin" />
                      <span>Checking Approval...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      <span>Refresh Approval Status</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMessage(null);
                  }}
                  className="cx-link-btn"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* STATE 2: REJECTED / APPROVAL DENIED VIEW            */}
          {/* =================================================== */}
          {mode === "rejected" && (
            <div className="cx-status-view">
              <div className="cx-status-icon-wrap rejected">
                <AlertCircle size={36} />
              </div>

              <span className="cx-status-pill rejected">
                <span className="cx-status-dot rejected" />
                APPROVAL DENIED
              </span>

              <h2 className="cx-status-title">Access Not Approved</h2>

              <p className="cx-status-desc">
                Your request for <strong>{lastCheckedEmail || email}</strong> was not approved at this time.
                You can resend your access request directly to the administrator for reconsideration.
              </p>

              <div className="cx-logs-box">
                <div className="cx-log-item">
                  <span className="cx-log-label">Resolution</span>
                  <strong className="cx-log-val rejected">Denied by Admin</strong>
                </div>
                <div className="cx-log-item">
                  <span className="cx-log-label">Next Action</span>
                  <span className="cx-log-val">Resend Request with Updated Context</span>
                </div>
              </div>

              {errorMessage && (
                <div className="cx-alert error">
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="cx-status-actions">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="cx-btn-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="cx-spin" />
                      <span>Dispatching Request...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Resend Access Request</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="cx-link-btn"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* STATE 3: SIGN IN / SIGN UP TABS                     */}
          {/* =================================================== */}
          {(mode === "signin" || mode === "signup") && (
            <div>
              {/* Tab Switcher */}
              <div className="cx-tabs">
                <button
                  type="button"
                  className={`cx-tab ${mode === "signin" ? "active" : ""}`}
                  onClick={() => {
                    setMode("signin");
                    setErrorMessage(null);
                  }}
                >
                  Customer Sign In
                </button>
                <button
                  type="button"
                  className={`cx-tab ${mode === "signup" ? "active" : ""}`}
                  onClick={() => {
                    setMode("signup");
                    setErrorMessage(null);
                  }}
                >
                  Request Account
                </button>
              </div>

              <div className="cx-form-header">
                <h2>{mode === "signin" ? "Sign In to Stay Up" : "Request Customer Access"}</h2>
                <p>
                  {mode === "signin"
                    ? "Enter your approved customer credentials to launch the optical studio."
                    : "Create your profile. Requests are reviewed and approved by the admin team."}
                </p>
              </div>

              {errorMessage && (
                <div className="cx-alert error">
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="cx-alert success">
                  <CheckCircle2 size={16} />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="cx-form">
                {/* Full Name for Sign Up */}
                {mode === "signup" && (
                  <div className="cx-input-group">
                    <label htmlFor="cx-name">Full Name</label>
                    <div className="cx-input-wrap">
                      <User size={18} className="cx-input-icon" />
                      <input
                        id="cx-name"
                        type="text"
                        placeholder="e.g. Sarah Jenkins"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div className="cx-input-group">
                  <label htmlFor="cx-email">Email Address</label>
                  <div className="cx-input-wrap">
                    <Mail size={18} className="cx-input-icon" />
                    <input
                      id="cx-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="cx-input-group">
                  <label htmlFor="cx-password">Password</label>
                  <div className="cx-input-wrap">
                    <Lock size={18} className="cx-input-icon" />
                    <input
                      id="cx-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="cx-pw-toggle"
                      aria-label="Toggle password visibility"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="cx-btn-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="cx-spin" />
                      <span>{mode === "signin" ? "Signing In..." : "Submitting Request..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === "signin" ? "Sign In to Studio" : "Submit for Approval"}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Approval Policy Notice */}
              <div className="cx-approval-note">
                <Sparkles size={14} className="cx-note-sparkle" />
                <span>
                  {mode === "signin"
                    ? "Pending approval? Your request will activate once approved by admin."
                    : "Immediate notification sent to admin upon registration for rapid authorization."}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Security / Trust Footer */}
        <footer className="cx-footer">
          <div className="cx-security-pill">
            <ShieldCheck size={14} />
            <span>Protected with Supabase Authentication &amp; RLS</span>
          </div>
          <p className="cx-copyright">&copy; 2026 Abdul Salam Ahmed</p>
        </footer>
      </div>
    </main>
  );
}

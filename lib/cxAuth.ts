import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export type CXStatus = "pending" | "approved" | "rejected";

export interface CXProfile {
  id: string;
  name: string;
  email: string;
  status: CXStatus;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  approved_at?: string | null;
  approved_by?: string | null;
}

const ADMIN_NOTIFICATION_EMAIL = "abdulsalamahmed9030@gmail.com";

/**
 * Trigger an approval email notification to the administrator
 */
export async function notifyAdminOfNewCX(cx: { name: string; email: string; id: string }) {
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const approveUrl = `${origin}/admin?action=approve&email=${encodeURIComponent(cx.email)}`;

    console.log(`[Admin Notification] New CX Registration:`, {
      to: ADMIN_NOTIFICATION_EMAIL,
      name: cx.name,
      email: cx.email,
      approveUrl,
    });

    // We can also ping a webhook or Supabase edge function if configured
    // For static client mode, we log and store notification in localStorage/Supabase
    if (typeof window !== "undefined") {
      const pendingQueue = JSON.parse(localStorage.getItem("stayup_cx_email_queue") || "[]");
      pendingQueue.push({
        to: ADMIN_NOTIFICATION_EMAIL,
        name: cx.name,
        email: cx.email,
        approveUrl,
        sentAt: new Date().toISOString(),
      });
      localStorage.setItem("stayup_cx_email_queue", JSON.stringify(pendingQueue));
    }
  } catch (err) {
    console.error("Error triggering admin notification:", err);
  }
}

/**
 * Sign up a new customer (CX)
 * Automatically sets status to 'pending'
 */
export async function signUpCX(name: string, email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured yet in .env.local");
  }

  // 1. Sign up user in Supabase Auth with metadata
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: "cx",
        status: "pending",
        requested_at: new Date().toISOString(),
      },
    },
  });

  if (authError) {
    throw authError;
  }

  const user = authData.user;
  if (!user) {
    throw new Error("Unable to create account. Please try again.");
  }

  // 2. Insert into cx_profiles table if available
  try {
    await supabase.from("cx_profiles").upsert({
      id: user.id,
      name,
      email,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Could not insert to cx_profiles table (using metadata fallback):", err);
  }

  // 3. Trigger notification to admin email
  await notifyAdminOfNewCX({
    name,
    email,
    id: user.id,
  });

  return {
    user,
    status: "pending" as CXStatus,
  };
}

/**
 * Check customer approval status
 */
export async function getCXStatus(email: string): Promise<{
  status: CXStatus;
  name: string;
  rejection_reason?: string | null;
  user_id?: string;
}> {
  // Try reading from cx_profiles table first
  try {
    const { data, error } = await supabase
      .from("cx_profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!error && data) {
      return {
        status: data.status as CXStatus,
        name: data.name,
        rejection_reason: data.rejection_reason,
        user_id: data.id,
      };
    }
  } catch (err) {
    console.warn("Query cx_profiles error:", err);
  }

  // Fallback: check session user metadata if signed in
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user && session.user.email === email) {
    const meta = session.user.user_metadata || {};
    return {
      status: (meta.status as CXStatus) || "pending",
      name: meta.name || email.split("@")[0],
      rejection_reason: meta.rejection_reason || null,
      user_id: session.user.id,
    };
  }

  return {
    status: "pending",
    name: email.split("@")[0],
  };
}

/**
 * Sign in a customer (CX)
 * Verifies password AND ensures status === 'approved'
 */
export async function signInCX(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured yet in .env.local");
  }

  // 1. Authenticate with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Email not confirmed") || error.message.toLowerCase().includes("not confirmed")) {
      throw new Error("WAITING_FOR_APPROVAL");
    }
    throw error;
  }

  const user = data.user;
  if (!user) {
    throw new Error("Sign in failed. No user found.");
  }

  // 2. Verify customer approval status
  const cxStatus = await getCXStatus(email);

  if (cxStatus.status === "pending") {
    // Sign out immediately so session is not active for unapproved users
    await supabase.auth.signOut();
    throw new Error("WAITING_FOR_APPROVAL");
  }

  if (cxStatus.status === "rejected") {
    await supabase.auth.signOut();
    throw new Error("APPROVAL_DENIED");
  }

  return {
    user,
    session: data.session,
    profile: cxStatus,
  };
}

/**
 * Resend access request (when rejected)
 */
export async function resendCXRequest(email: string, name?: string) {
  try {
    // Update in cx_profiles table
    await supabase
      .from("cx_profiles")
      .update({
        status: "pending",
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);
  } catch (err) {
    console.warn("Could not update cx_profiles table:", err);
  }

  // Notify admin again
  await notifyAdminOfNewCX({
    name: name || email.split("@")[0],
    email,
    id: "resend",
  });

  return { success: true };
}

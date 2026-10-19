import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { email, status } = await req.json();

    if (!email || !status) {
      return NextResponse.json({ error: "Missing email or status" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase service role key not configured in environment" },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Find user by email in Supabase Auth
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const targetUser = usersData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return NextResponse.json({ error: `User with email ${email} not found in auth.` }, { status: 404 });
    }

    // 2. Update user in auth: confirm email and set status in user_metadata
    const updatePayload: {
      email_confirm?: boolean;
      user_metadata: Record<string, unknown>;
    } = {
      user_metadata: {
        ...(targetUser.user_metadata || {}),
        status,
        email_verified: status === "approved",
        updated_at: new Date().toISOString(),
      },
    };

    if (status === "approved") {
      updatePayload.email_confirm = true;
    }

    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUser.id,
      updatePayload
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Update cx_profiles table if it exists
    try {
      await adminClient.from("cx_profiles").upsert({
        id: targetUser.id,
        email: targetUser.email,
        name: (targetUser.user_metadata?.name as string) || email.split("@")[0],
        status,
        approved_at: status === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Notice: cx_profiles table update:", e);
    }

    return NextResponse.json({
      success: true,
      message: `User ${email} status updated to ${status}`,
      user: {
        id: updateData.user.id,
        email: updateData.user.email,
        status,
        confirmed: updateData.user.email_confirmed_at,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const payload = await request.json();
  const { userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ ...payload, password: undefined });
  }

  if (!userId) {
    return unauthorized();
  }

  if (!payload.password || String(payload.password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase admin client is not configured." },
      { status: 500 }
    );
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      name: payload.name,
      role: payload.role,
      accountType: payload.accountType,
      customerId: payload.accountType === "platform_admin" ? null : payload.customerId
    }
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Unable to create Supabase Auth user." }, { status: 400 });
  }

  const authUserId = authData.user.id;
  const customerId = payload.accountType === "platform_admin" ? null : payload.customerId;

  const { error: managedUserError } = await admin
    .from("managed_users")
    .upsert({
      id: authUserId,
      account_type: payload.accountType,
      customer_id: customerId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      status: "active"
    })
    .select("id")
    .single();

  if (managedUserError) {
    await admin.auth.admin.deleteUser(authUserId);
    return NextResponse.json({ error: managedUserError.message }, { status: 400 });
  }

  if (customerId) {
    const { error: membershipError } = await admin
      .from("customer_members")
      .upsert({ customer_id: customerId, user_id: authUserId, role: payload.role });

    if (membershipError) {
      await admin.from("managed_users").delete().eq("id", authUserId);
      await admin.auth.admin.deleteUser(authUserId);
      return NextResponse.json({ error: membershipError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ id: authUserId }, { status: 201 });
}

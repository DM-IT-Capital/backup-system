import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedAdminSupabase, serverConfigError, unauthorized } from "@/lib/api";

function readCustomerIds(payload: { accountType?: string; customerIds?: unknown; customerId?: unknown }) {
  if (payload.accountType === "platform_admin") {
    return [];
  }

  if (Array.isArray(payload.customerIds)) {
    return payload.customerIds.map(String).filter(Boolean);
  }

  return payload.customerId ? [String(payload.customerId)] : [];
}

export async function POST(request: Request) {
  const payload = await request.json();
  const { admin, userId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return demoAccepted({ ...payload, password: undefined });
  }

  if (!userId) {
    return unauthorized();
  }

  if (!payload.password || String(payload.password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const customerIds = readCustomerIds(payload);

  if (payload.accountType === "customer_user" && customerIds.length === 0) {
    return NextResponse.json({ error: "Select at least one customer for this customer user." }, { status: 400 });
  }

  if (!admin) {
    return serverConfigError(configError ?? "Supabase admin client is not configured.");
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      name: payload.name,
      role: payload.role,
      accountType: payload.accountType,
      customerIds
    }
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Unable to create Supabase Auth user." }, { status: 400 });
  }

  const authUserId = authData.user.id;
  const primaryCustomerId = payload.accountType === "platform_admin" ? null : customerIds[0];

  const { error: managedUserError } = await admin
    .from("managed_users")
    .upsert({
      id: authUserId,
      account_type: payload.accountType,
      customer_id: primaryCustomerId,
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

  if (customerIds.length > 0) {
    const memberships = customerIds.map((customerId) => ({
      customer_id: customerId,
      user_id: authUserId,
      role: payload.role
    }));

    const { error: membershipError } = await admin.from("customer_members").upsert(memberships);

    if (membershipError) {
      await admin.from("managed_users").delete().eq("id", authUserId);
      await admin.auth.admin.deleteUser(authUserId);
      return NextResponse.json({ error: membershipError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ id: authUserId }, { status: 201 });
}

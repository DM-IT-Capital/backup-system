import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedAdminSupabase, serverConfigError, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

function readCustomerIds(payload: { accountType?: string; customerIds?: unknown; customerId?: unknown }) {
  if (payload.accountType === "platform_admin") {
    return [];
  }

  if (Array.isArray(payload.customerIds)) {
    return payload.customerIds.map(String).filter(Boolean);
  }

  return payload.customerId ? [String(payload.customerId)] : [];
}

export async function PATCH(request: Request, context: RouteContext) {
  const payload = await request.json();
  const { userId } = await context.params;
  const { admin, userId: actorId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return demoAccepted({ userId, ...payload });
  }

  if (!actorId) {
    return unauthorized();
  }

  if (!admin) {
    return serverConfigError(configError ?? "Supabase admin client is not configured.");
  }

  const customerIds = readCustomerIds(payload);

  if (payload.accountType === "customer_user" && customerIds.length === 0) {
    return NextResponse.json({ error: "Select at least one customer for this customer user." }, { status: 400 });
  }

  const primaryCustomerId = payload.accountType === "platform_admin" ? null : customerIds[0];

  const { error } = await admin
    .from("managed_users")
    .update({
      account_type: payload.accountType,
      customer_id: primaryCustomerId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      status: payload.status
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await admin.from("customer_members").delete().eq("user_id", userId);

    if (customerIds.length > 0) {
      await admin.from("customer_members").upsert(
        customerIds.map((customerId) => ({
          customer_id: customerId,
          user_id: userId,
          role: payload.role
        }))
      );
    }

    await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        name: payload.name,
        role: payload.role,
        accountType: payload.accountType,
        customerIds
      }
    });
  } catch {
    // The managed user was updated. Membership sync requires SUPABASE_SERVICE_ROLE_KEY.
  }

  return NextResponse.json({ accepted: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId } = await context.params;
  const { admin, userId: actorId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return demoAccepted({ userId });
  }

  if (!actorId) {
    return unauthorized();
  }

  if (!admin) {
    return serverConfigError(configError ?? "Supabase admin client is not configured.");
  }

  const { error } = await admin.from("managed_users").delete().eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await admin.from("customer_members").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // Managed user deletion has succeeded. Auth cleanup requires SUPABASE_SERVICE_ROLE_KEY.
  }

  return NextResponse.json({ accepted: true });
}

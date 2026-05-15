import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const payload = await request.json();
  const { userId } = await context.params;
  const { supabase, userId: actorId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ userId, ...payload });
  }

  if (!supabase || !actorId) {
    return unauthorized();
  }

  const { error } = await supabase
    .from("managed_users")
    .update({
      customer_id: payload.customerId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      status: payload.status
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId } = await context.params;
  const { supabase, userId: actorId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ userId });
  }

  if (!supabase || !actorId) {
    return unauthorized();
  }

  const { error } = await supabase.from("managed_users").delete().eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

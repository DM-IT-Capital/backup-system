import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ restoreId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const payload = await request.json();
  const { restoreId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ restoreId, ...payload });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { error } = await supabase
    .from("restore_requests")
    .update({
      customer_id: payload.customerId,
      server_id: payload.serverId,
      restore_point: payload.restorePoint,
      target: payload.target
    })
    .eq("id", restoreId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { restoreId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ restoreId });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { error } = await supabase.from("restore_requests").delete().eq("id", restoreId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ serverId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const payload = await request.json();
  const { serverId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ serverId, ...payload });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { error } = await supabase
    .from("protected_servers")
    .update({
      customer_id: payload.customerId,
      hostname: payload.hostname,
      address: payload.address,
      kind: payload.kind
    })
    .eq("id", serverId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { serverId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ serverId });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { error } = await supabase.from("protected_servers").delete().eq("id", serverId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

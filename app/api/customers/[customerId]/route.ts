import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const payload = await request.json();
  const { customerId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ customerId, ...payload });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { error } = await supabase
    .from("customers")
    .update({ name: payload.name, mode: payload.mode })
    .eq("id", customerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { customerId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ customerId });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { error } = await supabase.from("customers").delete().eq("id", customerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

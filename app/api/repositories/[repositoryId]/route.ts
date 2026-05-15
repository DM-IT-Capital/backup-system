import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ repositoryId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const payload = await request.json();
  const { repositoryId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ repositoryId, ...payload });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { error } = await supabase
    .from("repositories")
    .update({
      customer_id: payload.customerId,
      name: payload.name,
      repository_type: payload.type,
      config: {
        location: payload.location,
        capacityGb: payload.capacityGb,
        usedGb: payload.usedGb,
        immutable: payload.immutable,
        status: payload.status ?? "idle"
      }
    })
    .eq("id", repositoryId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { repositoryId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ repositoryId });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { error } = await supabase.from("repositories").delete().eq("id", repositoryId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

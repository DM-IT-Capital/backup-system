import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedAdminSupabase, serverConfigError, unauthorized } from "@/lib/api";

export async function POST(request: Request) {
  const payload = await request.json();
  const { admin, userId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return demoAccepted(payload);
  }

  if (!userId) {
    return unauthorized();
  }

  if (!admin) {
    return serverConfigError(configError ?? "Supabase admin client is not configured.");
  }

  const { data, error } = await admin
    .from("repositories")
    .insert({
      customer_id: payload.customerId,
      name: payload.name,
      repository_type: payload.type,
      config: {
        location: payload.location,
        capacityGb: payload.capacityGb,
        usedGb: payload.usedGb ?? 0,
        immutable: payload.immutable,
        status: payload.status ?? "idle"
      }
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

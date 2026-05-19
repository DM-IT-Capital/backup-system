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
    .from("restore_requests")
    .insert({
      customer_id: payload.customerId,
      server_id: payload.serverId,
      restore_point: payload.restorePoint,
      target: payload.target,
      status: "queued"
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.from("commands").insert({
    customer_id: payload.customerId,
    command_type: "restore",
    payload: {
      restore_request_id: data.id,
      server_id: payload.serverId,
      restore_point: payload.restorePoint,
      target: payload.target
    }
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}

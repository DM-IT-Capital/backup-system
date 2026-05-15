import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";

export async function POST(request: Request) {
  const payload = await request.json();
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted(payload);
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { data, error } = await supabase
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

  await supabase.from("commands").insert({
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

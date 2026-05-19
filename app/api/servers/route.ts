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

  const { data: repository } = await admin
    .from("repositories")
    .select("id")
    .eq("customer_id", payload.customerId)
    .limit(1)
    .maybeSingle();

  const { data: gateway } = await admin
    .from("gateways")
    .select("id")
    .eq("customer_id", payload.customerId)
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("protected_servers")
    .insert({
      customer_id: payload.customerId,
      gateway_id: gateway?.id ?? null,
      hostname: payload.hostname,
      address: payload.address,
      kind: payload.kind,
      agent_status: "not_installed",
      repository_id: repository?.id ?? null
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.from("commands").insert({
    customer_id: payload.customerId,
    gateway_id: gateway?.id ?? null,
    command_type: "deploy_agent",
    payload: {
      server_id: data.id,
      repository_id: repository?.id ?? null,
      address: payload.address,
      kind: payload.kind
    }
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}

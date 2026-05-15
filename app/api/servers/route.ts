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

  const { data: repository } = await supabase
    .from("repositories")
    .select("id")
    .eq("customer_id", payload.customerId)
    .limit(1)
    .maybeSingle();

  const { data: gateway } = await supabase
    .from("gateways")
    .select("id")
    .eq("customer_id", payload.customerId)
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("protected_servers")
    .insert({
      customer_id: payload.customerId,
      gateway_id: gateway?.id ?? null,
      hostname: payload.hostname,
      address: payload.address,
      kind: payload.kind,
      agent_status: "installing",
      repository_id: repository?.id ?? null
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("commands").insert({
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

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

  const repositoryId = typeof payload.repositoryId === "string" && payload.repositoryId.length > 0 ? payload.repositoryId : null;

  if (repositoryId) {
    const { data: repository, error: repositoryError } = await admin
      .from("repositories")
      .select("id")
      .eq("id", repositoryId)
      .eq("customer_id", payload.customerId)
      .maybeSingle();

    if (repositoryError || !repository) {
      return NextResponse.json({ error: "Selected repository does not belong to this customer." }, { status: 400 });
    }
  }

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
      repository_id: repositoryId
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
      repository_id: repositoryId,
      address: payload.address,
      kind: payload.kind
    }
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}

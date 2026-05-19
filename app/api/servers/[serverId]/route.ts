import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedAdminSupabase, serverConfigError, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ serverId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const payload = await request.json();
  const { serverId } = await context.params;
  const { admin, userId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return demoAccepted({ serverId, ...payload });
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

  const { error } = await admin
    .from("protected_servers")
    .update({
      customer_id: payload.customerId,
      hostname: payload.hostname,
      address: payload.address,
      kind: payload.kind,
      repository_id: repositoryId
    })
    .eq("id", serverId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { serverId } = await context.params;
  const { admin, userId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return demoAccepted({ serverId });
  }

  if (!userId) {
    return unauthorized();
  }

  if (!admin) {
    return serverConfigError(configError ?? "Supabase admin client is not configured.");
  }

  const { error } = await admin.from("protected_servers").delete().eq("id", serverId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

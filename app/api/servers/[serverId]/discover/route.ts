import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedAdminSupabase, serverConfigError, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ serverId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { serverId } = await context.params;
  const { admin, userId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return demoAccepted({ serverId, command: "discover_server" });
  }

  if (!userId) {
    return unauthorized();
  }

  if (!admin) {
    return serverConfigError(configError ?? "Supabase admin client is not configured.");
  }

  const { data: server, error: serverError } = await admin
    .from("protected_servers")
    .select("customer_id,gateway_id,address,kind")
    .eq("id", serverId)
    .single();

  if (serverError) {
    return NextResponse.json({ error: serverError.message }, { status: 400 });
  }

  await admin.from("commands").insert({
    customer_id: server.customer_id,
    gateway_id: server.gateway_id,
    command_type: "discover_server",
    payload: {
      server_id: serverId,
      address: server.address,
      kind: server.kind
    }
  });

  return NextResponse.json({ accepted: true });
}

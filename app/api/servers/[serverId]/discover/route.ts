import { NextResponse } from "next/server";
import { getAuthenticatedAdminSupabase, serverConfigError, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ serverId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { serverId } = await context.params;
  const { admin, userId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return NextResponse.json({
      accepted: true,
      demo: true,
      status: "checking",
      message: "Demo mode: discovery queued. A real gateway result is required before marking a server reachable."
    });
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

  const { error: commandError } = await admin.from("commands").insert({
    customer_id: server.customer_id,
    gateway_id: server.gateway_id,
    command_type: "discover_server",
    payload: {
      server_id: serverId,
      address: server.address,
      kind: server.kind
    }
  });

  if (commandError) {
    return NextResponse.json({ error: commandError.message }, { status: 400 });
  }

  await admin
    .from("protected_servers")
    .update({ last_seen_at: null })
    .eq("id", serverId);

  return NextResponse.json({
    accepted: true,
    status: "checking",
    message: "Discovery command queued. The server will only become reachable after the gateway reports a successful result."
  });
}

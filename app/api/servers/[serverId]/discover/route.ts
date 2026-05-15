import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ serverId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { serverId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ serverId, command: "discover_server" });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { data: server, error: serverError } = await supabase
    .from("protected_servers")
    .select("customer_id,gateway_id,address,kind")
    .eq("id", serverId)
    .single();

  if (serverError) {
    return NextResponse.json({ error: serverError.message }, { status: 400 });
  }

  await supabase.from("commands").insert({
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

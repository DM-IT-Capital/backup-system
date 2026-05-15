import { NextResponse } from "next/server";

type HeartbeatPayload = {
  agentId?: string;
  customerId?: string;
  hostname?: string;
  address?: string;
  version?: string;
  capabilities?: string[];
};

export async function POST(request: Request) {
  const payload = (await request.json()) as HeartbeatPayload;

  if (!payload.agentId || !payload.customerId) {
    return NextResponse.json(
      { error: "agentId and customerId are required" },
      { status: 400 }
    );
  }

  // Replace this with a Supabase upsert into agents + agent_heartbeats.
  return NextResponse.json({
    accepted: true,
    nextPollSeconds: 20,
    commandsEndpoint: `/api/agents/${payload.agentId}/commands`,
    received: {
      agentId: payload.agentId,
      customerId: payload.customerId,
      hostname: payload.hostname ?? "unknown",
      address: payload.address ?? "unknown",
      version: payload.version ?? "unknown",
      capabilities: payload.capabilities ?? []
    }
  });
}

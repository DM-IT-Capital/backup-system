import { NextResponse } from "next/server";
import { jobs } from "@/lib/mock-data";
import type { ProtectionAction } from "@/lib/types";

type CreateJobPayload = {
  customerId?: string;
  name?: string;
  action?: ProtectionAction;
  target?: string;
  schedule?: string;
};

export async function GET() {
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as CreateJobPayload;

  if (!payload.customerId || !payload.name || !payload.action || !payload.target) {
    return NextResponse.json(
      { error: "customerId, name, action, and target are required" },
      { status: 400 }
    );
  }

  // Replace this with a Supabase insert and queue command for the on-prem gateway.
  return NextResponse.json(
    {
      id: `job-${Date.now()}`,
      status: "queued",
      schedule: payload.schedule ?? "manual",
      ...payload
    },
    { status: 201 }
  );
}

import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const payload = await request.json();
  const { jobId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ jobId, ...payload });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { error } = await supabase
    .from("protection_jobs")
    .update({
      customer_id: payload.customerId,
      name: payload.name,
      action: payload.action,
      schedule_cron: payload.schedule,
      policy: {
        target: payload.target,
        rpo: payload.rpo,
        status: payload.status ?? "idle"
      }
    })
    .eq("id", jobId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ jobId });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { error } = await supabase.from("protection_jobs").delete().eq("id", jobId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedAdminSupabase, serverConfigError, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const payload = await request.json();
  const { jobId } = await context.params;
  const { admin, userId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return demoAccepted({ jobId, ...payload });
  }

  if (!userId) {
    return unauthorized();
  }

  if (!admin) {
    return serverConfigError(configError ?? "Supabase admin client is not configured.");
  }

  const { error } = await admin
    .from("protection_jobs")
    .update({
      customer_id: payload.customerId,
      name: payload.name,
      action: payload.action,
      schedule_cron: payload.schedule,
      policy: {
        target: payload.target,
        rpo: payload.rpo,
        status: payload.status ?? "idle",
        repositoryId: payload.repository,
        progressPercent: payload.progressPercent ?? 0,
        throughputMbps: payload.throughputMbps ?? 0,
        processedGb: payload.processedGb ?? 0,
        duration: payload.duration ?? "0 min",
        bottleneck: payload.bottleneck ?? "Pending"
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
  const { admin, userId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return demoAccepted({ jobId });
  }

  if (!userId) {
    return unauthorized();
  }

  if (!admin) {
    return serverConfigError(configError ?? "Supabase admin client is not configured.");
  }

  const { error } = await admin.from("protection_jobs").delete().eq("id", jobId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accepted: true });
}

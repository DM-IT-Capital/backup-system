import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedAdminSupabase, serverConfigError, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  await request.json();
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

  const { data: job, error: jobError } = await admin
    .from("protection_jobs")
    .select("customer_id,action,policy")
    .eq("id", jobId)
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 400 });
  }

  const policy = typeof job.policy === "object" && job.policy !== null ? job.policy : {};

  await admin
    .from("protection_jobs")
    .update({
      policy: {
        ...policy,
        status: "running",
        progressPercent: Math.max(Number(policy.progressPercent ?? 0), 5),
        throughputMbps: Number(policy.throughputMbps ?? 180),
        processedGb: Number(policy.processedGb ?? 10),
        duration: "Running",
        bottleneck: "Detecting"
      }
    })
    .eq("id", jobId);

  await admin.from("job_runs").insert({
    customer_id: job.customer_id,
    job_id: jobId,
    status: "running",
    started_at: new Date().toISOString()
  });

  await admin.from("commands").insert({
    customer_id: job.customer_id,
    command_type: job.action,
    payload: {
      job_id: jobId,
      manual_run: true
    }
  });

  return NextResponse.json({ accepted: true });
}

import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  await request.json();
  const { jobId } = await context.params;
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted({ jobId });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { data: job, error: jobError } = await supabase
    .from("protection_jobs")
    .select("customer_id,action,policy")
    .eq("id", jobId)
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 400 });
  }

  const policy = typeof job.policy === "object" && job.policy !== null ? job.policy : {};

  await supabase
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

  await supabase.from("job_runs").insert({
    customer_id: job.customer_id,
    job_id: jobId,
    status: "running",
    started_at: new Date().toISOString()
  });

  await supabase.from("commands").insert({
    customer_id: job.customer_id,
    command_type: job.action,
    payload: {
      job_id: jobId,
      manual_run: true
    }
  });

  return NextResponse.json({ accepted: true });
}

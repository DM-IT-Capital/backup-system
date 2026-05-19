import { NextResponse } from "next/server";
import { jobs } from "@/lib/mock-data";
import { demoAccepted, getAuthenticatedAdminSupabase, serverConfigError, unauthorized } from "@/lib/api";

export async function GET() {
  const { admin, userId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return NextResponse.json({ jobs });
  }

  if (!userId) {
    return unauthorized();
  }

  if (!admin) {
    return serverConfigError(configError ?? "Supabase admin client is not configured.");
  }

  const { data, error } = await admin
    .from("protection_jobs")
    .select("id,customer_id,name,action,schedule_cron,policy,enabled,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ jobs: data });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const { admin, userId, demo, configError } = await getAuthenticatedAdminSupabase();

  if (demo) {
    return demoAccepted(payload);
  }

  if (!userId) {
    return unauthorized();
  }

  if (!admin) {
    return serverConfigError(configError ?? "Supabase admin client is not configured.");
  }

  const { data, error } = await admin
    .from("protection_jobs")
    .insert({
      customer_id: payload.customerId,
      name: payload.name,
      action: payload.action,
      schedule_cron: payload.schedule,
      policy: {
        target: payload.target,
        rpo: payload.rpo,
        status: "queued",
        repositoryId: payload.repository,
        progressPercent: 0,
        throughputMbps: 0,
        processedGb: 0,
        duration: "0 min",
        bottleneck: "Pending"
      }
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.from("job_runs").insert({
    customer_id: payload.customerId,
    job_id: data.id,
    status: "queued"
  });

  await admin.from("commands").insert({
    customer_id: payload.customerId,
    command_type: payload.action,
    payload: {
      job_id: data.id,
      target: payload.target,
      rpo: payload.rpo
    }
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}

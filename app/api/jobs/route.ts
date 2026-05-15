import { NextResponse } from "next/server";
import { jobs } from "@/lib/mock-data";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";

export async function GET() {
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return NextResponse.json({ jobs });
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { data, error } = await supabase
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
  const { supabase, userId, demo } = await getAuthenticatedSupabase();

  if (demo) {
    return demoAccepted(payload);
  }

  if (!supabase || !userId) {
    return unauthorized();
  }

  const { data, error } = await supabase
    .from("protection_jobs")
    .insert({
      customer_id: payload.customerId,
      name: payload.name,
      action: payload.action,
      schedule_cron: payload.schedule,
      policy: {
        target: payload.target,
        rpo: payload.rpo,
        status: "queued"
      }
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("job_runs").insert({
    customer_id: payload.customerId,
    job_id: data.id,
    status: "queued"
  });

  await supabase.from("commands").insert({
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

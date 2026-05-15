import { NextResponse } from "next/server";
import { demoAccepted, getAuthenticatedSupabase, unauthorized } from "@/lib/api";

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
    .from("managed_users")
    .insert({
      customer_id: payload.customerId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      status: "invited"
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

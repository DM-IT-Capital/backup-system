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
    .from("customers")
    .insert({
      name: payload.name,
      mode: payload.mode
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("customer_members").insert({
    customer_id: data.id,
    user_id: userId,
    role: "owner"
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}

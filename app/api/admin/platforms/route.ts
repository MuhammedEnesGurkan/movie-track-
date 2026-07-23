import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return { supabase, error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }

  return { supabase, error: null };
}

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("streaming_platforms")
    .select("*")
    .order("name");

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ platforms: data });
}

export async function POST(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { tmdb_provider_id, name, logo_path, monthly_price, currency } = body;

  if (!tmdb_provider_id || !name) {
    return NextResponse.json({ error: "tmdb_provider_id ve name zorunlu" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("streaming_platforms")
    .insert({
      tmdb_provider_id: Number(tmdb_provider_id),
      name,
      logo_path: logo_path || null,
      monthly_price: monthly_price ? Number(monthly_price) : null,
      currency: currency || "TRY",
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ platform: data });
}

export async function PATCH(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { id, name, logo_path, monthly_price, currency } = body;

  if (!id) {
    return NextResponse.json({ error: "id zorunlu" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("streaming_platforms")
    .update({
      name,
      logo_path: logo_path || null,
      monthly_price: monthly_price === null || monthly_price === "" ? null : Number(monthly_price),
      currency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ platform: data });
}

export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id zorunlu" }, { status: 400 });
  }

  const { error: dbError } = await supabase.from("streaming_platforms").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

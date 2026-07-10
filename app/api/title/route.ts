import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractSeasons, extractTRProviders, getTitleDetails } from "@/lib/tmdb";
import type { Title, TitleType } from "@/lib/types";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isFresh(cachedAt: string) {
  return Date.now() - new Date(cachedAt).getTime() < SEVEN_DAYS_MS;
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") as TitleType | null;
  const id = req.nextUrl.searchParams.get("id");

  if (!type || !id || (type !== "movie" && type !== "tv")) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const tmdbId = Number(id);
  const db = supabaseAdmin();

  const { data: cached } = await db
    .from("titles")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (cached && isFresh(cached.cached_at)) {
    return NextResponse.json({ title: cached as Title });
  }

  try {
    const details = await getTitleDetails(type, id);

    const row: Title = {
      tmdb_id: tmdbId,
      type,
      title: details.title ?? details.name,
      poster_path: details.poster_path ?? null,
      backdrop_path: details.backdrop_path ?? null,
      providers: extractTRProviders(details),
      seasons: type === "tv" ? extractSeasons(details) : [],
      vote: details.vote_average ?? null,
      cached_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await db
      .from("titles")
      .upsert(row)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ title: upserted as Title });
  } catch (err) {
    console.error("api/title failed", err);
    if (cached) {
      return NextResponse.json({ title: cached as Title, stale: true });
    }
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null
          ? JSON.stringify(err)
          : String(err);
    return NextResponse.json({ error: "TMDB unavailable", detail: message }, { status: 502 });
  }
}

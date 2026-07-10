import { NextRequest, NextResponse } from "next/server";
import { searchMulti } from "@/lib/tmdb";
import type { SearchResult } from "@/lib/types";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await searchMulti(q);
    const results: SearchResult[] = (data.results ?? [])
      .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
      .slice(0, 10)
      .map((r: any) => ({
        tmdb_id: r.id,
        type: r.media_type,
        title: r.title ?? r.name,
        poster_path: r.poster_path ?? null,
        vote: r.vote_average ?? null,
      }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}

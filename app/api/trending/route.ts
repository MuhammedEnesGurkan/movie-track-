import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getTrending } from "@/lib/tmdb";
import type { SearchResult } from "@/lib/types";

const getCachedTrending = unstable_cache(
  async (): Promise<SearchResult[]> => {
    const data = await getTrending();
    return (data.results ?? [])
      .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
      .map((r: any) => ({
        tmdb_id: r.id,
        type: r.media_type,
        title: r.title ?? r.name,
        poster_path: r.poster_path ?? null,
        vote: r.vote_average ?? null,
      }));
  },
  ["trending-week"],
  { revalidate: 60 * 60 * 24 }
);

export async function GET() {
  try {
    const results = await getCachedTrending();
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}

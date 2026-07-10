import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSimilar, getTrending } from "@/lib/tmdb";
import type { SearchResult, TitleType } from "@/lib/types";

function mapResults(list: any[]): SearchResult[] {
  return (list ?? [])
    .filter((r: any) => r.media_type === "movie" || r.media_type === "tv" || r.id)
    .map((r: any) => ({
      tmdb_id: r.id,
      type: (r.media_type ?? (r.title ? "movie" : "tv")) as TitleType,
      title: r.title ?? r.name,
      poster_path: r.poster_path ?? null,
      vote: r.vote_average ?? null,
    }));
}

const getCachedTrending = unstable_cache(
  async (): Promise<SearchResult[]> => {
    const data = await getTrending();
    return mapResults(data.results);
  },
  ["trending-week"],
  { revalidate: 60 * 60 * 24 }
);

// "Senin İçin" rayı için: bir başlığa benzer içerikler (24 saat cache)
const getCachedSimilar = unstable_cache(
  async (type: TitleType, id: number): Promise<SearchResult[]> => {
    const data = await getSimilar(type, id);
    return mapResults(
      (data.results ?? []).map((r: any) => ({ ...r, media_type: type }))
    );
  },
  ["similar-title"],
  { revalidate: 60 * 60 * 24 }
);

export async function GET(req: NextRequest) {
  const similarTo = req.nextUrl.searchParams.get("similarTo");
  const type = req.nextUrl.searchParams.get("type") as TitleType | null;

  try {
    if (similarTo && (type === "movie" || type === "tv")) {
      const results = await getCachedSimilar(type, Number(similarTo));
      return NextResponse.json({ results });
    }
    const results = await getCachedTrending();
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}

"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search as SearchIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PosterCard from "@/components/PosterCard";
import type { SearchResult } from "@/lib/types";

const TMDB_IMG = "https://image.tmdb.org/t/p";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [recommended, setRecommended] = useState<SearchResult[]>([]);
  const [recommendedBecause, setRecommendedBecause] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("focus") === "search") {
      inputRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`).then((r) =>
          r.json()
        );
        setResults(res.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const trendData = await fetch("/api/trending").then((r) => r.json());
      const trendResults: SearchResult[] = trendData.results ?? [];
      setTrending(trendResults);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRecommended(trendResults);
        return;
      }

      const { data: watchingRow } = await supabase
        .from("user_progress")
        .select("tmdb_id, titles(type, title)")
        .eq("status", "watching")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const watchingType = (watchingRow as any)?.titles?.type;
      const watchingTitle = (watchingRow as any)?.titles?.title as string | undefined;
      if (!watchingRow || !watchingType) {
        setRecommended(trendResults);
        return;
      }

      const simData = await fetch(
        `/api/trending?similarTo=${watchingRow.tmdb_id}&type=${watchingType}`
      ).then((r) => r.json());
      const simResults: SearchResult[] = simData.results ?? [];
      const hasSimResults = simResults.length > 0;
      setRecommended(hasSimResults ? simResults : trendResults);
      setRecommendedBecause(hasSimResults && watchingTitle ? watchingTitle : null);
    })();
  }, []);

  const showSearch = query.trim().length > 0;

  return (
    <main className="px-4 pt-6 md:px-6 lg:px-8">
      <div className="relative md:mx-auto md:max-w-xl">
        <SearchIcon
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Dizi veya film ara..."
          className="w-full rounded-full border border-white/5 bg-card py-3 pl-11 pr-4 text-sm outline-none placeholder:text-white/30 focus:border-accent/50"
        />
      </div>

      {showSearch ? (
        <div className="mt-4 flex flex-col gap-2 md:mx-auto md:max-w-xl">
          {searching && <p className="py-6 text-center text-sm text-white/40">Aranıyor...</p>}
          {!searching && results.length === 0 && (
            <p className="py-6 text-center text-sm text-white/40">Sonuç bulunamadı</p>
          )}
          {results.map((r) => (
            <Link
              key={`${r.type}-${r.tmdb_id}`}
              href={`/title/${r.type}/${r.tmdb_id}`}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card p-2"
            >
              <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-white/5">
                {r.poster_path && (
                  <Image
                    src={`${TMDB_IMG}/w154${r.poster_path}`}
                    alt={r.title}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-xs text-white/40">
                  {r.type === "movie" ? "Film" : "Dizi"}
                  {r.vote ? ` · ⭐ ${r.vote.toFixed(1)}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          <Rail title="Senin İçin" caption={recommendedBecause ? `${recommendedBecause} izlediğin için` : undefined} items={recommended} />
          <Rail title="Trend" items={trending} />
        </div>
      )}
    </main>
  );
}

function Rail({ title, caption, items }: { title: string; caption?: string; items: SearchResult[] }) {
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3 border-b border-accent/20 pb-2">
        <h2 className="font-display text-2xl tracking-wide text-accent">{title}</h2>
        {caption && <p className="truncate text-xs text-white/40">{caption}</p>}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible xl:grid-cols-7">
        {items.map((item) => (
          <PosterCard
            key={`${item.type}-${item.tmdb_id}`}
            tmdbId={item.tmdb_id}
            type={item.type}
            title={item.title}
            posterPath={item.poster_path}
          />
        ))}
      </div>
    </section>
  );
}

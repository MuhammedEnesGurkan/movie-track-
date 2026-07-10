"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search as SearchIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
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
        .select("tmdb_id, titles(type)")
        .eq("status", "watching")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const watchingType = (watchingRow as any)?.titles?.type;
      if (!watchingRow || !watchingType) {
        setRecommended(trendResults);
        return;
      }

      const simData = await fetch(
        `/api/trending?similarTo=${watchingRow.tmdb_id}&type=${watchingType}`
      ).then((r) => r.json());
      const simResults: SearchResult[] = simData.results ?? [];
      setRecommended(simResults.length ? simResults : trendResults);
    })();
  }, []);

  const showSearch = query.trim().length > 0;

  return (
    <main className="px-4 pt-6">
      <div className="relative">
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
        <div className="mt-4 flex flex-col gap-2">
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
        <div className="mt-6 flex flex-col gap-6">
          <Rail title="Senin İçin" items={recommended} />
          <Rail title="Trend" items={trending} />
        </div>
      )}
    </main>
  );
}

function Rail({ title, items }: { title: string; items: SearchResult[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-white/80">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
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

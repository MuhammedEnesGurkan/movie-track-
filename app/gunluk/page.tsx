"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import WatchLogRow from "@/components/WatchLogRow";
import { fetchWatchLog } from "@/lib/fetchWatchLog";
import { groupByDay, type WatchLogEntry } from "@/lib/watchStats";

const PAGE_SIZE = 60;

export default function WatchLogPage() {
  const supabase = useMemo(() => createClient(), []);

  const [entries, setEntries] = useState<WatchLogEntry[]>([]);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(true);

  const load = useCallback(
    async (nextLimit: number) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSignedIn(false);
        return;
      }

      // Bir fazlasını isteyip "daha var mı"yı ayrı sorgu atmadan anlıyoruz.
      const rows = await fetchWatchLog(supabase, user.id, nextLimit + 1);
      setHasMore(rows.length > nextLimit);
      setEntries(rows.slice(0, nextLimit));
    },
    [supabase]
  );

  useEffect(() => {
    (async () => {
      try {
        await load(PAGE_SIZE);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Beklenmedik bir hata oluştu");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  async function handleLoadMore() {
    const nextLimit = limit + PAGE_SIZE;
    setLoadingMore(true);
    try {
      await load(nextLimit);
      setLimit(nextLimit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmedik bir hata oluştu");
    } finally {
      setLoadingMore(false);
    }
  }

  const days = groupByDay(entries);

  return (
    <main className="px-4 pb-6 pt-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-baseline justify-between gap-3 border-b border-accent/20 pb-2">
          <h1 className="font-display text-3xl tracking-wide text-accent">Seyir Günlüğü</h1>
          <Link href="/wrapped" className="shrink-0 text-xs font-medium text-white/50 hover:text-white">
            İzleme Özetin
          </Link>
        </div>
        <p className="mt-2 text-xs text-white/40">
          İşaretlediğin her bölüm ve film, izlediğin tarihle birlikte burada birikir.
        </p>

        {loading && <p className="py-10 text-center text-sm text-white/40">Yükleniyor...</p>}

        {!loading && !signedIn && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-white/50">Günlüğünü görmek için giriş yap.</p>
            <Link
              href="/login"
              className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-black"
            >
              Giriş Yap
            </Link>
          </div>
        )}

        {!loading && signedIn && error && (
          <p className="py-10 text-center text-sm text-red-400">Günlük yüklenemedi. {error}</p>
        )}

        {!loading && signedIn && !error && entries.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-white/50">
              Günlüğün henüz boş. Bir bölümü izlendi işaretlediğinde ilk kaydın buraya düşecek.
            </p>
            <Link
              href="/"
              className="rounded-xl border border-white/10 px-5 py-2 text-sm font-medium text-white/70 transition hover:border-white/25"
            >
              İçerik bul
            </Link>
          </div>
        )}

        {!loading && signedIn && !error && days.length > 0 && (
          <div className="mt-5 flex flex-col gap-5">
            {days.map((day) => (
              <section key={day.key}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">
                  {day.label}
                </p>
                <div className="flex flex-col gap-1.5">
                  {day.entries.map((entry) => (
                    <WatchLogRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </section>
            ))}

            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-xl border border-white/10 py-2 text-sm font-medium text-white/70 transition hover:border-white/25 disabled:opacity-50"
              >
                {loadingMore ? "Yükleniyor..." : "Daha fazla göster"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { clearLeftToWatch, getLeftToWatch } from "@/lib/watchReturn";
import { getNextEpisode } from "@/lib/nextEpisode";
import type { TitleSeason, TitleType, WatchedProgress } from "@/lib/types";

const THRESHOLD_MS = 3 * 60 * 1000;

type WatchReturnPromptProps = {
  userId: string | null;
  tmdbId: number;
  type: TitleType;
  title: string;
  seasons: TitleSeason[];
  progress: WatchedProgress;
  onConfirmEpisode: (seasonNumber: number, episodeNumber: number) => void;
  onConfirmMovie: () => void;
};

export default function WatchReturnPrompt({
  userId,
  tmdbId,
  type,
  title,
  seasons,
  progress,
  onConfirmEpisode,
  onConfirmMovie,
}: WatchReturnPromptProps) {
  const [visible, setVisible] = useState(false);
  const [nextEpisode, setNextEpisode] = useState<{ season: number; episode: number } | null>(
    null
  );

  useEffect(() => {
    if (!userId) return;

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;

      const record = getLeftToWatch();
      if (!record) return;
      if (record.tmdbId !== tmdbId || record.type !== type) return;

      const elapsed = Date.now() - record.leftAt;
      if (elapsed < THRESHOLD_MS) return;

      if (type === "tv") {
        const next = getNextEpisode(seasons, progress);
        if (!next) {
          clearLeftToWatch();
          return;
        }
        setNextEpisode(next);
      }

      setVisible(true);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [userId, tmdbId, type, seasons, progress]);

  if (!userId || !visible) return null;

  function handleYes() {
    if (type === "movie") {
      onConfirmMovie();
    } else if (nextEpisode) {
      onConfirmEpisode(nextEpisode.season, nextEpisode.episode);
    }
    clearLeftToWatch();
    setVisible(false);
  }

  function handleNo() {
    clearLeftToWatch();
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 lg:items-center">
      <div className="w-full max-w-md rounded-t-2xl border-t border-white/10 bg-card p-5 pb-8 lg:rounded-2xl lg:border lg:pb-5">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-white/60">
          {type === "movie"
            ? "İzledin mi?"
            : nextEpisode
              ? `S${nextEpisode.season}B${nextEpisode.episode}'yi izledin mi?`
              : "İzledin mi?"}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleYes}
            className="flex-1 rounded-full bg-accent py-3 text-sm font-semibold text-black"
          >
            {type === "movie" ? "İzledim" : "Evet, işaretle"}
          </button>
          <button
            onClick={handleNo}
            className="flex-1 rounded-full border border-white/20 py-3 text-sm font-semibold text-white"
          >
            Hayır
          </button>
        </div>
      </div>
    </div>
  );
}

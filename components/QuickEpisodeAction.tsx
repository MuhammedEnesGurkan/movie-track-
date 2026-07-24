"use client";

import { Check, Loader2 } from "lucide-react";

type QuickEpisodeActionProps = {
  season: number;
  episode: number;
  onMark: () => void;
  loading?: boolean;
};

export default function QuickEpisodeAction({ season, episode, onMark, loading }: QuickEpisodeActionProps) {
  return (
    <button
      onClick={onMark}
      disabled={loading}
      className="flex items-center justify-center gap-1 rounded-lg border border-accent/30 bg-accent/10 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
      S{season}B{episode}
    </button>
  );
}

import Image from "next/image";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { formatEntryDetail, formatTime, type WatchLogEntry } from "@/lib/watchStats";

const TMDB_IMG = "https://image.tmdb.org/t/p";

export default function WatchLogRow({ entry }: { entry: WatchLogEntry }) {
  return (
    <Link
      href={`/title/${entry.type}/${entry.tmdb_id}`}
      className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06]"
    >
      <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-md bg-black/30">
        {entry.poster_path ? (
          <Image
            src={`${TMDB_IMG}/w154${entry.poster_path}`}
            alt={entry.title}
            fill
            sizes="32px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-white/30">
            {entry.title.slice(0, 1)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{entry.title}</p>
        <p className="flex items-center gap-1.5 text-[11px] text-white/40">
          <span>{formatEntryDetail(entry)}</span>
          <span aria-hidden>·</span>
          <span>{formatTime(entry.watched_at)}</span>
          {entry.rewatch_number > 1 && (
            <span className="flex items-center gap-0.5 text-accent/80">
              <RotateCcw size={9} />
              {entry.rewatch_number}. kez
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

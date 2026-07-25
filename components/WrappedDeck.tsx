"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function WrappedDeck({ tickets }: { tickets: ReactNode[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function syncActive() {
    const el = scrollerRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, tickets.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div
        ref={scrollerRef}
        onScroll={syncActive}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") goTo(active + 1);
          if (e.key === "ArrowLeft") goTo(active - 1);
        }}
        tabIndex={0}
        role="region"
        aria-label="İzleme özeti biletleri"
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {tickets.map((ticket, i) => (
          <div key={i} className="h-[26rem] w-full shrink-0 snap-center sm:h-[28rem]">
            {ticket}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          aria-label="Önceki bilet"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:border-white/25 disabled:opacity-25"
        >
          <ChevronLeft size={15} />
        </button>

        <div className="flex items-center gap-1.5">
          {tickets.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`${i + 1}. bilete git`}
              aria-current={i === active}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-5 bg-accent" : "w-1.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(active + 1)}
          disabled={active === tickets.length - 1}
          aria-label="Sonraki bilet"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:border-white/25 disabled:opacity-25"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

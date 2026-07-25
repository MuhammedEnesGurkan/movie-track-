import type { ReactNode } from "react";

type WrappedTicketProps = {
  /** Biletin sağ üstünde görünen küçük başlık: SEANS, SALON, HESAP... */
  eyebrow: string;
  index: number;
  total: number;
  /** alarm: yalnızca boşa giden abonelik biletinde kullanılır. */
  tone?: "default" | "alarm";
  children: ReactNode;
};

export default function WrappedTicket({
  eyebrow,
  index,
  total,
  tone = "default",
  children,
}: WrappedTicketProps) {
  const isAlarm = tone === "alarm";

  return (
    <article
      className={`ticket-rise flex h-full flex-col rounded-2xl border bg-card ${
        isAlarm ? "border-[#e8674f]/35" : "border-white/10"
      }`}
    >
      <div className="flex items-center justify-between px-5 pt-5">
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
            isAlarm ? "text-[#e8674f]" : "text-accent/70"
          }`}
        >
          {eyebrow}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/25">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center px-5 py-6">{children}</div>

      {/* Yırtma çizgisi: uçlarındaki delikler kenarı "delerek" koçan hissini veriyor */}
      <div className="ticket-notch relative border-t border-dashed border-white/15" />

      <div className="flex items-center justify-between px-5 pb-4 pt-3">
        <span className="font-display text-sm tracking-[0.2em] text-white/30">WATCHLIST</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/25">
          Koçan {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    </article>
  );
}

import { MONTH_NAMES } from "@/lib/watchStats";

// Aylık yoğunluk, 12 kareli bir film şeridi olarak. Kare ne kadar doluysa
// o ay o kadar izlenmiş; boş aylar sönük kare olarak kalıyor ki yılın
// ritmi görünsün.
export default function FilmStrip({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1);

  return (
    <div>
      <div className="flex gap-[3px] rounded-sm bg-black/40 p-[3px]">
        {counts.map((count, month) => {
          const intensity = count / max;
          return (
            <div
              key={month}
              title={`${MONTH_NAMES[month]}: ${count}`}
              className="h-10 flex-1 rounded-[2px] border border-white/5"
              style={{
                backgroundColor:
                  count === 0 ? "rgba(255,255,255,0.03)" : `rgba(242, 169, 59, ${0.18 + intensity * 0.72})`,
              }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[3px] px-[3px]">
        {counts.map((_, month) => (
          <span key={month} className="flex-1 text-center text-[9px] text-white/25">
            {MONTH_NAMES[month].slice(0, 1)}
          </span>
        ))}
      </div>
    </div>
  );
}

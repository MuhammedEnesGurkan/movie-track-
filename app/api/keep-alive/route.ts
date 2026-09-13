import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withTimeout } from "@/lib/withTimeout";

// Supabase yanıt vermezse fonksiyonun Vercel limitinde çökmesindense burada
// süreyi bağlayıp anlaşılır bir hata dönmek daha iyi: cron kaydında
// "timeout" yazar, opak bir çökme görünmez.
const QUERY_TIMEOUT_MS = 5000;

// Supabase ücretsiz planda ~7 gün hareketsiz kalan projeyi duraklatıyor ve
// duraklamış proje tüm siteyi kullanılmaz hâle getiriyordu. Bu uç, cron ile
// günde bir çağrılıp veritabanına küçük bir sorgu atarak projeyi uyanık tutar.
// Zamanlaması vercel.json içinde.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel, CRON_SECRET tanımlıysa bu başlığı kendi cron çağrılarına
  // otomatik ekler. Tanımlı değilse uç açık kalır; tek satır okuyan ucuz bir
  // sorgu olsa da production'da CRON_SECRET tanımlamak gerekir.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, error: "supabase env eksik" }, { status: 500 });
  }

  // Anon anahtar yeterli: streaming_platforms herkese okumaya açık.
  // Sadece canlılık yoklaması yapan bir uç için service_role gereksiz yetki.
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

  const startedAt = Date.now();

  let result;
  try {
    result = await withTimeout(
      supabase.from("streaming_platforms").select("id").limit(1),
      QUERY_TIMEOUT_MS
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, ms: Date.now() - startedAt },
      { status: 503 }
    );
  }

  const ms = Date.now() - startedAt;

  // Hata durumunda 503: cron kayıtlarında ya da bir uptime aracında
  // "Supabase'e ulaşılamıyor" sinyali olarak görünsün.
  if (result === null) {
    return NextResponse.json({ ok: false, error: "supabase timeout", ms }, { status: 503 });
  }

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error.message, ms }, { status: 503 });
  }

  return NextResponse.json({ ok: true, ms });
}

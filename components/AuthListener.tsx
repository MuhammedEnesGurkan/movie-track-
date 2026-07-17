"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearSessionTimeoutState, isIdleTimedOut, touchActivity } from "@/lib/sessionTimeout";

// Oturum kurulduğunda (veya çıkış yapıldığında) server tarafındaki
// cookie'lerin yenisiyle senkron kalması için sayfayı yeniler.
// Ayrıca "Beni Hatırla" işaretlenmemişse uzun süre hareketsizlikte
// otomatik çıkış yapar (Supabase'in kendisi bunu yapmıyor).
export default function AuthListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (isIdleTimedOut()) {
        await supabase.auth.signOut();
        clearSessionTimeoutState();
        router.push("/login");
        router.refresh();
        return;
      }

      touchActivity();
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") clearSessionTimeoutState();
      if (event === "SIGNED_IN") touchActivity();
      router.refresh();
    });

    function handleVisibility() {
      if (document.visibilityState === "visible") touchActivity();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);

  return null;
}

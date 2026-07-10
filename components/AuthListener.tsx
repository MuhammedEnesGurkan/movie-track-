"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Magic link ile oturum kurulduğunda (veya çıkış yapıldığında) server
// tarafındaki cookie'lerin yenisiyle senkron kalması için sayfayı yeniler.
export default function AuthListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}

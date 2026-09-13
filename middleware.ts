import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // API route'ları hariç: /api/title service_role ile çalışıyor,
    // /api/admin/platforms kendi yetki kontrolünü yapıyor, arama ve trend
    // uçları ise oturum istemiyor. Middleware'in oralarda Supabase'e gitmesi
    // her istek için gereksiz bir ağ turu demek.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

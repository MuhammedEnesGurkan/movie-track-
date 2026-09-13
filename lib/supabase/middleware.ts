import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { withTimeout } from "@/lib/withTimeout";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Middleware her istekte çalışır ve dönmezse Vercel tüm siteye 504 verir
// (MIDDLEWARE_INVOCATION_TIMEOUT). Supabase'e yapılan çağrılar ağ üzerinden
// olduğu için yavaşlayabilir ya da hiç dönmeyebilir; bu yüzden hepsi süre
// sınırlı. Normal Supabase yanıtı 50-300ms mertebesinde.
const SUPABASE_TIMEOUT_MS = 3000;

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin");

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Oturum tazeleme kritik yol değil, bir iyileştirme: Supabase'e ulaşılamazsa
  // isteği geçir, sayfa kendi içinde "giriş yapılmamış" durumunu zaten ele
  // alıyor. Siteyi tamamen düşürmektense bozulmuş hâlde ayakta tutmak daha iyi.
  // /admin bunun istisnası: orada doğrulanamayan istek içeri alınmaz.
  let user = null;

  try {
    const result = await withTimeout(supabase.auth.getUser(), SUPABASE_TIMEOUT_MS);
    if (result === null) {
      return isAdminPath ? redirectTo(request, "/") : response;
    }
    user = result.data.user;
  } catch {
    return isAdminPath ? redirectTo(request, "/") : response;
  }

  if (!isAdminPath) {
    return response;
  }

  if (!user) {
    return redirectTo(request, "/login");
  }

  try {
    const result = await withTimeout(
      supabase.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle(),
      SUPABASE_TIMEOUT_MS
    );
    if (!result?.data?.is_admin) {
      return redirectTo(request, "/");
    }
  } catch {
    return redirectTo(request, "/");
  }

  return response;
}

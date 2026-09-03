import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forget-password", "/reset-password", "/callback"];


async function isAuthenticated() {
  const cookieStore = await cookies();
  try {
    const apiUrl = process.env.API_INTERNAL_URL;
    const res = await fetch(`${apiUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Cookie: cookieStore.toString(),
      },
    })
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("access_token")?.value;

  const isPublic = PUBLIC_PATHS.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (!isPublic && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = await isAuthenticated();

  console.log("user in middleware: ", user);

  if (!isPublic && !user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && !user.profile && request.nextUrl.pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|svg|ico)$).*)"],
};

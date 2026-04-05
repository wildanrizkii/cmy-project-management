import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;

  const isLoggedIn = !!session;

  const publicRoutes = ["/", "/login"];

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");

  const isPublicRoute =
    publicRoutes.includes(nextUrl.pathname) ||
    isApiAuthRoute;

  if (isPublicRoute) return NextResponse.next();

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

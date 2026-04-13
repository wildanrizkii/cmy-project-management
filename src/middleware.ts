import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Department } from "@prisma/client";

const ALLOWED_DEPARTMENTS: Department[] = [
  "PROJECT_LEADER",
  "PROJECT_LEADER_COORDINATOR",
];

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

  const userDepartment = session.user?.department as Department | undefined;
  
  if (!userDepartment || !ALLOWED_DEPARTMENTS.includes(userDepartment)) {
    return NextResponse.redirect(new URL("/login?error=forbidden", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const publicPaths = ["/", "/login", "/onboarding"];
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/storage") ||
    pathname.startsWith("/api/garmin/webhook");

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && !role && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (isLoggedIn && role === "athlete" && pathname.startsWith("/coach")) {
    return NextResponse.redirect(new URL("/athlete", req.url));
  }

  if (isLoggedIn && role === "coach" && pathname.startsWith("/athlete")) {
    return NextResponse.redirect(new URL("/coach", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

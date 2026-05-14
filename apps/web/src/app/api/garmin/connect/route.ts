import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { garminRequestTokens } from "@betri/db/schema";
import { getRequestToken, isGarminConfigured } from "@/lib/garmin/oauth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!isGarminConfigured()) {
    return NextResponse.redirect(
      new URL("/athlete/connections?error=garmin_not_configured", req.url),
    );
  }

  const origin = new URL(req.url).origin;
  const callbackUrl = `${origin}/api/garmin/callback`;

  try {
    const { oauthToken, oauthTokenSecret, authorizeUrl } =
      await getRequestToken(callbackUrl);

    await db
      .insert(garminRequestTokens)
      .values({
        oauthToken,
        oauthTokenSecret,
        userId: session.user.id,
      })
      .onConflictDoNothing();

    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    console.error("[garmin] connect error", err);
    return NextResponse.redirect(
      new URL("/athlete/connections?error=garmin_request_token", req.url),
    );
  }
}

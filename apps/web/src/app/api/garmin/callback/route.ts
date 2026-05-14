import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { garminConnections, garminRequestTokens } from "@betri/db/schema";
import { exchangeAccessToken } from "@/lib/garmin/oauth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const oauthToken = url.searchParams.get("oauth_token");
  const oauthVerifier = url.searchParams.get("oauth_verifier");

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.redirect(
      new URL("/athlete/connections?error=garmin_missing_params", req.url),
    );
  }

  const [pending] = await db
    .select()
    .from(garminRequestTokens)
    .where(eq(garminRequestTokens.oauthToken, oauthToken))
    .limit(1);

  if (!pending || pending.userId !== session.user.id) {
    return NextResponse.redirect(
      new URL("/athlete/connections?error=garmin_unknown_token", req.url),
    );
  }

  try {
    const { accessToken, accessTokenSecret } = await exchangeAccessToken(
      oauthToken,
      pending.oauthTokenSecret,
      oauthVerifier,
    );

    await db
      .insert(garminConnections)
      .values({
        userId: session.user.id,
        accessToken,
        accessTokenSecret,
        connectedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: garminConnections.userId,
        set: { accessToken, accessTokenSecret, connectedAt: new Date() },
      });

    await db
      .delete(garminRequestTokens)
      .where(eq(garminRequestTokens.oauthToken, oauthToken));

    return NextResponse.redirect(
      new URL("/athlete/connections?connected=garmin", req.url),
    );
  } catch (err) {
    console.error("[garmin] callback error", err);
    return NextResponse.redirect(
      new URL("/athlete/connections?error=garmin_access_token", req.url),
    );
  }
}

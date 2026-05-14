import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@betri/db/client";
import { activities, garminConnections } from "@betri/db/schema";

// Garmin Activity API "Activity Files" push notification.
// Configure at developer.garmin.com -> your app -> Endpoint Configuration.
// Garmin signs the request via OAuth 1.0a; for Phase 1 we accept any POST and
// log the payload. Production: verify the signature.
//
// Expected body shape (abridged):
// { activityFiles: [{ userId, fileType: "FIT", callbackURL, activityId, ... }] }

interface ActivityFile {
  userId: string;
  userAccessToken?: string;
  fileType: string;
  callbackURL: string;
  activityId?: number | string;
  startTimeInSeconds?: number;
}

export async function POST(req: Request) {
  let body: { activityFiles?: ActivityFile[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const files = body.activityFiles ?? [];
  console.log(`[garmin webhook] received ${files.length} activity file(s)`);

  let queued = 0;
  for (const f of files) {
    if (f.fileType !== "FIT" || !f.callbackURL) continue;

    const [conn] = await db
      .select()
      .from(garminConnections)
      .where(eq(garminConnections.garminUserId, f.userId))
      .limit(1);

    if (!conn) {
      console.warn(`[garmin webhook] no connection for garminUserId=${f.userId}`);
      continue;
    }

    await db.insert(activities).values({
      userId: conn.userId,
      source: "garmin",
      sourceFileKey: f.callbackURL,
      sourceFileName: f.activityId ? `garmin-${f.activityId}.fit` : null,
      startedAt: f.startTimeInSeconds
        ? new Date(f.startTimeInSeconds * 1000)
        : null,
      status: "pending",
    });
    queued++;
  }

  return NextResponse.json({ queued });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

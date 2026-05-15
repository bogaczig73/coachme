import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities } from "@betri/db/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const rpe = body.rpe != null ? Number(body.rpe) : null;
  const feeling = body.feeling != null ? Number(body.feeling) : null;
  const athleteNotes = typeof body.athleteNotes === "string" ? body.athleteNotes.slice(0, 2000) : null;

  if (rpe !== null && (rpe < 1 || rpe > 10 || !Number.isInteger(rpe))) {
    return new NextResponse("rpe must be integer 1–10", { status: 400 });
  }
  if (feeling !== null && (feeling < 1 || feeling > 5 || !Number.isInteger(feeling))) {
    return new NextResponse("feeling must be integer 1–5", { status: 400 });
  }

  const [exists] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(and(eq(activities.id, id), eq(activities.userId, session.user.id)))
    .limit(1);

  if (!exists) return new NextResponse("Not found", { status: 404 });

  await db
    .update(activities)
    .set({ rpe, feeling, athleteNotes, updatedAt: new Date() })
    .where(and(eq(activities.id, id), eq(activities.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { plannedWorkouts, activities } from "@betri/db/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const activityId: string | null = body.activityId ?? null;

  // Verify the planned workout belongs to this athlete
  const [pw] = await db
    .select({ athleteUserId: plannedWorkouts.athleteUserId })
    .from(plannedWorkouts)
    .where(eq(plannedWorkouts.id, id))
    .limit(1);

  if (!pw) return new NextResponse("Not found", { status: 404 });
  if (pw.athleteUserId !== session.user.id) return new NextResponse("Forbidden", { status: 403 });

  // If linking, verify the activity belongs to this athlete too
  if (activityId !== null) {
    const [act] = await db
      .select({ userId: activities.userId })
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);
    if (!act || act.userId !== session.user.id) {
      return new NextResponse("Activity not found", { status: 404 });
    }
  }

  await db
    .update(plannedWorkouts)
    .set({ completedActivityId: activityId, updatedAt: new Date() })
    .where(eq(plannedWorkouts.id, id));

  return NextResponse.json({ ok: true });
}

import { and, eq, gte, lte, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities, plannedWorkouts, users } from "@betri/db/schema";
import { assertCoaches } from "@/lib/access";
import { CalendarGrid } from "@/components/calendar/calendar-grid";

interface Props {
  params: Promise<{ athleteId: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function CoachAthleteCalendarPage({ params, searchParams }: Props) {
  const { athleteId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    await assertCoaches(session.user.id, athleteId);
  } catch {
    notFound();
  }

  const [athleteRow] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, athleteId))
    .limit(1);
  if (!athleteRow) notFound();

  const sp = await searchParams;
  const now = new Date();
  const year = sp.year ? parseInt(sp.year, 10) : now.getFullYear();
  const month = sp.month ? parseInt(sp.month, 10) : now.getMonth() + 1;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const lastDayStr = String(new Date(year, month, 0).getDate()).padStart(2, "0");
  const monthStr = String(month).padStart(2, "0");

  const [planned, done] = await Promise.all([
    db
      .select()
      .from(plannedWorkouts)
      .where(
        and(
          eq(plannedWorkouts.athleteUserId, athleteId),
          gte(plannedWorkouts.scheduledDate, `${year}-${monthStr}-01`),
          lte(plannedWorkouts.scheduledDate, `${year}-${monthStr}-${lastDayStr}`),
        ),
      )
      .orderBy(plannedWorkouts.scheduledDate),
    db
      .select({
        id: activities.id,
        name: activities.name,
        sport: activities.sport,
        startedAt: activities.startedAt,
        durationSec: activities.durationSec,
        distanceM: activities.distanceM,
        tss: activities.tss,
      })
      .from(activities)
      .where(
        and(
          eq(activities.userId, athleteId),
          eq(activities.status, "ready"),
          gte(activities.startedAt, monthStart),
          lte(activities.startedAt, monthEnd),
        ),
      )
      .orderBy(desc(activities.startedAt)),
  ]);

  const calendarActivities = done.map((a) => ({
    ...a,
    startedAt: a.startedAt ? a.startedAt.toISOString() : null,
    detailHref: `/coach/athletes/${athleteId}/activities/${a.id}`,
  }));

  const athleteName = athleteRow.name ?? athleteRow.email ?? "Athlete";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{athleteName} — Training Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Plan workouts and track completions for this athlete
        </p>
      </div>

      <CalendarGrid
        year={year}
        month={month}
        plannedWorkouts={planned}
        activities={calendarActivities}
        athleteUserId={athleteId}
        canCreate
        calendarBaseHref={`/coach/athletes/${athleteId}/calendar`}
        icsHref={`/api/calendar/ics?athleteId=${athleteId}&year=${year}&month=${month}`}
      />
    </div>
  );
}

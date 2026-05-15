import { and, eq, gte, lte, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities, plannedWorkouts, users, coachAthletes } from "@betri/db/schema";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import Link from "next/link";

function weekMonday(date: Date): Date {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function CoachCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ athleteId?: string }>;
}) {
  const { athleteId: selectedId } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const coachId = session.user.id;

  const athletes = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(coachAthletes)
    .innerJoin(users, eq(users.id, coachAthletes.athleteUserId))
    .where(and(eq(coachAthletes.coachUserId, coachId), eq(coachAthletes.status, "active")));

  if (athletes.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Training Calendar</h1>
        <div className="rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
          No active athletes yet.{" "}
          <Link href="/coach/athletes" className="underline hover:text-foreground">
            Invite an athlete
          </Link>{" "}
          to get started.
        </div>
      </div>
    );
  }

  const athleteId =
    selectedId && athletes.some((a) => a.id === selectedId)
      ? selectedId
      : athletes[0].id;

  const selectedAthlete = athletes.find((a) => a.id === athleteId)!;

  const today = new Date();
  const todayStr = toYMD(today);

  const windowStart = weekMonday(today);
  windowStart.setDate(windowStart.getDate() - 4 * 7);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowStart.getDate() + 13 * 7 - 1);
  windowEnd.setHours(23, 59, 59, 999);

  const startDate = toYMD(windowStart);
  const endDate = toYMD(windowEnd);

  const [planned, done] = await Promise.all([
    db
      .select()
      .from(plannedWorkouts)
      .where(
        and(
          eq(plannedWorkouts.athleteUserId, athleteId),
          gte(plannedWorkouts.scheduledDate, startDate),
          lte(plannedWorkouts.scheduledDate, endDate),
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
        avgPowerW: activities.avgPowerW,
        normalizedPowerW: activities.normalizedPowerW,
        avgHrBpm: activities.avgHrBpm,
        avgSpeedMps: activities.avgSpeedMps,
        tss: activities.tss,
        rpe: activities.rpe,
        feeling: activities.feeling,
      })
      .from(activities)
      .where(
        and(
          eq(activities.userId, athleteId),
          eq(activities.status, "ready"),
          gte(activities.startedAt, windowStart),
          lte(activities.startedAt, windowEnd),
        ),
      )
      .orderBy(desc(activities.startedAt)),
  ]);

  const calendarActivities = done.map((a) => ({
    ...a,
    startedAt: a.startedAt ? a.startedAt.toISOString() : null,
    detailHref: `/coach/athletes/${athleteId}/activities/${a.id}`,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Training Calendar</h1>
        <p className="text-sm text-muted-foreground">
          {selectedAthlete.name ?? selectedAthlete.email} — plan and track workouts
        </p>
      </div>

      {/* Athlete selector — only shown when there are multiple athletes */}
      {athletes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {athletes.map((a) => {
            const active = a.id === athleteId;
            const initials = (a.name ?? a.email ?? "?")
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <a
                key={a.id}
                href={`/coach/calendar?athleteId=${a.id}`}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {a.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                      active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {initials}
                  </span>
                )}
                {a.name ?? a.email}
              </a>
            );
          })}
        </div>
      )}

      <CalendarGrid
        startDate={startDate}
        endDate={endDate}
        todayStr={todayStr}
        plannedWorkouts={planned}
        activities={calendarActivities}
        athleteUserId={athleteId}
        canCreate
        icsHref={`/api/calendar/ics?athleteId=${athleteId}&startDate=${startDate}&endDate=${endDate}`}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities, users, conversations } from "@betri/db/schema";
import { assertCoaches } from "@/lib/access";

function fmtDuration(sec: number | null) {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtDistance(m: number | null) {
  if (!m) return "—";
  return `${(m / 1000).toFixed(2)} km`;
}

export default async function CoachAthletePage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    await assertCoaches(session.user.id, athleteId);
  } catch {
    notFound();
  }

  const [athlete] = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(users)
    .where(eq(users.id, athleteId))
    .limit(1);
  if (!athlete) notFound();

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.athleteUserId, athleteId))
    .limit(1);

  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.userId, athleteId))
    .orderBy(desc(activities.startedAt), desc(activities.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <Link
        href="/coach/athletes"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Athletes
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {athlete.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={athlete.image}
              alt=""
              className="h-12 w-12 rounded-full"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted" />
          )}
          <div>
            <h1 className="text-2xl font-semibold">
              {athlete.name ?? athlete.email}
            </h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} activit{rows.length === 1 ? "y" : "ies"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/coach/athletes/${athleteId}/calendar`}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Calendar
          </Link>
          {conv && (
            <Link
              href={`/chat/${conv.id}`}
              className="rounded-md bg-foreground px-3 py-2 text-sm text-background hover:opacity-90"
            >
              Open chat
            </Link>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
          {athlete.name?.split(" ")[0] ?? "They"} hasn&apos;t uploaded any
          activities yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Sport</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Distance</th>
                <th className="px-4 py-3 font-medium">TSS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/coach/athletes/${athleteId}/activities/${a.id}`}
                      className="font-medium hover:underline"
                    >
                      {a.name ?? a.sport ?? "Activity"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {a.startedAt
                        ? new Date(a.startedAt).toLocaleString()
                        : new Date(a.createdAt).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.sport ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmtDuration(a.durationSec)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmtDistance(a.distanceM)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.tss ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

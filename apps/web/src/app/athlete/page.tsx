import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { db } from "@betri/db/client";
import { activities, garminConnections } from "@betri/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function AthleteHome() {
  const session = await auth();
  const userId = session!.user.id;

  const [recent, garmin] = await Promise.all([
    db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(5),
    db
      .select()
      .from(garminConnections)
      .where(eq(garminConnections.userId, userId))
      .limit(1),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome, {session?.user?.name?.split(" ")[0] ?? "athlete"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload a FIT file or connect Garmin to start tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-6">
          <h2 className="font-semibold">Upload activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag in a .fit file from any device.
          </p>
          <Button asChild className="mt-4">
            <Link href="/athlete/upload">Upload FIT</Link>
          </Button>
        </div>

        <div className="rounded-lg border border-border p-6">
          <h2 className="font-semibold">
            Garmin {garmin.length > 0 ? "connected" : "not connected"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {garmin.length > 0
              ? "Activities will sync automatically."
              : "Connect once to auto-import activities."}
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/athlete/connections">
              {garmin.length > 0 ? "Manage" : "Connect Garmin"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent activities</h2>
          <Link
            href="/athlete/activities"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No activities yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {recent.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {a.name ?? a.sport ?? "Activity"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.startedAt
                      ? new Date(a.startedAt).toLocaleString()
                      : new Date(a.createdAt).toLocaleString()}{" "}
                    · {a.status}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {a.distanceM ? `${(a.distanceM / 1000).toFixed(1)} km` : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

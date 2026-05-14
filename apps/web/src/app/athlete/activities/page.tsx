import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { db } from "@betri/db/client";
import { activities } from "@betri/db/schema";
import { eq, desc } from "drizzle-orm";
import { SportIcon } from "@/components/sport-badge";
import { getSportTheme } from "@/lib/sport";

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

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  parsing: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};

export default async function ActivitiesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.userId, userId))
    .orderBy(desc(activities.startedAt), desc(activities.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Activities</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>
        <Button asChild>
          <Link href="/athlete/upload">
            <Plus className="h-4 w-4" />
            Upload activity
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No activities yet.</p>
          <Link
            href="/athlete/upload"
            className="mt-2 inline-block text-sm font-medium hover:underline"
          >
            Upload your first FIT file →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((a) => {
            const theme = getSportTheme(a.sport);
            return (
              <li key={a.id}>
                <Link
                  href={`/athlete/activities/${a.id}`}
                  className="group flex items-stretch overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-sm"
                >
                  <div
                    className="w-1.5 shrink-0"
                    style={{ background: theme.color }}
                  />
                  <div
                    className="flex items-center justify-center p-3"
                    style={{ background: theme.bg }}
                  >
                    <SportIcon sport={a.sport} className="h-5 w-5" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate font-medium">
                        {a.name ?? a.sourceFileName ?? theme.label}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusStyles[a.status] ?? statusStyles.pending
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.startedAt
                        ? new Date(a.startedAt).toLocaleString()
                        : new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-6 px-4 py-3 text-right text-xs text-muted-foreground sm:flex">
                    <span className="tabular-nums">
                      <span className="block text-[10px] uppercase tracking-wider">
                        Duration
                      </span>
                      <span className="font-medium text-foreground">
                        {fmtDuration(a.durationSec)}
                      </span>
                    </span>
                    <span className="tabular-nums">
                      <span className="block text-[10px] uppercase tracking-wider">
                        Distance
                      </span>
                      <span className="font-medium text-foreground">
                        {fmtDistance(a.distanceM)}
                      </span>
                    </span>
                    <span className="tabular-nums">
                      <span className="block text-[10px] uppercase tracking-wider">
                        TSS
                      </span>
                      <span className="font-medium text-foreground">
                        {a.tss ?? "—"}
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

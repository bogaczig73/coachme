import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities } from "@betri/db/schema";
import { eq, desc } from "drizzle-orm";

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
  parsing: "bg-yellow-500/15 text-yellow-700",
  ready: "bg-green-500/15 text-green-700",
  failed: "bg-red-500/15 text-red-700",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Activities</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>
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
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Sport</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Distance</th>
                <th className="px-4 py-3 font-medium">TSS</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {a.name ?? a.sourceFileName ?? "Activity"}
                    </p>
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
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                        statusStyles[a.status] ?? statusStyles.pending
                      }`}
                    >
                      {a.status}
                    </span>
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

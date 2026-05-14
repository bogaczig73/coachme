import { eq } from "drizzle-orm";
import { db } from "@betri/db/client";
import {
  activities,
  activityStreams,
  athleteProfiles,
} from "@betri/db/schema";
import { parseFit } from "./parse-fit.js";

const PARSE_TIMEOUT_MS = 60_000;

async function downloadFit(url: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PARSE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } finally {
    clearTimeout(t);
  }
}

export async function processOnePending(): Promise<boolean> {
  // Atomically grab one pending activity by flipping its status to "parsing".
  const claimed = await db
    .update(activities)
    .set({ status: "parsing", updatedAt: new Date() })
    .where(eq(activities.status, "pending"))
    .returning();

  // The above flips ALL pending rows — for a single-worker setup that's fine.
  // For multi-worker we'd use SELECT ... FOR UPDATE SKIP LOCKED. Phase 2 problem.
  if (claimed.length === 0) return false;

  for (const a of claimed) {
    try {
      if (!a.sourceFileKey) throw new Error("Missing sourceFileKey");

      const [profile] = await db
        .select({ ftpWatts: athleteProfiles.ftpWatts })
        .from(athleteProfiles)
        .where(eq(athleteProfiles.userId, a.userId))
        .limit(1);

      const buf = await downloadFit(a.sourceFileKey);
      const parsed = await parseFit(buf, profile?.ftpWatts);
      const s = parsed.summary;

      await db
        .insert(activityStreams)
        .values({ activityId: a.id, ...parsed.streams })
        .onConflictDoUpdate({
          target: activityStreams.activityId,
          set: parsed.streams,
        });

      await db
        .update(activities)
        .set({
          sport: s.sport,
          name: a.name ?? (s.sport ? capitalize(s.sport) : "Activity"),
          startedAt: s.startedAt,
          durationSec: s.durationSec,
          movingTimeSec: s.movingTimeSec,
          distanceM: s.distanceM,
          elevationGainM: s.elevationGainM,
          avgPowerW: s.avgPowerW,
          maxPowerW: s.maxPowerW,
          normalizedPowerW: s.normalizedPowerW,
          avgHrBpm: s.avgHrBpm,
          maxHrBpm: s.maxHrBpm,
          avgCadenceRpm: s.avgCadenceRpm,
          avgSpeedMps: s.avgSpeedMps,
          maxSpeedMps: s.maxSpeedMps,
          caloriesKcal: s.caloriesKcal,
          tss: s.tss,
          intensityFactor: s.intensityFactor,
          status: "ready",
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(activities.id, a.id));

      console.log(`[worker] parsed ${a.id} (${s.sport ?? "unknown"}, ${s.durationSec ?? 0}s)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[worker] failed ${a.id}:`, message);
      await db
        .update(activities)
        .set({
          status: "failed",
          errorMessage: message.slice(0, 500),
          updatedAt: new Date(),
        })
        .where(eq(activities.id, a.id));
    }
  }

  return true;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

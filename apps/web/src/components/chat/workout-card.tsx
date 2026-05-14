import Link from "next/link";
import { fmtDuration, fmtDistance } from "@/lib/format";

interface Props {
  activity: {
    id: string;
    name: string | null;
    sport: string | null;
    startedAt: Date | string | null;
    durationSec: number | null;
    distanceM: number | null;
    tss: number | null;
  };
  detailHref: string;
  compact?: boolean;
}

export function WorkoutCard({ activity, detailHref, compact }: Props) {
  const started = activity.startedAt
    ? new Date(activity.startedAt)
    : null;

  return (
    <Link
      href={detailHref}
      className={`block rounded-lg border border-border bg-background/60 transition-colors hover:bg-background ${
        compact ? "px-3 py-2" : "p-3"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className={`truncate font-medium ${compact ? "text-sm" : ""}`}>
          {activity.name ?? activity.sport ?? "Workout"}
        </p>
        {activity.sport && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {activity.sport}
          </span>
        )}
      </div>
      {started && (
        <p className="text-xs text-muted-foreground">
          {started.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}
      {!compact && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{fmtDuration(activity.durationSec)}</span>
          <span>{fmtDistance(activity.distanceM)}</span>
          {activity.tss != null && <span>TSS {activity.tss}</span>}
        </div>
      )}
    </Link>
  );
}

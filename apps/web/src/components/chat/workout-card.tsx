import Link from "next/link";
import { fmtDuration, fmtDistance } from "@/lib/format";
import { SportIcon } from "@/components/sport-badge";
import { getSportTheme } from "@/lib/sport";

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
  const theme = getSportTheme(activity.sport);
  const started = activity.startedAt ? new Date(activity.startedAt) : null;

  return (
    <Link
      href={detailHref}
      className="block overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-sm"
      style={{ borderLeft: `3px solid ${theme.color}` }}
    >
      <div className={compact ? "p-2.5" : "p-3"}>
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{ background: theme.bg }}
          >
            <SportIcon sport={activity.sport} className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`truncate font-semibold ${compact ? "text-sm" : ""}`}>
              {activity.name ?? theme.label}
            </p>
            {started && (
              <p className="text-xs text-muted-foreground">
                {started.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>
        </div>
        {!compact && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{fmtDuration(activity.durationSec)}</span>
            <span>{fmtDistance(activity.distanceM)}</span>
            {activity.tss != null && <span>TSS {activity.tss}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

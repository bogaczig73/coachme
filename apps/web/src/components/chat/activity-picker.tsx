"use client";

import { useEffect } from "react";
import { fmtDuration, fmtDistance } from "@/lib/format";

interface PickerActivity {
  id: string;
  name: string | null;
  sport: string | null;
  startedAt: string | null;
  durationSec: number | null;
  distanceM: number | null;
  tss: number | null;
}

export function ActivityPicker({
  activities,
  onClose,
  onPick,
}: {
  activities: PickerActivity[];
  athleteId: string;
  onClose: () => void;
  onPick: (activityId: string) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-border p-4">
          <h2 className="font-semibold">Attach a workout</h2>
          <p className="text-xs text-muted-foreground">
            Pick an activity to share in the chat.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No activities yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {activities.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onPick(a.id)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {a.name ?? a.sport ?? "Workout"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.startedAt
                          ? new Date(a.startedAt).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <p>{fmtDuration(a.durationSec)}</p>
                      <p>{fmtDistance(a.distanceM)}</p>
                      {a.tss != null && <p>TSS {a.tss}</p>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-border p-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}

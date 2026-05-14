"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type SeriesKey = "powerW" | "hrBpm" | "cadenceRpm" | "speedKph" | "altitudeM";

interface Series {
  key: SeriesKey;
  label: string;
  color: string;
  unit: string;
  yAxisId: "main" | "alt";
  type: "line" | "area";
  defaultOn: boolean;
}

const SERIES: Series[] = [
  { key: "powerW", label: "Power", color: "#ea580c", unit: "W", yAxisId: "main", type: "line", defaultOn: true },
  { key: "hrBpm", label: "HR", color: "#dc2626", unit: "bpm", yAxisId: "main", type: "line", defaultOn: true },
  { key: "cadenceRpm", label: "Cadence", color: "#7c3aed", unit: "rpm", yAxisId: "main", type: "line", defaultOn: false },
  { key: "speedKph", label: "Speed", color: "#0ea5e9", unit: "km/h", yAxisId: "main", type: "line", defaultOn: false },
  { key: "altitudeM", label: "Elevation", color: "#94a3b8", unit: "m", yAxisId: "alt", type: "area", defaultOn: true },
];

interface Props {
  timestampSec: number[];
  powerW: (number | null)[] | null;
  hrBpm: (number | null)[] | null;
  cadenceRpm: (number | null)[] | null;
  speedMps: (number | null)[] | null;
  altitudeM: (number | null)[] | null;
}

const MAX_POINTS = 1200;

function decimate<T>(arr: T[], targetCount: number): T[] {
  if (arr.length <= targetCount) return arr;
  const step = arr.length / targetCount;
  const out: T[] = [];
  for (let i = 0; i < targetCount; i++) {
    out.push(arr[Math.floor(i * step)]!);
  }
  return out;
}

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m}:${s.toString().padStart(2, "0")}`;
}

export function StreamChart({
  timestampSec,
  powerW,
  hrBpm,
  cadenceRpm,
  speedMps,
  altitudeM,
}: Props) {
  const available = useMemo(() => {
    const has = (arr: (number | null)[] | null) =>
      !!arr && arr.some((v) => v != null);
    return {
      powerW: has(powerW),
      hrBpm: has(hrBpm),
      cadenceRpm: has(cadenceRpm),
      speedKph: has(speedMps),
      altitudeM: has(altitudeM),
    };
  }, [powerW, hrBpm, cadenceRpm, speedMps, altitudeM]);

  const [active, setActive] = useState<Record<SeriesKey, boolean>>(() => {
    const init = {} as Record<SeriesKey, boolean>;
    for (const s of SERIES) init[s.key] = s.defaultOn && available[s.key];
    return init;
  });

  const data = useMemo(() => {
    const idx = decimate(
      Array.from({ length: timestampSec.length }, (_, i) => i),
      MAX_POINTS,
    );
    return idx.map((i) => ({
      t: timestampSec[i],
      powerW: powerW?.[i] ?? null,
      hrBpm: hrBpm?.[i] ?? null,
      cadenceRpm: cadenceRpm?.[i] ?? null,
      speedKph: speedMps?.[i] != null ? +(speedMps[i]! * 3.6).toFixed(1) : null,
      altitudeM: altitudeM?.[i] ?? null,
    }));
  }, [timestampSec, powerW, hrBpm, cadenceRpm, speedMps, altitudeM]);

  if (timestampSec.length === 0) {
    return (
      <div className="rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
        No stream data
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {SERIES.filter((s) => available[s.key]).map((s) => (
          <button
            key={s.key}
            onClick={() => setActive((p) => ({ ...p, [s.key]: !p[s.key] }))}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
              active[s.key]
                ? "border-foreground/20 bg-muted"
                : "border-border opacity-50 hover:opacity-75"
            }`}
            type="button"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
          </button>
        ))}
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="t"
              tickFormatter={fmtTime}
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              minTickGap={40}
            />
            <YAxis
              yAxisId="main"
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              width={48}
            />
            <YAxis
              yAxisId="alt"
              orientation="right"
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-background)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(t: number) => fmtTime(t)}
              formatter={(value, name) => {
                if (value == null) return ["—", String(name)];
                const s = SERIES.find((x) => x.label === String(name));
                return [`${value} ${s?.unit ?? ""}`, String(name)];
              }}
            />
            <Legend wrapperStyle={{ display: "none" }} />
            {SERIES.filter((s) => active[s.key]).map((s) =>
              s.type === "area" ? (
                <Area
                  key={s.key}
                  yAxisId={s.yAxisId}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.15}
                  strokeWidth={1}
                  isAnimationActive={false}
                  connectNulls
                  dot={false}
                />
              ) : (
                <Line
                  key={s.key}
                  yAxisId={s.yAxisId}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={1.4}
                  isAnimationActive={false}
                  connectNulls
                  dot={false}
                />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

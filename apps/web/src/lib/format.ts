export function fmtDuration(sec: number | null | undefined): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtDistance(m: number | null | undefined): string {
  if (m == null) return "—";
  return `${(m / 1000).toFixed(2)} km`;
}

export function fmtSpeed(mps: number | null | undefined): string {
  if (mps == null) return "—";
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

export function fmtPace(mps: number | null | undefined): string {
  if (mps == null || mps <= 0) return "—";
  const secPerKm = 1000 / mps;
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

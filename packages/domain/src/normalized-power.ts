/**
 * 30-second rolling average raised to the 4th power, averaged, 4th-root.
 * Inputs: per-second power samples (nulls treated as 0).
 */
export function normalizedPower(powerW: (number | null | undefined)[]): number {
  const samples = powerW.map((p) => (typeof p === "number" && p > 0 ? p : 0));
  if (samples.length < 30) return 0;

  const window = 30;
  let sum = 0;
  let fourthSum = 0;
  let count = 0;

  for (let i = 0; i < samples.length; i++) {
    sum += samples[i]!;
    if (i >= window) sum -= samples[i - window]!;
    if (i >= window - 1) {
      const avg = sum / window;
      fourthSum += avg ** 4;
      count++;
    }
  }

  if (count === 0) return 0;
  return Math.round((fourthSum / count) ** 0.25);
}

export function average(values: (number | null | undefined)[]): number {
  let sum = 0;
  let n = 0;
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) {
      sum += v;
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

export function max(values: (number | null | undefined)[]): number {
  let m = -Infinity;
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v) && v > m) m = v;
  }
  return m === -Infinity ? 0 : m;
}

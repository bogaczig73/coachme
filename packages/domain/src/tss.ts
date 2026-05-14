export interface PowerTssInput {
  durationSec: number;
  normalizedPowerW: number;
  ftpW: number;
}

export function powerTss({ durationSec, normalizedPowerW, ftpW }: PowerTssInput): number {
  if (ftpW <= 0 || durationSec <= 0) return 0;
  const intensityFactor = normalizedPowerW / ftpW;
  const tss = (durationSec * normalizedPowerW * intensityFactor) / (ftpW * 3600) * 100;
  return Math.round(tss);
}

export function intensityFactor(normalizedPowerW: number, ftpW: number): number {
  if (ftpW <= 0) return 0;
  return normalizedPowerW / ftpW;
}

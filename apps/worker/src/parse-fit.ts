// fit-file-parser ships as CJS without proper types. Use require + minimal local typings.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const FitParser = require("fit-file-parser").default;

import { normalizedPower, average, max, powerTss } from "@betri/domain";

interface FitRecord {
  timestamp?: Date;
  elapsed_time?: number;
  position_lat?: number;
  position_long?: number;
  distance?: number;
  altitude?: number;
  speed?: number;
  power?: number;
  heart_rate?: number;
  cadence?: number;
  temperature?: number;
}

interface FitSession {
  sport?: string;
  start_time?: Date;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  total_ascent?: number;
  total_calories?: number;
  avg_power?: number;
  max_power?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_cadence?: number;
  avg_speed?: number;
  max_speed?: number;
  records?: FitRecord[];
}

interface FitData {
  activity?: {
    sessions?: FitSession[];
  };
  sessions?: FitSession[];
  records?: FitRecord[];
}

export interface ParsedFit {
  summary: {
    sport: string | null;
    startedAt: Date | null;
    durationSec: number | null;
    movingTimeSec: number | null;
    distanceM: number | null;
    elevationGainM: number | null;
    avgPowerW: number | null;
    maxPowerW: number | null;
    normalizedPowerW: number | null;
    avgHrBpm: number | null;
    maxHrBpm: number | null;
    avgCadenceRpm: number | null;
    avgSpeedMps: number | null;
    maxSpeedMps: number | null;
    caloriesKcal: number | null;
    tss: number | null;
    intensityFactor: number | null;
  };
  streams: {
    timestampSec: number[];
    powerW: (number | null)[];
    hrBpm: (number | null)[];
    cadenceRpm: (number | null)[];
    speedMps: (number | null)[];
    altitudeM: (number | null)[];
    distanceM: (number | null)[];
    lat: (number | null)[];
    lon: (number | null)[];
    tempC: (number | null)[];
  };
}

function n(v: number | undefined | null): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function parseFit(buffer: Buffer, ftpW?: number | null): Promise<ParsedFit> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      speedUnit: "m/s",
      lengthUnit: "m",
      temperatureUnit: "celsius",
      elapsedRecordField: true,
      mode: "list",
    });

    parser.parse(buffer, (err: Error | null, data: FitData) => {
      if (err) return reject(err);
      try {
        resolve(buildParsedFit(data, ftpW));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function buildParsedFit(data: FitData, ftpW: number | null | undefined): ParsedFit {
  const session: FitSession =
    data.activity?.sessions?.[0] ?? data.sessions?.[0] ?? { records: data.records ?? [] };
  const records: FitRecord[] = session.records ?? data.records ?? [];

  const startedAt = session.start_time ?? records[0]?.timestamp ?? null;
  const startMs = startedAt ? startedAt.getTime() : null;

  const streams: ParsedFit["streams"] = {
    timestampSec: [],
    powerW: [],
    hrBpm: [],
    cadenceRpm: [],
    speedMps: [],
    altitudeM: [],
    distanceM: [],
    lat: [],
    lon: [],
    tempC: [],
  };

  for (const r of records) {
    if (!r.timestamp) continue;
    const t = startMs != null ? Math.round((r.timestamp.getTime() - startMs) / 1000) : streams.timestampSec.length;
    streams.timestampSec.push(t);
    streams.powerW.push(n(r.power));
    streams.hrBpm.push(n(r.heart_rate));
    streams.cadenceRpm.push(n(r.cadence));
    streams.speedMps.push(n(r.speed));
    streams.altitudeM.push(n(r.altitude));
    streams.distanceM.push(n(r.distance));
    streams.lat.push(n(r.position_lat));
    streams.lon.push(n(r.position_long));
    streams.tempC.push(n(r.temperature));
  }

  const durationSec = session.total_elapsed_time != null
    ? Math.round(session.total_elapsed_time)
    : streams.timestampSec.length > 0
      ? streams.timestampSec[streams.timestampSec.length - 1]!
      : null;

  const movingTimeSec = session.total_timer_time != null ? Math.round(session.total_timer_time) : null;

  const avgPower = session.avg_power ?? (streams.powerW.length > 0 ? average(streams.powerW) : null);
  const maxPower = session.max_power ?? (streams.powerW.length > 0 ? max(streams.powerW) : null);
  const np = streams.powerW.length > 0 ? normalizedPower(streams.powerW) : 0;

  let tss: number | null = null;
  let intensityFactor: number | null = null;
  if (ftpW && ftpW > 0 && np > 0 && durationSec) {
    tss = powerTss({ durationSec, normalizedPowerW: np, ftpW });
    intensityFactor = +(np / ftpW).toFixed(3);
  }

  return {
    summary: {
      sport: session.sport ?? null,
      startedAt,
      durationSec,
      movingTimeSec,
      distanceM: session.total_distance != null ? Math.round(session.total_distance) : null,
      elevationGainM: session.total_ascent != null ? Math.round(session.total_ascent) : null,
      avgPowerW: avgPower != null ? Math.round(avgPower) : null,
      maxPowerW: maxPower != null ? Math.round(maxPower) : null,
      normalizedPowerW: np > 0 ? np : null,
      avgHrBpm: session.avg_heart_rate != null ? Math.round(session.avg_heart_rate) : streams.hrBpm.length > 0 ? Math.round(average(streams.hrBpm)) : null,
      maxHrBpm: session.max_heart_rate != null ? Math.round(session.max_heart_rate) : streams.hrBpm.length > 0 ? Math.round(max(streams.hrBpm)) : null,
      avgCadenceRpm: session.avg_cadence != null ? Math.round(session.avg_cadence) : null,
      avgSpeedMps: session.avg_speed ?? null,
      maxSpeedMps: session.max_speed ?? null,
      caloriesKcal: session.total_calories != null ? Math.round(session.total_calories) : null,
      tss,
      intensityFactor,
    },
    streams,
  };
}

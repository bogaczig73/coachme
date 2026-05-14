export type SportKey = "swim" | "bike" | "run" | "strength" | "brick" | "other";

interface SportTheme {
  key: SportKey;
  label: string;
  /** CSS color — reads from --color-sport-* tokens, so it respects dark mode. */
  color: string;
  /** Tinted background, also from CSS tokens. */
  bg: string;
  /** Same hue as color (text/tint variant). */
  tint: string;
  icon: string; // lucide-react icon name
}

export const SPORT_THEMES: Record<SportKey, SportTheme> = {
  swim: {
    key: "swim",
    label: "Swim",
    color: "var(--color-sport-swim)",
    bg: "var(--color-sport-swim-bg)",
    tint: "var(--color-sport-swim)",
    icon: "Waves",
  },
  bike: {
    key: "bike",
    label: "Bike",
    color: "var(--color-sport-bike)",
    bg: "var(--color-sport-bike-bg)",
    tint: "var(--color-sport-bike)",
    icon: "Bike",
  },
  run: {
    key: "run",
    label: "Run",
    color: "var(--color-sport-run)",
    bg: "var(--color-sport-run-bg)",
    tint: "var(--color-sport-run)",
    icon: "Footprints",
  },
  strength: {
    key: "strength",
    label: "Strength",
    color: "var(--color-sport-strength)",
    bg: "var(--color-sport-strength-bg)",
    tint: "var(--color-sport-strength)",
    icon: "Dumbbell",
  },
  brick: {
    key: "brick",
    label: "Brick",
    color: "var(--color-sport-brick)",
    bg: "var(--color-sport-brick-bg)",
    tint: "var(--color-sport-brick)",
    icon: "Zap",
  },
  other: {
    key: "other",
    label: "Activity",
    color: "var(--color-sport-other)",
    bg: "var(--color-sport-other-bg)",
    tint: "var(--color-sport-other)",
    icon: "Activity",
  },
};

const SPORT_ALIASES: Record<string, SportKey> = {
  swim: "swim",
  swimming: "swim",
  open_water_swimming: "swim",
  cycling: "bike",
  bike: "bike",
  biking: "bike",
  road_biking: "bike",
  mountain_biking: "bike",
  indoor_cycling: "bike",
  gravel_cycling: "bike",
  virtual_ride: "bike",
  running: "run",
  run: "run",
  treadmill_running: "run",
  trail_running: "run",
  walking: "run",
  walk: "run",
  hiking: "run",
  strength: "strength",
  strength_training: "strength",
  weight_training: "strength",
  brick: "brick",
  multisport: "brick",
  triathlon: "brick",
};

export function getSportTheme(sport: string | null | undefined): SportTheme {
  if (!sport) return SPORT_THEMES.other;
  const key = SPORT_ALIASES[sport.toLowerCase()] ?? "other";
  return SPORT_THEMES[key];
}

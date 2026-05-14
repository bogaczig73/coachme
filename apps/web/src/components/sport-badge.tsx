import { Waves, Bike, Footprints, Dumbbell, Zap, Activity } from "lucide-react";
import { getSportTheme } from "@/lib/sport";

const ICONS = {
  Waves,
  Bike,
  Footprints,
  Dumbbell,
  Zap,
  Activity,
} as const;

export function SportIcon({
  sport,
  className,
}: {
  sport: string | null | undefined;
  className?: string;
}) {
  const theme = getSportTheme(sport);
  const Icon = ICONS[theme.icon as keyof typeof ICONS] ?? Activity;
  return <Icon className={className} style={{ color: theme.color }} />;
}

export function SportPill({
  sport,
  className,
}: {
  sport: string | null | undefined;
  className?: string;
}) {
  const theme = getSportTheme(sport);
  const Icon = ICONS[theme.icon as keyof typeof ICONS] ?? Activity;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ""}`}
      style={{ background: theme.bg, color: theme.tint }}
    >
      <Icon className="h-3 w-3" />
      {theme.label}
    </span>
  );
}

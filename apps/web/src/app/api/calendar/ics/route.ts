import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { plannedWorkouts, coachAthletes } from "@betri/db/schema";
import { getSportTheme } from "@/lib/sport";
import { fmtDuration, fmtDistance } from "@/lib/format";

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  // RFC 5545: fold lines longer than 75 octets
  const out: string[] = [];
  while (line.length > 75) {
    out.push(line.slice(0, 75));
    line = " " + line.slice(75);
  }
  out.push(line);
  return out.join("\r\n");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const athleteId = searchParams.get("athleteId");
  const year = parseInt(searchParams.get("year") ?? "0", 10);
  const month = parseInt(searchParams.get("month") ?? "0", 10);

  if (!athleteId || !year || !month) {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Auth check: must be the athlete or their active coach
  const isAthlete = session.user.id === athleteId;
  if (!isAthlete) {
    const [coachRow] = await db
      .select()
      .from(coachAthletes)
      .where(
        and(
          eq(coachAthletes.coachUserId, session.user.id),
          eq(coachAthletes.athleteUserId, athleteId),
          eq(coachAthletes.status, "active"),
        ),
      )
      .limit(1);
    if (!coachRow) return new NextResponse("Forbidden", { status: 403 });
  }

  const monthStr = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();

  const rows = await db
    .select()
    .from(plannedWorkouts)
    .where(
      and(
        eq(plannedWorkouts.athleteUserId, athleteId),
        gte(plannedWorkouts.scheduledDate, `${year}-${monthStr}-01`),
        lte(plannedWorkouts.scheduledDate, `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`),
      ),
    );

  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const events = rows.map((pw) => {
    const theme = getSportTheme(pw.sport);
    const dateCompact = pw.scheduledDate.replace(/-/g, "");

    const descParts: string[] = [];
    if (pw.description) descParts.push(pw.description);
    if (pw.targetDurationSec) descParts.push(`Duration: ${fmtDuration(pw.targetDurationSec)}`);
    if (pw.targetDistanceM) descParts.push(`Distance: ${fmtDistance(pw.targetDistanceM)}`);
    if (pw.targetTss) descParts.push(`Target TSS: ${pw.targetTss}`);

    const lines = [
      "BEGIN:VEVENT",
      foldLine(`UID:${pw.id}@betri-coachme`),
      foldLine(`DTSTAMP:${now}`),
      foldLine(`DTSTART;VALUE=DATE:${dateCompact}`),
      foldLine(`DTEND;VALUE=DATE:${dateCompact}`),
      foldLine(`SUMMARY:${icsEscape(`[${theme.label}] ${pw.name}`)}`),
      foldLine(`CATEGORIES:${icsEscape(theme.label.toUpperCase())}`),
    ];
    if (descParts.length > 0) {
      lines.push(foldLine(`DESCRIPTION:${icsEscape(descParts.join("\\n"))}`));
    }
    lines.push("END:VEVENT");
    return lines.join("\r\n");
  });

  const cal = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Betri CoachMe//Training Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(cal, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="training-${year}-${monthStr}.ics"`,
    },
  });
}

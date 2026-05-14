import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";

type AdapterAccountType = "oauth" | "oidc" | "email" | "webauthn";

export const userRole = pgEnum("user_role", ["athlete", "coach"]);

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: userRole("role"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

export const athleteProfiles = pgTable("athlete_profile", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  ftpWatts: integer("ftp_watts"),
  thresholdHrBpm: integer("threshold_hr_bpm"),
  thresholdRunPaceSecPerKm: integer("threshold_run_pace_sec_per_km"),
  cssSwimSecPer100m: integer("css_swim_sec_per_100m"),
  weightKg: integer("weight_kg"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const coachProfiles = pgTable("coach_profile", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const coachAthletes = pgTable(
  "coach_athlete",
  {
    coachUserId: text("coach_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    athleteUserId: text("athlete_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.coachUserId, t.athleteUserId] })],
);

export const activities = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  sourceFileKey: text("source_file_key"),
  sport: text("sport"),
  startedAt: timestamp("started_at", { mode: "date" }),
  durationSec: integer("duration_sec"),
  distanceM: integer("distance_m"),
  avgPowerW: integer("avg_power_w"),
  avgHrBpm: integer("avg_hr_bpm"),
  tss: integer("tss"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type UserRole = (typeof userRole.enumValues)[number];

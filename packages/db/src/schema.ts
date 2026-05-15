import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  pgEnum,
  uuid,
  jsonb,
  index,
  real,
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

export const activities = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    sourceFileKey: text("source_file_key"),
    sourceFileName: text("source_file_name"),
    sport: text("sport"),
    name: text("name"),
    startedAt: timestamp("started_at", { mode: "date" }),
    durationSec: integer("duration_sec"),
    movingTimeSec: integer("moving_time_sec"),
    distanceM: integer("distance_m"),
    elevationGainM: integer("elevation_gain_m"),
    avgPowerW: integer("avg_power_w"),
    maxPowerW: integer("max_power_w"),
    normalizedPowerW: integer("normalized_power_w"),
    avgHrBpm: integer("avg_hr_bpm"),
    maxHrBpm: integer("max_hr_bpm"),
    avgCadenceRpm: integer("avg_cadence_rpm"),
    avgSpeedMps: real("avg_speed_mps"),
    maxSpeedMps: real("max_speed_mps"),
    caloriesKcal: integer("calories_kcal"),
    tss: integer("tss"),
    intensityFactor: real("intensity_factor"),
    rpe: integer("rpe"),
    feeling: integer("feeling"),
    athleteNotes: text("athlete_notes"),
    status: text("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    index("activity_user_started_idx").on(t.userId, t.startedAt),
    index("activity_status_idx").on(t.status),
  ],
);

export const activityStreams = pgTable("activity_stream", {
  activityId: uuid("activity_id")
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  timestampSec: jsonb("timestamp_sec").$type<number[]>(),
  powerW: jsonb("power_w").$type<(number | null)[]>(),
  hrBpm: jsonb("hr_bpm").$type<(number | null)[]>(),
  cadenceRpm: jsonb("cadence_rpm").$type<(number | null)[]>(),
  speedMps: jsonb("speed_mps").$type<(number | null)[]>(),
  altitudeM: jsonb("altitude_m").$type<(number | null)[]>(),
  distanceM: jsonb("distance_m").$type<(number | null)[]>(),
  lat: jsonb("lat").$type<(number | null)[]>(),
  lon: jsonb("lon").$type<(number | null)[]>(),
  tempC: jsonb("temp_c").$type<(number | null)[]>(),
});

export const garminConnections = pgTable("garmin_connection", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  garminUserId: text("garmin_user_id"),
  accessToken: text("access_token").notNull(),
  accessTokenSecret: text("access_token_secret").notNull(),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
});

export const garminRequestTokens = pgTable("garmin_request_token", {
  oauthToken: text("oauth_token").primaryKey(),
  oauthTokenSecret: text("oauth_token_secret").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coachInvitations = pgTable(
  "coach_invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coachUserId: text("coach_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    athleteEmail: text("athlete_email").notNull(),
    token: text("token").notNull().unique(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at"),
    expiresAt: timestamp("expires_at"),
  },
  (t) => [
    index("coach_invitation_token_idx").on(t.token),
    index("coach_invitation_email_idx").on(t.athleteEmail),
  ],
);

export const conversations = pgTable(
  "conversation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coachUserId: text("coach_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    athleteUserId: text("athlete_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastMessageAt: timestamp("last_message_at"),
  },
  (t) => [index("conversation_pair_idx").on(t.coachUserId, t.athleteUserId)],
);

export const messages = pgTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderUserId: text("sender_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body"),
    replyToMessageId: uuid("reply_to_message_id"),
    activityId: uuid("activity_id").references(() => activities.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("message_conversation_created_idx").on(t.conversationId, t.createdAt),
  ],
);

export const messageReactions = pgTable(
  "message_reaction",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId, t.emoji] })],
);

export const conversationReads = pgTable(
  "conversation_read",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] })],
);

export const plannedWorkouts = pgTable(
  "planned_workout",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    athleteUserId: text("athlete_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD, stored as text to avoid TZ issues
    sport: text("sport").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    targetDurationSec: integer("target_duration_sec"),
    targetDistanceM: integer("target_distance_m"),
    targetTss: integer("target_tss"),
    completedActivityId: uuid("completed_activity_id").references(
      () => activities.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("planned_workout_athlete_date_idx").on(t.athleteUserId, t.scheduledDate),
    index("planned_workout_creator_idx").on(t.createdByUserId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type ActivityStream = typeof activityStreams.$inferSelect;
export type NewActivityStream = typeof activityStreams.$inferInsert;
export type GarminConnection = typeof garminConnections.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type CoachInvitation = typeof coachInvitations.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
export type PlannedWorkout = typeof plannedWorkouts.$inferSelect;
export type NewPlannedWorkout = typeof plannedWorkouts.$inferInsert;

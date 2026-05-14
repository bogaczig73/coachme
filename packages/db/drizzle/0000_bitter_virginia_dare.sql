CREATE TYPE "public"."user_role" AS ENUM('athlete', 'coach');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"source" text NOT NULL,
	"source_file_key" text,
	"source_file_name" text,
	"sport" text,
	"name" text,
	"started_at" timestamp,
	"duration_sec" integer,
	"moving_time_sec" integer,
	"distance_m" integer,
	"elevation_gain_m" integer,
	"avg_power_w" integer,
	"max_power_w" integer,
	"normalized_power_w" integer,
	"avg_hr_bpm" integer,
	"max_hr_bpm" integer,
	"avg_cadence_rpm" integer,
	"avg_speed_mps" real,
	"max_speed_mps" real,
	"calories_kcal" integer,
	"tss" integer,
	"intensity_factor" real,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_stream" (
	"activity_id" uuid PRIMARY KEY NOT NULL,
	"timestamp_sec" jsonb,
	"power_w" jsonb,
	"hr_bpm" jsonb,
	"cadence_rpm" jsonb,
	"speed_mps" jsonb,
	"altitude_m" jsonb,
	"distance_m" jsonb,
	"lat" jsonb,
	"lon" jsonb,
	"temp_c" jsonb
);
--> statement-breakpoint
CREATE TABLE "athlete_profile" (
	"userId" text PRIMARY KEY NOT NULL,
	"ftp_watts" integer,
	"threshold_hr_bpm" integer,
	"threshold_run_pace_sec_per_km" integer,
	"css_swim_sec_per_100m" integer,
	"weight_kg" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_athlete" (
	"coach_user_id" text NOT NULL,
	"athlete_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coach_athlete_coach_user_id_athlete_user_id_pk" PRIMARY KEY("coach_user_id","athlete_user_id")
);
--> statement-breakpoint
CREATE TABLE "coach_profile" (
	"userId" text PRIMARY KEY NOT NULL,
	"bio" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garmin_connection" (
	"user_id" text PRIMARY KEY NOT NULL,
	"garmin_user_id" text,
	"access_token" text NOT NULL,
	"access_token_secret" text NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garmin_request_token" (
	"oauth_token" text PRIMARY KEY NOT NULL,
	"oauth_token_secret" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"role" "user_role",
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_stream" ADD CONSTRAINT "activity_stream_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_profile" ADD CONSTRAINT "athlete_profile_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_athlete" ADD CONSTRAINT "coach_athlete_coach_user_id_user_id_fk" FOREIGN KEY ("coach_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_athlete" ADD CONSTRAINT "coach_athlete_athlete_user_id_user_id_fk" FOREIGN KEY ("athlete_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_profile" ADD CONSTRAINT "coach_profile_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_connection" ADD CONSTRAINT "garmin_connection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_request_token" ADD CONSTRAINT "garmin_request_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_user_started_idx" ON "activity" USING btree ("userId","started_at");--> statement-breakpoint
CREATE INDEX "activity_status_idx" ON "activity" USING btree ("status");
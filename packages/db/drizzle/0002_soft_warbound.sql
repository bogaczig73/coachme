CREATE TABLE "planned_workout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_user_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"scheduled_date" text NOT NULL,
	"sport" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_duration_sec" integer,
	"target_distance_m" integer,
	"target_tss" integer,
	"completed_activity_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planned_workout" ADD CONSTRAINT "planned_workout_athlete_user_id_user_id_fk" FOREIGN KEY ("athlete_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_workout" ADD CONSTRAINT "planned_workout_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_workout" ADD CONSTRAINT "planned_workout_completed_activity_id_activity_id_fk" FOREIGN KEY ("completed_activity_id") REFERENCES "public"."activity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "planned_workout_athlete_date_idx" ON "planned_workout" USING btree ("athlete_user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "planned_workout_creator_idx" ON "planned_workout" USING btree ("created_by_user_id");
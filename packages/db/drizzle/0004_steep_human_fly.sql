ALTER TABLE "planned_workout" ADD COLUMN "target_calories_kcal" integer;--> statement-breakpoint
ALTER TABLE "planned_workout" ADD COLUMN "target_elevation_gain_m" integer;--> statement-breakpoint
ALTER TABLE "planned_workout" ADD COLUMN "target_avg_power_w" integer;--> statement-breakpoint
ALTER TABLE "planned_workout" ADD COLUMN "target_avg_hr_bpm" integer;--> statement-breakpoint
ALTER TABLE "planned_workout" ADD COLUMN "target_intensity_factor" real;--> statement-breakpoint
ALTER TABLE "planned_workout" ADD COLUMN "pre_activity_comments" text;--> statement-breakpoint
ALTER TABLE "planned_workout" ADD COLUMN "workout_steps" jsonb;
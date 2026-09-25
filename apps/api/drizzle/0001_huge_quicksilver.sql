CREATE TYPE "public"."photo_moderation" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "spot_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spot_id" uuid NOT NULL,
	"s3_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"credit" text,
	"moderation" "photo_moderation" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "photo_id" uuid;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "marks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "spot_photos" ADD CONSTRAINT "spot_photos_spot_id_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spot_photos_spot_id_idx" ON "spot_photos" USING btree ("spot_id");--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_photo_id_spot_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."spot_photos"("id") ON DELETE set null ON UPDATE no action;
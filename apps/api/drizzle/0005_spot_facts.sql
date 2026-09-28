ALTER TABLE "spots" RENAME COLUMN "description" TO "note";--> statement-breakpoint
ALTER TABLE "spots" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "spots" DROP COLUMN "object_type";--> statement-breakpoint
ALTER TABLE "spots" DROP COLUMN "surface";--> statement-breakpoint
ALTER TABLE "spots" DROP COLUMN "height_m";--> statement-breakpoint
ALTER TABLE "spots" DROP COLUMN "dry_in_rain";--> statement-breakpoint
ALTER TABLE "spots" DROP COLUMN "access";--> statement-breakpoint
DROP TYPE "public"."object_type";--> statement-breakpoint
DROP TYPE "public"."surface";--> statement-breakpoint
DROP TYPE "public"."access_kind";

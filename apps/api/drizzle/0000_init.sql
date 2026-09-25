CREATE TYPE "public"."access_kind" AS ENUM('always', 'gated_yard', 'daytime', 'seasonal');--> statement-breakpoint
CREATE TYPE "public"."discipline" AS ENUM('boulder', 'lead');--> statement-breakpoint
CREATE TYPE "public"."external_kind" AS ENUM('gym', 'crag');--> statement-breakpoint
CREATE TYPE "public"."forbidden_category" AS ENUM('heritage', 'bridge', 'railway', 'transport', 'power', 'communication', 'industrial', 'port');--> statement-breakpoint
CREATE TYPE "public"."object_type" AS ENUM('wall', 'low_wall', 'parapet', 'retaining_wall', 'street_wall', 'other');--> statement-breakpoint
CREATE TYPE "public"."problem_status" AS ENUM('project', 'unconfirmed', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."spot_status" AS ENUM('active', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."surface" AS ENUM('asphalt', 'tiles', 'concrete', 'ground', 'grass', 'sand', 'rubber');--> statement-breakpoint
CREATE TABLE "external_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "external_kind" NOT NULL,
	"name" text NOT NULL,
	"location" geometry(Point, 4326) NOT NULL,
	"url" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "forbidden_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "forbidden_category" NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"name" text,
	"geom" geometry(Geometry, 4326) NOT NULL,
	"zone" geometry(Geometry, 4326) NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spot_id" uuid NOT NULL,
	"name" text NOT NULL,
	"discipline" "discipline" NOT NULL,
	"author_grade" text NOT NULL,
	"grade" text NOT NULL,
	"status" "problem_status" DEFAULT 'project' NOT NULL,
	"confirmation_points" integer DEFAULT 0 NOT NULL,
	"ascent_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"location" geometry(Point, 4326) NOT NULL,
	"object_type" "object_type" NOT NULL,
	"surface" "surface" NOT NULL,
	"needs_pad" boolean NOT NULL,
	"height_m" real,
	"dry_in_rain" boolean DEFAULT false NOT NULL,
	"lighting" boolean DEFAULT false NOT NULL,
	"access" "access_kind" DEFAULT 'always' NOT NULL,
	"last_visit_at" timestamp with time zone,
	"status" "spot_status" DEFAULT 'active' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_spot_id_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forbidden_zones_zone_gist" ON "forbidden_zones" USING gist ("zone");--> statement-breakpoint
CREATE UNIQUE INDEX "forbidden_zones_source_uq" ON "forbidden_zones" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "problems_spot_id_idx" ON "problems" USING btree ("spot_id");--> statement-breakpoint
CREATE INDEX "spots_location_gist" ON "spots" USING gist ("location");
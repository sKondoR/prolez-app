CREATE TABLE "regions" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"geom" geometry(Geometry, 4326) NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "regions_geom_gist" ON "regions" USING gist ("geom");
CREATE TABLE "post_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"post_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"author" varchar(120),
	"note" varchar(120),
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"refresh_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" RENAME COLUMN "studied_at" TO "studied_from";--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "meta" jsonb;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "studied_to" date;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "cover_caption" varchar(120);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "reading_minutes" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "label" varchar(60);--> statement-breakpoint
CREATE INDEX "post_references_post_id_position_idx" ON "post_references" ("post_id","position");--> statement-breakpoint
ALTER TABLE "post_references" ADD CONSTRAINT "post_references_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "blocks" DROP CONSTRAINT "blocks_type_check", ADD CONSTRAINT "blocks_type_check" CHECK (("type" IN ('text', 'code', 'callout') AND "content" IS NOT NULL) OR "type" = 'image' OR ("type" = 'cards' AND "meta" IS NOT NULL));
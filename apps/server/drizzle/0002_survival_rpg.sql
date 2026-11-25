CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_stats" ALTER COLUMN "hp" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "character_stats" ALTER COLUMN "energy" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "character_stats" ALTER COLUMN "satiety" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "character_stats" ALTER COLUMN "satiety" SET DEFAULT 100;--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "xp" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "backpack" jsonb;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_character_id_wallets_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."wallets"("character_id") ON DELETE cascade ON UPDATE no action;
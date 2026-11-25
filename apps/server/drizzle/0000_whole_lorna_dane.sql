CREATE TABLE "character_positions" (
	"character_id" uuid PRIMARY KEY NOT NULL,
	"zone_id" text NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_stats" (
	"character_id" uuid PRIMARY KEY NOT NULL,
	"hp" integer NOT NULL,
	"max_hp" integer NOT NULL,
	"energy" integer NOT NULL,
	"max_energy" integer NOT NULL,
	"satiety" integer DEFAULT 100 NOT NULL,
	"strength" integer NOT NULL,
	"agility" integer NOT NULL,
	"speed_multiplier" real DEFAULT 1 NOT NULL,
	"max_carry_weight_kg" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"archetype" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text,
	"google_id" text,
	"role" text DEFAULT 'player' NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"character_id" uuid PRIMARY KEY NOT NULL,
	"coins" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"is_pvp_enabled" boolean DEFAULT false NOT NULL,
	"spawn_x" real DEFAULT 0 NOT NULL,
	"spawn_y" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_positions" ADD CONSTRAINT "character_positions_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_positions" ADD CONSTRAINT "character_positions_zone_id_world_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."world_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_stats" ADD CONSTRAINT "character_stats_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
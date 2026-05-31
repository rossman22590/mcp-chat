DO $$ BEGIN
 ALTER TABLE "User" ADD COLUMN "plan" varchar DEFAULT 'premium' NOT NULL;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "User" ADD COLUMN "credits" integer DEFAULT 10 NOT NULL;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

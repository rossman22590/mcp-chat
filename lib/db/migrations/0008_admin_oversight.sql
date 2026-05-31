CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adminUserId" uuid,
	"adminEmail" varchar(64) NOT NULL,
	"targetUserId" uuid,
	"targetEmail" varchar(64),
	"action" varchar(64) NOT NULL,
	"before" json,
	"after" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CreditTransaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"adminUserId" uuid,
	"adminEmail" varchar(64),
	"type" varchar NOT NULL,
	"amount" integer NOT NULL,
	"balanceAfter" integer NOT NULL,
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "isSuspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "isAdmin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "User" SET "isAdmin" = true WHERE lower("email") = 'rcohen@mytsi.org';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_User_id_fk" FOREIGN KEY ("adminUserId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetUserId_User_id_fk" FOREIGN KEY ("targetUserId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_adminUserId_User_id_fk" FOREIGN KEY ("adminUserId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

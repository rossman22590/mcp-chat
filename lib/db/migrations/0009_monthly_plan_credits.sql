ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 500;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "creditResetAt" timestamp DEFAULT now() + interval '1 month' NOT NULL;
--> statement-breakpoint
INSERT INTO "CreditTransaction" ("userId", "type", "amount", "balanceAfter", "reason", "createdAt")
SELECT
	"id",
	CASE
		WHEN (CASE WHEN "plan" = 'ultra' THEN 1500 ELSE 500 END) - "credits" > 0 THEN 'grant'
		ELSE 'adjustment'
	END,
	(CASE WHEN "plan" = 'ultra' THEN 1500 ELSE 500 END) - "credits",
	CASE WHEN "plan" = 'ultra' THEN 1500 ELSE 500 END,
	'Initial monthly plan allowance',
	now()
FROM "User"
WHERE "credits" <> CASE
	WHEN "plan" = 'ultra' THEN 1500
	ELSE 500
END;
--> statement-breakpoint
UPDATE "User"
SET "credits" = CASE
	WHEN "plan" = 'ultra' THEN 1500
	ELSE 500
END,
"creditResetAt" = now() + interval '1 month';

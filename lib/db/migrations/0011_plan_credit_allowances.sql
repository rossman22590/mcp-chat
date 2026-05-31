ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 10000;
--> statement-breakpoint
UPDATE "User"
SET "credits" = LEAST(
 "credits",
 CASE
  WHEN "plan" = 'ultra' THEN 20000
  ELSE 10000
 END
);

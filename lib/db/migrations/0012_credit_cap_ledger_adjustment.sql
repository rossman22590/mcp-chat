INSERT INTO "CreditTransaction" (
 "userId",
 "type",
 "amount",
 "balanceAfter",
 "reason",
 "createdAt"
)
SELECT
 latest."userId",
 'adjustment',
 "User"."credits" - latest."balanceAfter",
 "User"."credits",
 'Plan allowance cap',
 now()
FROM (
 SELECT DISTINCT ON ("userId")
  "userId",
  "balanceAfter"
 FROM "CreditTransaction"
 ORDER BY "userId", "createdAt" DESC, "id" DESC
) latest
INNER JOIN "User" ON "User"."id" = latest."userId"
WHERE latest."balanceAfter" <> "User"."credits";

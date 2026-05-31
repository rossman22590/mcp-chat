DO $$ BEGIN
 IF EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'User'
    AND column_name = 'credits'
    AND column_default = '500'
 ) THEN
  ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 50000;
  UPDATE "User" SET "credits" = "credits" * 100;
  UPDATE "CreditTransaction"
  SET
   "amount" = "amount" * 100,
   "balanceAfter" = "balanceAfter" * 100;
 END IF;
END $$;

-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN "couplePin" TEXT NOT NULL DEFAULT '';

-- Existing weddings get a random 6-digit code (new ones get one from the app).
UPDATE "Wedding" SET "couplePin" = lpad(floor(random() * 1000000)::int::text, 6, '0') WHERE "couplePin" = '';

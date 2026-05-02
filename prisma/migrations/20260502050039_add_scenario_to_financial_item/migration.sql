/*
  Warnings:

  - A unique constraint covering the columns `[scenarioId,id]` on the table `FinancialItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `scenarioId` to the `FinancialItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."FinancialItem" DROP CONSTRAINT "FinancialItem_profileId_fkey";

-- Create a base scenario for profiles that don't have one
INSERT INTO "public"."Scenario" (id, name, type, "isDefault", "createdAt", "profileId")
SELECT
  gen_random_uuid(),
  'ベースプラン',
  'base',
  true,
  NOW(),
  fi."profileId"
FROM (
  SELECT DISTINCT "profileId" FROM "public"."FinancialItem" fi
  WHERE NOT EXISTS (
    SELECT 1 FROM "public"."Scenario" s
    WHERE s."profileId" = fi."profileId"
  )
) fi
ON CONFLICT DO NOTHING;

-- AlterTable: Add scenarioId column with NULL temporarily
ALTER TABLE "public"."FinancialItem" ADD COLUMN "scenarioId" TEXT;

-- Populate scenarioId: Assign each financial item to a scenario in its profile
UPDATE "public"."FinancialItem" fi
SET "scenarioId" = (
  SELECT s.id FROM "public"."Scenario" s
  WHERE s."profileId" = fi."profileId"
  LIMIT 1
);

-- Make scenarioId NOT NULL
ALTER TABLE "public"."FinancialItem" ALTER COLUMN "scenarioId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FinancialItem_scenarioId_id_key" ON "public"."FinancialItem"("scenarioId", "id");

-- AddForeignKey
ALTER TABLE "public"."FinancialItem" ADD CONSTRAINT "FinancialItem_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "public"."Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

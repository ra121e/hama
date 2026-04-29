-- CreateTable
CREATE TABLE "public"."FinancialItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "autoCalc" TEXT NOT NULL DEFAULT 'none',
    "rate" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FinancialItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinancialEntry" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "isExpanded" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialEntry_scenarioId_itemId_yearMonth_idx" ON "public"."FinancialEntry"("scenarioId", "itemId", "yearMonth");

-- AddForeignKey
ALTER TABLE "public"."FinancialItem" ADD CONSTRAINT "FinancialItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinancialItem" ADD CONSTRAINT "FinancialItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."FinancialItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinancialEntry" ADD CONSTRAINT "FinancialEntry_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "public"."Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinancialEntry" ADD CONSTRAINT "FinancialEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."FinancialItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Normalize invalid or empty scenario types before adding uniqueness constraints.
UPDATE "public"."Scenario"
SET "type" = CASE
  WHEN "isDefault" = true THEN 'base'
  ELSE 'custom'
END
WHERE "type" IS NULL OR btrim("type") = '';

-- Resolve duplicate types within the same profile so profileId/type can be unique.
WITH ranked AS (
  SELECT
    s."id",
    s."profileId",
    s."type",
    ROW_NUMBER() OVER (
      PARTITION BY s."profileId", s."type"
      ORDER BY s."createdAt" ASC, s."id" ASC
    ) AS rn
  FROM "public"."Scenario" s
)
UPDATE "public"."Scenario" s
SET
  "type" = CASE
    WHEN r."type" = 'base' THEN 'custom:' || substr(s."id", 1, 8)
    ELSE r."type" || ':' || substr(s."id", 1, 8)
  END,
  "isDefault" = CASE
    WHEN r."type" = 'base' THEN false
    ELSE s."isDefault"
  END
FROM ranked r
WHERE s."id" = r."id"
  AND r.rn > 1;

-- Ensure every profile has exactly one base scenario after normalization.
INSERT INTO "public"."Scenario" ("id", "name", "type", "isDefault", "createdAt", "profileId")
SELECT
  gen_random_uuid(),
  'ベースケース',
  'base',
  true,
  NOW(),
  p."id"
FROM "public"."Profile" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "public"."Scenario" s
  WHERE s."profileId" = p."id"
    AND s."type" = 'base'
);

CREATE UNIQUE INDEX "Scenario_profileId_type_key"
ON "public"."Scenario"("profileId", "type");

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_PROFILE_NAME = "マイプラン";
const DEFAULT_SCENARIO_ID = "base";
const DEFAULT_SCENARIO_NAME = "ベースケース";

type Timepoint = "now" | "5y" | "10y" | "20y";

type FinancialData = {
  fin_assets: number;
  fin_income: number;
  fin_expense: number;
};

type HappinessData = {
  hap_time: number;
  hap_health: number;
  hap_relation: number;
  hap_selfreal: number;
};

type HappinessMemoMap = Partial<Record<keyof HappinessData, string>>;

type SaveProfileRequest = {
  profile: {
    id?: string;
    name?: string;
    currency?: string;
    userId?: string | null;
    financial: FinancialData;
    happiness: HappinessData;
    happinessMemo?: HappinessMemoMap;
    settings?: {
      weightHappiness?: number;
      weightFinance?: number;
      targetAssets?: number | null;
      displayUnit?: string;
    };
  };
  scenarioId?: string;
  scenarioName?: string;
  scenarioType?: string;
  timepoint?: Timepoint;
};

const DEFAULT_FINANCIAL: FinancialData = {
  fin_assets: 0,
  fin_income: 0,
  fin_expense: 0,
};

const DEFAULT_HAPPINESS: HappinessData = {
  hap_time: 50,
  hap_health: 50,
  hap_relation: 50,
  hap_selfreal: 50,
};

const DEFAULT_SETTINGS = {
  weightHappiness: 0.7,
  weightFinance: 0.3,
  targetAssets: null as number | null,
  displayUnit: "man",
};

const buildSnapshotCreateInput = (
  scenarioId: string,
  financial: FinancialData,
  happiness: HappinessData,
  happinessMemo: HappinessMemoMap,
  timepoint: Timepoint,
) => {
  const snapshots: Prisma.SnapshotCreateManyInput[] = [
    {
      scenarioId,
      timepoint,
      categoryId: "financial",
      itemId: "fin_assets",
      value: financial.fin_assets,
    },
    {
      scenarioId,
      timepoint,
      categoryId: "financial",
      itemId: "fin_income",
      value: financial.fin_income,
    },
    {
      scenarioId,
      timepoint,
      categoryId: "financial",
      itemId: "fin_expense",
      value: financial.fin_expense,
    },
    {
      scenarioId,
      timepoint,
      categoryId: "happiness",
      itemId: "hap_time",
      value: happiness.hap_time,
      memo: happinessMemo.hap_time,
    },
    {
      scenarioId,
      timepoint,
      categoryId: "happiness",
      itemId: "hap_health",
      value: happiness.hap_health,
      memo: happinessMemo.hap_health,
    },
    {
      scenarioId,
      timepoint,
      categoryId: "happiness",
      itemId: "hap_relation",
      value: happiness.hap_relation,
      memo: happinessMemo.hap_relation,
    },
    {
      scenarioId,
      timepoint,
      categoryId: "happiness",
      itemId: "hap_selfreal",
      value: happiness.hap_selfreal,
      memo: happinessMemo.hap_selfreal,
    },
  ];

  return snapshots;
};

const groupSnapshotsByScenario = (
  scenarios: Array<{
    id: string;
    snapshots: Array<{
      id: string;
      scenarioId: string;
      timepoint: string;
      categoryId: string;
      itemId: string;
      value: number;
      memo: string | null;
    }>;
  }>,
) => {
  const result: Record<string, Record<string, Array<{
    id: string;
    scenarioId: string;
    timepoint: string;
    categoryId: string;
    itemId: string;
    value: number;
    memo?: string;
  }>>> = {};

  for (const scenario of scenarios) {
    result[scenario.id] = {};
    for (const snapshot of scenario.snapshots) {
      const key = snapshot.timepoint;
      if (!result[scenario.id][key]) {
        result[scenario.id][key] = [];
      }
      result[scenario.id][key].push({
        id: snapshot.id,
        scenarioId: snapshot.scenarioId,
        timepoint: snapshot.timepoint,
        categoryId: snapshot.categoryId,
        itemId: snapshot.itemId,
        value: snapshot.value,
        memo: snapshot.memo ?? undefined,
      });
    }
  }

  return result;
};

const deriveInputValues = (
  snapshots: Array<{
    categoryId: string;
    itemId: string;
    value: number;
    memo: string | null;
    timepoint: string;
  }>,
) => {
  const financial: FinancialData = { ...DEFAULT_FINANCIAL };
  const happiness: HappinessData = { ...DEFAULT_HAPPINESS };
  const happinessMemo: HappinessMemoMap = {};

  for (const snapshot of snapshots) {
    if (snapshot.timepoint !== "now") {
      continue;
    }

    if (snapshot.categoryId === "financial") {
      if (snapshot.itemId === "fin_assets") {
        financial.fin_assets = snapshot.value;
      }
      if (snapshot.itemId === "fin_income") {
        financial.fin_income = snapshot.value;
      }
      if (snapshot.itemId === "fin_expense") {
        financial.fin_expense = snapshot.value;
      }
    }

    if (snapshot.categoryId === "happiness") {
      if (snapshot.itemId === "hap_time") {
        happiness.hap_time = snapshot.value;
        if (snapshot.memo) happinessMemo.hap_time = snapshot.memo;
      }
      if (snapshot.itemId === "hap_health") {
        happiness.hap_health = snapshot.value;
        if (snapshot.memo) happinessMemo.hap_health = snapshot.memo;
      }
      if (snapshot.itemId === "hap_relation") {
        happiness.hap_relation = snapshot.value;
        if (snapshot.memo) happinessMemo.hap_relation = snapshot.memo;
      }
      if (snapshot.itemId === "hap_selfreal") {
        happiness.hap_selfreal = snapshot.value;
        if (snapshot.memo) happinessMemo.hap_selfreal = snapshot.memo;
      }
    }
  }

  return { financial, happiness, happinessMemo };
};

const fetchProfileBundle = async () => {
  let profile = await prisma.profile.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      settings: true,
      scenarios: {
        orderBy: { createdAt: "asc" },
        include: {
          snapshots: true,
        },
      },
    },
  });

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        name: DEFAULT_PROFILE_NAME,
        currency: "JPY",
        scenarios: {
          create: {
            id: DEFAULT_SCENARIO_ID,
            name: DEFAULT_SCENARIO_NAME,
            type: "base",
            isDefault: true,
            snapshots: {
              createMany: {
                data: buildSnapshotCreateInput(
                  DEFAULT_SCENARIO_ID,
                  DEFAULT_FINANCIAL,
                  DEFAULT_HAPPINESS,
                  {},
                  "now",
                ),
              },
            },
          },
        },
        settings: {
          create: DEFAULT_SETTINGS,
        },
      },
      include: {
        settings: true,
        scenarios: {
          orderBy: { createdAt: "asc" },
          include: {
            snapshots: true,
          },
        },
      },
    });
  }

  const activeScenario =
    profile.scenarios.find((scenario) => scenario.isDefault) ?? profile.scenarios[0];

  const derived = deriveInputValues(activeScenario?.snapshots ?? []);

  return {
    profile: {
      id: profile.id,
      name: profile.name,
      currency: profile.currency,
      userId: profile.userId,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      financial: derived.financial,
      happiness: derived.happiness,
      happinessMemo: derived.happinessMemo,
      settings: {
        weightHappiness:
          profile.settings?.weightHappiness ?? DEFAULT_SETTINGS.weightHappiness,
        weightFinance: profile.settings?.weightFinance ?? DEFAULT_SETTINGS.weightFinance,
        targetAssets: profile.settings?.targetAssets ?? null,
        displayUnit: profile.settings?.displayUnit ?? DEFAULT_SETTINGS.displayUnit,
        currency: "JPY",
      },
    },
    activeScenarioId: activeScenario?.id ?? DEFAULT_SCENARIO_ID,
    snapshotsByScenario: groupSnapshotsByScenario(profile.scenarios),
    scenarios: profile.scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      type: scenario.type,
      isDefault: scenario.isDefault,
      createdAt: scenario.createdAt.toISOString(),
    })),
  };
};

const saveProfile = async (request: Request) => {
  const body = (await request.json()) as SaveProfileRequest;
  const scenarioId = body.scenarioId ?? DEFAULT_SCENARIO_ID;
  const scenarioName = body.scenarioName ?? DEFAULT_SCENARIO_NAME;
  const scenarioType = body.scenarioType ?? "base";
  const timepoint = body.timepoint ?? "now";

  const profileFromDb = body.profile.id
    ? await prisma.profile.findUnique({ where: { id: body.profile.id } })
    : await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });

  const profile = profileFromDb
    ? await prisma.profile.update({
        where: { id: profileFromDb.id },
        data: {
          name: body.profile.name ?? profileFromDb.name,
          currency: body.profile.currency ?? profileFromDb.currency,
          userId: body.profile.userId ?? profileFromDb.userId,
        },
      })
    : await prisma.profile.create({
        data: {
          name: body.profile.name ?? DEFAULT_PROFILE_NAME,
          currency: body.profile.currency ?? "JPY",
          userId: body.profile.userId ?? null,
        },
      });

  await prisma.settings.upsert({
    where: { profileId: profile.id },
    update: {
      weightHappiness:
        body.profile.settings?.weightHappiness ?? DEFAULT_SETTINGS.weightHappiness,
      weightFinance: body.profile.settings?.weightFinance ?? DEFAULT_SETTINGS.weightFinance,
      targetAssets: body.profile.settings?.targetAssets ?? null,
      displayUnit: body.profile.settings?.displayUnit ?? DEFAULT_SETTINGS.displayUnit,
    },
    create: {
      profileId: profile.id,
      weightHappiness:
        body.profile.settings?.weightHappiness ?? DEFAULT_SETTINGS.weightHappiness,
      weightFinance: body.profile.settings?.weightFinance ?? DEFAULT_SETTINGS.weightFinance,
      targetAssets: body.profile.settings?.targetAssets ?? null,
      displayUnit: body.profile.settings?.displayUnit ?? DEFAULT_SETTINGS.displayUnit,
    },
  });

  const scenario = await prisma.scenario.upsert({
    where: { id: scenarioId },
    update: {
      name: scenarioName,
      type: scenarioType,
      profileId: profile.id,
    },
    create: {
      id: scenarioId,
      profileId: profile.id,
      name: scenarioName,
      type: scenarioType,
      isDefault: scenarioId === DEFAULT_SCENARIO_ID,
    },
  });

  await prisma.snapshot.deleteMany({
    where: {
      scenarioId: scenario.id,
      timepoint,
    },
  });

  await prisma.snapshot.createMany({
    data: buildSnapshotCreateInput(
      scenario.id,
      body.profile.financial,
      body.profile.happiness,
      body.profile.happinessMemo ?? {},
      timepoint,
    ),
  });

  return Response.json(await fetchProfileBundle());
};

export async function GET() {
  try {
    return Response.json(await fetchProfileBundle());
  } catch (error) {
    return Response.json(
      { message: "Failed to load profile", error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    return await saveProfile(request);
  } catch (error) {
    return Response.json(
      { message: "Failed to save profile", error: String(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    return await saveProfile(request);
  } catch (error) {
    return Response.json(
      { message: "Failed to save profile", error: String(error) },
      { status: 500 },
    );
  }
}

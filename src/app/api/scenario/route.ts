import { prisma } from "@/lib/prisma";

const DEFAULT_PROFILE_NAME = "マイプラン";
const createCustomScenarioType = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `custom:${crypto.randomUUID()}`
    : `custom:${Date.now()}-${Math.random().toString(16).slice(2)}`;

const ensureProfile = async () => {
  const existing = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) {
    return existing;
  }

  return prisma.profile.create({
    data: {
      name: DEFAULT_PROFILE_NAME,
      currency: "JPY",
      settings: {
        create: {
          weightHappiness: 0.7,
          weightFinance: 0.3,
          displayUnit: "man",
        },
      },
    },
  });
};

const ensureBaseScenario = async (profileId: string) => {
  return prisma.scenario.upsert({
    where: {
      profileId_type: {
        profileId,
        type: "base",
      },
    },
    update: {},
    create: {
      profileId,
      name: "ベースケース",
      type: "base",
      isDefault: true,
    },
  });
};

export async function GET() {
  try {
    const profile = await ensureProfile();
    await ensureBaseScenario(profile.id);
    const scenarios = await prisma.scenario.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { snapshots: true },
        },
      },
    });

    return Response.json({
      scenarios: scenarios.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        type: scenario.type,
        isDefault: scenario.isDefault,
        createdAt: scenario.createdAt.toISOString(),
        snapshotCount: scenario._count.snapshots,
      })),
    });
  } catch (error) {
    return Response.json(
      { message: "Failed to load scenarios", error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      type?: string;
      isDefault?: boolean;
    };
    const profile = await ensureProfile();
    await ensureBaseScenario(profile.id);

    if (body.isDefault) {
      await prisma.scenario.updateMany({
        where: { profileId: profile.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const scenario = await prisma.scenario.create({
      data: {
        profileId: profile.id,
        name: body.name ?? "新規シナリオ",
        type:
          body.type && body.type !== "base" && body.type !== "custom"
            ? body.type
            : createCustomScenarioType(),
        isDefault: body.isDefault ?? false,
      },
    });

    return Response.json({
      scenario: {
        id: scenario.id,
        name: scenario.name,
        type: scenario.type,
        isDefault: scenario.isDefault,
        createdAt: scenario.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return Response.json(
      { message: "Failed to create scenario", error: String(error) },
      { status: 500 },
    );
  }
}

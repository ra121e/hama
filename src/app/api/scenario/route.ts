import { prisma } from "@/lib/prisma";

const DEFAULT_PROFILE_NAME = "マイプラン";

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

export async function GET() {
  try {
    const profile = await ensureProfile();
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
        type: body.type ?? "custom",
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

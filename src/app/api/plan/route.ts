import { prisma } from "@/lib/prisma";

const MAX_ADDITIONAL_PLANS = 5;
const BASE_PLAN_ID = "base";

type CreatePlanRequest = {
  name: string;
  sourcePlanId?: string;
};

type RenamePlanRequest = {
  planId: string;
  name: string;
};

type DeletePlanRequest = {
  planId: string;
};

const toPlanSummary = (scenario: {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
  createdAt: Date;
}) => ({
  id: scenario.id,
  name: scenario.name,
  type: scenario.type,
  isDefault: scenario.isDefault,
  createdAt: scenario.createdAt.toISOString(),
});

const getProfileWithScenarios = async () => {
  const profile = await prisma.profile.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      scenarios: {
        orderBy: { createdAt: "asc" },
        include: {
          snapshots: true,
        },
      },
    },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  return profile;
};

export async function GET() {
  try {
    const profile = await getProfileWithScenarios();
    const activePlan = profile.scenarios.find((item) => item.isDefault) ?? profile.scenarios[0];

    return Response.json({
      plans: profile.scenarios.map(toPlanSummary),
      activePlanId: activePlan?.id ?? BASE_PLAN_ID,
    });
  } catch (error) {
    return Response.json(
      { message: "Failed to load plans", error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePlanRequest;

    if (!body?.name?.trim()) {
      return Response.json({ message: "Plan name is required" }, { status: 400 });
    }

    const profile = await getProfileWithScenarios();
    const additionalCount = profile.scenarios.filter((item) => !item.isDefault).length;

    if (additionalCount >= MAX_ADDITIONAL_PLANS) {
      return Response.json({ message: "Additional plan limit exceeded" }, { status: 400 });
    }

    const sourcePlan =
      profile.scenarios.find((item) => item.id === body.sourcePlanId) ??
      profile.scenarios.find((item) => item.id === BASE_PLAN_ID) ??
      profile.scenarios[0];

    if (!sourcePlan) {
      return Response.json({ message: "Source plan not found" }, { status: 404 });
    }

    const nextPlanId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `plan-${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      await tx.scenario.create({
        data: {
          id: nextPlanId,
          profileId: profile.id,
          name: body.name.trim(),
          type: "custom",
          isDefault: false,
        },
      });

      if (sourcePlan.snapshots.length > 0) {
        await tx.snapshot.createMany({
          data: sourcePlan.snapshots.map((snapshot) => ({
            scenarioId: nextPlanId,
            timepoint: snapshot.timepoint,
            categoryId: snapshot.categoryId,
            itemId: snapshot.itemId,
            value: snapshot.value,
            memo: snapshot.memo,
          })),
        });
      }
    });

    const refreshed = await getProfileWithScenarios();

    return Response.json({
      planId: nextPlanId,
      plans: refreshed.scenarios.map(toPlanSummary),
      activePlanId: nextPlanId,
    });
  } catch (error) {
    return Response.json(
      { message: "Failed to create plan", error: String(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as RenamePlanRequest;

    if (!body?.planId || !body?.name?.trim()) {
      return Response.json({ message: "planId and name are required" }, { status: 400 });
    }

    const profile = await getProfileWithScenarios();
    const target = profile.scenarios.find((item) => item.id === body.planId);
    if (!target) {
      return Response.json({ message: "Plan not found" }, { status: 404 });
    }

    await prisma.scenario.update({
      where: { id: target.id },
      data: { name: body.name.trim() },
    });

    const refreshed = await getProfileWithScenarios();
    const activePlan = refreshed.scenarios.find((item) => item.isDefault) ?? refreshed.scenarios[0];

    return Response.json({
      plans: refreshed.scenarios.map(toPlanSummary),
      activePlanId: activePlan?.id ?? BASE_PLAN_ID,
    });
  } catch (error) {
    return Response.json(
      { message: "Failed to rename plan", error: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as DeletePlanRequest;

    if (!body?.planId) {
      return Response.json({ message: "planId is required" }, { status: 400 });
    }

    if (body.planId === BASE_PLAN_ID) {
      return Response.json({ message: "Base plan cannot be deleted" }, { status: 400 });
    }

    const profile = await getProfileWithScenarios();
    const target = profile.scenarios.find((item) => item.id === body.planId);

    if (!target) {
      return Response.json({ message: "Plan not found" }, { status: 404 });
    }

    await prisma.scenario.delete({ where: { id: target.id } });

    const refreshed = await getProfileWithScenarios();
    const activePlan = refreshed.scenarios.find((item) => item.isDefault) ?? refreshed.scenarios[0];

    return Response.json({
      plans: refreshed.scenarios.map(toPlanSummary),
      activePlanId: activePlan?.id ?? BASE_PLAN_ID,
    });
  } catch (error) {
    return Response.json(
      { message: "Failed to delete plan", error: String(error) },
      { status: 500 },
    );
  }
}

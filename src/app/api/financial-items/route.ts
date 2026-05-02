import { prisma } from "@/lib/prisma";
import type { FinancialItem } from "@/entities/financial-item";
import {
	FIXED_ROOT_FINANCIAL_ITEMS,
	getDescendantIds,
	getNextSortOrder,
	sortFinancialItems,
} from "@/features/financial-detail/lib/financial-items";
import {
	createFinancialItemSchema,
	deleteFinancialItemSchema,
	reorderFinancialItemsSchema,
	renameFinancialItemSchema,
} from "@/features/financial-detail/schema";

const toFinancialItemPayload = (item: {
	id: string;
	profileId: string;
	scenarioId: string;
	level: string;
	parentId: string | null;
	name: string;
	category: string;
	autoCalc: string;
	rate: number | null;
	sortOrder: number;
}): FinancialItem => ({
	id: item.id,
	profileId: item.profileId,
	scenarioId: item.scenarioId,
	level: item.level as "large" | "medium" | "small",
	parentId: item.parentId,
	name: item.name,
	category: item.category as "income" | "expense" | "asset" | "liability",
	autoCalc: item.autoCalc as "none" | "compound" | "depreciation" | "cashflow",
	rate: item.rate,
	sortOrder: item.sortOrder,
});

const ensureLargeRoots = async (scenarioId: string) => {
	const scenario = await prisma.scenario.findUnique({
		where: { id: scenarioId },
		select: { profileId: true }
	});

	if (!scenario) {
		throw new Error("Scenario not found");
	}

	await prisma.$transaction(async (tx) => {
		// Lock the scenario to prevent concurrent modifications
		await tx.$executeRaw`SELECT 1 FROM "Scenario" WHERE id = ${scenarioId} FOR UPDATE`;

		// Get existing large roots for this scenario
		const roots = await tx.financialItem.findMany({
			where: {
				scenarioId,
				level: "large",
				parentId: null,
			},
		});

		for (const [index, root] of FIXED_ROOT_FINANCIAL_ITEMS.entries()) {
			const existingItems = roots.filter((item) => item.category === root.category);

			// Handle duplicates: Keep the first one, delete others
			if (existingItems.length > 1) {
				const [keepItem, ...deleteItems] = existingItems;

				// Delete duplicate items and their descendants
				for (const item of deleteItems) {
					const allDescendants = roots
						.filter((r) => r.scenarioId === scenarioId)
						.flatMap((r) => {
							const queue = [r.id];
							const result: string[] = [];
							while (queue.length > 0) {
								const currentId = queue.shift();
								if (!currentId) continue;

								const children = roots.filter((c) => c.parentId === currentId);
								result.push(...children.map((c) => c.id));
								queue.push(...children.map((c) => c.id));
							}
							return result;
						});

					if (allDescendants.length > 0) {
						await tx.financialItem.deleteMany({
							where: { id: { in: allDescendants } },
						});
					}

					await tx.financialItem.delete({
						where: { id: item.id },
					});
				}

				// Update the kept item
				if (keepItem.name !== root.label || keepItem.sortOrder !== index) {
					await tx.financialItem.update({
						where: { id: keepItem.id },
						data: {
							name: root.label,
							sortOrder: index,
						},
					});
				}
			} else if (existingItems.length === 1) {
				const existing = existingItems[0];
				if (existing.name !== root.label || existing.sortOrder !== index) {
					await tx.financialItem.update({
						where: { id: existing.id },
						data: {
							name: root.label,
							sortOrder: index,
						},
					});
				}
			} else {
				// Create new item if none exists
				await tx.financialItem.create({
					data: {
						profileId: scenario.profileId,
						scenarioId,
						level: "large",
						parentId: null,
						name: root.label,
						category: root.category,
						autoCalc: "none",
						rate: null,
						sortOrder: index,
					},
				});
			}
		}
	});
};

const fetchItems = async (scenarioId: string) => {
	await ensureLargeRoots(scenarioId);

	const items = await prisma.financialItem.findMany({
		where: { scenarioId },
		orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
	});

	// Cast database objects to FinancialItem type for type safety
	const typedItems = items as FinancialItem[];
	return sortFinancialItems(typedItems).map(toFinancialItemPayload);
};

export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		const profileId = url.searchParams.get("profileId");
		const scenarioId = url.searchParams.get("scenarioId");

		if (!scenarioId) {
			return Response.json({ message: "scenarioId is required" }, { status: 400 });
		}

		const items = await fetchItems(scenarioId);

		return Response.json({ profileId, scenarioId, items });
	} catch (error) {
		return Response.json({ message: "Failed to load financial items", error: String(error) }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const body = createFinancialItemSchema.parse(await request.json());
		const parent = await prisma.financialItem.findUnique({ where: { id: body.parentId } });

		if (!parent || parent.scenarioId !== body.scenarioId) {
			return Response.json({ message: "Parent item not found" }, { status: 404 });
		}

		if (parent.level === "small") {
			return Response.json({ message: "Small items cannot have children" }, { status: 400 });
		}

		const siblingItems = await prisma.financialItem.findMany({
			where: { scenarioId: body.scenarioId, parentId: body.parentId },
		});
		const nextSortOrder = getNextSortOrder(siblingItems as FinancialItem[], body.parentId);

		const created = await prisma.financialItem.create({
			data: {
				profileId: body.profileId,
				scenarioId: body.scenarioId,
				level: parent.level === "large" ? "medium" : "small",
				parentId: body.parentId,
				name: body.name.trim(),
				category: parent.category,
				autoCalc: "none",
				rate: null,
				sortOrder: nextSortOrder,
			},
		});

		return Response.json({ item: toFinancialItemPayload(created) });
	} catch (error) {
		return Response.json({ message: "Failed to create financial item", error: String(error) }, { status: 500 });
	}
}

export async function PATCH(request: Request) {
	try {
		const payload = await request.json();

		if (Array.isArray(payload?.orderedIds)) {
			const body = reorderFinancialItemsSchema.parse(payload);
			const siblings = await prisma.financialItem.findMany({
				where: { scenarioId: body.scenarioId, parentId: body.parentId },
			});
			const siblingIds = new Set(siblings.map((item) => item.id));
			if (siblings.length !== body.orderedIds.length || body.orderedIds.some((id) => !siblingIds.has(id))) {
				return Response.json({ message: "orderedIds must match the sibling set" }, { status: 400 });
			}

			await prisma.$transaction(
				body.orderedIds.map((itemId, index) =>
					prisma.financialItem.update({
						where: { id: itemId },
						data: { sortOrder: index },
					}),
				),
			);

			return Response.json({ ok: true });
		}

		const body = renameFinancialItemSchema.parse(payload);
		const target = await prisma.financialItem.findUnique({ where: { id: body.itemId } });

		if (!target || target.scenarioId !== body.scenarioId) {
			return Response.json({ message: "Financial item not found" }, { status: 404 });
		}

		if (target.level === "large") {
			return Response.json({ message: "Large items cannot be renamed" }, { status: 400 });
		}

		const updated = await prisma.financialItem.update({
			where: { id: target.id },
			data: { name: body.name.trim() },
		});

		return Response.json({ item: toFinancialItemPayload(updated) });
	} catch (error) {
		return Response.json({ message: "Failed to update financial item", error: String(error) }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	try {
		const body = deleteFinancialItemSchema.parse(await request.json());
		const target = await prisma.financialItem.findUnique({ where: { id: body.itemId } });

		if (!target || target.scenarioId !== body.scenarioId) {
			return Response.json({ message: "Financial item not found" }, { status: 404 });
		}

		if (target.level === "large") {
			return Response.json({ message: "Large items cannot be deleted" }, { status: 400 });
		}

		const allItems = await prisma.financialItem.findMany({ where: { scenarioId: body.scenarioId } });
		const descendantIds = getDescendantIds(allItems as FinancialItem[], target.id);

		await prisma.$transaction(async (tx) => {
			if (descendantIds.length > 0) {
				await tx.financialItem.deleteMany({ where: { id: { in: descendantIds } } });
			}
			await tx.financialItem.delete({ where: { id: target.id } });
		});

		return Response.json({ ok: true });
	} catch (error) {
		return Response.json({ message: "Failed to delete financial item", error: String(error) }, { status: 500 });
	}
}

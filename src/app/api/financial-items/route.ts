import { prisma } from "@/lib/prisma";
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
	level: string;
	parentId: string | null;
	name: string;
	category: string;
	autoCalc: string;
	rate: number | null;
	sortOrder: number;
}) => ({
	id: item.id,
	profileId: item.profileId,
	level: item.level,
	parentId: item.parentId,
	name: item.name,
	category: item.category,
	autoCalc: item.autoCalc,
	rate: item.rate,
	sortOrder: item.sortOrder,
});

const ensureLargeRoots = async (profileId: string) => {
	const roots = await prisma.financialItem.findMany({
		where: {
			profileId,
			level: "large",
			parentId: null,
		},
		orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
	});

	await prisma.$transaction(async (tx) => {
		for (const [index, root] of FIXED_ROOT_FINANCIAL_ITEMS.entries()) {
			const existing = roots.find((item) => item.category === root.category);

			if (!existing) {
				await tx.financialItem.create({
					data: {
						profileId,
						level: "large",
						parentId: null,
						name: root.label,
						category: root.category,
						autoCalc: "none",
						rate: null,
						sortOrder: index,
					},
				});
				continue;
			}

			if (existing.name !== root.label || existing.sortOrder !== index) {
				await tx.financialItem.update({
					where: { id: existing.id },
					data: {
						name: root.label,
						sortOrder: index,
					},
				});
			}
		}
	});
};

const fetchItems = async (profileId: string) => {
	await ensureLargeRoots(profileId);

	const items = await prisma.financialItem.findMany({
		where: { profileId },
		orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
	});

	return sortFinancialItems(items).map(toFinancialItemPayload);
};

export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		const profileId = url.searchParams.get("profileId");

		if (!profileId) {
			return Response.json({ message: "profileId is required" }, { status: 400 });
		}

		const items = await fetchItems(profileId);

		return Response.json({ profileId, items });
	} catch (error) {
		return Response.json({ message: "Failed to load financial items", error: String(error) }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const body = createFinancialItemSchema.parse(await request.json());
		const parent = await prisma.financialItem.findUnique({ where: { id: body.parentId } });

		if (!parent || parent.profileId !== body.profileId) {
			return Response.json({ message: "Parent item not found" }, { status: 404 });
		}

		if (parent.level === "small") {
			return Response.json({ message: "Small items cannot have children" }, { status: 400 });
		}

		const siblingItems = await prisma.financialItem.findMany({
			where: { profileId: body.profileId, parentId: body.parentId },
		});
		const nextSortOrder = getNextSortOrder(siblingItems, body.parentId);

		const created = await prisma.financialItem.create({
			data: {
				profileId: body.profileId,
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
				where: { profileId: body.profileId, parentId: body.parentId },
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

		if (!target || target.profileId !== body.profileId) {
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

		if (!target || target.profileId !== body.profileId) {
			return Response.json({ message: "Financial item not found" }, { status: 404 });
		}

		if (target.level === "large") {
			return Response.json({ message: "Large items cannot be deleted" }, { status: 400 });
		}

		const allItems = await prisma.financialItem.findMany({ where: { profileId: body.profileId } });
		const descendantIds = getDescendantIds(allItems, target.id);

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

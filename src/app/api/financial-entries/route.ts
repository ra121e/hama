import { prisma } from "@/lib/prisma";

type FinancialEntryPayload = {
	yearMonth: string;
	value: number;
	isExpanded?: boolean;
	memo?: string;
};

export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		const scenarioId = url.searchParams.get("scenarioId");
		const itemId = url.searchParams.get("itemId");

		if (!scenarioId) {
			return Response.json(
				{ message: "scenarioId parameter is required" },
				{ status: 400 }
			);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const whereClause: any = { scenarioId };
		if (itemId) {
			whereClause.itemId = itemId;
		}

		const entries = await prisma.financialEntry.findMany({
			where: whereClause,
			orderBy: [
				{ yearMonth: "asc" },
				{ item: { sortOrder: "asc" } },
				{ item: { name: "asc" } },
			],
			include: {
				item: true,
			},
		});

		return Response.json({
			scenarioId,
			entries: entries.map((entry) => ({
				id: entry.id,
				scenarioId: entry.scenarioId,
				itemId: entry.itemId,
				yearMonth: entry.yearMonth,
				value: entry.value,
				isExpanded: entry.isExpanded,
				memo: entry.memo,
				item: {
					id: entry.item.id,
					name: entry.item.name,
					category: entry.item.category,
					autoCalc: entry.item.autoCalc,
					level: entry.item.level,
				},
			})),
		});
	} catch (error) {
		console.error("GET /api/financial-entries error:", error);
		return Response.json(
			{ message: error instanceof Error ? error.message : "Failed to fetch financial entries" },
			{ status: 500 }
		);
	}
}

export async function PATCH(request: Request) {
	try {
		const body = (await request.json()) as {
			id: string;
			value: number;
			memo?: string;
		};

		const { id, value, memo } = body;

		if (!id) {
			return Response.json(
				{ message: "id is required" },
				{ status: 400 }
			);
		}

		const entry = await prisma.financialEntry.update({
			where: { id },
			data: {
				value,
				memo: memo || null,
			},
			include: { item: true },
		});

		return Response.json({
			id: entry.id,
			scenarioId: entry.scenarioId,
			itemId: entry.itemId,
			yearMonth: entry.yearMonth,
			value: entry.value,
			isExpanded: entry.isExpanded,
			memo: entry.memo,
		});
	} catch (error) {
		console.error("PATCH /api/financial-entries error:", error);
		return Response.json(
			{ message: error instanceof Error ? error.message : "Failed to update financial entry" },
			{ status: 500 }
		);
	}
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			scenarioId: string;
			itemId: string;
			yearMonth?: string;
			value?: number;
			memo?: string;
			isExpanded?: boolean;
			entries?: FinancialEntryPayload[];
		};

		const { scenarioId, itemId, yearMonth, value, memo, isExpanded, entries } = body;

		if (!scenarioId || !itemId) {
			return Response.json(
				{ message: "scenarioId and itemId are required" },
				{ status: 400 }
			);
		}

		if (entries && entries.length > 0) {
			const savedEntries = await prisma.$transaction(async (tx) => {
				const result = [] as Array<{
					id: string;
					scenarioId: string;
					itemId: string;
					yearMonth: string;
					value: number;
					isExpanded: boolean;
					memo: string | null;
				}>;

				for (const entryInput of entries) {
					await tx.financialEntry.deleteMany({
						where: {
							scenarioId,
							itemId,
							yearMonth: entryInput.yearMonth,
						},
					});

					const created = await tx.financialEntry.create({
						data: {
							scenarioId,
							itemId,
							yearMonth: entryInput.yearMonth,
							value: entryInput.value,
							isExpanded: entryInput.isExpanded ?? false,
							memo: entryInput.memo ?? null,
						},
					});

					result.push({
						id: created.id,
						scenarioId: created.scenarioId,
						itemId: created.itemId,
						yearMonth: created.yearMonth,
						value: created.value,
						isExpanded: created.isExpanded,
						memo: created.memo,
					});
				}

				return result;
			});

			return Response.json({
				scenarioId,
				itemId,
				savedCount: savedEntries.length,
				entries: savedEntries,
			});
		}

		if (!yearMonth || value === undefined) {
			return Response.json(
				{ message: "yearMonth and value are required" },
				{ status: 400 }
			);
		}

		// Check if entry already exists
		const existing = await prisma.financialEntry.findFirst({
			where: {
				scenarioId,
				itemId,
				yearMonth,
			},
		});

		if (existing) {
			const updated = await prisma.financialEntry.update({
				where: { id: existing.id },
				data: {
					value,
					memo: memo || null,
					isExpanded: isExpanded ?? existing.isExpanded,
				},
			});

			return Response.json({
				id: updated.id,
				scenarioId: updated.scenarioId,
				itemId: updated.itemId,
				yearMonth: updated.yearMonth,
				value: updated.value,
				isExpanded: updated.isExpanded,
				memo: updated.memo,
			});
		}

		const entry = await prisma.financialEntry.create({
			data: {
				scenarioId,
				itemId,
				yearMonth,
				value,
				isExpanded: isExpanded ?? false,
				memo: memo || null,
			},
		});

		return Response.json({
			id: entry.id,
			scenarioId: entry.scenarioId,
			itemId: entry.itemId,
			yearMonth: entry.yearMonth,
			value: entry.value,
			isExpanded: entry.isExpanded,
			memo: entry.memo,
		});
	} catch (error) {
		console.error("POST /api/financial-entries error:", error);
		return Response.json(
			{ message: error instanceof Error ? error.message : "Failed to create financial entry" },
			{ status: 500 }
		);
	}
}

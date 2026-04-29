import { prisma } from "@/lib/prisma";

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
			yearMonth: string;
			value: number;
			memo?: string;
		};

		const { scenarioId, itemId, yearMonth, value, memo } = body;

		if (!scenarioId || !itemId || !yearMonth) {
			return Response.json(
				{ message: "scenarioId, itemId, and yearMonth are required" },
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
			return Response.json(
				{ message: "Entry already exists for this item and month" },
				{ status: 409 }
			);
		}

		const entry = await prisma.financialEntry.create({
			data: {
				scenarioId,
				itemId,
				yearMonth,
				value,
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

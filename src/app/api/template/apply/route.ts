import { prisma } from "@/lib/prisma";
import type { LifecycleTemplate } from "@/features/plan/lib/lifecycleTemplates";

/**
 * POST /api/template/apply
 * テンプレートを適用する
 * - FinancialItems（大中小項目）を作成
 * - FinancialEntriesを作成
 * - 既存の詳細財務入力データは上書きされる
 */
export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			profileId: string;
			scenarioId: string;
			template: LifecycleTemplate;
		};

		const { profileId, scenarioId, template } = body;

		if (!profileId || !scenarioId || !template) {
			return Response.json(
				{ message: "profileId, scenarioId, and template are required" },
				{ status: 400 }
			);
		}

		if (!template.financialDetail?.items || !template.financialDetail?.entries) {
			return Response.json(
				{ message: "Template must include financialDetail with items and entries" },
				{ status: 400 }
			);
		}

		const result = await prisma.$transaction(async (tx) => {
			// 確実に financialDetail が存在することを型に反映させる
			const financialDetail = template.financialDetail;
			if (!financialDetail || !financialDetail.items || !financialDetail.entries) {
				throw new Error("Invalid financial detail structure");
			}
			// 1. 既存の FinancialItem（シナリオに紐づく）を削除しない
			// （他のシナリオから参照される可能性があるため）
			// 2. 既存の FinancialEntry を削除
			await tx.financialEntry.deleteMany({
				where: { scenarioId },
			});

			// 3. テンプレートの items から FinancialItem を作成
			// まず大項目の固定ルートを確認
			const largeItems = await tx.financialItem.findMany({
				where: {
					profileId,
					level: "large",
					parentId: null,
				},
			});

			const categoryToLargeItemId: Record<string, string> = {};
			for (const largeItem of largeItems) {
				categoryToLargeItemId[largeItem.category] = largeItem.id;
			}

			// itemName -> itemId のマップを作成
			const itemNameToId: Record<string, string> = {};

			for (const templateItem of financialDetail.items) {
				if (templateItem.level === "large") {
					// 大項目はカテゴリでマッピング
					const largeItemId = categoryToLargeItemId[templateItem.category];
					itemNameToId[templateItem.name] = largeItemId;
				} else if (templateItem.level === "medium") {
					// 中項目を作成
					const parentLargeId = categoryToLargeItemId[templateItem.category];
					if (!parentLargeId) {
						throw new Error(`Large item not found for category: ${templateItem.category}`);
					}

					const mediumSiblings = await tx.financialItem.findMany({
						where: {
							profileId,
							parentId: parentLargeId,
							level: "medium",
						},
					});
					const nextSortOrder = mediumSiblings.length;

					const medium = await tx.financialItem.create({
						data: {
							profileId,
							level: "medium",
							parentId: parentLargeId,
							name: templateItem.name,
							category: templateItem.category,
							autoCalc: templateItem.autoCalc || "none",
							rate: templateItem.rate || null,
							sortOrder: nextSortOrder,
						},
					});

					itemNameToId[templateItem.name] = medium.id;
				} else if (templateItem.level === "small") {
					// 小項目を作成
					// parentId は templateItem.parentId だが、これは理論的な親
					// 実装では、パレントに対応する実際のIDを見つける必要がある
					const parentName = templateItem.parentId || "";
					const parentId = itemNameToId[parentName];
					if (!parentId) {
						throw new Error(`Parent item not found: ${parentName}`);
					}

					const smallSiblings = await tx.financialItem.findMany({
						where: {
							profileId,
							parentId,
							level: "small",
						},
					});
					const nextSortOrder = smallSiblings.length;

					const small = await tx.financialItem.create({
						data: {
							profileId,
							level: "small",
							parentId,
							name: templateItem.name,
							category: templateItem.category,
							autoCalc: templateItem.autoCalc || "none",
							rate: templateItem.rate || null,
							sortOrder: nextSortOrder,
						},
					});

					itemNameToId[templateItem.name] = small.id;
				}
			}

			// 4. テンプレートの entries から FinancialEntry を作成
			for (const entry of financialDetail.entries) {
				const itemId = itemNameToId[entry.itemName];
				if (!itemId) {
					console.warn(`Item not found: ${entry.itemName}`);
					continue;
				}

				await tx.financialEntry.create({
					data: {
						scenarioId,
						itemId,
						yearMonth: entry.yearMonth,
						value: entry.value,
						isExpanded: false,
						memo: null,
					},
				});
			}

			return {
				success: true,
				itemsCreated: Object.keys(itemNameToId).length,
				entriesCreated: financialDetail.entries.length,
			};
		});

		return Response.json(result);
	} catch (error) {
		console.error("POST /api/template/apply error:", error);
		return Response.json(
			{ message: error instanceof Error ? error.message : "Failed to apply template" },
			{ status: 500 }
		);
	}
}

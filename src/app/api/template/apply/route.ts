import { prisma } from "@/lib/prisma";
import type { FinancialEntry, FinancialItem } from "@/entities/financial-item";
import type { LifecycleTemplate } from "@/features/plan/lib/lifecycleTemplates";
import { applyLifecycleTemplate } from "@/features/financial-detail/lib/applyLifecycleTemplate";

const fixedRootItems = [
	{ category: "income", label: "収入" },
	{ category: "expense", label: "支出" },
	{ category: "asset", label: "資産" },
	{ category: "liability", label: "負債" },
] as const;

const ensureFixedRoots = async (profileId: string, scenarioId: string) => {
	const existingRoots = await prisma.financialItem.findMany({
		where: {
			scenarioId,
			level: "large",
			parentId: null,
		},
		orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
	});

	for (const [sortOrder, root] of fixedRootItems.entries()) {
		const existing = existingRoots.find((item) => item.category === root.category);
		if (existing) {
			continue;
		}

		await prisma.financialItem.create({
			data: {
				profileId,
				scenarioId,
				level: "large",
				parentId: null,
				name: root.label,
				category: root.category,
				autoCalc: "none",
				rate: null,
				sortOrder,
			},
		});
	}
};

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

		const scenario = await prisma.scenario.findFirst({
			where: {
				id: scenarioId,
				profileId,
			},
			select: {
				id: true,
				type: true,
			},
		});

		if (!scenario) {
			return Response.json({ message: "Scenario not found" }, { status: 404 });
		}

		// ベースケース（デフォルトプラン）にはテンプレートを適用しない
		if (scenario.type === "base") {
			return Response.json({ message: "ベースケースにはテンプレートを適用できません" }, { status: 400 });
		}

		if (!template.financialDetail?.items || !template.financialDetail?.entries) {
			return Response.json(
				{ message: "Template must include financialDetail with items and entries" },
				{ status: 400 }
			);
		}

		// 既存の中項目・小項目とシナリオのエントリを全て削除してからテンプレートを適用する
		await ensureFixedRoots(profileId, scenarioId);

		const result = await prisma.$transaction(async (tx) => {
			// まず対象シナリオのエントリを削除
			await tx.financialEntry.deleteMany({ where: { scenarioId } });

			// シナリオ対応の中項目・小項目を全て削除（大項目の固定ルートは維持）
			await tx.financialItem.deleteMany({ where: { scenarioId, level: { in: ["medium", "small"] } } });

			// 現在存在する（大項目のみ想定）項目を取得してテンプレート適用に渡す
			const existingItems = (await tx.financialItem.findMany({
				where: { scenarioId },
				orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
			})) as FinancialItem[];

			const existingEntries: FinancialEntry[] = [];

			return applyLifecycleTemplate({
				profileId,
				scenarioId,
				template,
				existingItems,
				existingEntries,
				createItem: async (data) => tx.financialItem.create({ data }) as Promise<FinancialItem>,
				createEntry: async (data) => tx.financialEntry.create({ data }) as Promise<FinancialEntry>,
			});
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

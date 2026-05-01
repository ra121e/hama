"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	loadLifecycleTemplates,
	type LifecycleTemplate,
	type LifecycleTemplateId,
} from "@/features/plan/lib/lifecycleTemplates";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/profileStore";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const stageLabels: Record<LifecycleTemplateId, string> = {
	twenties: "20代",
	thirties: "30代",
	forties: "40代",
	fifties: "50代",
};

const templateTone: Record<LifecycleTemplateId, string> = {
	twenties: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
	thirties: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
	forties: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
	fifties: "bg-rose-500/10 text-rose-700 ring-rose-500/20",
};

const formatMoney = (value: number) => `${Math.round(value / 10000).toLocaleString("ja-JP")}万円`;

type DetailTemplateSelectorProps = {
	onApplyComplete?: () => void;
};

export function DetailTemplateSelector({ onApplyComplete }: DetailTemplateSelectorProps) {
	const profile = useProfileStore((state) => state.profile);
	const activeScenarioId = useProfileStore((state) => state.activeScenarioId || "base");
	const [templates, setTemplates] = useState<LifecycleTemplate[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [selectedTemplate, setSelectedTemplate] = useState<LifecycleTemplate | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isApplying, setIsApplying] = useState(false);
	const [applyError, setApplyError] = useState<string | null>(null);
	const { toast } = useToast();

	useEffect(() => {
		let isMounted = true;

		const run = async () => {
			try {
				setIsLoading(true);
				setLoadError(null);
				const items = await loadLifecycleTemplates();
				if (isMounted) {
					setTemplates(items);
				}
			} catch (error) {
				if (isMounted) {
					setLoadError(error instanceof Error ? error.message : "テンプレートの読み込みに失敗しました");
				}
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		void run();

		return () => {
			isMounted = false;
		};
	}, []);

	const selectedSummary = useMemo(() => {
		if (!selectedTemplate || !selectedTemplate.financialDetail) {
			return null;
		}

		const itemCount = selectedTemplate.financialDetail.items?.length ?? 0;
		const entryCount = selectedTemplate.financialDetail.entries?.length ?? 0;

		return {
			financial: [
				selectedTemplate.financial.fin_assets,
				selectedTemplate.financial.fin_income,
				selectedTemplate.financial.fin_expense,
			],
			happiness: [
				selectedTemplate.happiness.hap_time,
				selectedTemplate.happiness.hap_health,
				selectedTemplate.happiness.hap_relation,
				selectedTemplate.happiness.hap_selfreal,
			],
			itemCount,
			entryCount,
		};
	}, [selectedTemplate]);

	const openConfirm = (template: LifecycleTemplate) => {
		setSelectedTemplate(template);
		setApplyError(null);
		setIsDialogOpen(true);
	};

	const handleApply = async () => {
		if (!selectedTemplate || !profile.id) {
			return;
		}

		setIsApplying(true);
		setApplyError(null);

		try {
			const response = await fetch("/api/template/apply", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					profileId: profile.id,
					scenarioId: activeScenarioId,
					template: selectedTemplate,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "テンプレート適用に失敗しました");
			}

			const result = await response.json();

			toast({
				title: "テンプレートを適用しました",
				description: `${result.itemsCreated}個の財務項目と${result.entriesCreated}個のエントリを作成しました。`,
			});

			setIsDialogOpen(false);
			setSelectedTemplate(null);

			// 親コンポーネントに通知
			onApplyComplete?.();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "テンプレート適用に失敗しました";
			setApplyError(errorMessage);

			toast({
				variant: "destructive",
				title: "エラー",
				description: errorMessage,
			});
		} finally {
			setIsApplying(false);
		}
	};

	return (
		<div className="space-y-3">
			<div>
				<h3 className="text-sm font-semibold">テンプレートから入力する</h3>
				<p className="text-xs text-muted-foreground">ライフステージ別のサンプル財務項目と月次データを一括適用できます。</p>
			</div>

			{loadError ? <p className="text-xs text-destructive">{loadError}</p> : null}
			{isLoading ? <p className="text-xs text-muted-foreground">テンプレートを読み込み中...</p> : null}

			<div className="grid gap-2 lg:grid-cols-2">
				{templates.map((template) => (
					<Card key={template.id} className="border-border/70 bg-background/70">
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between gap-3">
								<div className="space-y-1">
									<CardTitle className="text-sm">{template.title}</CardTitle>
									<CardDescription className="text-xs">{template.description}</CardDescription>
								</div>
								<Badge className={cn("border", templateTone[template.id])} variant="outline">
									{stageLabels[template.id]}
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="text-xs text-muted-foreground">
								<p>項目: {template.financialDetail?.items?.length ?? 0}個</p>
								<p>月次エントリ: {template.financialDetail?.entries?.length ?? 0}件</p>
							</div>
							<Button
								type="button"
								size="sm"
								onClick={() => openConfirm(template)}
								disabled={!template.financialDetail}
							>
								このテンプレートを使う
							</Button>
						</CardContent>
					</Card>
				))}
			</div>

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>テンプレートを適用しますか？</DialogTitle>
						<DialogDescription>
							選択したテンプレートの財務項目と月次データで、現在のプランの詳細財務入力を上書きします。
						</DialogDescription>
					</DialogHeader>

					{selectedTemplate && selectedSummary ? (
						<div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 text-sm">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium">{selectedTemplate.title}</p>
									<p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
								</div>
								<Badge variant="secondary">{stageLabels[selectedTemplate.id]}</Badge>
							</div>

							<div className="space-y-3">
								<div>
									<p className="text-xs font-semibold text-muted-foreground">財務（基本項目）</p>
									<ul className="mt-1 space-y-1 text-xs">
										<li>総資産: {formatMoney(selectedSummary.financial[0])}</li>
										<li>収入: {formatMoney(selectedSummary.financial[1])}</li>
										<li>支出: {formatMoney(selectedSummary.financial[2])}</li>
									</ul>
								</div>
								<div>
									<p className="text-xs font-semibold text-muted-foreground">詳細財務データ</p>
									<ul className="mt-1 space-y-1 text-xs">
										<li>財務項目: {selectedSummary.itemCount}個</li>
										<li>月次エントリ: {selectedSummary.entryCount}件</li>
									</ul>
								</div>
								<div>
									<p className="text-xs font-semibold text-muted-foreground">ハッピー4項目</p>
									<ul className="mt-1 space-y-1 text-xs">
										<li>時間バランス: {selectedSummary.happiness[0]}</li>
										<li>健康: {selectedSummary.happiness[1]}</li>
										<li>人間関係: {selectedSummary.happiness[2]}</li>
										<li>自己実現: {selectedSummary.happiness[3]}</li>
									</ul>
								</div>
							</div>

							{applyError ? (
								<div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
									{applyError}
								</div>
							) : null}
						</div>
					) : null}

					<DialogFooter>
						<DialogClose className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted">
							キャンセル
						</DialogClose>
						<Button
							type="button"
							onClick={handleApply}
							disabled={!selectedTemplate || isApplying}
						>
							{isApplying ? "適用中..." : "適用する"}
						</Button>
					</DialogFooter>
					<DialogClose className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
						<X className="size-4" />
						<span className="sr-only">閉じる</span>
					</DialogClose>
				</DialogContent>
			</Dialog>
		</div>
	);
}

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
import { usePlanManager } from "@/features/plan/hooks/usePlanManager";
import {
	loadLifecycleTemplates,
	type LifecycleTemplate,
	type LifecycleTemplateId,
} from "@/features/plan/lib/lifecycleTemplates";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { X } from "lucide-react";

type TemplateSelectorProps = {
	className?: string;
};

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

export function TemplateSelector({ className }: TemplateSelectorProps) {
	const { applyTemplate } = usePlanManager();
	const setSelectedTimepoint = useUIStore((state) => state.setSelectedTimepoint);
	const [templates, setTemplates] = useState<LifecycleTemplate[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [selectedTemplate, setSelectedTemplate] = useState<LifecycleTemplate | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

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
		if (!selectedTemplate) {
			return null;
		}

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
		};
	}, [selectedTemplate]);

	const openConfirm = (template: LifecycleTemplate) => {
		setSelectedTemplate(template);
		setIsDialogOpen(true);
	};

	const handleApply = () => {
		if (!selectedTemplate) {
			return;
		}

		applyTemplate(selectedTemplate);
		setSelectedTimepoint("now");
		setIsDialogOpen(false);
	};

	return (
		<section className={cn("space-y-4 rounded-2xl border border-border bg-card/75 p-4 shadow-sm", className)}>
			<div className="space-y-1">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-sm font-semibold">テンプレートから始める</h2>
						<p className="text-xs text-muted-foreground">ライフステージに合わせたサンプル値を一括適用できます。</p>
					</div>
					<Badge variant="secondary">全4種</Badge>
				</div>
			</div>

			{loadError ? <p className="text-xs text-destructive">{loadError}</p> : null}
			{isLoading ? <p className="text-xs text-muted-foreground">テンプレートを読み込み中...</p> : null}

			<div className="grid gap-3 lg:grid-cols-2">
				{templates.map((template) => (
					<Card key={template.id} className="border-border/70 bg-background/70">
						<CardHeader>
							<div className="flex items-start justify-between gap-3">
								<div className="space-y-1">
									<CardTitle className="text-base">{template.title}</CardTitle>
									<CardDescription>{template.description}</CardDescription>
								</div>
								<Badge className={cn("border", templateTone[template.id])} variant="outline">
									{stageLabels[template.id]}
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
								<p>総資産: {formatMoney(template.financial.fin_assets)}</p>
								<p>収入: {formatMoney(template.financial.fin_income)}</p>
								<p>支出: {formatMoney(template.financial.fin_expense)}</p>
								<p>現在時点: 現在</p>
							</div>
							<Button type="button" onClick={() => openConfirm(template)}>
								このテンプレートを使う
							</Button>
						</CardContent>
					</Card>
				))}
			</div>

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>本当に適用しますか？</DialogTitle>
						<DialogDescription>
							選択したテンプレートの値で、現在のアクティブプランを上書きします。
						</DialogDescription>
					</DialogHeader>

					{selectedTemplate && selectedSummary ? (
						<div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 text-sm">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium">{selectedTemplate.title}</p>
									<p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
								</div>
								<Badge variant="secondary">現在</Badge>
							</div>

							<div className="grid gap-2 sm:grid-cols-2">
								<div>
									<p className="text-xs font-semibold text-muted-foreground">財務</p>
									<ul className="mt-1 space-y-1 text-xs">
										<li>総資産: {formatMoney(selectedSummary.financial[0])}</li>
										<li>収入: {formatMoney(selectedSummary.financial[1])}</li>
										<li>支出: {formatMoney(selectedSummary.financial[2])}</li>
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
						</div>
					) : null}

					<DialogFooter>
						<DialogClose className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted">
							キャンセル
						</DialogClose>
						<Button type="button" onClick={handleApply} disabled={!selectedTemplate}>
							適用する
						</Button>
					</DialogFooter>
					<DialogClose className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
						<X className="size-4" />
						<span className="sr-only">閉じる</span>
					</DialogClose>
				</DialogContent>
			</Dialog>
		</section>
	);
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FolderPlus, PencilLine, Plus, Trash2 } from "lucide-react";
import { Accordion, AccordionButton, AccordionItem, AccordionPanel } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildFinancialItemTree, getLevelLabel, getRootLabel, getSiblingOrder, type FinancialItemTreeNode } from "@/features/financial-detail/lib/financial-items";
import { useFinancialItems } from "@/features/financial-detail/hooks/useFinancialItems";

type DialogState =
	| {
		mode: "create";
		parent: FinancialItemTreeNode;
		childLevel: "medium" | "small";
	}
	| {
		mode: "rename";
		item: FinancialItemTreeNode;
	};

const buildIndentClassName = (depth: number) => {
	if (depth === 0) {
		return "";
	}

	return depth === 1 ? "ml-4 border-l border-border pl-4" : "ml-8 border-l border-border pl-4";
};

const ItemActionButton = ({
	label,
	icon,
	onClick,
	disabled,
}: {
	label: string;
	icon: React.ReactNode;
	onClick: () => void;
	disabled?: boolean;
}) => (
	<Button type="button" variant="ghost" size="icon-sm" onClick={onClick} disabled={disabled} aria-label={label}>
		{icon}
	</Button>
);

interface FinancialItemManagerProps {
	onApplyComplete?: () => void | Promise<void>;
}

export function FinancialItemManager({ onApplyComplete }: FinancialItemManagerProps) {
	const { items, isLoading, error, profileId, scenarioId, createFinancialItem, renameFinancialItem, deleteFinancialItem, moveFinancialItem } =
		useFinancialItems();
	const tree = useMemo(() => buildFinancialItemTree(items), [items]);
	const [openRootIds, setOpenRootIds] = useState<string[]>([]);
	const [dialogState, setDialogState] = useState<DialogState | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<FinancialItemTreeNode | null>(null);
	const [draftName, setDraftName] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [isApplying, setIsApplying] = useState(false);

	useEffect(() => {
		if (openRootIds.length === 0 && tree.length > 0) {
			setOpenRootIds(tree.map((item) => item.id));
		}
	}, [openRootIds.length, tree]);

	useEffect(() => {
		if (!dialogState) {
			setDraftName("");
			return;
		}

		setDraftName(dialogState.mode === "rename" ? dialogState.item.name : "");
	}, [dialogState]);

	const openCreateDialog = (parent: FinancialItemTreeNode, childLevel: "medium" | "small") => {
		setActionError(null);
		setDialogState({ mode: "create", parent, childLevel });
	};

	const openRenameDialog = (item: FinancialItemTreeNode) => {
		setActionError(null);
		setDialogState({ mode: "rename", item });
	};

	const closeDialog = () => {
		if (isSubmitting) {
			return;
		}

		setDialogState(null);
		setActionError(null);
	};

	const handleApply = async () => {
		setIsApplying(true);
		try {
			await onApplyComplete?.();
		} catch (error) {
			setActionError(error instanceof Error ? error.message : "適用に失敗しました");
		} finally {
			setIsApplying(false);
		}
	};

	const handleSubmitDialog = async () => {
		if (!dialogState) {
			return;
		}

		setIsSubmitting(true);
		setActionError(null);

		try {
			if (dialogState.mode === "create") {
				await createFinancialItem(dialogState.parent.id, draftName);
			} else {
				await renameFinancialItem(dialogState.item.id, draftName);
			}
			setDialogState(null);
		} catch (submissionError) {
			setActionError(submissionError instanceof Error ? submissionError.message : "処理に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) {
			return;
		}

		setIsSubmitting(true);
		setActionError(null);

		try {
			await deleteFinancialItem(deleteTarget.id);
			setDeleteTarget(null);
		} catch (submissionError) {
			setActionError(submissionError instanceof Error ? submissionError.message : "削除に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const renderSmallItems = (itemsForParent: FinancialItemTreeNode[], parent: FinancialItemTreeNode, depth: number) => {
		if (itemsForParent.length === 0) {
			return (
				<p className="text-xs text-muted-foreground">
					まだ小項目がありません。親にぶら下がる小項目を追加してください。
				</p>
			);
		}

		return (
			<div className="space-y-2">
				{itemsForParent.map((child) => {
					const siblings = getSiblingOrder(items, parent.id).filter((item) => item.level === child.level);
					const currentIndex = siblings.findIndex((item) => item.id === child.id);
					return (
						<div key={child.id} className={`rounded-lg border border-border bg-background/60 p-3 ${buildIndentClassName(depth)}`}>
							<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<div className="min-w-0 space-y-1">
									<div className="flex flex-wrap items-center gap-2">
										<p className="truncate text-sm font-medium">{child.name}</p>
										<Badge variant="outline">{getLevelLabel(child.level)}</Badge>
									</div>
									<p className="text-xs text-muted-foreground">{child.category}</p>
								</div>
								<div className="flex flex-wrap items-center gap-1">
									<ItemActionButton
										label={`${child.name} を上へ移動`}
										icon={<ArrowUp className="size-3.5" />}
										onClick={() => void moveFinancialItem(child.id, "up")}
										disabled={currentIndex <= 0}
									/>
									<ItemActionButton
										label={`${child.name} を下へ移動`}
										icon={<ArrowDown className="size-3.5" />}
										onClick={() => void moveFinancialItem(child.id, "down")}
										disabled={currentIndex >= siblings.length - 1}
									/>
									<ItemActionButton
										label={`${child.name} を編集`}
										icon={<PencilLine className="size-3.5" />}
										onClick={() => openRenameDialog(child)}
									/>
									<ItemActionButton
										label={`${child.name} を削除`}
										icon={<Trash2 className="size-3.5" />}
										onClick={() => setDeleteTarget(child)}
									/>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		);
	};

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="space-y-2">
					<CardTitle>財務項目管理</CardTitle>
					<CardDescription>
						大項目は固定です。中項目と小項目のみ追加・削除・名前変更・並び替えができます。
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoading ? (
						<p className="text-sm text-muted-foreground">財務項目を読み込み中です。</p>
					) : null}
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					{profileId ? (
						<p className="text-xs text-muted-foreground">対象プロフィールID: {profileId}</p>
					) : null}
					{scenarioId ? (
						<p className="text-xs text-muted-foreground">対象シナリオID: {scenarioId}</p>
					) : null}
				</CardContent>
			</Card>

			<Accordion value={openRootIds} onValueChange={setOpenRootIds} multiple>
				{tree.map((root) => {
					const mediumItems = root.children;
					return (
						<AccordionItem key={root.id} value={root.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
							<AccordionButton className="rounded-none border-0 bg-transparent px-4 py-4 text-base">
								<span className="flex min-w-0 items-center gap-3">
									<Badge variant="secondary">{getRootLabel(root.category)}</Badge>
									<span className="truncate">{root.name}</span>
								</span>
								<span className="text-xs font-normal text-muted-foreground">{mediumItems.length}件</span>
							</AccordionButton>
							<AccordionPanel className="px-4 pb-4">
								<div className="space-y-4 border-t border-border pt-4">
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div className="space-y-1">
											<p className="text-sm font-medium">{root.name}</p>
											<p className="text-xs text-muted-foreground">{getLevelLabel(root.level)} / {root.category}</p>
										</div>
										<Button type="button" size="sm" onClick={() => openCreateDialog(root, "medium") }>
											<Plus className="mr-2 size-4" />
											中項目を追加
										</Button>
									</div>

									{mediumItems.length === 0 ? (
										<div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
											この大項目にはまだ中項目がありません。
										</div>
									) : null}

									<div className="space-y-3">
										{mediumItems.map((medium) => {
											const siblingItems = getSiblingOrder(items, root.id).filter((item) => item.level === medium.level);
											const currentIndex = siblingItems.findIndex((item) => item.id === medium.id);
											const smallItems = medium.children;

											return (
												<div key={medium.id} className="rounded-xl border border-border bg-background p-4">
													<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
														<div className="min-w-0 space-y-1">
															<div className="flex flex-wrap items-center gap-2">
																<p className="truncate text-sm font-medium">{medium.name}</p>
																<Badge variant="outline">{getLevelLabel(medium.level)}</Badge>
																<Badge variant="secondary">{medium.category}</Badge>
															</div>
															<p className="text-xs text-muted-foreground">{smallItems.length}件の小項目</p>
														</div>
														<div className="flex flex-wrap items-center gap-1">
															<Button type="button" variant="outline" size="sm" onClick={() => openCreateDialog(medium, "small") }>
																<FolderPlus className="mr-2 size-4" />
																小項目を追加
															</Button>
															<ItemActionButton
																label={`${medium.name} を上へ移動`}
																icon={<ArrowUp className="size-3.5" />}
																onClick={() => void moveFinancialItem(medium.id, "up")}
																disabled={currentIndex <= 0}
															/>
															<ItemActionButton
																label={`${medium.name} を下へ移動`}
																icon={<ArrowDown className="size-3.5" />}
																onClick={() => void moveFinancialItem(medium.id, "down")}
																disabled={currentIndex >= siblingItems.length - 1}
															/>
															<ItemActionButton
																label={`${medium.name} を編集`}
																icon={<PencilLine className="size-3.5" />}
																onClick={() => openRenameDialog(medium)}
															/>
															<ItemActionButton
																label={`${medium.name} を削除`}
																icon={<Trash2 className="size-3.5" />}
																onClick={() => setDeleteTarget(medium)}
															/>
														</div>
													</div>

													<div className={buildIndentClassName(1)}>
														{renderSmallItems(smallItems, medium, 2)}
													</div>
												</div>
											);
										})}
									</div>
								</div>
							</AccordionPanel>
						</AccordionItem>
					);
				})}
			</Accordion>

			<Dialog open={dialogState !== null} onOpenChange={(open) => !open && closeDialog()}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{dialogState?.mode === "rename" ? "項目名を変更" : "財務項目を追加"}</DialogTitle>
						<DialogDescription>
							{dialogState?.mode === "rename"
								? "中項目・小項目の名称のみ変更できます。"
								: `${dialogState?.childLevel === "medium" ? "中項目" : "小項目"}を追加します。`}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Input
							value={draftName}
							onChange={(event) => setDraftName(event.target.value)}
							placeholder="項目名を入力"
							autoFocus
						/>
						{dialogState?.mode === "create" ? (
							<p className="text-xs text-muted-foreground">親: {dialogState.parent.name}</p>
						) : null}
						{actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" disabled={isSubmitting} onClick={closeDialog}>
							キャンセル
						</Button>
						<Button type="button" onClick={() => void handleSubmitDialog()} disabled={isSubmitting || draftName.trim() === ""}>
							{isSubmitting ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && !isSubmitting && setDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>項目を削除</DialogTitle>
						<DialogDescription>
							{deleteTarget ? `${deleteTarget.name} を削除します。配下の小項目も一緒に削除されます。` : null}
						</DialogDescription>
					</DialogHeader>
					{actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
					<DialogFooter>
						<Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setDeleteTarget(null)}>
							キャンセル
						</Button>
						<Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={isSubmitting}>
							{isSubmitting ? "削除中..." : "削除する"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className="flex gap-2">
				<Button
					type="button"
					onClick={() => void handleApply()}
					disabled={isApplying || isLoading}
					className="ml-auto"
				>
					{isApplying ? "適用中..." : "適用"}
				</Button>
			</div>
		</div>
	);
}

"use client";

import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { FinancialItemManagerBuffered as FinancialItemManager } from "@/features/financial-detail/components/FinancialItemManagerBuffered";
import { useState } from "react";

interface FinancialItemManagerDialogProps {
	onApplyComplete?: () => void | Promise<void>;
}

export function FinancialItemManagerDialog({ onApplyComplete }: FinancialItemManagerDialogProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger render={
				<Button type="button" variant="default" size="lg" className="h-11 gap-2 px-5 shadow-sm">
					<Settings2 className="size-4" />
					財務項目を管理する
				</Button>
			} />
			<DialogContent className="max-w-6xl gap-5 overflow-y-auto p-0">
				<div className="max-h-[90vh] space-y-5 p-6">
					<DialogHeader>
						<DialogTitle>財務項目管理</DialogTitle>
						<DialogDescription>中項目と小項目の追加・編集・削除を行います。</DialogDescription>
					</DialogHeader>
					<FinancialItemManager onApplyComplete={onApplyComplete} onClose={() => setIsOpen(false)} isOpen={isOpen} />
				</div>
			</DialogContent>
		</Dialog>
	);
}

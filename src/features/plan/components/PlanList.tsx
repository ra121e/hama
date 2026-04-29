"use client";

import { Button } from "@/components/ui/button";
import type { PlanSummary } from "@/features/plan/types";
import { cn } from "@/lib/utils";

type PlanListProps = {
  plans: PlanSummary[];
  activePlanId: string;
  onSelect: (planId: string) => void;
  onRename: (planId: string) => void;
  onDelete: (planId: string) => void;
  className?: string;
};

export function PlanList({
  plans,
  activePlanId,
  onSelect,
  onRename,
  onDelete,
  className,
}: PlanListProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {plans.map((plan) => {
        const isActive = plan.id === activePlanId;

        return (
          <div
            key={plan.id}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md border px-3 py-2",
              isActive ? "border-primary bg-primary/5" : "border-border bg-background",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(plan.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-medium">{plan.name}</p>
              <p className="text-xs text-muted-foreground">
                {plan.isDefault ? "ベースプラン（削除不可）" : "追加プラン"}
              </p>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="outline" size="xs" onClick={() => onRename(plan.id)}>
                名前変更
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => onDelete(plan.id)}
                disabled={plan.isDefault}
              >
                削除
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanList } from "@/features/plan/components/PlanList";
import { usePlanManager } from "@/features/plan/hooks/usePlanManager";
import { cn } from "@/lib/utils";

type PlanSwitcherProps = {
  className?: string;
};

export function PlanSwitcher({ className }: PlanSwitcherProps) {
  const {
    plans,
    activePlanId,
    isSaving,
    canCreatePlan,
    additionalPlanCount,
    validatePlanName,
    setActivePlan,
    createPlan,
    renamePlan,
    deletePlan,
  } = usePlanManager();

  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanError, setNewPlanError] = useState<string | null>(null);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === activePlanId),
    [activePlanId, plans],
  );

  const handleCreate = async () => {
    const parsed = validatePlanName(newPlanName);
    if (!parsed.success) {
      setNewPlanError(parsed.error.issues[0]?.message ?? "プラン名を確認してください");
      return;
    }

    setNewPlanError(null);
    await createPlan(parsed.data);
    setNewPlanName("");
  };

  const handleRename = async (planId: string) => {
    const target = plans.find((plan) => plan.id === planId);
    if (!target) {
      return;
    }

    const nextName = window.prompt("新しいプラン名", target.name);
    if (nextName === null) {
      return;
    }

    const parsed = validatePlanName(nextName);
    if (!parsed.success) {
      window.alert(parsed.error.issues[0]?.message ?? "プラン名を確認してください");
      return;
    }

    await renamePlan(planId, parsed.data);
  };

  const handleDelete = async (planId: string) => {
    const target = plans.find((plan) => plan.id === planId);
    if (!target || target.isDefault) {
      return;
    }

    const accepted = window.confirm(`プラン「${target.name}」を削除しますか？`);
    if (!accepted) {
      return;
    }

    await deletePlan(planId);
  };

  return (
    <section className={cn("space-y-3 rounded-xl border border-border bg-card/70 p-4", className)}>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">プラン管理</h2>
        <p className="text-xs text-muted-foreground">
          現在プラン: {activePlan?.name ?? "未選択"} / 追加プラン数: {additionalPlanCount}/5
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-plan-name">新規プラン名</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="new-plan-name"
            placeholder="例: 子ども2人私立大学"
            value={newPlanName}
            onChange={(event) => setNewPlanName(event.target.value)}
            className="min-w-[220px] flex-1"
          />
          <Button type="button" onClick={() => void handleCreate()} disabled={!canCreatePlan || isSaving}>
            新規プラン作成
          </Button>
        </div>
        {!canCreatePlan ? (
          <p className="text-xs text-amber-600">追加プランは最大5件までです。</p>
        ) : null}
        {newPlanError ? <p className="text-xs text-destructive">{newPlanError}</p> : null}
      </div>

      <PlanList
        plans={plans}
        activePlanId={activePlanId}
        onSelect={setActivePlan}
        onRename={(planId) => void handleRename(planId)}
        onDelete={(planId) => void handleDelete(planId)}
      />
    </section>
  );
}

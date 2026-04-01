"use client";

import { Button } from "@/components/ui/button";
import type { Timepoint } from "@/entities/profile";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/profileStore";
import { useUIStore } from "@/store/uiStore";

const TIMEPOINT_OPTIONS: Array<{ value: Timepoint; label: string }> = [
  { value: "now", label: "現在" },
  { value: "5y", label: "5年後" },
  { value: "10y", label: "10年後" },
  { value: "20y", label: "20年後" },
];

type TimepointSelectorProps = {
  className?: string;
};

export function TimepointSelector({ className }: TimepointSelectorProps) {
  const activeTimepoint = useProfileStore((state) => state.activeTimepoint);
  const setActiveTimepoint = useProfileStore((state) => state.setActiveTimepoint);
  const setSelectedTimepoint = useUIStore((state) => state.setSelectedTimepoint);

  const handleSelect = (timepoint: Timepoint) => {
    setActiveTimepoint(timepoint);
    setSelectedTimepoint(timepoint);
  };

  return (
    <div className={cn("rounded-xl border border-border bg-card/70 p-3", className)}>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">時間軸</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TIMEPOINT_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={activeTimepoint === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleSelect(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

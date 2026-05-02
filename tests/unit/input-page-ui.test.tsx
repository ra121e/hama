import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("input page (simplified)", () => {
	it("contains PlanSwitcher and detail CTA, and removes other inputs", () => {
		const source = readFileSync(join(process.cwd(), "src", "app", "input", "page.tsx"), "utf8");

		expect(source).toContain("PlanSwitcher");
		expect(source).toContain("詳細財務入力へ進む");

		// Removed components
		expect(source).not.toContain("TimepointSelector");
		expect(source).not.toContain("HappinessSlider");
	});
});

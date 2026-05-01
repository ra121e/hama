import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("financial item manager dialog", () => {
	it("wraps the manager in a dialog trigger and content", () => {
		const source = readFileSync(
			join(process.cwd(), "src", "features", "financial-detail", "components", "FinancialItemManagerDialog.tsx"),
			"utf8",
		);

		expect(source).toContain("DialogTrigger");
		expect(source).toContain("DialogContent");
		expect(source).toContain("DialogHeader");
		expect(source).toContain("DialogTitle");
		expect(source).toContain("FinancialItemManager");
		expect(source).toContain("財務項目を管理する");
	});
});

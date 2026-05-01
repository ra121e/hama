import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("detail input page", () => {
	it("exports the expected title and section labels", () => {
		const source = readFileSync(join(process.cwd(), "src", "app", "input", "detail", "page.tsx"), "utf8");

		expect(source).toContain("詳細財務入力");
		expect(source).toContain("FinancialItemManagerDialog");
		expect(source).toContain("FinancialSpreadsheet");
		expect(source).not.toContain("AggregateDebugPanel");
	});
});

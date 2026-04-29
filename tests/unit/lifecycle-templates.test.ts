import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lifecycleTemplateSchema } from "../../src/features/plan/lib/lifecycleTemplates";

const templateIds = ["twenties", "thirties", "forties", "fifties"] as const;

describe("lifecycle templates", () => {
	it("parses every bundled template file", () => {
		for (const id of templateIds) {
			const filePath = join(process.cwd(), "public", "templates", `${id}.json`);
			const payload = JSON.parse(readFileSync(filePath, "utf8"));
			const parsed = lifecycleTemplateSchema.parse(payload);

			expect(parsed.id).toBe(id);
			expect(parsed.timepoint).toBe("now");
			expect(parsed.financial.fin_assets).toBeGreaterThanOrEqual(0);
			expect(parsed.happiness.hap_time).toBeGreaterThanOrEqual(0);
		}
	});
});

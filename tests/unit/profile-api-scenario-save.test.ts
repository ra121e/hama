import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("profile API scenario persistence", () => {
	it("rejects stale scenario ids instead of creating a new scenario during profile save", () => {
		const source = readFileSync(join(process.cwd(), "src", "app", "api", "profile", "route.ts"), "utf8");

		expect(source).toContain("throw new UnknownScenarioError(normalizedScenarioId);");
		expect(source).toContain("{ status: 409 }");
		expect(source).not.toContain("name: scenarioName ?? \"新規シナリオ\"");
		expect(source).not.toContain("createCustomScenarioType");
	});
});

import { describe, expect, it } from "vitest";
import { createBaseScenario, createScenario } from "../../src/entities/scenario";

describe("scenario entity base handling", () => {
	it("creates base scenarios with generated IDs", () => {
		const scenario = createBaseScenario();
		expect(scenario.type).toBe("base");
		expect(scenario.isDefault).toBe(true);
		expect(scenario.id).not.toBe("base");
	});

	it("respects explicit IDs only when provided intentionally", () => {
		const explicit = createScenario("明示ID", "custom", { id: "explicit-id" });
		const generated = createScenario("自動ID", "custom");

		expect(explicit.id).toBe("explicit-id");
		expect(generated.id).not.toBe("base");
		expect(generated.id).not.toBe("");
	});
});

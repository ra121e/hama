import { describe, expect, it } from "vitest";
import {
	resolveActiveScenarioIdFromServer,
	resolveScenarioIdForPersist,
} from "../../src/shared/lib/scenario-id";

describe("profile store scenario id sync", () => {
	const plans = [
		{ id: "server-base-id", name: "ベースプラン", type: "base", isDefault: true, createdAt: "2026-05-03T00:00:00.000Z" },
		{ id: "custom-1", name: "カスタム", type: "custom:123", isDefault: false, createdAt: "2026-05-03T00:00:00.000Z" },
	];

	it("prefers the client selection only when it still exists on the server", () => {
		expect(resolveActiveScenarioIdFromServer("custom-1", plans, "server-base-id")).toBe("custom-1");
	});

	it("falls back to the server base id when the client selection is stale", () => {
		expect(resolveActiveScenarioIdFromServer("local-temp-id", plans, "server-base-id")).toBe("server-base-id");
	});

	it("uses the server base id for persistence when the current selection is stale", () => {
		expect(resolveScenarioIdForPersist("local-temp-id", plans)).toBe("server-base-id");
	});
});

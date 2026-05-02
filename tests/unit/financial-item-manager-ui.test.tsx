import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("FinancialItemManager UI", () => {
    it("has unified apply and cancel buttons", () => {
        const source = readFileSync(join(process.cwd(), "src", "features", "financial-detail", "components", "FinancialItemManager.tsx"), "utf8");

        expect(source).toContain("適用する");
        expect(source).toContain("適用中...");
        expect(source).toContain("キャンセル");
    });
});

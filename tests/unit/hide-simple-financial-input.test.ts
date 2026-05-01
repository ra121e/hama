import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("UI: simple financial input hidden", () => {
  it("dashboard (src/app/page.tsx) does not render FinancialInput and has detail link", () => {
    const source = readFileSync(join(process.cwd(), "src", "app", "page.tsx"), "utf8");

    expect(source).not.toContain("<FinancialInput />");
    expect(source).toMatch(/href=\{"?\/input\/detail"?\}|href=\"\/input\/detail\"/);
  });

  it("input page (src/app/input/page.tsx) does not render FinancialInput and links to detail", () => {
    const source = readFileSync(join(process.cwd(), "src", "app", "input", "page.tsx"), "utf8");

    expect(source).not.toContain("<FinancialInput />");
    expect(source).toContain("/input/detail");
  });
});

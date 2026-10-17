import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fixedDeposit } from "@/lib/finance/growth";
import { emi } from "@/lib/finance/loans";
import { estimateIncomeTax } from "@/lib/finance/tax/income-tax";
import { executeCalculator, retrieveUserGoals } from "@/lib/agent/tools";
import { calculators } from "@/features/calculators/registry";
import { emptySeed, parseSeed } from "@/features/calculators/parse";

function sourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) files.push(...sourceFiles(full));
    else if (full.endsWith(".ts")) files.push(full);
  }
  return files;
}

describe("calculation boundary", () => {
  it("keeps the finance package free of UI, React, and the agent", () => {
    for (const file of sourceFiles(path.join(process.cwd(), "lib/finance"))) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/from ["']react/);
      expect(source, file).not.toMatch(/from ["']@\/(features|components|app|lib\/agent)/);
    }
  });

  it("keeps the agent free of React components", () => {
    for (const file of sourceFiles(path.join(process.cwd(), "lib/agent"))) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/from ["']react/);
      expect(source, file).not.toMatch(/from ["']@\/components/);
    }
  });

  it("gives every default calculator run finite engine figures", () => {
    for (const calculator of calculators) {
      const parsed = parseSeed(calculator, emptySeed(calculator));
      expect(parsed.ok, calculator.slug).toBe(true);
      if (!parsed.ok) continue;
      const result = calculator.calculate(parsed.values);
      expect(result.figures.length, calculator.slug).toBeGreaterThan(0);
      for (const figure of result.figures) {
        if (figure.value !== null) expect(Number.isFinite(figure.value), `${calculator.slug}:${figure.id}`).toBe(true);
      }
    }
  });

  it("returns the same FD, EMI, and tax numbers the engine computed", () => {
    const fd = executeCalculator("fd");
    expect(fd.ok).toBe(true);
    if (!fd.ok) return;
    const engineFd = fixedDeposit({
      principal: 100000,
      annualNominalRate: 0.07,
      months: 12,
      compounding: "quarterly",
      payout: "cumulative",
    });
    expect(fd.data.figures.find((figure) => figure.id === "totalReceived")?.value).toBe(engineFd.totalReceived);
    expect(fd.data).not.toHaveProperty("headline");

    const loan = executeCalculator("emi");
    expect(loan.ok).toBe(true);
    if (!loan.ok) return;
    expect(loan.data.figures.find((figure) => figure.id === "emi")?.value).toBe(
      emi({ principal: 2_500_000, annualNominalRate: 0.085, months: 240 }),
    );

    const tax = executeCalculator("income-tax");
    expect(tax.ok).toBe(true);
    if (!tax.ok) return;
    const engineTax = estimateIncomeTax({
      financialYear: "FY2026-27",
      regime: "new",
      age: "below-60",
      resident: true,
      salaryIncome: true,
      grossIncome: 1_500_000,
      section80c: 150_000,
      section80d: 0,
      otherOldRegimeDeductions: 0,
      employerNps: 0,
      selfOccupiedInterest: 0,
    });
    expect(tax.data.figures.find((figure) => figure.id === "totalTax")?.value).toBe(engineTax.totalTax);
  });

  it("refuses saved goals", () => {
    const result = retrieveUserGoals();
    expect(result.ok).toBe(false);
  });
});

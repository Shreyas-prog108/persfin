import { describe, expect, it } from "vitest";
import { calculators, getCalculator } from "@/features/calculators/registry";
import { emptySeed, parseSeed } from "@/features/calculators/parse";
import { searchCalculators } from "@/features/calculators/search";

describe("calculator registry", () => {
  it("ships every roadmap calculator once", () => {
    expect(calculators.length).toBe(62);
    expect(new Set(calculators.map((calculator) => calculator.slug)).size).toBe(62);
  });

  it("calculates the labelled defaults for every tool", () => {
    for (const calculator of calculators) {
      const parsed = parseSeed(calculator, emptySeed(calculator));
      expect(parsed.ok, calculator.slug).toBe(true);
      if (!parsed.ok) continue;
      const result = calculator.calculate(parsed.values);
      expect(result.headline.length, calculator.slug).toBeGreaterThan(0);
      expect(result.metrics.length, calculator.slug).toBeGreaterThan(0);
      for (const slug of calculator.related) {
        expect(getCalculator(slug), `${calculator.slug} -> ${slug}`).toBeTruthy();
      }
    }
  });

  it("finds an FD from a plain question", () => {
    const found = searchCalculators("how much will my fd earn");
    expect(found[0]?.slug).toBe("fd");
  });
});

import { phase1 } from "./phase1";
import { phase2 } from "./phase2";
import { phase3 } from "./phase3";
import { phase4 } from "./phase4";
import type { Calculator, CategoryId } from "./types";

export const calculators: Calculator[] = [...phase1, ...phase2, ...phase3, ...phase4];

const bySlug = new Map(calculators.map((calculator) => [calculator.slug, calculator]));

export function getCalculator(slug: string): Calculator | undefined {
  return bySlug.get(slug);
}

export function calculatorsInCategory(category: CategoryId): Calculator[] {
  return calculators.filter((calculator) => calculator.category === category);
}

export function comparisonCalculators(): Calculator[] {
  return calculators.filter((calculator) => calculator.comparison || calculator.category === "compare");
}

export function relatedCalculators(calculator: Calculator): Calculator[] {
  return calculator.related.map((slug) => bySlug.get(slug)).filter((item): item is Calculator => Boolean(item));
}

export const POPULAR_SLUGS = ["fd", "sip", "emi", "income-tax", "ppf", "goal-investment", "fire", "rent-vs-buy"];

export function popularCalculators(): Calculator[] {
  return POPULAR_SLUGS.map((slug) => bySlug.get(slug)).filter((item): item is Calculator => Boolean(item));
}

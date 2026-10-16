import type { GrowthPoint } from "@/lib/finance/growth";
import { samplePoints } from "@/lib/finance/growth";
import { FinanceError } from "@/lib/finance/errors";
import type { CompoundingFrequency } from "@/lib/finance/rates";
import type { ContributionTiming } from "@/lib/finance/growth";
import type { RateConvention } from "@/lib/finance/rates";
import type { ResultSeries } from "./result";

export function growthChart(points: GrowthPoint[], valueLabel = "Value"): ResultSeries[] {
  const sampled = samplePoints(points, 24);
  return [
    { id: "value", label: valueLabel, points: sampled.map((point) => ({ x: monthLabel(point.month), y: point.value })) },
    {
      id: "invested",
      label: "Amount paid in",
      points: sampled.map((point) => ({ x: monthLabel(point.month), y: point.invested })),
    },
  ];
}

export function monthLabel(month: number): string {
  return month % 12 === 0 ? `Year ${month / 12}` : `Month ${month}`;
}

export function asCompounding(value: string): CompoundingFrequency {
  if (value === "monthly" || value === "quarterly" || value === "half-yearly" || value === "yearly") return value;
  throw new FinanceError("Choose a compounding frequency.");
}

export function asTiming(value: string): ContributionTiming {
  if (value === "start" || value === "end") return value;
  throw new FinanceError("Choose when money goes in or comes out.");
}

export function asConvention(value: string): RateConvention {
  if (value === "effective-annual" || value === "nominal") return value;
  throw new FinanceError("Choose how the annual rate should be converted.");
}

export function asPayout(value: string): "cumulative" | "monthly" | "quarterly" | "half-yearly" | "yearly" {
  if (value === "cumulative" || value === "monthly" || value === "quarterly" || value === "half-yearly" || value === "yearly") {
    return value;
  }
  throw new FinanceError("Choose a payout option.");
}

export const ASSUMPTION_RETURN =
  "The return you enter is an assumption. It is not a forecast, and it is not a guaranteed rate.";
export const NOT_ADVICE =
  "This is an educational calculation. It is not tax, investment, insurance, or lending advice.";

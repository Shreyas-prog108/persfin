import { assertFinite, assertPositive, assertRateAboveMinusOne } from "./errors";

export type CompoundingFrequency = "monthly" | "quarterly" | "half-yearly" | "yearly";

export const COMPOUNDING_PERIODS: Record<CompoundingFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  "half-yearly": 2,
  yearly: 1,
};

export type RateConvention = "effective-annual" | "nominal";

/**
 * Nominal annual rate divided by the number of compounding periods.
 * A 8% rate compounded quarterly is 2% per quarter. This is not an effective rate.
 */
export function periodicNominal(annualNominal: number, periodsPerYear: number): number {
  assertFinite("Annual nominal rate", annualNominal);
  assertPositive("Compounding periods", periodsPerYear);
  return annualNominal / periodsPerYear;
}

/** Effective annual rate from a nominal annual rate compounded `periodsPerYear` times. */
export function effectiveAnnualRate(annualNominal: number, periodsPerYear: number): number {
  assertFinite("Annual nominal rate", annualNominal);
  assertPositive("Compounding periods", periodsPerYear);
  const periodic = annualNominal / periodsPerYear;
  if (periodic <= -1) {
    throw new Error("Periodic rate must be greater than -100%.");
  }
  return (1 + periodic) ** periodsPerYear - 1;
}

/**
 * Convert a quoted annual rate into a per-period rate.
 * Effective-annual treats the quote as a CAGR and takes the nth root.
 * Nominal divides the quote by the number of periods, which is the usual loan and FD convention.
 */
export function ratePerPeriod(
  annualRate: number,
  periodsPerYear: number,
  convention: RateConvention,
): number {
  assertRateAboveMinusOne("Annual rate", annualRate);
  assertPositive("Periods per year", periodsPerYear);
  if (convention === "nominal") {
    const periodic = annualRate / periodsPerYear;
    if (periodic <= -1) {
      throw new Error("Periodic rate must be greater than -100%.");
    }
    return periodic;
  }
  return (1 + annualRate) ** (1 / periodsPerYear) - 1;
}

export function futureValueLumpSum(
  principal: number,
  annualRate: number,
  years: number,
  convention: RateConvention = "effective-annual",
  compoundsPerYear = 1,
): number {
  assertFinite("Principal", principal);
  assertFinite("Years", years);
  if (years < 0) {
    throw new Error("Years cannot be negative.");
  }
  if (convention === "nominal") {
    const periodic = ratePerPeriod(annualRate, compoundsPerYear, "nominal");
    return principal * (1 + periodic) ** (compoundsPerYear * years);
  }
  assertRateAboveMinusOne("Annual rate", annualRate);
  return principal * (1 + annualRate) ** years;
}

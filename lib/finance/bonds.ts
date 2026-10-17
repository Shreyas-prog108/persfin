import { FinanceError, assertFinite, assertInteger, assertNonNegative, assertPositive } from "./errors";

export type CouponFrequency = 1 | 2 | 4 | 12;

export interface BondCashflowInput {
  faceValue: number;
  /** Annual coupon rate as a decimal. This is not the yield. */
  annualCouponRate: number;
  periods: number;
  frequency: CouponFrequency;
}

/**
 * Clean price on a coupon date. Yield is the nominal annual yield compounded `frequency` times.
 * A bond priced with its coupon rate as the yield is at par. The coupon is not the yield.
 */
export function bondCleanPrice(
  input: BondCashflowInput & { annualYield: number },
): number {
  const { faceValue, coupon, yieldPerPeriod, periods } = bondParts(input, input.annualYield);
  if (yieldPerPeriod === 0) return coupon * periods + faceValue;
  let price = 0;
  for (let period = 1; period <= periods; period += 1) {
    price += coupon / (1 + yieldPerPeriod) ** period;
  }
  price += faceValue / (1 + yieldPerPeriod) ** periods;
  return price;
}

export function bondYieldToMaturity(
  input: BondCashflowInput & { cleanPrice: number },
): { yield: number; converged: boolean } {
  assertPositive("Clean price", input.cleanPrice);
  const solve = (guess: number): number | null => {
    let rate = guess;
    for (let iteration = 0; iteration < 80; iteration += 1) {
      if (rate <= -0.999) return null;
      const price = safePrice(input, rate);
      const bumped = safePrice(input, rate + 1e-6);
      if (price === null || bumped === null) return null;
      const slope = (bumped - price) / 1e-6;
      if (!Number.isFinite(slope) || Math.abs(slope) < 1e-12) return null;
      const next = rate - (price - input.cleanPrice) / slope;
      if (!Number.isFinite(next) || next <= -1) return null;
      if (Math.abs(next - rate) < 1e-12) return next;
      rate = next;
    }
    return null;
  };
  for (const guess of [input.annualCouponRate, 0.05, 0.08, 0.01, 0.15, 0.3]) {
    const found = solve(guess);
    if (found !== null && Math.abs(safePrice(input, found)! - input.cleanPrice) < 0.01) {
      return { yield: found, converged: true };
    }
  }
  return { yield: Number.NaN, converged: false };
}

function safePrice(input: BondCashflowInput, annualYield: number): number | null {
  try {
    if (annualYield <= -1) return null;
    return bondCleanPrice({ ...input, annualYield });
  } catch {
    return null;
  }
}

export interface AccruedInterestInput {
  faceValue: number;
  annualCouponRate: number;
  frequency: CouponFrequency;
  daysSinceCoupon: number;
  daysInCouponPeriod: number;
}

/** Actual-day accrued coupon. Dirty price is clean price plus this amount. */
export function accruedInterest(input: AccruedInterestInput): number {
  assertPositive("Face value", input.faceValue);
  assertNonNegative("Coupon rate", input.annualCouponRate);
  assertInteger("Days since coupon", input.daysSinceCoupon, 0, 3660);
  assertPositive("Days in coupon period", input.daysInCouponPeriod);
  if (input.daysSinceCoupon > input.daysInCouponPeriod) {
    throw new FinanceError("Days since the last coupon cannot exceed the coupon period.");
  }
  const periodicCoupon = (input.faceValue * input.annualCouponRate) / input.frequency;
  return periodicCoupon * (input.daysSinceCoupon / input.daysInCouponPeriod);
}

export function currentYield(annualCouponCash: number, cleanPrice: number): number {
  assertNonNegative("Annual coupon", annualCouponCash);
  assertPositive("Clean price", cleanPrice);
  return annualCouponCash / cleanPrice;
}

export interface CouponIncomeInput {
  faceValue: number;
  annualCouponRate: number;
  years: number;
  /** Rate at which received coupons are assumed to be reinvested. This is an assumption. */
  reinvestmentAnnualRate: number;
  frequency: CouponFrequency;
}

/**
 * Cash coupons over a holding period, optionally compounded at a reinvestment rate.
 * This is coupon income, not yield to maturity.
 */
export function couponIncome(input: CouponIncomeInput): { cashCoupons: number; reinvestedValue: number } {
  assertPositive("Face value", input.faceValue);
  assertNonNegative("Coupon rate", input.annualCouponRate);
  assertNonNegative("Years", input.years);
  assertFinite("Reinvestment rate", input.reinvestmentAnnualRate);
  if (input.reinvestmentAnnualRate <= -1) {
    throw new FinanceError("Reinvestment rate must be greater than -100%.");
  }
  const periods = Math.round(input.years * input.frequency);
  if (Math.abs(periods - input.years * input.frequency) > 1e-8) {
    throw new FinanceError("Holding period must cover a whole number of coupon periods.");
  }
  const coupon = (input.faceValue * input.annualCouponRate) / input.frequency;
  const cashCoupons = coupon * periods;
  const periodicReinvestment = (1 + input.reinvestmentAnnualRate) ** (1 / input.frequency) - 1;
  let reinvested = 0;
  if (periodicReinvestment === 0) {
    reinvested = cashCoupons;
  } else {
    for (let period = 1; period <= periods; period += 1) {
      const periodsLeft = periods - period;
      reinvested += coupon * (1 + periodicReinvestment) ** periodsLeft;
    }
  }
  return { cashCoupons, reinvestedValue: reinvested };
}

function bondParts(input: BondCashflowInput, annualYield: number): {
  faceValue: number;
  coupon: number;
  yieldPerPeriod: number;
  periods: number;
} {
  assertPositive("Face value", input.faceValue);
  assertNonNegative("Coupon rate", input.annualCouponRate);
  assertInteger("Periods", input.periods, 1, 480);
  assertFinite("Yield", annualYield);
  if (annualYield / input.frequency <= -1) {
    throw new FinanceError("Yield per period must be greater than -100%.");
  }
  return {
    faceValue: input.faceValue,
    coupon: (input.faceValue * input.annualCouponRate) / input.frequency,
    yieldPerPeriod: annualYield / input.frequency,
    periods: input.periods,
  };
}

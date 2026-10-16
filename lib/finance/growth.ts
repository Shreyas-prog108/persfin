import { FinanceError, assertFinite, assertInteger, assertNonNegative, assertPositive } from "./errors";
import {
  type CompoundingFrequency,
  type RateConvention,
  COMPOUNDING_PERIODS,
  effectiveAnnualRate,
  futureValueLumpSum,
  ratePerPeriod,
} from "./rates";

export type ContributionTiming = "start" | "end";

export interface GrowthPoint {
  month: number;
  invested: number;
  value: number;
}

export interface FixedDepositInput {
  principal: number;
  /** Nominal annual rate as a decimal. 0.07 means 7%. */
  annualNominalRate: number;
  months: number;
  compounding: CompoundingFrequency;
  payout: "cumulative" | "monthly" | "quarterly" | "half-yearly" | "yearly";
}

export interface FixedDepositResult {
  maturityValue: number;
  totalInterest: number;
  totalReceived: number;
  effectiveAnnualRate: number;
  periodicPayout: number | null;
  points: GrowthPoint[];
}

const PAYOUT_PERIODS: Record<Exclude<FixedDepositInput["payout"], "cumulative">, number> = {
  monthly: 12,
  quarterly: 4,
  "half-yearly": 2,
  yearly: 1,
};

/**
 * Cumulative FDs compound a nominal annual rate at the selected frequency.
 * Non-cumulative FDs pay simple interest on the original principal. The payout
 * frequency changes when cash is received, not the total simple interest.
 */
export function fixedDeposit(input: FixedDepositInput): FixedDepositResult {
  assertPositive("Deposit amount", input.principal);
  assertFinite("Interest rate", input.annualNominalRate);
  assertInteger("Tenure", input.months, 1, 1200);
  if (input.annualNominalRate <= -1) {
    throw new FinanceError("Interest rate must be greater than -100%.");
  }

  const years = input.months / 12;
  const compounds = COMPOUNDING_PERIODS[input.compounding];
  const ear = effectiveAnnualRate(input.annualNominalRate, compounds);

  if (input.payout === "cumulative") {
    const points: GrowthPoint[] = [];
    for (let month = 1; month <= input.months; month += 1) {
      const value = futureValueLumpSum(
        input.principal,
        input.annualNominalRate,
        month / 12,
        "nominal",
        compounds,
      );
      points.push({ month, invested: input.principal, value });
    }
    const maturityValue = points[points.length - 1]?.value ?? input.principal;
    return {
      maturityValue,
      totalInterest: maturityValue - input.principal,
      totalReceived: maturityValue,
      effectiveAnnualRate: ear,
      periodicPayout: null,
      points,
    };
  }

  const payoutsPerYear = PAYOUT_PERIODS[input.payout];
  const periodicPayout = input.principal * (input.annualNominalRate / payoutsPerYear);
  const totalInterest = input.principal * input.annualNominalRate * years;
  const points: GrowthPoint[] = [];
  for (let month = 1; month <= input.months; month += 1) {
    points.push({
      month,
      invested: input.principal,
      value: input.principal + input.principal * input.annualNominalRate * (month / 12),
    });
  }
  return {
    maturityValue: input.principal,
    totalInterest,
    totalReceived: input.principal + totalInterest,
    effectiveAnnualRate: input.annualNominalRate,
    periodicPayout,
    points,
  };
}

export interface AnnuityInput {
  installment: number;
  annualRate: number;
  months: number;
  timing: ContributionTiming;
  convention: RateConvention;
  /** Used only when convention is nominal. */
  compoundsPerYear?: number;
}

export interface AnnuityResult {
  maturityValue: number;
  totalInvested: number;
  gain: number;
  periodicRate: number;
  points: GrowthPoint[];
}

/**
 * Future value of a monthly annuity.
 * End timing is an ordinary annuity: each instalment earns no return in the month it is paid.
 * Start timing is an annuity due: each instalment earns that month's return.
 * Nominal rates are converted to an equivalent monthly effective rate from the stated compounding frequency.
 */
export function monthlyAnnuity(input: AnnuityInput): AnnuityResult {
  assertPositive("Instalment", input.installment);
  assertInteger("Months", input.months, 1, 1200);
  const compounds = input.compoundsPerYear ?? 12;
  const monthly =
    input.convention === "nominal"
      ? ratePerPeriod(effectiveAnnualRate(input.annualRate, compounds), 12, "effective-annual")
      : ratePerPeriod(input.annualRate, 12, "effective-annual");

  return simulateMonthly({
    months: input.months,
    timing: input.timing,
    monthlyRate: monthly,
    contributionAt: () => input.installment,
    periodicRate: monthly,
  });
}

function simulateMonthly(input: {
  months: number;
  timing: ContributionTiming;
  monthlyRate: number;
  contributionAt: (month: number) => number;
  periodicRate: number;
}): AnnuityResult {
  if (input.monthlyRate <= -1) {
    throw new FinanceError("Monthly rate must be greater than -100%.");
  }
  let value = 0;
  let invested = 0;
  const points: GrowthPoint[] = [];
  for (let month = 1; month <= input.months; month += 1) {
    const contribution = input.contributionAt(month);
    assertNonNegative("Contribution", contribution);
    if (input.timing === "start") {
      value += contribution;
      invested += contribution;
    }
    value *= 1 + input.monthlyRate;
    if (input.timing === "end") {
      value += contribution;
      invested += contribution;
    }
    points.push({ month, invested, value });
  }
  const last = points[points.length - 1];
  return {
    maturityValue: last?.value ?? 0,
    totalInvested: last?.invested ?? 0,
    gain: (last?.value ?? 0) - (last?.invested ?? 0),
    periodicRate: input.periodicRate,
    points,
  };
}

export interface StepUpSipInput {
  installment: number;
  /** Decimal increase applied to the instalment after every 12 contributions. */
  annualStepUp: number;
  annualRate: number;
  months: number;
  timing: ContributionTiming;
  convention: RateConvention;
}

export function stepUpSip(input: StepUpSipInput): AnnuityResult {
  assertPositive("Instalment", input.installment);
  assertNonNegative("Step-up rate", input.annualStepUp);
  assertInteger("Months", input.months, 1, 1200);
  const monthlyRate =
    input.convention === "nominal"
      ? ratePerPeriod(input.annualRate, 12, "nominal")
      : ratePerPeriod(input.annualRate, 12, "effective-annual");
  let current = input.installment;
  return simulateMonthly({
    months: input.months,
    timing: input.timing,
    monthlyRate,
    periodicRate: monthlyRate,
    contributionAt: (month) => {
      if (month > 1 && (month - 1) % 12 === 0) {
        current *= 1 + input.annualStepUp;
      }
      return current;
    },
  });
}

export interface SimpleCompoundInput {
  principal: number;
  annualNominalRate: number;
  years: number;
  compoundsPerYear: number;
}

export function simpleInterest(input: Pick<SimpleCompoundInput, "principal" | "annualNominalRate" | "years">): number {
  assertFinite("Principal", input.principal);
  assertFinite("Rate", input.annualNominalRate);
  assertNonNegative("Years", input.years);
  return input.principal * input.annualNominalRate * input.years;
}

export function compoundInterest(input: SimpleCompoundInput): number {
  assertPositive("Compounding frequency", input.compoundsPerYear);
  if (!Number.isInteger(input.compoundsPerYear)) {
    throw new FinanceError("Compounding frequency must be a whole number of times per year.");
  }
  const maturity = futureValueLumpSum(
    input.principal,
    input.annualNominalRate,
    input.years,
    "nominal",
    input.compoundsPerYear,
  );
  return maturity - input.principal;
}

export interface InflationInput {
  presentAmount: number;
  annualInflation: number;
  years: number;
  nominalAnnualReturn?: number;
}

export interface InflationResult {
  futureCost: number;
  purchasingPower: number;
  realAnnualReturn: number | null;
}

export function inflationImpact(input: InflationInput): InflationResult {
  assertFinite("Amount", input.presentAmount);
  assertNonNegative("Years", input.years);
  assertFinite("Inflation", input.annualInflation);
  if (input.annualInflation <= -1) {
    throw new FinanceError("Inflation must be greater than -100%.");
  }
  const factor = (1 + input.annualInflation) ** input.years;
  const realAnnualReturn =
    input.nominalAnnualReturn === undefined
      ? null
      : realReturn(input.nominalAnnualReturn, input.annualInflation);
  return {
    futureCost: input.presentAmount * factor,
    purchasingPower: input.presentAmount / factor,
    realAnnualReturn,
  };
}

export function realReturn(nominalAnnual: number, inflationAnnual: number): number {
  assertFinite("Nominal return", nominalAnnual);
  assertFinite("Inflation", inflationAnnual);
  if (nominalAnnual <= -1 || inflationAnnual <= -1) {
    throw new FinanceError("Nominal return and inflation must be greater than -100%.");
  }
  return (1 + nominalAnnual) / (1 + inflationAnnual) - 1;
}

/**
 * Tax is applied to the full nominal gain each year. That fits interest.
 * It is a poor model for unrealised equity gains, and the result says so.
 */
export function realReturnAfterAnnualTax(
  nominalAnnual: number,
  inflationAnnual: number,
  taxRate: number,
): number {
  assertNonNegative("Tax rate", taxRate);
  if (taxRate > 1) {
    throw new FinanceError("Tax rate cannot exceed 100%.");
  }
  const afterTax = nominalAnnual * (1 - taxRate);
  return realReturn(afterTax, inflationAnnual);
}

export interface GoalInput {
  targetInTodayRupees: number;
  annualInflation: number;
  months: number;
  existingSavings: number;
  annualReturn: number;
  timing: ContributionTiming;
  convention: RateConvention;
}

export interface GoalResult {
  futureTarget: number;
  futureExisting: number;
  gap: number;
  requiredMonthly: number;
  requiredLumpSumToday: number;
  surplus: number;
}

export function goalInvestment(input: GoalInput): GoalResult {
  assertNonNegative("Target", input.targetInTodayRupees);
  assertNonNegative("Existing savings", input.existingSavings);
  assertInteger("Months", input.months, 0, 1200);
  assertFinite("Inflation", input.annualInflation);
  if (input.annualInflation <= -1) {
    throw new FinanceError("Inflation must be greater than -100%.");
  }
  const years = input.months / 12;
  if (input.annualReturn <= -1) {
    throw new FinanceError("Expected return must be greater than -100%.");
  }
  const futureTarget = input.targetInTodayRupees * (1 + input.annualInflation) ** years;
  const annualGrowth =
    input.convention === "nominal" ? effectiveAnnualRate(input.annualReturn, 12) : input.annualReturn;
  const growth = (1 + annualGrowth) ** years;
  const futureExisting = input.existingSavings * growth;
  const gap = futureTarget - futureExisting;
  const requiredLumpSumToday = years === 0 ? Math.max(0, gap) : Math.max(0, gap) / growth;
  const requiredMonthly =
    gap <= 0 || input.months === 0
      ? 0
      : paymentForFutureValue(Math.max(0, gap), input.annualReturn, input.months, input.timing, input.convention);
  return {
    futureTarget,
    futureExisting,
    gap,
    requiredMonthly,
    requiredLumpSumToday,
    surplus: gap < 0 ? -gap : 0,
  };
}

export function paymentForFutureValue(
  futureValue: number,
  annualRate: number,
  months: number,
  timing: ContributionTiming,
  convention: RateConvention,
): number {
  assertNonNegative("Future value", futureValue);
  assertInteger("Months", months, 1, 1200);
  const monthly =
    convention === "nominal"
      ? ratePerPeriod(annualRate, 12, "nominal")
      : ratePerPeriod(annualRate, 12, "effective-annual");
  if (monthly === 0) return futureValue / months;
  const ordinary = (futureValue * monthly) / ((1 + monthly) ** months - 1);
  return timing === "start" ? ordinary / (1 + monthly) : ordinary;
}

export function samplePoints(points: GrowthPoint[], maxPoints = 36): GrowthPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const sampled = points.filter((point, index) => index === points.length - 1 || point.month % step === 0);
  return sampled;
}

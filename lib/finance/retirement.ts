import { FinanceError, assertFinite, assertInteger, assertNonNegative, assertPositive, assertRateAboveMinusOne } from "./errors";
import { ratePerPeriod } from "./rates";
import type { ContributionTiming } from "./growth";
import { paymentForFutureValue } from "./growth";

export const PPF_ANNUAL_DEPOSIT_CEILING = 150_000;
export const EPF_EPS_WAGE_CEILING = 15_000;
export const EPF_LAST_NOTIFIED_RATE_FY2025_26 = 0.0825;

export interface PpfInput {
  annualDeposit: number;
  /** Nominal annual rate compounded once a year, as a decimal. */
  annualRate: number;
  years: number;
  timing: "start" | "end";
}

export interface PpfResult {
  maturity: number;
  invested: number;
  interest: number;
  aboveCeiling: boolean;
  points: { year: number; invested: number; value: number }[];
}

/**
 * One deposit each financial year. Interest compounds annually.
 * The real PPF scheme credits interest on the lowest balance between the 5th and the end of each month.
 * A single annual deposit does not reproduce that monthly rule.
 */
export function ppfMaturity(input: PpfInput): PpfResult {
  assertNonNegative("Annual deposit", input.annualDeposit);
  assertRateAboveMinusOne("PPF rate", input.annualRate);
  assertInteger("Years", input.years, 1, 50);
  let balance = 0;
  let invested = 0;
  const points: PpfResult["points"] = [];
  for (let year = 1; year <= input.years; year += 1) {
    invested += input.annualDeposit;
    if (input.timing === "start") {
      balance = (balance + input.annualDeposit) * (1 + input.annualRate);
    } else {
      balance = balance * (1 + input.annualRate) + input.annualDeposit;
    }
    points.push({ year, invested, value: balance });
  }
  return {
    maturity: balance,
    invested,
    interest: balance - invested,
    aboveCeiling: input.annualDeposit > PPF_ANNUAL_DEPOSIT_CEILING,
    points,
  };
}

export interface EpfInput {
  monthlyBasic: number;
  employeeRate: number;
  employerRate: number;
  epsRate: number;
  wageCeiling: number;
  restrictToCeiling: boolean;
  annualInterestRate: number;
  years: number;
  annualSalaryGrowth: number;
  openingBalance: number;
}

export interface EpfResult {
  epfBalance: number;
  employeeContribution: number;
  employerEpfContribution: number;
  epsContribution: number;
  interest: number;
  monthlyEmployee: number;
  monthlyEmployerEpf: number;
  monthlyEps: number;
  points: { year: number; value: number; epsPensionIfStopped: number }[];
}

/**
 * EPF interest follows the monthly running-balance method: each month's closing balance
 * earns annualRate/12, and the year's interest is added at year end.
 * EPS is calculated on the wage ceiling even when EPF contributions use a higher basic.
 */
export function epfCorpus(input: EpfInput): EpfResult {
  assertPositive("Monthly basic", input.monthlyBasic);
  assertNonNegative("Employee rate", input.employeeRate);
  assertNonNegative("Employer rate", input.employerRate);
  assertNonNegative("EPS rate", input.epsRate);
  assertPositive("Wage ceiling", input.wageCeiling);
  assertRateAboveMinusOne("EPF interest", input.annualInterestRate);
  assertNonNegative("Salary growth", input.annualSalaryGrowth);
  assertNonNegative("Opening balance", input.openingBalance);
  assertInteger("Years", input.years, 1, 50);
  if (input.employeeRate > 1 || input.employerRate > 1 || input.epsRate > 1) {
    throw new FinanceError("Contribution rates cannot exceed 100%.");
  }

  let basic = input.monthlyBasic;
  let balance = input.openingBalance;
  let employeeContribution = 0;
  let employerEpfContribution = 0;
  let epsContribution = 0;
  let interest = 0;
  const points: EpfResult["points"] = [];
  const cappedWages: number[] = [];
  let firstSplit = monthlySplit(basic, input);

  for (let year = 1; year <= input.years; year += 1) {
    let balanceSum = 0;
    const split = monthlySplit(basic, input);
    if (year === 1) firstSplit = split;
    for (let month = 0; month < 12; month += 1) {
      balance += split.employee + split.employerEpf;
      employeeContribution += split.employee;
      employerEpfContribution += split.employerEpf;
      epsContribution += split.eps;
      balanceSum += balance;
      cappedWages.push(Math.min(basic, input.wageCeiling));
    }
    const yearInterest = (balanceSum * input.annualInterestRate) / 12;
    balance += yearInterest;
    interest += yearInterest;
    points.push({
      year,
      value: balance,
      epsPensionIfStopped: epsPension(cappedWages, year),
    });
    basic *= 1 + input.annualSalaryGrowth;
  }

  return {
    epfBalance: balance,
    employeeContribution,
    employerEpfContribution,
    epsContribution,
    interest,
    monthlyEmployee: firstSplit.employee,
    monthlyEmployerEpf: firstSplit.employerEpf,
    monthlyEps: firstSplit.eps,
    points,
  };
}

function monthlySplit(basic: number, input: EpfInput): { employee: number; employerEpf: number; eps: number } {
  const considered = input.restrictToCeiling ? Math.min(basic, input.wageCeiling) : basic;
  const employee = considered * input.employeeRate;
  const epsWage = Math.min(basic, input.wageCeiling);
  const eps = roundPaise(epsWage * input.epsRate);
  const employerTotal = considered * input.employerRate;
  const employerEpf = Math.max(0, employerTotal - eps);
  return { employee, employerEpf, eps };
}

function roundPaise(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * EPS 1995 pension estimate: pensionable salary × pensionable service / 70.
 * Pensionable salary is the average of the last 60 months of wages, each month capped at the ceiling.
 * Service under 10 years generally does not qualify for a monthly pension.
 */
export function epsPension(cappedMonthlyWages: number[], yearsOfService: number): number {
  assertInteger("Years of service", yearsOfService, 0, 60);
  if (cappedMonthlyWages.length === 0 || yearsOfService <= 0) return 0;
  const window = cappedMonthlyWages.slice(-60);
  const average = window.reduce((sum, wage) => sum + wage, 0) / window.length;
  return (average * yearsOfService) / 70;
}

export interface NpsInput {
  monthlyEmployee: number;
  monthlyEmployer: number;
  monthlyVoluntary: number;
  annualReturn: number;
  years: number;
  /** Share of the corpus used to buy an annuity. The general exit minimum is 40%, with exceptions. */
  annuityShare: number;
  /** Assumed annuity rate. This is not a quote from an annuity provider. */
  annuityRate: number;
  timing: ContributionTiming;
}

export interface NpsResult {
  corpus: number;
  invested: number;
  gain: number;
  annuityCorpus: number;
  lumpSum: number;
  annualPension: number;
  points: { year: number; invested: number; value: number }[];
}

export function npsProjection(input: NpsInput): NpsResult {
  assertNonNegative("Employee contribution", input.monthlyEmployee);
  assertNonNegative("Employer contribution", input.monthlyEmployer);
  assertNonNegative("Voluntary contribution", input.monthlyVoluntary);
  assertRateAboveMinusOne("Expected return", input.annualReturn);
  assertInteger("Years", input.years, 1, 50);
  assertFinite("Annuity share", input.annuityShare);
  assertNonNegative("Annuity rate", input.annuityRate);
  if (input.annuityShare < 0 || input.annuityShare > 1) {
    throw new FinanceError("Annuity share must be between 0% and 100%.");
  }
  const monthly = input.monthlyEmployee + input.monthlyEmployer + input.monthlyVoluntary;
  const monthlyRate = ratePerPeriod(input.annualReturn, 12, "effective-annual");
  let value = 0;
  let invested = 0;
  const points: NpsResult["points"] = [];
  for (let year = 1; year <= input.years; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      if (input.timing === "start") {
        value += monthly;
        invested += monthly;
      }
      value *= 1 + monthlyRate;
      if (input.timing === "end") {
        value += monthly;
        invested += monthly;
      }
    }
    points.push({ year, invested, value });
  }
  return {
    corpus: value,
    invested,
    gain: value - invested,
    annuityCorpus: value * input.annuityShare,
    lumpSum: value * (1 - input.annuityShare),
    annualPension: value * input.annuityShare * input.annuityRate,
    points,
  };
}

export interface SwpInput {
  corpus: number;
  withdrawal: number;
  /** Effective annual return assumption. A constant return hides sequence risk. */
  annualReturn: number;
  annualInflation: number;
  months: number;
  timing: ContributionTiming;
}

export interface SwpResult {
  endingCorpus: number;
  monthsLasted: number;
  totalWithdrawn: number;
  depleted: boolean;
  points: { month: number; value: number; withdrawn: number }[];
}

export function systematicWithdrawal(input: SwpInput): SwpResult {
  assertPositive("Corpus", input.corpus);
  assertPositive("Withdrawal", input.withdrawal);
  assertRateAboveMinusOne("Expected return", input.annualReturn);
  assertRateAboveMinusOne("Inflation", input.annualInflation);
  assertInteger("Months", input.months, 1, 1200);
  const monthlyRate = ratePerPeriod(input.annualReturn, 12, "effective-annual");
  let balance = input.corpus;
  let withdrawal = input.withdrawal;
  let totalWithdrawn = 0;
  let depleted = false;
  const points: SwpResult["points"] = [];
  let month = 0;
  for (; month < input.months; month += 1) {
    if (balance <= 0.005) {
      depleted = true;
      break;
    }
    const due = withdrawal;
    if (input.timing === "start") {
      const taken = Math.min(balance, due);
      balance -= taken;
      totalWithdrawn += taken;
      if (taken < due - 0.005) {
        depleted = true;
        points.push({ month: month + 1, value: 0, withdrawn: totalWithdrawn });
        break;
      }
      balance *= 1 + monthlyRate;
    } else {
      balance *= 1 + monthlyRate;
      const taken = Math.min(balance, due);
      balance -= taken;
      totalWithdrawn += taken;
      if (taken < due - 0.005) {
        depleted = true;
        points.push({ month: month + 1, value: 0, withdrawn: totalWithdrawn });
        break;
      }
    }
    if ((month + 1) % 12 === 0) withdrawal *= 1 + input.annualInflation;
    points.push({ month: month + 1, value: balance, withdrawn: totalWithdrawn });
  }
  return {
    endingCorpus: Math.max(0, balance),
    monthsLasted: points.length,
    totalWithdrawn,
    depleted,
    points,
  };
}

export interface RetirementInput {
  annualExpenseToday: number;
  yearsToRetirement: number;
  yearsInRetirement: number;
  inflation: number;
  preRetirementReturn: number;
  postRetirementReturn: number;
  currentCorpus: number;
  timing: ContributionTiming;
}

export interface RetirementResult {
  expenseAtRetirement: number;
  corpusNeeded: number;
  projectedCurrentCorpus: number;
  gap: number;
  requiredMonthly: number;
  survived: boolean;
}

/**
 * Retirement spending starts at the inflated expense and then grows with inflation each year.
 * Withdrawals happen at the start of each retirement year. The required corpus is found by binary search.
 * A constant return is one scenario, not a promise that the portfolio will survive.
 */
export function retirementCorpus(input: RetirementInput): RetirementResult {
  assertPositive("Annual expense", input.annualExpenseToday);
  assertInteger("Years to retirement", input.yearsToRetirement, 0, 70);
  assertInteger("Years in retirement", input.yearsInRetirement, 1, 60);
  assertRateAboveMinusOne("Inflation", input.inflation);
  assertRateAboveMinusOne("Pre-retirement return", input.preRetirementReturn);
  assertRateAboveMinusOne("Post-retirement return", input.postRetirementReturn);
  assertNonNegative("Current corpus", input.currentCorpus);

  const expenseAtRetirement =
    input.annualExpenseToday * (1 + input.inflation) ** input.yearsToRetirement;
  const corpusNeeded = corpusForGrowingWithdrawal({
    firstWithdrawal: expenseAtRetirement,
    years: input.yearsInRetirement,
    nominalReturn: input.postRetirementReturn,
    inflation: input.inflation,
  });
  const projectedCurrentCorpus =
    input.currentCorpus * (1 + input.preRetirementReturn) ** input.yearsToRetirement;
  const gap = corpusNeeded - projectedCurrentCorpus;
  const months = input.yearsToRetirement * 12;
  const requiredMonthly =
    gap <= 0 || months === 0
      ? 0
      : paymentForFutureValue(gap, input.preRetirementReturn, months, input.timing, "effective-annual");
  return {
    expenseAtRetirement,
    corpusNeeded,
    projectedCurrentCorpus,
    gap,
    requiredMonthly,
    survived: corpusLasts(corpusNeeded, expenseAtRetirement, input.yearsInRetirement, input.postRetirementReturn, input.inflation),
  };
}

export function corpusForGrowingWithdrawal(input: {
  firstWithdrawal: number;
  years: number;
  nominalReturn: number;
  inflation: number;
}): number {
  let low = 0;
  let high = Math.max(input.firstWithdrawal, 1);
  while (!corpusLasts(high, input.firstWithdrawal, input.years, input.nominalReturn, input.inflation)) {
    high *= 2;
    if (high > 1e15) {
      throw new FinanceError("No finite corpus supports this withdrawal under the entered return.");
    }
  }
  for (let step = 0; step < 60; step += 1) {
    const mid = (low + high) / 2;
    if (corpusLasts(mid, input.firstWithdrawal, input.years, input.nominalReturn, input.inflation)) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return high;
}

export function corpusLasts(
  corpus: number,
  firstWithdrawal: number,
  years: number,
  nominalReturn: number,
  inflation: number,
): boolean {
  let balance = corpus;
  let withdrawal = firstWithdrawal;
  for (let year = 0; year < years; year += 1) {
    balance -= withdrawal;
    if (balance < -0.5) return false;
    balance *= 1 + nominalReturn;
    withdrawal *= 1 + inflation;
  }
  return balance >= -0.5;
}

export interface FireInput {
  annualExpenses: number;
  safeWithdrawalRate: number;
  portfolio: number;
  annualSavings: number;
  annualReturn: number;
  inflation: number;
  savingsGrowth: number;
}

export interface FireResult {
  fireNumberToday: number;
  progress: number;
  years: number | null;
  reachable: boolean;
  scenarios: { withdrawalRate: number; corpus: number }[];
}

export function fireEstimate(input: FireInput): FireResult {
  assertPositive("Annual expenses", input.annualExpenses);
  assertPositive("Safe withdrawal rate", input.safeWithdrawalRate);
  if (input.safeWithdrawalRate > 0.2) {
    throw new FinanceError("Enter a withdrawal rate of 20% or less for this scenario tool.");
  }
  assertNonNegative("Portfolio", input.portfolio);
  assertFinite("Annual savings", input.annualSavings);
  assertRateAboveMinusOne("Return", input.annualReturn);
  assertRateAboveMinusOne("Inflation", input.inflation);
  assertRateAboveMinusOne("Savings growth", input.savingsGrowth);
  const fireNumberToday = input.annualExpenses / input.safeWithdrawalRate;
  const scenarioRates = [0.03, 0.035, 0.04, input.safeWithdrawalRate];
  const uniqueRates = [...new Set(scenarioRates.map((rate) => Number(rate.toFixed(4))))];
  let portfolio = input.portfolio;
  let expenses = input.annualExpenses;
  let savings = input.annualSavings;
  let years: number | null = portfolio >= expenses / input.safeWithdrawalRate ? 0 : null;
  for (let year = 1; year <= 80 && years === null; year += 1) {
    portfolio = portfolio * (1 + input.annualReturn) + savings;
    expenses *= 1 + input.inflation;
    savings *= 1 + input.savingsGrowth;
    if (portfolio >= expenses / input.safeWithdrawalRate) years = year;
  }
  return {
    fireNumberToday,
    progress: fireNumberToday === 0 ? 0 : input.portfolio / fireNumberToday,
    years,
    reachable: years !== null,
    scenarios: uniqueRates.map((withdrawalRate) => ({
      withdrawalRate,
      corpus: input.annualExpenses / withdrawalRate,
    })),
  };
}

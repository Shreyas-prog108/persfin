import { FinanceError, assertFinite, assertNonNegative, assertPositive } from "./errors";
import { daysBetween, utcDayNumber, yearFraction365 } from "./dates";

export function absoluteReturn(startValue: number, endValue: number): number {
  assertPositive("Starting value", startValue);
  assertFinite("Ending value", endValue);
  if (endValue < 0) {
    throw new FinanceError("Ending value cannot be negative.");
  }
  return (endValue - startValue) / startValue;
}

export function cagr(startValue: number, endValue: number, years: number): number {
  assertPositive("Starting value", startValue);
  assertPositive("Ending value", endValue);
  assertPositive("Years", years);
  return (endValue / startValue) ** (1 / years) - 1;
}

export function cagrBetweenDates(startValue: number, endValue: number, startDate: string, endDate: string): number {
  return cagr(startValue, endValue, yearFraction365(startDate, endDate));
}

export interface CashFlow {
  date: string;
  amount: number;
}

export interface XirrResult {
  status: "unique" | "multiple" | "no-root";
  /** Present only when a single root was found. */
  rate: number | null;
  candidates: number[];
}

interface TimedFlow {
  amount: number;
  years: number;
}

/**
 * Excel-compatible XIRR: NPV uses actual days divided by 365.
 * Newton-Raphson is started from several guesses. Distinct converged roots are all reported.
 * If more than one root is found, `rate` is null so a single number is not presented as the answer.
 */
export function xirr(cashFlows: CashFlow[]): XirrResult {
  if (cashFlows.length < 2) {
    throw new FinanceError("XIRR needs at least two cash flows.");
  }
  const timed = cashFlows.map((flow) => {
    assertFinite(`Cash flow on ${flow.date}`, flow.amount);
    return { date: flow.date, day: utcDayNumber(flow.date), amount: flow.amount };
  });
  const hasPositive = timed.some((flow) => flow.amount > 0);
  const hasNegative = timed.some((flow) => flow.amount < 0);
  if (!hasPositive || !hasNegative) {
    throw new FinanceError("XIRR needs at least one contribution and one return. Use opposite signs.");
  }
  const firstDay = Math.min(...timed.map((flow) => flow.day));
  const lastDay = Math.max(...timed.map((flow) => flow.day));
  if (lastDay === firstDay) {
    throw new FinanceError("Cash flows must not all fall on the same date.");
  }
  const flows: TimedFlow[] = timed.map((flow) => ({
    amount: flow.amount,
    years: (flow.day - firstDay) / 365,
  }));

  const guesses = [-0.9, -0.5, -0.2, 0, 0.1, 0.2, 0.5, 1, 2, 5];
  const found: number[] = [];
  for (const guess of guesses) {
    const root = newtonXirr(flows, guess);
    if (root === null) continue;
    if (!found.some((existing) => Math.abs(existing - root) <= 1e-6)) {
      found.push(root);
    }
  }
  found.sort((a, b) => a - b);
  if (found.length === 0) return { status: "no-root", rate: null, candidates: [] };
  if (found.length === 1) return { status: "unique", rate: found[0] ?? null, candidates: found };
  return { status: "multiple", rate: null, candidates: found };
}

function npv(rate: number, flows: TimedFlow[]): number {
  let total = 0;
  for (const flow of flows) {
    total += flow.amount / (1 + rate) ** flow.years;
  }
  return total;
}

function derivative(rate: number, flows: TimedFlow[]): number {
  let total = 0;
  for (const flow of flows) {
    total += (-flow.years * flow.amount) / (1 + rate) ** (flow.years + 1);
  }
  return total;
}

function newtonXirr(flows: TimedFlow[], guess: number): number | null {
  let rate = guess;
  for (let iteration = 0; iteration < 80; iteration += 1) {
    if (rate <= -0.999999999) return null;
    const value = npv(rate, flows);
    const slope = derivative(rate, flows);
    if (!Number.isFinite(value) || !Number.isFinite(slope) || Math.abs(slope) < 1e-14) return null;
    const next = rate - value / slope;
    if (!Number.isFinite(next) || next <= -1) return null;
    if (Math.abs(next - rate) < 1e-12) {
      return Math.abs(npv(next, flows)) < 1e-6 ? next : null;
    }
    rate = next;
  }
  return Math.abs(npv(rate, flows)) < 1e-6 ? rate : null;
}

export function dividendYield(annualDividend: number, price: number): number {
  assertNonNegative("Annual dividend", annualDividend);
  assertPositive("Price", price);
  return annualDividend / price;
}

export interface TotalReturnInput {
  amountInvested: number;
  endingValue: number;
  incomeReceived: number;
  years?: number;
}

export function totalReturn(input: TotalReturnInput): { gain: number; absolute: number; cagr: number | null } {
  assertPositive("Amount invested", input.amountInvested);
  assertNonNegative("Ending value", input.endingValue);
  assertNonNegative("Income received", input.incomeReceived);
  const gain = input.endingValue - input.amountInvested + input.incomeReceived;
  const absolute = gain / input.amountInvested;
  const annualised = input.years === undefined ? null : cagr(input.amountInvested, input.amountInvested + gain, input.years);
  if (input.years !== undefined && input.amountInvested + gain <= 0) {
    throw new FinanceError("CAGR is not defined when the ending wealth is zero or negative.");
  }
  return { gain, absolute, cagr: annualised };
}

export { daysBetween };

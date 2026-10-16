import { FinanceError, assertFinite, assertInteger, assertNonNegative, assertPositive } from "./errors";

export interface EmiInput {
  principal: number;
  /** Nominal annual rate as a decimal. The monthly rate is this divided by 12. */
  annualNominalRate: number;
  months: number;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  interest: number;
  principalPaid: number;
  extraPrincipal: number;
  balance: number;
}

export interface AmortizationSummary {
  emi: number;
  months: number;
  totalPaid: number;
  totalInterest: number;
  rows: AmortizationRow[];
}

/**
 * Reducing-balance EMI. The rate is nominal annual divided by 12.
 * Payments are due at the end of each month. The final payment is reduced so the balance ends at zero.
 */
export function emi(input: EmiInput): number {
  assertPositive("Loan amount", input.principal);
  assertNonNegative("Interest rate", input.annualNominalRate);
  assertInteger("Tenure", input.months, 1, 1200);
  const monthly = input.annualNominalRate / 12;
  if (monthly === 0) return input.principal / input.months;
  const growth = (1 + monthly) ** input.months;
  return (input.principal * monthly * growth) / (growth - 1);
}

export interface ScheduleInput extends EmiInput {
  extraMonthly?: number;
  prepayment?: { month: number; amount: number };
}

export function amortizationSchedule(input: ScheduleInput): AmortizationSummary {
  const baseEmi = emi(input);
  const extraMonthly = input.extraMonthly ?? 0;
  assertNonNegative("Extra monthly payment", extraMonthly);
  if (input.prepayment) {
    assertInteger("Prepayment month", input.prepayment.month, 1, input.months);
    assertNonNegative("Prepayment amount", input.prepayment.amount);
  }
  const monthly = input.annualNominalRate / 12;
  let balance = input.principal;
  const rows: AmortizationRow[] = [];
  let totalPaid = 0;
  let totalInterest = 0;

  for (let month = 1; month <= input.months && balance > 0.005; month += 1) {
    const interest = balance * monthly;
    let payment = Math.min(baseEmi, balance + interest);
    let principalPaid = payment - interest;
    if (principalPaid > balance) {
      principalPaid = balance;
      payment = interest + principalPaid;
    }
    balance -= principalPaid;
    let extraPrincipal = 0;
    if (extraMonthly > 0 && balance > 0) {
      extraPrincipal += Math.min(extraMonthly, balance);
    }
    if (input.prepayment && input.prepayment.month === month && balance > 0) {
      extraPrincipal += Math.min(input.prepayment.amount, balance - Math.min(extraMonthly, balance));
    }
    extraPrincipal = Math.min(extraPrincipal, balance);
    balance -= extraPrincipal;
    if (balance < 0.005) balance = 0;
    totalPaid += payment + extraPrincipal;
    totalInterest += interest;
    rows.push({
      month,
      payment,
      interest,
      principalPaid,
      extraPrincipal,
      balance,
    });
  }

  return {
    emi: baseEmi,
    months: rows.length,
    totalPaid,
    totalInterest,
    rows,
  };
}

export function loanFromEmi(monthlyEmi: number, annualNominalRate: number, months: number): number {
  assertNonNegative("EMI", monthlyEmi);
  assertNonNegative("Interest rate", annualNominalRate);
  assertInteger("Tenure", months, 1, 1200);
  if (monthlyEmi === 0) return 0;
  const monthly = annualNominalRate / 12;
  if (monthly === 0) return monthlyEmi * months;
  const growth = (1 + monthly) ** months;
  return (monthlyEmi * (growth - 1)) / (monthly * growth);
}

export interface AffordabilityInput {
  monthlyIncome: number;
  /** Share of monthly income that can go to all EMIs. A planning assumption, not a lender rule. */
  obligationRatio: number;
  existingMonthlyEmi: number;
  annualNominalRate: number;
  months: number;
}

export function homeLoanAffordability(input: AffordabilityInput): {
  maxEmi: number;
  maxLoan: number;
  limitedByExistingEmi: boolean;
} {
  assertPositive("Monthly income", input.monthlyIncome);
  assertNonNegative("Existing EMI", input.existingMonthlyEmi);
  assertFinite("Obligation ratio", input.obligationRatio);
  if (input.obligationRatio <= 0 || input.obligationRatio > 0.8) {
    throw new FinanceError("The obligation ratio must be between 0% and 80%.");
  }
  const room = input.monthlyIncome * input.obligationRatio - input.existingMonthlyEmi;
  const maxEmi = Math.max(0, room);
  return {
    maxEmi,
    maxLoan: loanFromEmi(maxEmi, input.annualNominalRate, input.months),
    limitedByExistingEmi: room <= 0,
  };
}

export interface Debt {
  name: string;
  balance: number;
  annualNominalRate: number;
  minimumPayment: number;
}

export interface DebtPayoffResult {
  strategy: "avalanche" | "snowball";
  months: number;
  totalInterest: number;
  totalPaid: number;
  paidOff: boolean;
  warnings: string[];
  yearly: { month: number; balance: number; interest: number }[];
}

/**
 * Month-end model: interest accrues, then minimums are paid, then the extra amount
 * goes to the target debt. Avalanche targets the highest rate. Snowball targets the smallest balance.
 */
export function debtPayoff(
  debts: Debt[],
  extraMonthly: number,
  strategy: "avalanche" | "snowball",
  maxMonths = 1200,
): DebtPayoffResult {
  assertNonNegative("Extra payment", extraMonthly);
  assertInteger("Month cap", maxMonths, 1, 2400);
  if (debts.length === 0) {
    throw new FinanceError("Add at least one debt.");
  }
  const state = debts.map((debt, index) => {
    if (!debt.name.trim()) throw new FinanceError(`Debt ${index + 1} needs a name.`);
    assertPositive(`Balance for ${debt.name}`, debt.balance);
    assertNonNegative(`Rate for ${debt.name}`, debt.annualNominalRate);
    assertPositive(`Minimum payment for ${debt.name}`, debt.minimumPayment);
    return { ...debt, balance: debt.balance, interestPaid: 0 };
  });
  const warnings: string[] = [];
  for (const debt of state) {
    const firstInterest = debt.balance * (debt.annualNominalRate / 12);
    if (debt.minimumPayment < firstInterest) {
      warnings.push(
        `${debt.name}: the minimum payment is below the first month's interest, so the balance can grow.`,
      );
    }
  }

  let totalPaid = 0;
  let month = 0;
  const yearly: DebtPayoffResult["yearly"] = [];
  let interestThisYear = 0;

  while (state.some((debt) => debt.balance > 0.5) && month < maxMonths) {
    month += 1;
    for (const debt of state) {
      if (debt.balance <= 0) continue;
      const interest = debt.balance * (debt.annualNominalRate / 12);
      debt.balance += interest;
      debt.interestPaid += interest;
      interestThisYear += interest;
    }
    for (const debt of state) {
      if (debt.balance <= 0) continue;
      const payment = Math.min(debt.minimumPayment, debt.balance);
      debt.balance -= payment;
      totalPaid += payment;
    }
    let extraLeft = extraMonthly;
    const order = state
      .filter((debt) => debt.balance > 0.5)
      .sort((a, b) =>
        strategy === "avalanche" ? b.annualNominalRate - a.annualNominalRate : a.balance - b.balance,
      );
    for (const debt of order) {
      if (extraLeft <= 0) break;
      const payment = Math.min(extraLeft, debt.balance);
      debt.balance -= payment;
      extraLeft -= payment;
      totalPaid += payment;
    }
    if (month % 12 === 0 || state.every((debt) => debt.balance <= 0.5)) {
      yearly.push({
        month,
        balance: state.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0),
        interest: interestThisYear,
      });
      interestThisYear = 0;
    }
  }

  const totalInterest = state.reduce((sum, debt) => sum + debt.interestPaid, 0);
  const paidOff = state.every((debt) => debt.balance <= 0.5);
  if (!paidOff) {
    warnings.push("The debts were not cleared within the month cap. Raise the payment or extend the cap.");
  }
  return { strategy, months: month, totalInterest, totalPaid, paidOff, warnings, yearly };
}

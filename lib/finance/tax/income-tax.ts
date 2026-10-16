import { FinanceError, assertFinite, assertNonNegative } from "../errors";
import { roundRupee } from "../money";
import {
  type AgeBand,
  type FinancialYearId,
  type Slab,
  type SurchargeStep,
  type TaxRegime,
  type TaxYearRules,
  getTaxYear,
} from "./rules";

export interface IncomeTaxInput {
  financialYear: FinancialYearId;
  regime: TaxRegime;
  age: AgeBand;
  resident: boolean;
  /** Gross annual income before the standard deduction and the deductions below. */
  grossIncome: number;
  salaryIncome: boolean;
  section80c: number;
  section80d: number;
  otherOldRegimeDeductions: number;
  employerNps: number;
  selfOccupiedInterest: number;
}

export interface IncomeTaxResult {
  rules: TaxYearRules;
  taxableIncome: number;
  slabTax: number;
  rebate: number;
  marginalRebateRelief: number;
  taxAfterRelief: number;
  surcharge: number;
  surchargeRelief: number;
  cess: number;
  totalTax: number;
  deductionsApplied: { label: string; amount: number }[];
  notes: string[];
}

export function estimateIncomeTax(input: IncomeTaxInput): IncomeTaxResult {
  assertNonNegative("Gross income", input.grossIncome);
  for (const [name, value] of [
    ["Section 80C", input.section80c],
    ["Section 80D", input.section80d],
    ["Other deductions", input.otherOldRegimeDeductions],
    ["Employer NPS", input.employerNps],
    ["Self-occupied interest", input.selfOccupiedInterest],
  ] as const) {
    assertNonNegative(name, value);
  }
  const rules = getTaxYear(input.financialYear);
  const deductions: { label: string; amount: number }[] = [];
  const notes: string[] = [];

  if (input.salaryIncome) {
    const standard = input.regime === "new" ? rules.standardDeduction.new : rules.standardDeduction.old;
    deductions.push({ label: "Standard deduction", amount: Math.min(standard, input.grossIncome) });
  }
  if (input.employerNps > 0) {
    deductions.push({
      label: "Employer NPS under section 80CCD(2), as entered",
      amount: input.employerNps,
    });
    notes.push(
      "Employer NPS is allowed in both regimes, subject to a salary percentage cap. Enter the eligible amount. This estimator does not recompute the 10% or 14% cap.",
    );
  }
  if (input.regime === "old") {
    const section80c = Math.min(input.section80c, rules.section80cCap);
    if (input.section80c > rules.section80cCap) {
      notes.push(`Section 80C, 80CCC and 80CCD(1) were limited to ${rules.section80cCap}.`);
    }
    if (section80c > 0) deductions.push({ label: "Section 80C, 80CCC and 80CCD(1)", amount: section80c });
    if (input.section80d > 0) deductions.push({ label: "Section 80D", amount: input.section80d });
    if (input.otherOldRegimeDeductions > 0) {
      deductions.push({ label: "Other old-regime deductions", amount: input.otherOldRegimeDeductions });
    }
    const interest = Math.min(input.selfOccupiedInterest, rules.selfOccupiedInterestCap);
    if (input.selfOccupiedInterest > rules.selfOccupiedInterestCap) {
      notes.push(`Self-occupied house interest was limited to ${rules.selfOccupiedInterestCap} under the old regime.`);
    }
    if (interest > 0) deductions.push({ label: "Self-occupied house interest", amount: interest });
  } else if (
    input.section80c > 0 ||
    input.section80d > 0 ||
    input.otherOldRegimeDeductions > 0 ||
    input.selfOccupiedInterest > 0
  ) {
    notes.push(
      "80C, 80D, most other Chapter VI-A deductions, and self-occupied house interest are not applied in the new regime.",
    );
  }

  const deductionTotal = deductions.reduce((sum, item) => sum + item.amount, 0);
  const taxableIncome = Math.max(0, input.grossIncome - deductionTotal);
  const ageForSlabs: AgeBand =
    input.regime === "old" && !input.resident ? "below-60" : input.age;
  if (input.regime === "old" && !input.resident && input.age !== "below-60") {
    notes.push(
      "The higher old-regime basic exemption for senior citizens applies to residents. This estimate uses the below-60 slabs.",
    );
  }
  const computed = taxOnTaxableIncome({
    taxableIncome,
    regime: input.regime,
    age: ageForSlabs,
    resident: input.resident,
    rules,
  });
  if (!input.resident) {
    notes.push("Section 87A rebate is not applied because the taxpayer is not marked as a resident.");
  }
  notes.push(...rules.notes);
  return {
    rules,
    taxableIncome,
    deductionsApplied: deductions,
    notes,
    ...computed,
    slabTax: roundRupee(computed.slabTax),
    rebate: roundRupee(computed.rebate),
    marginalRebateRelief: roundRupee(computed.marginalRebateRelief),
    taxAfterRelief: roundRupee(computed.taxAfterRelief),
    surcharge: roundRupee(computed.surcharge),
    surchargeRelief: roundRupee(computed.surchargeRelief),
    cess: roundRupee(computed.cess),
    totalTax: roundRupee(computed.taxAfterRelief) + roundRupee(computed.surcharge) + roundRupee(computed.cess),
  };
}

interface TaxParts {
  slabTax: number;
  rebate: number;
  marginalRebateRelief: number;
  taxAfterRelief: number;
  surcharge: number;
  surchargeRelief: number;
  cess: number;
  totalTax: number;
}

export function taxOnTaxableIncome(input: {
  taxableIncome: number;
  regime: TaxRegime;
  age: AgeBand;
  resident: boolean;
  rules: TaxYearRules;
}): TaxParts {
  assertFinite("Taxable income", input.taxableIncome);
  if (input.taxableIncome < 0) throw new FinanceError("Taxable income cannot be negative.");
  const exact = exactTax(input.taxableIncome, input);
  const cess = (exact.taxAfterRelief + exact.surcharge) * input.rules.cessRate;
  return {
    ...exact,
    cess,
    totalTax: exact.taxAfterRelief + exact.surcharge + cess,
  };
}

function exactTax(
  income: number,
  input: { regime: TaxRegime; age: AgeBand; resident: boolean; rules: TaxYearRules },
): Omit<TaxParts, "cess" | "totalTax"> {
  const slabs = input.regime === "new" ? input.rules.newSlabs : input.rules.oldSlabs[input.age];
  const slabTax = slabTaxOn(income, slabs);
  let rebate = 0;
  let marginalRebateRelief = 0;
  let taxAfterRelief = slabTax;
  if (input.resident && input.regime === "old" && income <= input.rules.rebate.old.maxIncome) {
    rebate = Math.min(slabTax, input.rules.rebate.old.maxRebate);
    taxAfterRelief = slabTax - rebate;
  } else if (input.resident && input.regime === "new" && income <= input.rules.rebate.new.maxIncome) {
    rebate = Math.min(slabTax, input.rules.rebate.new.maxRebate);
    taxAfterRelief = slabTax - rebate;
  } else if (input.resident && input.regime === "new" && input.rules.rebate.new.marginalRelief) {
    const excess = income - input.rules.rebate.new.maxIncome;
    if (slabTax > excess) {
      marginalRebateRelief = slabTax - excess;
      taxAfterRelief = excess;
    }
  }

  const steps = input.regime === "new" ? input.rules.newSurcharge : input.rules.oldSurcharge;
  const relieved = surchargeWithRelief(income, taxAfterRelief, (amount) => {
    const parts = exactTax(amount, input);
    return parts.taxAfterRelief;
  }, steps);
  return {
    slabTax,
    rebate,
    marginalRebateRelief,
    taxAfterRelief,
    surcharge: relieved.surcharge,
    surchargeRelief: relieved.relief,
  };
}

function surchargeWithRelief(
  income: number,
  taxAfterRelief: number,
  taxAt: (income: number) => number,
  steps: SurchargeStep[],
): { surcharge: number; relief: number } {
  const rate = surchargeRate(income, steps);
  if (rate === 0) return { surcharge: 0, relief: 0 };
  const raw = taxAfterRelief * rate;
  const threshold = previousThreshold(income, steps);
  const taxAtThreshold = taxAt(threshold);
  const rateAtThreshold = surchargeRate(threshold, steps);
  const cap = taxAtThreshold * (1 + rateAtThreshold) + (income - threshold);
  const total = taxAfterRelief + raw;
  if (total > cap) {
    const surcharge = Math.max(0, cap - taxAfterRelief);
    return { surcharge, relief: raw - surcharge };
  }
  return { surcharge: raw, relief: 0 };
}

export function slabTaxOn(income: number, slabs: Slab[]): number {
  let tax = 0;
  for (let index = 0; index < slabs.length; index += 1) {
    const slab = slabs[index];
    if (!slab) continue;
    const next = slabs[index + 1]?.above ?? Number.POSITIVE_INFINITY;
    if (income > slab.above) {
      tax += (Math.min(income, next) - slab.above) * slab.rate;
    }
  }
  return tax;
}

function surchargeRate(income: number, steps: SurchargeStep[]): number {
  for (const step of steps) {
    if (income <= step.upTo) return step.rate;
  }
  return steps[steps.length - 1]?.rate ?? 0;
}

function previousThreshold(income: number, steps: SurchargeStep[]): number {
  let threshold = 0;
  for (const step of steps) {
    if (income > step.upTo) threshold = step.upTo;
  }
  return threshold;
}

export interface RegimeComparison {
  old: IncomeTaxResult;
  newer: IncomeTaxResult;
  lower: TaxRegime;
  difference: number;
}

export function compareRegimes(input: Omit<IncomeTaxInput, "regime">): RegimeComparison {
  const old = estimateIncomeTax({ ...input, regime: "old" });
  const newer = estimateIncomeTax({ ...input, regime: "new" });
  const lower = old.totalTax <= newer.totalTax ? "old" : "new";
  return { old, newer, lower, difference: Math.abs(old.totalTax - newer.totalTax) };
}

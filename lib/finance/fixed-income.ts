import { assertInteger, assertNonNegative, assertRateAboveMinusOne } from "./errors";

export interface TaxDragInput {
  principal: number;
  annualRate: number;
  years: number;
  taxRate: number;
  /** When true, tax is paid from the balance. When false, tax is paid from outside the deposit. */
  payTaxFromCorpus: boolean;
  style: "cumulative" | "payout";
}

export interface TaxDragResult {
  preTaxValue: number;
  postTaxCorpus: number;
  taxPaid: number;
  netInterest: number;
}

/**
 * Applies one tax rate to interest each year.
 * Cumulative style taxes the year's accrued interest. Payout style taxes simple interest on the original principal.
 * This is not a full return and it ignores TDS, surcharge, and cess.
 */
export function annualTaxDrag(input: TaxDragInput): TaxDragResult {
  assertNonNegative("Principal", input.principal);
  assertRateAboveMinusOne("Rate", input.annualRate);
  assertInteger("Years", input.years, 1, 50);
  assertNonNegative("Tax rate", input.taxRate);
  if (input.taxRate > 1) {
    throw new Error("Tax rate cannot exceed 100%.");
  }
  let corpus = input.principal;
  let taxPaid = 0;
  if (input.style === "payout") {
    for (let year = 0; year < input.years; year += 1) {
      const interest = input.principal * input.annualRate;
      taxPaid += interest * input.taxRate;
    }
    return {
      preTaxValue: input.principal + input.principal * input.annualRate * input.years,
      postTaxCorpus: input.principal,
      taxPaid,
      netInterest: input.principal * input.annualRate * input.years - taxPaid,
    };
  }
  for (let year = 0; year < input.years; year += 1) {
    const interest = corpus * input.annualRate;
    const tax = interest * input.taxRate;
    taxPaid += tax;
    corpus += input.payTaxFromCorpus ? interest - tax : interest;
  }
  const preTax = input.principal * (1 + input.annualRate) ** input.years;
  return {
    preTaxValue: preTax,
    postTaxCorpus: corpus,
    taxPaid,
    netInterest: corpus - input.principal,
  };
}

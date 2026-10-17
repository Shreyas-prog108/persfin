export type FinancialYearId = "FY2025-26" | "FY2026-27";
export type TaxRegime = "new" | "old";
export type AgeBand = "below-60" | "60-to-79" | "80-plus";

export interface Slab {
  /** Income above this amount, up to the next slab, is taxed at `rate`. */
  above: number;
  rate: number;
}

export interface SurchargeStep {
  /** This rate applies when taxable income is less than or equal to `upTo`. */
  upTo: number;
  rate: number;
}

export interface TaxYearRules {
  id: FinancialYearId;
  financialYear: string;
  assessmentYear: string;
  standardDeduction: { old: number; new: number };
  rebate: {
    old: { maxIncome: number; maxRebate: number };
    new: { maxIncome: number; maxRebate: number; marginalRelief: boolean };
  };
  cessRate: number;
  oldSlabs: Record<AgeBand, Slab[]>;
  newSlabs: Slab[];
  oldSurcharge: SurchargeStep[];
  newSurcharge: SurchargeStep[];
  section80cCap: number;
  selfOccupiedInterestCap: number;
  sources: { title: string; url: string; reviewed: string }[];
  notes: string[];
}

const oldBelow60: Slab[] = [
  { above: 0, rate: 0 },
  { above: 250_000, rate: 0.05 },
  { above: 500_000, rate: 0.2 },
  { above: 1_000_000, rate: 0.3 },
];

const oldSenior: Slab[] = [
  { above: 0, rate: 0 },
  { above: 300_000, rate: 0.05 },
  { above: 500_000, rate: 0.2 },
  { above: 1_000_000, rate: 0.3 },
];

const oldSuperSenior: Slab[] = [
  { above: 0, rate: 0 },
  { above: 500_000, rate: 0.2 },
  { above: 1_000_000, rate: 0.3 },
];

const newSlabs: Slab[] = [
  { above: 0, rate: 0 },
  { above: 400_000, rate: 0.05 },
  { above: 800_000, rate: 0.1 },
  { above: 1_200_000, rate: 0.15 },
  { above: 1_600_000, rate: 0.2 },
  { above: 2_000_000, rate: 0.25 },
  { above: 2_400_000, rate: 0.3 },
];

const oldSurcharge: SurchargeStep[] = [
  { upTo: 5_000_000, rate: 0 },
  { upTo: 10_000_000, rate: 0.1 },
  { upTo: 20_000_000, rate: 0.15 },
  { upTo: 50_000_000, rate: 0.25 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.37 },
];

const newSurcharge: SurchargeStep[] = [
  { upTo: 5_000_000, rate: 0 },
  { upTo: 10_000_000, rate: 0.1 },
  { upTo: 20_000_000, rate: 0.15 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.25 },
];

const sharedSources: TaxYearRules["sources"] = [
  {
    title: "Salaried Individuals for AY 2026-27",
    url: "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1",
    reviewed: "2026-10-16",
  },
  {
    title: "Threshold limits under the Income-tax Act",
    url: "https://www.incometaxindia.gov.in/w/threshold-limits-under-income-tax-act",
    reviewed: "2026-10-16",
  },
  {
    title: "Finance Bill, 2026 memorandum",
    url: "https://www.incometaxindia.gov.in/documents/81799/11848482/memo-2026.pdf",
    reviewed: "2026-10-16",
  },
];

/**
 * Slabs for AY 2026-27, which taxes income of FY 2025-26.
 * The Finance Bill, 2026 memorandum said these enacted rates were unchanged and
 * would also be used for FY 2026-27 advance tax and salary withholding.
 */
const fy2025: TaxYearRules = {
  id: "FY2025-26",
  financialYear: "2025-26",
  assessmentYear: "2026-27",
  standardDeduction: { old: 50_000, new: 75_000 },
  rebate: {
    old: { maxIncome: 500_000, maxRebate: 12_500 },
    new: { maxIncome: 1_200_000, maxRebate: 60_000, marginalRelief: true },
  },
  cessRate: 0.04,
  oldSlabs: { "below-60": oldBelow60, "60-to-79": oldSenior, "80-plus": oldSuperSenior },
  newSlabs,
  oldSurcharge,
  newSurcharge,
  section80cCap: 150_000,
  selfOccupiedInterestCap: 200_000,
  sources: sharedSources,
  notes: [
    "New-regime slabs do not change with age. Old-regime basic exemption does.",
    "Section 87A rebate applies to resident individuals.",
    "Health and education cess is 4% of tax plus surcharge. The Finance Bill memorandum says marginal relief does not apply to cess.",
    "Section 288A rounding of total income to the nearest ₹10 is not applied.",
  ],
};

const fy2026: TaxYearRules = {
  ...fy2025,
  id: "FY2026-27",
  financialYear: "2026-27",
  assessmentYear: "2027-28",
  notes: [
    ...fy2025.notes,
    "The February 2026 Finance Bill memorandum proposed no change to the income-tax rates already enacted for AY 2026-27. This rule set therefore repeats those slabs for FY 2026-27 and records that it is the same table, not an independently redesigned one.",
  ],
};

export const TAX_YEARS: Record<FinancialYearId, TaxYearRules> = {
  "FY2025-26": fy2025,
  "FY2026-27": fy2026,
};

export const DEFAULT_TAX_YEAR: FinancialYearId = "FY2026-27";

export function getTaxYear(id: FinancialYearId): TaxYearRules {
  const rules = TAX_YEARS[id];
  if (!rules) {
    throw new Error(`Unknown financial year: ${id}`);
  }
  return rules;
}

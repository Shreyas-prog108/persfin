import { FinanceError, assertFinite, assertNonNegative } from "../errors";
import { roundRupee } from "../money";

/**
 * Rates in force for transfers on or after 23 July 2024.
 * Reviewed against section 112A and the Income Tax Department capital-gains note on 16 October 2026.
 * The February 2026 Finance Bill memorandum did not propose a change to enacted income-tax rates.
 */
export const CAPITAL_GAINS_RULES = {
  id: "post-2024-07-23",
  effectiveFrom: "2024-07-23",
  equityLtcgRate: 0.125,
  equityStcgRate: 0.2,
  otherLtcgRate: 0.125,
  equityLtcgExemption: 125_000,
  cessRate: 0.04,
  equityHoldingMonths: 12,
  sources: [
    {
      title: "Section 112A",
      url: "https://www.incometaxindia.gov.in/w/section-112a-60",
      reviewed: "2026-10-16",
    },
    {
      title: "Capital gains",
      url: "https://www.incometaxindia.gov.in/w/capital-gain",
      reviewed: "2026-10-16",
    },
    {
      title: "CBDT capital gains FAQ",
      url: "https://pib.gov.in/PressReleseDetailm.aspx?PRID=2036604",
      reviewed: "2026-10-16",
    },
  ],
} as const;

export type CapitalAssetClass = "listed-equity" | "other";
export type GainTerm = "short" | "long";

export interface CapitalGainInput {
  assetClass: CapitalAssetClass;
  gain: number;
  term: GainTerm;
  /** Exemption already used by other equity long-term gains in the same year. */
  equityExemptionUsed?: number;
  /** Marginal slab rate for non-equity short-term gains. Special rates are not used here. */
  marginalSlabRate?: number;
}

export interface CapitalGainResult {
  taxableGain: number;
  taxBeforeCess: number;
  cess: number;
  totalTax: number;
  rateApplied: number;
  notes: string[];
}

export function estimateCapitalGain(input: CapitalGainInput): CapitalGainResult {
  assertFinite("Gain", input.gain);
  const notes = [
    "Surcharge is not calculated here. On sections 111A, 112 and 112A it is capped at 15%, and it depends on total income.",
    "Loss set-off, grandfathering, and the property indexation option for assets acquired before 23 July 2024 are not applied.",
  ];
  if (input.gain <= 0) {
    return {
      taxableGain: 0,
      taxBeforeCess: 0,
      cess: 0,
      totalTax: 0,
      rateApplied: 0,
      notes: ["There is no tax on a zero or negative gain in this estimator.", ...notes],
    };
  }

  let taxableGain = input.gain;
  let rate = 0;
  if (input.assetClass === "listed-equity" && input.term === "long") {
    const used = input.equityExemptionUsed ?? 0;
    assertNonNegative("Exemption already used", used);
    const remaining = Math.max(0, CAPITAL_GAINS_RULES.equityLtcgExemption - used);
    taxableGain = Math.max(0, input.gain - remaining);
    rate = CAPITAL_GAINS_RULES.equityLtcgRate;
    notes.unshift(
      "Listed equity and equity-oriented fund long-term gains above the remaining ₹1,25,000 exemption are taxed at 12.5% when STT conditions are met.",
    );
  } else if (input.assetClass === "listed-equity" && input.term === "short") {
    rate = CAPITAL_GAINS_RULES.equityStcgRate;
    notes.unshift("Listed equity short-term gains under section 111A are taxed at 20% when STT conditions are met.");
  } else if (input.term === "long") {
    rate = CAPITAL_GAINS_RULES.otherLtcgRate;
    notes.unshift(
      "Other long-term gains are taxed at 12.5% without indexation in this estimator. Some land and buildings acquired before 23 July 2024 can still be compared with 20% plus indexation.",
    );
  } else {
    if (input.marginalSlabRate === undefined) {
      throw new FinanceError("Enter a marginal slab rate for short-term gains that are not covered by section 111A.");
    }
    assertNonNegative("Marginal slab rate", input.marginalSlabRate);
    if (input.marginalSlabRate > 0.3) {
      throw new FinanceError("Enter the slab rate before cess and surcharge, up to 30%.");
    }
    rate = input.marginalSlabRate;
    notes.unshift("This short-term gain is taxed at the slab rate you entered. Cess is added. Surcharge is not.");
  }

  const taxBeforeCess = taxableGain * rate;
  const cess = taxBeforeCess * CAPITAL_GAINS_RULES.cessRate;
  return {
    taxableGain,
    taxBeforeCess: roundRupee(taxBeforeCess),
    cess: roundRupee(cess),
    totalTax: roundRupee(taxBeforeCess) + roundRupee(cess),
    rateApplied: rate,
    notes,
  };
}

import { assertNonNegative } from "../errors";

export type HraCity = "metro" | "non-metro";

export interface HraInput {
  basicPlusDa: number;
  hraReceived: number;
  rentPaid: number;
  city: HraCity;
  regime: "old" | "new";
}

export interface HraResult {
  exemption: number;
  taxableHra: number;
  components: { label: string; amount: number }[];
  notes: string[];
}

/**
 * Old-regime exemption under section 10(13A) read with Rule 2A.
 * The exempt amount is the lowest of actual HRA, rent minus 10% of salary, and 50% or 40% of salary.
 * Salary here means basic pay plus dearness allowance where it forms part of retirement benefits.
 */
export function hraExemption(input: HraInput): HraResult {
  assertNonNegative("Basic pay plus DA", input.basicPlusDa);
  assertNonNegative("HRA received", input.hraReceived);
  assertNonNegative("Rent paid", input.rentPaid);
  const percentage = input.city === "metro" ? 0.5 : 0.4;
  const rentMinusTen = Math.max(0, input.rentPaid - input.basicPlusDa * 0.1);
  const salaryShare = input.basicPlusDa * percentage;
  const components = [
    { label: "Actual HRA received", amount: input.hraReceived },
    { label: "Rent paid minus 10% of basic plus DA", amount: rentMinusTen },
    {
      label: input.city === "metro" ? "50% of basic plus DA" : "40% of basic plus DA",
      amount: salaryShare,
    },
  ];
  if (input.regime === "new") {
    return {
      exemption: 0,
      taxableHra: input.hraReceived,
      components,
      notes: [
        "The new tax regime does not allow the HRA exemption. The three-way comparison is shown only so you can see the old-regime figure.",
      ],
    };
  }
  const exemption = input.rentPaid === 0 ? 0 : Math.min(input.hraReceived, rentMinusTen, salaryShare);
  return {
    exemption,
    taxableHra: input.hraReceived - exemption,
    components,
    notes: [
      "Metro for this rule means Delhi, Mumbai, Kolkata, or Chennai. Other cities use 40%.",
      "This is the exemption, not a refund. It reduces taxable salary under the old regime.",
    ],
  };
}

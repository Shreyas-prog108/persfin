import { describe, expect, it } from "vitest";
import {
  absoluteReturn,
  accruedInterest,
  bondCleanPrice,
  bondYieldToMaturity,
  cagr,
  cagrBetweenDates,
  compoundInterest,
  debtPayoff,
  effectiveAnnualRate,
  emi,
  estimateCapitalGain,
  estimateIncomeTax,
  expenseRatioImpact,
  fixedDeposit,
  goalInvestment,
  hraExemption,
  inflationImpact,
  monthlyAnnuity,
  ppfMaturity,
  realReturn,
  simpleInterest,
  stepUpSip,
  systematicWithdrawal,
  xirr,
} from "@/lib/finance";
import { epfCorpus, epsPension, fireEstimate, retirementCorpus } from "@/lib/finance/retirement";

describe("fixed deposit and interest", () => {
  it("compounds a nominal rate quarterly", () => {
    const result = fixedDeposit({
      principal: 100_000,
      annualNominalRate: 0.08,
      months: 24,
      compounding: "quarterly",
      payout: "cumulative",
    });
    const expected = 100_000 * 1.02 ** 8;
    expect(result.maturityValue).toBeCloseTo(expected, 6);
    expect(result.totalInterest).toBeCloseTo(expected - 100_000, 6);
    expect(effectiveAnnualRate(0.08, 4)).toBeCloseTo(1.02 ** 4 - 1, 10);
  });

  it("pays simple interest when the deposit is not cumulative", () => {
    const result = fixedDeposit({
      principal: 100_000,
      annualNominalRate: 0.06,
      months: 12,
      compounding: "quarterly",
      payout: "monthly",
    });
    expect(result.periodicPayout).toBeCloseTo(500, 8);
    expect(result.totalInterest).toBeCloseTo(6_000, 8);
    expect(result.maturityValue).toBe(100_000);
  });

  it("matches the textbook simple and compound split", () => {
    expect(simpleInterest({ principal: 10_000, annualNominalRate: 0.1, years: 2 })).toBe(2_000);
    expect(
      compoundInterest({ principal: 10_000, annualNominalRate: 0.1, years: 2, compoundsPerYear: 1 }),
    ).toBeCloseTo(2_100, 8);
  });
});

describe("annuities, SIP, and goals", () => {
  it("returns the instalments unchanged when the rate is zero", () => {
    const result = monthlyAnnuity({
      installment: 1_000,
      annualRate: 0,
      months: 12,
      timing: "end",
      convention: "effective-annual",
    });
    expect(result.maturityValue).toBeCloseTo(12_000, 6);
    expect(result.gain).toBeCloseTo(0, 6);
  });

  it("uses the annuity-due formula for a start-of-month SIP", () => {
    const monthly = 1.01 ** (1 / 12) - 1;
    const months = 12;
    const ordinary = (5_000 * ((1 + monthly) ** months - 1)) / monthly;
    const due = ordinary * (1 + monthly);
    const result = monthlyAnnuity({
      installment: 5_000,
      annualRate: 0.01,
      months,
      timing: "start",
      convention: "effective-annual",
    });
    expect(result.maturityValue).toBeCloseTo(due, 6);
  });

  it("steps the instalment only after each completed year", () => {
    const result = stepUpSip({
      installment: 1_000,
      annualStepUp: 0.5,
      annualRate: 0,
      months: 24,
      timing: "end",
      convention: "nominal",
    });
    expect(result.totalInvested).toBeCloseTo(12_000 + 18_000, 6);
    expect(result.maturityValue).toBeCloseTo(30_000, 6);
  });

  it("solves a zero-return goal as target divided by months", () => {
    const result = goalInvestment({
      targetInTodayRupees: 12_000,
      annualInflation: 0,
      months: 12,
      existingSavings: 0,
      annualReturn: 0,
      timing: "end",
      convention: "effective-annual",
    });
    expect(result.requiredMonthly).toBeCloseTo(1_000, 6);
    expect(result.requiredLumpSumToday).toBeCloseTo(12_000, 6);
  });
});

describe("inflation, CAGR, and XIRR", () => {
  it("separates a future cost from purchasing power", () => {
    const result = inflationImpact({ presentAmount: 100, annualInflation: 0.1, years: 2, nominalAnnualReturn: 0.1 });
    expect(result.futureCost).toBeCloseTo(121, 8);
    expect(result.purchasingPower).toBeCloseTo(100 / 1.21, 8);
    expect(result.realAnnualReturn).toBeCloseTo(0, 8);
    expect(realReturn(0.1, 0.05)).toBeCloseTo(1.1 / 1.05 - 1, 8);
    expect(absoluteReturn(100, 121)).toBeCloseTo(0.21, 8);
    expect(cagr(100, 121, 2)).toBeCloseTo(0.1, 8);
  });

  it("uses a 365-day year for dated CAGR and XIRR", () => {
    expect(cagrBetweenDates(10_000, 12_000, "2021-01-01", "2022-01-01")).toBeCloseTo(0.2, 8);
    const exact = xirr([
      { date: "2021-01-01", amount: -10_000 },
      { date: "2022-01-01", amount: 12_000 },
    ]);
    expect(exact.status).toBe("unique");
    expect(exact.rate).toBeCloseTo(0.2, 8);
  });

  it("reports two roots instead of picking one", () => {
    const result = xirr([
      { date: "2021-01-01", amount: -100 },
      { date: "2022-01-01", amount: 230 },
      { date: "2023-01-01", amount: -132 },
    ]);
    expect(result.status).toBe("multiple");
    expect(result.rate).toBeNull();
    expect(result.candidates.map((rate) => Number(rate.toFixed(6)))).toEqual([0.1, 0.2]);
  });

  it("rejects cash flows that have no sign change", () => {
    expect(() => xirr([{ date: "2021-01-01", amount: -100 }, { date: "2022-01-01", amount: -50 }])).toThrow(
      /opposite signs/,
    );
  });
});

describe("loans", () => {
  it("uses principal divided by months when the rate is zero", () => {
    expect(emi({ principal: 120_000, annualNominalRate: 0, months: 12 })).toBe(10_000);
  });

  it("matches the reducing-balance closed form", () => {
    const growth = 1.01 ** 12;
    const expected = (100_000 * 0.01 * growth) / (growth - 1);
    expect(emi({ principal: 100_000, annualNominalRate: 0.12, months: 12 })).toBeCloseTo(expected, 8);
  });

  it("clears a zero-interest debt with the minimum payment", () => {
    const result = debtPayoff(
      [{ name: "Family loan", balance: 1_000, annualNominalRate: 0, minimumPayment: 100 }],
      0,
      "avalanche",
    );
    expect(result.paidOff).toBe(true);
    expect(result.months).toBe(10);
    expect(result.totalInterest).toBeCloseTo(0, 6);
  });
});

describe("bonds", () => {
  it("prices a par bond at its face value", () => {
    expect(
      bondCleanPrice({
        faceValue: 1_000,
        annualCouponRate: 0.08,
        annualYield: 0.08,
        periods: 5,
        frequency: 1,
      }),
    ).toBeCloseTo(1_000, 6);
  });

  it("prices a two-year annual coupon bond from discounted cash flows", () => {
    const price = 100 / 1.08 + 1_100 / 1.08 ** 2;
    expect(
      bondCleanPrice({
        faceValue: 1_000,
        annualCouponRate: 0.1,
        annualYield: 0.08,
        periods: 2,
        frequency: 1,
      }),
    ).toBeCloseTo(price, 6);
    const ytm = bondYieldToMaturity({
      faceValue: 1_000,
      annualCouponRate: 0.1,
      cleanPrice: price,
      periods: 2,
      frequency: 1,
    });
    expect(ytm.converged).toBe(true);
    expect(ytm.yield).toBeCloseTo(0.08, 6);
  });

  it("does not treat accrued interest as part of the clean price", () => {
    expect(
      accruedInterest({
        faceValue: 1_000,
        annualCouponRate: 0.08,
        frequency: 2,
        daysSinceCoupon: 91,
        daysInCouponPeriod: 182,
      }),
    ).toBeCloseTo(20, 6);
  });
});

describe("retirement products", () => {
  it("compounds a PPF deposit annually from the start of the year", () => {
    const result = ppfMaturity({ annualDeposit: 100_000, annualRate: 0.071, years: 1, timing: "start" });
    expect(result.maturity).toBeCloseTo(107_100, 6);
    expect(result.aboveCeiling).toBe(false);
  });

  it("credits EPF interest on the sum of monthly balances", () => {
    const result = epfCorpus({
      monthlyBasic: 15_000,
      employeeRate: 0,
      employerRate: 0,
      epsRate: 0,
      wageCeiling: 15_000,
      restrictToCeiling: true,
      annualInterestRate: 0.0825,
      years: 1,
      annualSalaryGrowth: 0,
      openingBalance: 12_000,
    });
    expect(result.interest).toBeCloseTo((12_000 * 12 * 0.0825) / 12, 6);
  });

  it("uses the EPS formula of pensionable salary times service divided by 70", () => {
    expect(epsPension(Array.from({ length: 60 }, () => 15_000), 10)).toBeCloseTo((15_000 * 10) / 70, 6);
  });

  it("depletes a zero-return SWP in corpus divided by withdrawal", () => {
    const result = systematicWithdrawal({
      corpus: 12_000,
      withdrawal: 1_000,
      annualReturn: 0,
      annualInflation: 0,
      months: 24,
      timing: "start",
    });
    expect(result.depleted).toBe(true);
    expect(result.monthsLasted).toBe(12);
    expect(result.totalWithdrawn).toBeCloseTo(12_000, 6);
  });

  it("finds a retirement corpus that survives the stated years", () => {
    const result = retirementCorpus({
      annualExpenseToday: 600_000,
      yearsToRetirement: 0,
      yearsInRetirement: 10,
      inflation: 0,
      preRetirementReturn: 0,
      postRetirementReturn: 0,
      currentCorpus: 0,
      timing: "end",
    });
    expect(Math.abs(result.corpusNeeded - 6_000_000)).toBeLessThan(1);
    expect(result.survived).toBe(true);
  });

  it("sets the FIRE number to expenses divided by the withdrawal rate", () => {
    const result = fireEstimate({
      annualExpenses: 1_200_000,
      safeWithdrawalRate: 0.04,
      portfolio: 3_000_000,
      annualSavings: 0,
      annualReturn: 0,
      inflation: 0,
      savingsGrowth: 0,
    });
    expect(result.fireNumberToday).toBe(30_000_000);
    expect(result.progress).toBeCloseTo(0.1, 8);
    expect(result.reachable).toBe(false);
  });
});

describe("tax rules", () => {
  const base = {
    financialYear: "FY2026-27" as const,
    age: "below-60" as const,
    resident: true,
    salaryIncome: false,
    section80c: 0,
    section80d: 0,
    otherOldRegimeDeductions: 0,
    employerNps: 0,
    selfOccupiedInterest: 0,
  };

  it("rebates new-regime tax to zero at ₹12 lakh", () => {
    const result = estimateIncomeTax({ ...base, regime: "new", grossIncome: 1_200_000 });
    expect(result.totalTax).toBe(0);
  });

  it("applies marginal relief just above the new-regime rebate", () => {
    const result = estimateIncomeTax({ ...base, regime: "new", grossIncome: 1_210_000 });
    expect(result.taxAfterRelief).toBe(10_000);
    expect(result.cess).toBe(400);
    expect(result.totalTax).toBe(10_400);
  });

  it("charges cess on the ₹15 lakh new-regime slab", () => {
    const result = estimateIncomeTax({ ...base, regime: "new", grossIncome: 1_500_000 });
    expect(result.slabTax).toBe(105_000);
    expect(result.totalTax).toBe(109_200);
  });

  it("applies surcharge marginal relief just above ₹50 lakh", () => {
    const result = estimateIncomeTax({ ...base, regime: "new", grossIncome: 5_010_000 });
    expect(result.taxAfterRelief).toBe(1_083_000);
    expect(result.surcharge).toBe(7_000);
    expect(result.cess).toBe(43_600);
    expect(result.totalTax).toBe(1_133_600);
  });

  it("rebates old-regime tax at ₹5 lakh and charges it above that", () => {
    expect(estimateIncomeTax({ ...base, regime: "old", grossIncome: 500_000 }).totalTax).toBe(0);
    expect(estimateIncomeTax({ ...base, regime: "old", grossIncome: 600_000 }).totalTax).toBe(33_800);
  });

  it("uses the higher old-regime exemption for a senior citizen", () => {
    const result = estimateIncomeTax({ ...base, regime: "old", age: "60-to-79", grossIncome: 400_000 });
    expect(result.totalTax).toBe(0);
  });

  it("taxes equity long-term gains above ₹1.25 lakh at 12.5% plus cess", () => {
    const result = estimateCapitalGain({ assetClass: "listed-equity", gain: 225_000, term: "long" });
    expect(result.taxableGain).toBe(100_000);
    expect(result.taxBeforeCess).toBe(12_500);
    expect(result.cess).toBe(500);
    expect(result.totalTax).toBe(13_000);
  });
});

describe("HRA and expense ratios", () => {
  it("takes the lowest of the three HRA tests", () => {
    const result = hraExemption({
      basicPlusDa: 600_000,
      hraReceived: 240_000,
      rentPaid: 240_000,
      city: "metro",
      regime: "old",
    });
    expect(result.exemption).toBe(180_000);
    expect(result.taxableHra).toBe(60_000);
  });

  it("removes the expense ratio before compounding", () => {
    const result = expenseRatioImpact({
      annualGrossReturn: 0.1,
      expenseRatio: 0.01,
      comparisonExpenseRatio: 0.02,
      years: 1,
      lumpSum: 100,
      monthlySip: 0,
      timing: "end",
    });
    expect(result.netReturn).toBeCloseTo(1.1 * 0.99 - 1, 8);
    expect(result.lumpSum).toBeCloseTo(100 * (1.1 * 0.99), 8);
  });
});

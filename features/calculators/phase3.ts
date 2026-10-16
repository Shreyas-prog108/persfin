import {
  amortizationSchedule,
  compareRegimes,
  debtPayoff,
  emergencyFund,
  estimateCapitalGain,
  estimateIncomeTax,
  goalInvestment,
  homeLoanAffordability,
  hraExemption,
  insuranceNeed,
  netWorth,
  rentVersusBuy,
  salaryPath,
  salaryStructure,
  cardRewards,
} from "@/lib/finance";
import { formatINR, formatPercent } from "@/lib/finance/money";
import {
  booleanField,
  integer,
  money,
  percent,
  rows,
  select,
  textField,
  TIMING_OPTIONS,
} from "./fields";
import { readBoolean, readNumber, readRows, readString } from "./parse";
import { ASSUMPTION_RETURN, NOT_ADVICE, asTiming } from "./present";
import type { AgeBand, FinancialYearId, TaxRegime } from "@/lib/finance/tax/rules";
import type { Calculator } from "./types";

const limits = [NOT_ADVICE];
const yearOptions = [
  { value: "FY2026-27", label: "FY 2026-27 (AY 2027-28 rule set)" },
  { value: "FY2025-26", label: "FY 2025-26 (AY 2026-27)" },
];
const ageOptions = [
  { value: "below-60", label: "Below 60" },
  { value: "60-to-79", label: "60 to 79" },
  { value: "80-plus", label: "80 or older" },
];
const regimeOptions = [
  { value: "new", label: "New regime" },
  { value: "old", label: "Old regime" },
];

function taxFields(includeCompare = false) {
  return [
    select("year", "Financial year", "FY2026-27", yearOptions),
    ...(includeCompare ? [] : [select("regime", "Regime", "new", regimeOptions)]),
    select("age", "Age", "below-60", ageOptions),
    booleanField("resident", "Resident individual", true),
    booleanField("salary", "This income is salary", true),
    money("gross", "Gross annual income", 1500000, { min: 0 }),
    money("c80", "80C, 80CCC and 80CCD(1), old regime", 150000, { help: "Ignored in the new regime. Capped at ₹1,50,000." }),
    money("d80", "Section 80D, old regime", 0),
    money("other", "Other old-regime deductions", 0),
    money("nps", "Eligible employer NPS, section 80CCD(2)", 0, { help: "Allowed in both regimes. Enter the eligible amount. The 10% or 14% cap is not recomputed." }),
    money("interest", "Self-occupied home-loan interest, old regime", 0),
  ];
}

function taxInput(values: Parameters<Calculator["calculate"]>[0], regime: TaxRegime) {
  return {
    financialYear: readString(values, "year") as FinancialYearId,
    regime,
    age: readString(values, "age") as AgeBand,
    resident: readBoolean(values, "resident"),
    salaryIncome: readBoolean(values, "salary"),
    grossIncome: readNumber(values, "gross"),
    section80c: readNumber(values, "c80"),
    section80d: readNumber(values, "d80"),
    otherOldRegimeDeductions: readNumber(values, "other"),
    employerNps: readNumber(values, "nps"),
    selfOccupiedInterest: readNumber(values, "interest"),
  };
}

function taxMetrics(label: string, total: number, taxable: number) {
  return [
    { label: `${label} tax`, value: formatINR(total, 0) },
    { label: `${label} taxable income`, value: formatINR(taxable, 0) },
  ];
}

export const phase3: Calculator[] = [
  {
    slug: "income-tax",
    title: "Income tax estimator",
    shortTitle: "Income tax",
    description: "Slab tax, rebate, surcharge, and cess from a versioned financial-year rule set.",
    category: "tax",
    phase: 3,
    keywords: ["income tax", "tax slab", "new regime tax"],
    questions: ["how much income tax will i pay"],
    fields: taxFields(false),
    calculate: (values) => {
      const result = estimateIncomeTax(taxInput(values, readString(values, "regime") as TaxRegime));
      return {
        headline: `Estimated tax is ${formatINR(result.totalTax, 0)}`,
        detail: `${result.rules.financialYear}, ${readString(values, "regime")} regime. Taxable income ${formatINR(result.taxableIncome, 0)}.`,
        metrics: [
          { label: "Taxable income", value: formatINR(result.taxableIncome, 0) },
          { label: "Tax after rebate and relief", value: formatINR(result.taxAfterRelief, 0) },
          { label: "Surcharge", value: formatINR(result.surcharge, 0) },
          { label: "Cess", value: formatINR(result.cess, 0) },
          { label: "Total", value: formatINR(result.totalTax, 0) },
        ],
        tables: [{
          caption: "Deductions applied",
          columns: ["Deduction", "Amount"],
          rows: result.deductionsApplied.length
            ? result.deductionsApplied.map((item) => [item.label, formatINR(item.amount, 0)])
            : [["None", formatINR(0, 0)]],
        }],
        notes: result.notes.slice(0, 4),
        warnings: ["This is not a substitute for the income-tax utility. Special-rate incomes are not included."],
      };
    },
    formula: "Slab tax, then section 87A rebate or marginal relief, then surcharge with marginal relief, then 4% cess.",
    methodology: [
      "Rules are stored by financial year. FY 2026-27 repeats the AY 2026-27 slabs because the February 2026 Finance Bill memorandum proposed no rate change.",
      "Each of tax, surcharge, and cess is rounded to the nearest rupee after the calculation.",
    ],
    assumptions: ["The income figure is the right gross amount for the deductions you entered."],
    limitations: [...limits, "Business losses, capital gains, and house-property loss set-off are outside this estimator."],
    related: ["tax-regime", "take-home-salary", "capital-gains"],
    articles: ["tax-regime-comparison"],
  },
  {
    slug: "tax-regime",
    title: "Old versus new tax regime",
    shortTitle: "Regime comparison",
    description: "The same income under both regimes, using the deductions that each regime actually allows.",
    category: "compare",
    phase: 3,
    comparison: true,
    keywords: ["old vs new regime", "which tax regime"],
    questions: ["should i choose the old or new tax regime"],
    fields: taxFields(true),
    calculate: (values) => {
      const result = compareRegimes(taxInput(values, "new"));
      return {
        headline: `The ${result.lower} regime is lower here by ${formatINR(result.difference, 0)}`,
        detail: "Lower on these numbers is not automatically the regime you should file. Check deductions you did not enter.",
        metrics: [
          ...taxMetrics("New", result.newer.totalTax, result.newer.taxableIncome),
          ...taxMetrics("Old", result.old.totalTax, result.old.taxableIncome),
        ],
        notes: ["80C, 80D, and self-occupied interest are applied only to the old regime. Employer NPS is applied to both."],
        warnings: ["A small difference can reverse if a deduction was missed or overstated."],
      };
    },
    formula: "Run the versioned tax function twice, once for each regime.",
    methodology: ["The comparison uses one rule year and the deduction fields on this page."],
    assumptions: ["You can opt for the regime shown. Business income has extra form requirements that this page does not file."],
    limitations: limits,
    related: ["income-tax", "hra", "take-home-salary"],
    articles: ["tax-regime-comparison"],
  },
  {
    slug: "take-home-salary",
    title: "Take-home salary calculator",
    shortTitle: "Take-home salary",
    description: "Monthly take-home from CTC, basic pay, PF, professional tax, and the income-tax estimate.",
    category: "tax",
    phase: 3,
    keywords: ["take home", "in hand salary", "ctc"],
    questions: ["what is my take home salary"],
    fields: [
      money("ctc", "Annual CTC", 1800000, { min: 1 }),
      money("basic", "Monthly basic pay", 50000, { min: 1 }),
      money("hra", "Monthly HRA", 20000),
      percent("employeePf", "Employee PF rate", 12, { min: 0, max: 20 }),
      percent("employerPf", "Employer PF rate", 12, { min: 0, max: 20 }),
      money("pt", "Annual professional tax", 2400),
      select("regime", "Tax regime", "new", regimeOptions),
      select("year", "Financial year", "FY2026-27", yearOptions),
      select("age", "Age", "below-60", ageOptions),
    ],
    calculate: (values) => {
      const structure = salaryStructure({
        annualCtc: readNumber(values, "ctc"),
        monthlyBasic: readNumber(values, "basic"),
        monthlyHra: readNumber(values, "hra"),
        employeePfRate: readNumber(values, "employeePf"),
        employerPfRate: readNumber(values, "employerPf"),
        annualProfessionalTax: readNumber(values, "pt"),
        annualIncomeTax: 0,
      });
      const tax = estimateIncomeTax({
        financialYear: readString(values, "year") as FinancialYearId,
        regime: readString(values, "regime") as TaxRegime,
        age: readString(values, "age") as AgeBand,
        resident: true,
        salaryIncome: true,
        grossIncome: structure.monthlyGross * 12,
        section80c: readString(values, "regime") === "old" ? Math.min(150000, structure.monthlyEmployeePf * 12) : 0,
        section80d: 0,
        otherOldRegimeDeductions: 0,
        employerNps: 0,
        selfOccupiedInterest: 0,
      });
      const takeHome = salaryStructure({
        annualCtc: readNumber(values, "ctc"),
        monthlyBasic: readNumber(values, "basic"),
        monthlyHra: readNumber(values, "hra"),
        employeePfRate: readNumber(values, "employeePf"),
        employerPfRate: readNumber(values, "employerPf"),
        annualProfessionalTax: readNumber(values, "pt"),
        annualIncomeTax: tax.totalTax,
      });
      return {
        headline: `Estimated monthly take-home is ${formatINR(takeHome.monthlyTakeHome, 0)}`,
        detail: `Annual tax used in the estimate is ${formatINR(tax.totalTax, 0)}.`,
        metrics: [
          { label: "Monthly gross", value: formatINR(takeHome.monthlyGross) },
          { label: "Employee PF", value: formatINR(takeHome.monthlyEmployeePf) },
          { label: "Monthly tax", value: formatINR(takeHome.monthlyTax) },
          { label: "Monthly take-home", value: formatINR(takeHome.monthlyTakeHome) },
        ],
        notes: ["Gross is CTC minus employer PF. In the old regime, employee PF is counted toward 80C up to the cap. HRA exemption is not calculated on this page."],
        warnings: ["Employer TDS worksheets include more components. Treat this as an estimate."],
      };
    },
    formula: "Take-home = monthly gross − employee PF − professional tax / 12 − annual tax / 12.",
    methodology: ["Tax uses the versioned regime on the gross salary after standard deduction and, in the old regime, employee PF under 80C."],
    assumptions: ["CTC includes employer PF and no other employer benefits."],
    limitations: limits,
    related: ["salary-structure", "hra", "income-tax"],
    articles: ["tax-regime-comparison"],
  },
  {
    slug: "salary-structure",
    title: "Salary structure and PF estimator",
    shortTitle: "Salary structure",
    description: "Split CTC into gross, basic, HRA, special allowance, and PF.",
    category: "tax",
    phase: 3,
    keywords: ["salary structure", "ctc breakup", "pf"],
    questions: ["how is my ctc split"],
    fields: [
      money("ctc", "Annual CTC", 1200000, { min: 1 }),
      money("basic", "Monthly basic", 40000, { min: 1 }),
      money("hra", "Monthly HRA", 16000),
      percent("employeePf", "Employee PF rate on basic", 12, { min: 0, max: 20 }),
      percent("employerPf", "Employer PF rate on basic", 12, { min: 0, max: 20 }),
      money("pt", "Annual professional tax", 2500),
      money("tax", "Annual income tax, if you already know it", 0),
    ],
    calculate: (values) => {
      const result = salaryStructure({
        annualCtc: readNumber(values, "ctc"),
        monthlyBasic: readNumber(values, "basic"),
        monthlyHra: readNumber(values, "hra"),
        employeePfRate: readNumber(values, "employeePf"),
        employerPfRate: readNumber(values, "employerPf"),
        annualProfessionalTax: readNumber(values, "pt"),
        annualIncomeTax: readNumber(values, "tax"),
      });
      return {
        headline: `Monthly take-home is ${formatINR(result.monthlyTakeHome, 0)} before any deduction not listed here`,
        detail: `Special allowance is the gross left after basic and HRA: ${formatINR(result.specialAllowanceMonthly, 0)} a month.`,
        metrics: [
          { label: "Monthly gross", value: formatINR(result.monthlyGross) },
          { label: "Employer PF", value: formatINR(result.monthlyEmployerPf) },
          { label: "Employee PF", value: formatINR(result.monthlyEmployeePf) },
          { label: "Special allowance", value: formatINR(result.specialAllowanceMonthly) },
          { label: "Take-home", value: formatINR(result.monthlyTakeHome) },
        ],
        notes: ["Employer PF is inside CTC and is not part of the employee's monthly gross."],
        warnings: ["This split does not value gratuity, bonus, or insurance."],
      };
    },
    formula: "Monthly gross = (CTC − employer PF × 12) / 12. Special allowance = gross − basic − HRA.",
    methodology: ["PF is a percentage of the basic pay you entered, not of CTC."],
    assumptions: ["The basic and HRA figures match the appointment letter."],
    limitations: limits,
    related: ["take-home-salary", "epf", "hra"],
    articles: ["tax-regime-comparison"],
  },
  {
    slug: "hra",
    title: "HRA calculator",
    shortTitle: "HRA",
    description: "Old-regime HRA exemption: the lowest of actual HRA, rent minus 10% of salary, and 40% or 50% of salary.",
    category: "tax",
    phase: 3,
    keywords: ["hra", "house rent allowance"],
    questions: ["how much hra is exempt"],
    fields: [
      money("basic", "Annual basic pay plus DA", 600000),
      money("hra", "Annual HRA received", 240000),
      money("rent", "Annual rent paid", 240000),
      select("city", "City", "metro", [
        { value: "metro", label: "Delhi, Mumbai, Kolkata, or Chennai" },
        { value: "non-metro", label: "Any other city" },
      ]),
      select("regime", "Regime", "old", regimeOptions),
    ],
    calculate: (values) => {
      const result = hraExemption({
        basicPlusDa: readNumber(values, "basic"),
        hraReceived: readNumber(values, "hra"),
        rentPaid: readNumber(values, "rent"),
        city: readString(values, "city") === "metro" ? "metro" : "non-metro",
        regime: readString(values, "regime") === "new" ? "new" : "old",
      });
      return {
        headline: `Exempt HRA is ${formatINR(result.exemption, 0)}`,
        detail: `Taxable HRA is ${formatINR(result.taxableHra, 0)}.`,
        metrics: [
          { label: "Exemption", value: formatINR(result.exemption, 0) },
          { label: "Taxable HRA", value: formatINR(result.taxableHra, 0) },
          ...result.components.map((item) => ({ label: item.label, value: formatINR(item.amount, 0) })),
        ],
        notes: result.notes,
        warnings: [],
      };
    },
    formula: "Exemption = minimum of actual HRA, rent − 10% of salary, and 50% or 40% of salary.",
    methodology: ["Metro means Delhi, Mumbai, Kolkata, or Chennai under Rule 2A."],
    assumptions: ["Salary is basic plus DA that forms part of retirement benefits. Other allowances are excluded."],
    limitations: [...limits, "The new regime does not allow this exemption."],
    related: ["tax-regime", "take-home-salary", "rent-vs-buy"],
    articles: ["tax-regime-comparison"],
  },
  {
    slug: "home-loan-affordability",
    title: "Home loan affordability calculator",
    shortTitle: "Loan affordability",
    description: "A loan size from income, an obligation ratio you choose, and the EMI formula.",
    category: "loans",
    phase: 3,
    keywords: ["home loan eligibility", "how much loan can i get"],
    questions: ["how much home loan can i afford"],
    fields: [
      money("income", "Monthly take-home income", 150000, { min: 1 }),
      percent("foir", "Share of income available for all EMIs", 40, { min: 1, max: 80, help: "This is your planning limit, not a bank's rule." }),
      money("existing", "Existing monthly EMIs", 0),
      percent("rate", "Nominal annual interest rate", 8.5, { min: 0, max: 20 }),
      integer("months", "Tenure in months", 240, { min: 12, max: 360 }),
    ],
    calculate: (values) => {
      const result = homeLoanAffordability({
        monthlyIncome: readNumber(values, "income"),
        obligationRatio: readNumber(values, "foir"),
        existingMonthlyEmi: readNumber(values, "existing"),
        annualNominalRate: readNumber(values, "rate"),
        months: readNumber(values, "months"),
      });
      return {
        headline: result.limitedByExistingEmi
          ? "Existing EMIs already use the share of income you allowed"
          : `This planning limit supports about ${formatINR(result.maxLoan, 0)}`,
        detail: `Maximum new EMI: ${formatINR(result.maxEmi, 0)}.`,
        metrics: [
          { label: "Maximum new EMI", value: formatINR(result.maxEmi, 0) },
          { label: "Illustrative loan", value: formatINR(result.maxLoan, 0) },
        ],
        notes: ["The loan is the principal whose reducing-balance EMI equals the room left in your ratio."],
        warnings: ["A lender will use its own income multiple, credit score, and property value. This is not an approval."],
      };
    },
    formula: "Maximum EMI = income × ratio − existing EMIs. Loan is the inverse of the EMI formula.",
    methodology: ["The ratio is an input so Hisab does not pretend to know a bank's policy."],
    assumptions: ["Income is stable and the rate is fixed."],
    limitations: limits,
    related: ["emi", "home-loan-prepayment", "rent-vs-buy"],
    articles: ["emi-and-prepayment"],
  },
  {
    slug: "home-loan-prepayment",
    title: "Home loan prepayment comparison",
    shortTitle: "Prepayment",
    description: "Interest saved by an extra monthly payment or a one-time prepayment, with the EMI kept the same.",
    category: "loans",
    phase: 3,
    keywords: ["prepay home loan", "part payment", "foreclose"],
    questions: ["should i prepay my loan"],
    fields: [
      money("principal", "Outstanding loan", 3000000, { min: 1 }),
      percent("rate", "Nominal annual rate", 8.5, { min: 0, max: 20 }),
      integer("months", "Months left", 240, { min: 1, max: 360 }),
      money("extra", "Extra principal every month", 5000),
      integer("prepayMonth", "Month of a one-time prepayment", 12, { min: 1, max: 360 }),
      money("prepay", "One-time prepayment", 200000),
    ],
    calculate: (values) => {
      const baseInput = {
        principal: readNumber(values, "principal"),
        annualNominalRate: readNumber(values, "rate"),
        months: readNumber(values, "months"),
      };
      const base = amortizationSchedule(baseInput);
      const changed = amortizationSchedule({
        ...baseInput,
        extraMonthly: readNumber(values, "extra"),
        prepayment: { month: readNumber(values, "prepayMonth"), amount: readNumber(values, "prepay") },
      });
      return {
        headline: `Interest falls by ${formatINR(base.totalInterest - changed.totalInterest, 0)}`,
        detail: `Tenure goes from ${base.months} months to ${changed.months} months if the EMI stays ${formatINR(base.emi, 0)}.`,
        metrics: [
          { label: "Original interest", value: formatINR(base.totalInterest, 0) },
          { label: "Interest with prepayment", value: formatINR(changed.totalInterest, 0) },
          { label: "Interest saved", value: formatINR(base.totalInterest - changed.totalInterest, 0) },
          { label: "Months saved", value: String(base.months - changed.months) },
        ],
        notes: ["The EMI does not change. Extra money reduces principal, so the loan ends sooner."],
        warnings: ["A lender may charge a prepayment fee or apply the credit on a different date. That fee is not deducted here."],
      };
    },
    formula: "Run the reducing-balance schedule twice, with and without the extra principal.",
    methodology: ["Extra monthly principal is paid after the contractual EMI. The one-time amount is paid in the month you choose."],
    assumptions: ["The rate stays fixed and the lender accepts the prepayment."],
    limitations: limits,
    related: ["emi", "debt-payoff", "rent-vs-buy"],
    articles: ["emi-and-prepayment"],
  },
  {
    slug: "rent-vs-buy",
    title: "Rent versus buy scenario",
    shortTitle: "Rent vs buy",
    description: "Compare the wealth from owning a home with the wealth from investing the down payment and the cash-flow gap.",
    category: "compare",
    phase: 3,
    comparison: true,
    keywords: ["rent vs buy", "rent or buy"],
    questions: ["should i rent or buy a house"],
    fields: [
      integer("years", "Years to compare", 10, { min: 1, max: 30 }),
      money("price", "Property price", 8000000, { min: 1 }),
      money("down", "Down payment", 1600000),
      percent("loanRate", "Loan nominal rate", 8.5, { min: 0, max: 18 }),
      integer("loanYears", "Loan years", 20, { min: 1, max: 30 }),
      percent("growth", "Assumed property growth", 5, { min: -10, max: 20 }),
      money("maintenance", "Annual maintenance", 24000),
      money("rent", "Monthly rent today", 25000),
      percent("rentGrowth", "Annual rent increase", 5, { min: 0, max: 20 }),
      percent("invest", "Return on money not used to buy", 8, { min: -10, max: 20 }),
    ],
    calculate: (values) => {
      const result = rentVersusBuy({
        horizonYears: readNumber(values, "years"),
        propertyPrice: readNumber(values, "price"),
        downPayment: readNumber(values, "down"),
        loanRate: readNumber(values, "loanRate"),
        loanYears: readNumber(values, "loanYears"),
        propertyGrowth: readNumber(values, "growth"),
        annualMaintenance: readNumber(values, "maintenance"),
        monthlyRent: readNumber(values, "rent"),
        rentGrowth: readNumber(values, "rentGrowth"),
        investmentReturn: readNumber(values, "invest"),
      });
      return {
        headline: `Buy ends at ${formatINR(result.buyNetWorth, 0)} of home equity. Rent ends at ${formatINR(result.rentNetWorth, 0)} invested.`,
        detail: "Home equity is not cash until you sell, and the invested path is not a house.",
        metrics: [
          { label: "Home equity", value: formatINR(result.buyNetWorth, 0) },
          { label: "Invested rent path", value: formatINR(result.rentNetWorth, 0) },
          { label: "EMI", value: formatINR(result.emi, 0) },
          { label: "Property value", value: formatINR(result.propertyValue, 0) },
          { label: "Loan still left", value: formatINR(result.remainingLoan, 0) },
        ],
        notes: result.notes,
        warnings: ["Stamp duty, tax savings, repairs, and selling costs can reverse a close result. They are not in this scenario."],
      };
    },
    formula: "Buy: grown property value minus remaining loan. Rent: down payment invested, plus months when owning would have cost more cash.",
    methodology: ["If rent is higher than EMI plus maintenance, the gap is withdrawn from the invested down payment."],
    assumptions: [ASSUMPTION_RETURN, "Property growth is an assumption, not a city forecast."],
    limitations: limits,
    related: ["emi", "home-loan-affordability", "hra"],
    articles: ["emi-and-prepayment"],
  },
  {
    slug: "credit-card-rewards",
    title: "Credit card rewards calculator",
    shortTitle: "Card rewards",
    description: "Net value of rewards from the rates, caps, exclusions, and fees you enter. No card benefits are invented.",
    category: "planning",
    phase: 3,
    keywords: ["credit card", "cashback", "reward points"],
    questions: ["is my credit card reward worth the fee"],
    fields: [
      rows(
        "categories",
        "Spend categories",
        [
          { key: "name", label: "Category", kind: "text", defaultValue: "Groceries" },
          { key: "spend", label: "Monthly spend", kind: "money", min: 0, defaultValue: 10000 },
          { key: "rate", label: "Reward percent", kind: "percent", min: 0, max: 100, defaultValue: 1 },
          { key: "excluded", label: "Excluded", kind: "boolean", defaultValue: false },
        ],
        [
          { name: "Groceries", spend: 15000, rate: 5, excluded: false },
          { name: "Rent", spend: 20000, rate: 0, excluded: true },
        ],
        { minRows: 1, maxRows: 12 },
      ),
      numberField("pointValue", "Rupees received per reward unit", 1, { min: 0.01, max: 10, help: "Use 1 when the reward percent is already cashback. Use the redemption value when you earn points." }),
      money("cap", "Annual cap on reward value, 0 for none", 0),
      money("fee", "Annual fee", 500),
    ],
    calculate: (values) => {
      const result = cardRewards({
        categories: readRows(values, "categories").map((row) => ({
          name: String(row.name),
          monthlySpend: Number(row.spend),
          rewardRate: Number(row.rate),
          excluded: row.excluded === true || row.excluded === "true",
        })),
        rupeesPerPoint: readNumber(values, "pointValue"),
        annualValueCap: readNumber(values, "cap"),
        annualFee: readNumber(values, "fee"),
      });
      return {
        headline: `Net reward after the fee is ${formatINR(result.netValue, 0)}`,
        detail: `Eligible spend ${formatINR(result.eligibleSpend, 0)}. Excluded spend ${formatINR(result.excludedSpend, 0)}.`,
        metrics: [
          { label: "Reward before the cap", value: formatINR(result.uncappedValue) },
          { label: "Reward after the cap", value: formatINR(result.cappedValue) },
          { label: "Net of the fee", value: formatINR(result.netValue) },
        ],
        notes: result.notes,
        warnings: ["Enter the rate from your card's terms. A blank or guessed rate will produce a blank or guessed result."],
      };
    },
    formula: "Sum of eligible annual spend × reward rate × rupee value, then apply the cap and subtract the fee.",
    methodology: ["Excluded rows add spend but no reward. The cap is on rupee value, not on points."],
    assumptions: ["You redeem the full reward value and pay the fee."],
    limitations: limits,
    related: ["debt-payoff", "savings-rate"],
    articles: ["emergency-funds"],
  },
  {
    slug: "debt-payoff",
    title: "Debt repayment planner",
    shortTitle: "Debt payoff",
    description: "Avalanche and snowball payoff from balances, rates, and minimums you enter.",
    category: "loans",
    phase: 3,
    keywords: ["debt payoff", "avalanche", "snowball"],
    questions: ["how do i pay off my debt"],
    fields: [
      rows(
        "debts",
        "Debts",
        [
          { key: "name", label: "Name", kind: "text", defaultValue: "Card" },
          { key: "balance", label: "Balance", kind: "money", min: 1, defaultValue: 50000 },
          { key: "rate", label: "Annual rate percent", kind: "percent", min: 0, max: 48, defaultValue: 36 },
          { key: "minimum", label: "Minimum payment", kind: "money", min: 1, defaultValue: 2000 },
        ],
        [
          { name: "Credit card", balance: 80000, rate: 36, minimum: 4000 },
          { name: "Personal loan", balance: 150000, rate: 14, minimum: 5000 },
        ],
        { minRows: 1, maxRows: 12 },
      ),
      money("extra", "Extra payment each month", 3000),
      select("strategy", "Which debt gets the extra payment", "avalanche", [
        { value: "avalanche", label: "Highest rate first" },
        { value: "snowball", label: "Smallest balance first" },
      ]),
    ],
    calculate: (values) => {
      const debts = readRows(values, "debts").map((row) => ({
        name: String(row.name),
        balance: Number(row.balance),
        annualNominalRate: Number(row.rate),
        minimumPayment: Number(row.minimum),
      }));
      const strategy = readString(values, "strategy") === "snowball" ? "snowball" : "avalanche";
      const chosen = debtPayoff(debts, readNumber(values, "extra"), strategy);
      const other = debtPayoff(debts, readNumber(values, "extra"), strategy === "avalanche" ? "snowball" : "avalanche");
      return {
        headline: chosen.paidOff
          ? `${strategy === "avalanche" ? "Highest-rate" : "Smallest-balance"} order clears the debts in ${chosen.months} months`
          : "The debts are not cleared inside the month cap",
        detail: `Interest on this path is ${formatINR(chosen.totalInterest, 0)}. The other order takes ${other.months} months.`,
        metrics: [
          { label: "Months", value: String(chosen.months) },
          { label: "Interest", value: formatINR(chosen.totalInterest, 0) },
          { label: "Total paid", value: formatINR(chosen.totalPaid, 0) },
          { label: "Other order, months", value: String(other.months) },
        ],
        series: [{ id: "balance", label: "Balance left", points: chosen.yearly.map((row) => ({ x: `M${row.month}`, y: row.balance })) }],
        notes: ["Minimums are paid on every debt. Extra money goes to one target at a time."],
        warnings: chosen.warnings,
      };
    },
    formula: "Interest accrues monthly. Minimums are paid. The extra amount goes to the target debt.",
    methodology: ["Avalanche sorts by rate. Snowball sorts by balance. The math does not claim one is emotionally easier."],
    assumptions: ["Rates and minimums stay constant and you do not add new debt."],
    limitations: limits,
    related: ["emi", "home-loan-prepayment", "credit-card-rewards"],
    articles: ["emi-and-prepayment"],
  },
  {
    slug: "emergency-fund",
    title: "Emergency fund estimator",
    shortTitle: "Emergency fund",
    description: "Three, six, and twelve months of essential expenses, minus what you have already saved.",
    category: "planning",
    phase: 3,
    keywords: ["emergency fund", "contingency fund"],
    questions: ["how much emergency fund do i need"],
    fields: [
      money("expenses", "Monthly essential expenses", 40000, { min: 0 }),
      money("saved", "Already saved for emergencies", 50000),
    ],
    calculate: (values) => {
      const result = emergencyFund(readNumber(values, "expenses"), readNumber(values, "saved"));
      return {
        headline: "There is no single correct emergency fund. Here are three targets.",
        detail: "Essentials are rent, food, utilities, school fees, insurance, and loan EMIs. Leave out holidays.",
        metrics: result.scenarios.map((scenario) => ({
          label: `${scenario.months} months`,
          value: formatINR(scenario.target, 0),
          hint: scenario.gap === 0 ? "Already covered" : `${formatINR(scenario.gap, 0)} still to save`,
        })),
        notes: ["A larger fund matters more when income is uneven or a job would take longer to replace."],
        warnings: ["Keep this money where a market fall cannot delay the emergency."],
      };
    },
    formula: "Target = monthly essentials × months. Gap = target − savings already set aside.",
    methodology: ["The page shows 3, 6, and 12 months instead of declaring one of them correct."],
    assumptions: ["The monthly figure is essential spending, not your full lifestyle."],
    limitations: limits,
    related: ["insurance-needs", "savings-rate", "goal-investment"],
    articles: ["emergency-funds"],
  },
  {
    slug: "insurance-needs",
    title: "Insurance coverage needs estimator",
    shortTitle: "Insurance needs",
    description: "A cover gap from income replacement, liabilities, and goals, after assets and existing cover.",
    category: "planning",
    phase: 3,
    keywords: ["term insurance", "life cover", "how much insurance"],
    questions: ["how much life cover do i need"],
    fields: [
      money("income", "Annual income", 1200000),
      integer("years", "Years of income to replace", 20, { min: 0, max: 40 }),
      percent("self", "Share of income spent on yourself", 30, { min: 0, max: 90 }),
      money("liabilities", "Loans and other liabilities", 2000000),
      money("goals", "Goals you still want funded", 3000000),
      money("assets", "Assets your family can use", 1500000),
      money("cover", "Existing life cover", 5000000),
      percent("discount", "Discount rate for future income", 0, { min: 0, max: 12, help: "Zero adds the years without discounting. A higher rate lowers the income-replacement figure." }),
    ],
    calculate: (values) => {
      const result = insuranceNeed({
        annualIncome: readNumber(values, "income"),
        yearsToReplace: readNumber(values, "years"),
        selfConsumptionShare: readNumber(values, "self"),
        liabilities: readNumber(values, "liabilities"),
        goals: readNumber(values, "goals"),
        existingAssets: readNumber(values, "assets"),
        existingCover: readNumber(values, "cover"),
        discountRate: readNumber(values, "discount"),
      });
      return {
        headline: `The gap on these inputs is ${formatINR(result.netCoverGap, 0)}`,
        detail: "This estimates a need. It does not say that a particular policy is suitable.",
        metrics: [
          { label: "Income replacement", value: formatINR(result.incomeReplacement, 0) },
          { label: "Gross need", value: formatINR(result.grossNeed, 0) },
          { label: "Cover gap", value: formatINR(result.netCoverGap, 0) },
        ],
        notes: ["Income replacement uses income after the share you spend on yourself."],
        warnings: ["Health cover, disability, and policy exclusions are separate questions. This page does not price a premium."],
      };
    },
    formula: "Gap = income replacement + liabilities + goals − assets − existing cover.",
    methodology: ["At a zero discount rate, income replacement is the annual need times the years. A positive rate uses the present value of that annuity."],
    assumptions: ["The family can actually use the assets you counted."],
    limitations: [...limits, "This is not a recommendation to buy, keep, or cancel a policy."],
    related: ["emergency-fund", "education-goal", "goal-investment"],
    articles: ["emergency-funds"],
  },
  goalCopy("education-goal", "Education goal planner", "Education goal", "A savings plan for an education cost in today's rupees.", ["education", "college fees"], 1500000, 8),
  goalCopy("wedding-goal", "Wedding goal planner", "Wedding goal", "A savings plan for a wedding budget in today's rupees.", ["wedding", "marriage budget"], 800000, 3),
  {
    slug: "salary-vs-inflation",
    title: "Salary growth versus inflation",
    shortTitle: "Salary vs inflation",
    description: "See whether a hike raises real pay, and what happens to savings if lifestyle costs rise too.",
    category: "planning",
    phase: 3,
    keywords: ["salary hike", "inflation", "real salary"],
    questions: ["is my salary beating inflation"],
    fields: [
      money("salary", "Annual salary today", 1200000, { min: 1 }),
      money("expenses", "Annual expenses today", 700000),
      percent("hike", "Annual hike", 8, { min: -10, max: 30 }),
      percent("inflation", "Inflation", 5, { min: 0, max: 15 }),
      percent("lifestyle", "Lifestyle cost growth", 6, { min: 0, max: 20 }),
      integer("years", "Years", 10, { min: 1, max: 30 }),
    ],
    calculate: (values) => {
      const result = salaryPath({
        salary: readNumber(values, "salary"),
        annualHike: readNumber(values, "hike"),
        inflation: readNumber(values, "inflation"),
        lifestyleGrowth: readNumber(values, "lifestyle"),
        annualExpenses: readNumber(values, "expenses"),
        years: readNumber(values, "years"),
      });
      const last = result.rows[result.rows.length - 1];
      return {
        headline: last ? `In year ${last.year}, real salary is ${formatINR(last.realSalary, 0)} in today's rupees` : "Add a longer period.",
        detail: last ? `Savings that year are ${formatINR(last.savings, 0)}, a ${formatPercent(last.savingsRate)} savings rate.` : "",
        metrics: [
          { label: "Ending nominal salary", value: formatINR(last?.salary ?? 0, 0) },
          { label: "Ending real salary", value: formatINR(last?.realSalary ?? 0, 0) },
          { label: "Ending savings", value: formatINR(last?.savings ?? 0, 0) },
        ],
        tables: [{
          caption: "Year path",
          columns: ["Year", "Salary", "Real salary", "Savings"],
          rows: result.rows.map((row) => [String(row.year), formatINR(row.salary, 0), formatINR(row.realSalary, 0), formatINR(row.savings, 0)]),
        }],
        notes: ["Real salary divides the future salary by inflation. Lifestyle growth is separate and can consume a hike."],
        warnings: [],
      };
    },
    formula: "Salary grows by the hike. Real salary = salary / (1 + inflation) ^ year. Expenses grow by the lifestyle rate.",
    methodology: ["A hike above inflation can still lower the savings rate if lifestyle growth is faster."],
    assumptions: ["The hike and the cost growth repeat every year."],
    limitations: limits,
    related: ["hike-lifestyle", "inflation", "savings-rate"],
    articles: ["inflation-adjusted-returns"],
  },
  {
    slug: "net-worth",
    title: "Net worth calculator",
    shortTitle: "Net worth",
    description: "Assets minus liabilities, from the list you enter. Nothing is stored on a server.",
    category: "planning",
    phase: 3,
    keywords: ["net worth", "assets minus loans"],
    questions: ["what is my net worth"],
    fields: [
      rows("assets", "Assets", itemColumns("Savings account", 200000), [{ name: "Savings account", amount: 200000 }, { name: "EPF", amount: 400000 }], { minRows: 1, maxRows: 20 }),
      rows("liabilities", "Liabilities", itemColumns("Home loan", 0), [{ name: "Home loan", amount: 500000 }], { minRows: 0, maxRows: 20 }),
    ],
    calculate: (values) => {
      const result = netWorth(toItems(readRows(values, "assets")), toItems(readRows(values, "liabilities")));
      return {
        headline: `Net worth is ${formatINR(result.net, 0)}`,
        detail: `Assets ${formatINR(result.assets, 0)}. Liabilities ${formatINR(result.liabilities, 0)}.`,
        metrics: [
          { label: "Assets", value: formatINR(result.assets, 0) },
          { label: "Liabilities", value: formatINR(result.liabilities, 0) },
          { label: "Net worth", value: formatINR(result.net, 0) },
        ],
        notes: ["Use current realistic values. A house should be what you could sell it for, not what you hope it is worth."],
        warnings: ["This page keeps numbers in the calculator only. The plan workspace can store goals on this device."],
      };
    },
    formula: "Net worth = assets − liabilities.",
    methodology: ["Each row is added. Negative amounts are rejected so a loan is not hidden inside an asset."],
    assumptions: ["Values are in today's rupees."],
    limitations: limits,
    related: ["net-worth-projection", "goal-investment", "emergency-fund"],
    articles: ["net-worth-and-goals"],
  },
  {
    slug: "capital-gains",
    title: "Capital gains tax estimator",
    shortTitle: "Capital gains",
    description: "Tax on a gain using the post-23 July 2024 rates for equity and other assets.",
    category: "tax",
    phase: 3,
    keywords: ["capital gains", "ltcg", "stcg", "112a"],
    questions: ["how much capital gains tax will i pay"],
    fields: [
      select("asset", "Asset", "listed-equity", [
        { value: "listed-equity", label: "Listed equity or equity mutual fund, STT paid" },
        { value: "other", label: "Another asset" },
      ]),
      select("term", "How you classify the gain", "long", [
        { value: "long", label: "Long term" },
        { value: "short", label: "Short term" },
      ]),
      money("gain", "Gain", 200000),
      money("used", "Equity long-term exemption already used this year", 0),
      percent("slab", "Slab rate, only for other short-term gains", 30, { min: 0, max: 30 }),
    ],
    calculate: (values) => {
      const result = estimateCapitalGain({
        assetClass: readString(values, "asset") === "other" ? "other" : "listed-equity",
        term: readString(values, "term") === "short" ? "short" : "long",
        gain: readNumber(values, "gain"),
        equityExemptionUsed: readNumber(values, "used"),
        marginalSlabRate: readNumber(values, "slab"),
      });
      return {
        headline: `Estimated tax including cess is ${formatINR(result.totalTax, 0)}`,
        detail: `Taxable gain ${formatINR(result.taxableGain, 0)} at ${formatPercent(result.rateApplied)}.`,
        metrics: [
          { label: "Taxable gain", value: formatINR(result.taxableGain, 0) },
          { label: "Tax before cess", value: formatINR(result.taxBeforeCess, 0) },
          { label: "Cess", value: formatINR(result.cess, 0) },
          { label: "Total", value: formatINR(result.totalTax, 0) },
        ],
        notes: result.notes,
        warnings: ["You choose short or long term. Holding periods differ by asset, so the page does not guess the classification."],
      };
    },
    formula: "Equity long-term: 12.5% above the remaining ₹1,25,000. Equity short-term: 20%. Other long-term: 12.5%. Other short-term: your slab rate. Cess is 4%.",
    methodology: ["Rates apply to transfers on or after 23 July 2024. Surcharge is excluded and explained."],
    assumptions: ["STT conditions are met when you choose listed equity."],
    limitations: [...limits, "Indexation for certain property bought before 23 July 2024 is not compared here."],
    related: ["income-tax", "real-return", "total-return"],
    articles: ["tax-regime-comparison", "cagr-versus-xirr"],
  },
  {
    slug: "savings-rate",
    title: "Expense and savings rate calculator",
    shortTitle: "Savings rate",
    description: "Savings rate from income and expenses, plus how many months of expenses the savings cover.",
    category: "planning",
    phase: 3,
    keywords: ["savings rate", "expenses"],
    questions: ["what is my savings rate"],
    fields: [
      money("income", "Monthly income after tax", 100000, { min: 1 }),
      money("expenses", "Monthly expenses", 65000),
    ],
    calculate: (values) => {
      const income = readNumber(values, "income");
      const expenses = readNumber(values, "expenses");
      const savings = income - expenses;
      const rate = savings / income;
      return {
        headline: `Savings rate is ${formatPercent(rate)}`,
        detail: `You save ${formatINR(savings, 0)} a month.`,
        metrics: [
          { label: "Monthly savings", value: formatINR(savings, 0) },
          { label: "Savings rate", value: formatPercent(rate) },
          { label: "Months of expenses covered by one year of savings", value: expenses === 0 ? "—" : (savings * 12 / expenses).toFixed(1) },
        ],
        notes: ["A negative rate means expenses are above income. The emergency-fund page is the next place to look."],
        warnings: [],
      };
    },
    formula: "Savings rate = (income − expenses) / income.",
    methodology: ["Use after-tax income so the rate matches money you can actually save."],
    assumptions: ["The month you entered is typical."],
    limitations: limits,
    related: ["emergency-fund", "salary-vs-inflation", "goal-priority"],
    articles: ["net-worth-and-goals", "emergency-funds"],
  },
];

function goalCopy(slug: string, title: string, shortTitle: string, description: string, keywords: string[], target: number, years: number): Calculator {
  return {
    slug,
    title,
    shortTitle,
    description,
    category: "planning",
    phase: 3,
    keywords,
    questions: [`how much should i save for ${shortTitle.toLowerCase()}`],
    fields: [
      textField("name", "Goal name", shortTitle),
      money("target", "Cost in today's rupees", target, { min: 1 }),
      percent("inflation", "Inflation of this cost", 6, { min: 0, max: 15 }),
      integer("years", "Years left", years, { min: 0, max: 40 }),
      money("existing", "Already saved", 0),
      percent("rate", "Assumed annual return", 8, { min: -10, max: 20 }),
      select("timing", "SIP timing", "end", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const months = readNumber(values, "years") * 12;
      const result = goalInvestment({
        targetInTodayRupees: readNumber(values, "target"),
        annualInflation: readNumber(values, "inflation"),
        months,
        existingSavings: readNumber(values, "existing"),
        annualReturn: readNumber(values, "rate"),
        timing: asTiming(readString(values, "timing")),
        convention: "effective-annual",
      });
      return {
        headline: result.requiredMonthly === 0 && result.gap <= 0
          ? `${readString(values, "name")} is funded on these assumptions`
          : `${readString(values, "name")} needs about ${formatINR(result.requiredMonthly, 0)} a month`,
        detail: `Inflated cost ${formatINR(result.futureTarget, 0)}.`,
        metrics: [
          { label: "Future cost", value: formatINR(result.futureTarget, 0) },
          { label: "Monthly SIP", value: formatINR(result.requiredMonthly, 0) },
          { label: "Or a lump sum today", value: formatINR(result.requiredLumpSumToday, 0) },
        ],
        notes: [ASSUMPTION_RETURN],
        warnings: ["A goal date can move. If it cannot, treat a very large SIP as a signal to change the target or the date."],
      };
    },
    formula: "Inflate today's cost, grow existing savings, and solve the monthly annuity for the gap.",
    methodology: ["This is the goal calculator with a label. The maths is the same."],
    assumptions: ["The cost you entered is in today's rupees."],
    limitations: limits,
    related: ["goal-investment", "multi-goal", "goal-priority"],
    articles: ["net-worth-and-goals"],
  };
}

function itemColumns(name: string, amount: number) {
  return [
    { key: "name", label: "Name", kind: "text" as const, defaultValue: name },
    { key: "amount", label: "Amount", kind: "money" as const, min: 0, defaultValue: amount },
  ];
}

function toItems(rows: { name?: string | number | boolean; amount?: string | number | boolean }[]) {
  return rows.map((row) => ({ name: String(row.name), amount: Number(row.amount) }));
}

function numberField(key: string, label: string, defaultValue: number, extra?: { min?: number; max?: number; help?: string }) {
  return { type: "scalar" as const, kind: "number" as const, key, label, defaultValue, step: 0.01, ...extra };
}

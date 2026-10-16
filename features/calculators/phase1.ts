import {
  absoluteReturn,
  amortizationSchedule,
  cagr,
  cagrBetweenDates,
  compoundInterest,
  fixedDeposit,
  futureValueLumpSum,
  goalInvestment,
  inflationImpact,
  monthlyAnnuity,
  simpleInterest,
  stepUpSip,
} from "@/lib/finance";
import { COMPOUNDING_PERIODS } from "@/lib/finance/rates";
import { formatINR, formatPercent } from "@/lib/finance/money";
import { readNumber, readString } from "./parse";
import { COMPOUNDING_OPTIONS, RATE_OPTIONS, TIMING_OPTIONS, integer, money, percent, select } from "./fields";
import { ASSUMPTION_RETURN, NOT_ADVICE, asCompounding, asConvention, asPayout, asTiming, growthChart } from "./present";
import type { Calculator } from "./types";

const commonLimits = [NOT_ADVICE, "Bank, fund, and tax rounding can move the result by a few rupees."];

export const phase1: Calculator[] = [
  {
    slug: "fd",
    title: "Fixed deposit calculator",
    shortTitle: "Fixed deposit",
    description: "Maturity value for a cumulative FD, or the interest paid out by a non-cumulative FD.",
    category: "savings",
    phase: 1,
    keywords: ["fd", "fixed deposit", "term deposit", "bank deposit"],
    questions: ["how much will my fd earn", "fixed deposit maturity"],
    fields: [
      money("principal", "Deposit amount", 100000, { param: "amount" }),
      percent("rate", "Nominal annual interest rate", 7, { min: 0, max: 20, help: "Use the rate quoted by the bank. Hisab does not fetch live FD rates." }),
      integer("months", "Tenure in months", 12, { min: 1, max: 1200 }),
      select("compounding", "Compounding, for a cumulative deposit", "quarterly", COMPOUNDING_OPTIONS),
      select("payout", "What happens to the interest", "cumulative", [
        { value: "cumulative", label: "Reinvest it (cumulative)" },
        { value: "monthly", label: "Pay it out monthly" },
        { value: "quarterly", label: "Pay it out quarterly" },
        { value: "half-yearly", label: "Pay it out half-yearly" },
        { value: "yearly", label: "Pay it out yearly" },
      ]),
    ],
    calculate: (values) => {
      const payout = asPayout(readString(values, "payout"));
      const result = fixedDeposit({
        principal: readNumber(values, "principal"),
        annualNominalRate: readNumber(values, "rate"),
        months: readNumber(values, "months"),
        compounding: asCompounding(readString(values, "compounding")),
        payout,
      });
      return {
        headline: payout === "cumulative"
          ? `Maturity value is ${formatINR(result.maturityValue, 0)}`
          : `Interest paid out is ${formatINR(result.totalInterest, 0)}`,
        detail: `Total cash you receive, including principal, is ${formatINR(result.totalReceived, 0)}.`,
        metrics: [
          { label: "Interest", value: formatINR(result.totalInterest) },
          { label: "Principal back", value: formatINR(result.maturityValue) },
          { label: "Effective annual rate", value: formatPercent(result.effectiveAnnualRate) },
          ...(result.periodicPayout === null ? [] : [{ label: "Each interest payout", value: formatINR(result.periodicPayout) }]),
        ],
        series: growthChart(result.points, payout === "cumulative" ? "Deposit value" : "Principal plus interest earned"),
        notes: ["A cumulative FD compounds the nominal rate at the frequency you chose."],
        warnings: payout === "cumulative"
          ? []
          : ["Payout mode uses simple interest on the original principal. The compounding choice does not change that total."],
      };
    },
    formula: "Cumulative: principal × (1 + nominal rate / compounding frequency) ^ (frequency × years). Payout: principal × nominal rate × years.",
    methodology: [
      "The rate is a nominal annual rate. Quarterly compounding uses one quarter of that rate, four times a year.",
      "Non-cumulative deposits pay the interest out. The principal is returned at the end, and the total interest is simple.",
    ],
    assumptions: ["The rate stays fixed for the whole tenure.", "No premature withdrawal and no TDS is deducted inside the result."],
    limitations: [...commonLimits, "Banks differ on day count and on whether a broken period earns simple interest."],
    related: ["rd", "tax-adjusted-fixed-income", "fd-vs-bond"],
    articles: ["fd-returns-and-tax", "compound-interest"],
  },
  {
    slug: "rd",
    title: "Recurring deposit calculator",
    shortTitle: "Recurring deposit",
    description: "Maturity value of a monthly recurring deposit from the nominal rate and compounding frequency.",
    category: "savings",
    phase: 1,
    keywords: ["rd", "recurring deposit", "monthly deposit"],
    questions: ["how much will my rd mature at", "recurring deposit interest"],
    fields: [
      money("installment", "Monthly instalment", 5000),
      percent("rate", "Nominal annual interest rate", 6.7, { min: 0, max: 20, help: "Post Office 5-year RD was 6.7% for 1 Oct 2026 to 31 Dec 2026. Bank RD rates differ. Edit this." }),
      integer("months", "Number of instalments", 12, { min: 1, max: 120 }),
      select("compounding", "Compounding frequency", "quarterly", COMPOUNDING_OPTIONS),
      select("timing", "When each instalment is deposited", "end", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const compounding = asCompounding(readString(values, "compounding"));
      const result = monthlyAnnuity({
        installment: readNumber(values, "installment"),
        annualRate: readNumber(values, "rate"),
        months: readNumber(values, "months"),
        timing: asTiming(readString(values, "timing")),
        convention: "nominal",
        compoundsPerYear: COMPOUNDING_PERIODS[compounding],
      });
      return {
        headline: `Maturity value is ${formatINR(result.maturityValue, 0)}`,
        detail: `You deposit ${formatINR(result.totalInvested, 0)} and earn ${formatINR(result.gain, 0)} of interest.`,
        metrics: [
          { label: "Total deposited", value: formatINR(result.totalInvested) },
          { label: "Interest", value: formatINR(result.gain) },
          { label: "Maturity value", value: formatINR(result.maturityValue) },
        ],
        series: growthChart(result.points, "RD value"),
        notes: ["The nominal rate is converted to a monthly effective rate from the compounding frequency you chose."],
        warnings: ["A bank may round each quarter's interest to the nearest rupee. This result does not round intermediate interest."],
      };
    },
    formula: "Each monthly instalment grows at the monthly effective rate implied by the nominal rate and compounding frequency.",
    methodology: [
      "Quarterly compounding at rate r means the monthly effective rate is (1 + r/4)^(1/3) − 1.",
      "End-of-month deposits are an ordinary annuity. Start-of-month deposits earn one extra month.",
    ],
    assumptions: ["The instalment and the rate stay constant.", "No missed instalments and no premature closure penalty."],
    limitations: commonLimits,
    related: ["fd", "sip", "step-up-sip"],
    articles: ["rd-mechanics", "compound-interest"],
  },
  {
    slug: "sip",
    title: "Mutual fund SIP calculator",
    shortTitle: "SIP",
    description: "Future value of a monthly SIP from an assumed annual return. The return is yours to enter.",
    category: "investing",
    phase: 1,
    keywords: ["sip", "mutual fund", "systematic investment"],
    questions: ["how much should i invest monthly", "sip return projection"],
    fields: [
      money("installment", "Monthly SIP", 10000),
      percent("rate", "Assumed annual return", 10, { min: -50, max: 40, help: "There is no default market return hiding here. 10% is only a labelled example." }),
      integer("months", "Number of months", 120, { min: 1, max: 600 }),
      select("convention", "How to read the annual return", "effective-annual", RATE_OPTIONS),
      select("timing", "When the SIP is invested", "start", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const result = monthlyAnnuity({
        installment: readNumber(values, "installment"),
        annualRate: readNumber(values, "rate"),
        months: readNumber(values, "months"),
        timing: asTiming(readString(values, "timing")),
        convention: asConvention(readString(values, "convention")),
      });
      return {
        headline: `Projected value is ${formatINR(result.maturityValue, 0)}`,
        detail: `Invested ${formatINR(result.totalInvested, 0)}. The rest is the assumed gain, not a promise.`,
        metrics: [
          { label: "Amount invested", value: formatINR(result.totalInvested) },
          { label: "Assumed gain", value: formatINR(result.gain) },
          { label: "Projected value", value: formatINR(result.maturityValue) },
        ],
        series: growthChart(result.points, "Projected value"),
        notes: [ASSUMPTION_RETURN, "Effective annual mode turns a CAGR into a monthly rate with a 12th root. Nominal mode divides by 12."],
        warnings: ["A mutual fund can lose money. This path uses one constant return."],
      };
    },
    formula: "Future value of an annuity at the monthly rate implied by the annual assumption.",
    methodology: [
      "Start-of-month is the usual SIP presentation: the instalment earns that month's assumed return.",
      "The calculator does not use a fund's past return unless you type that number in yourself.",
    ],
    assumptions: ["The SIP amount and the return do not change.", "No exit load and no tax."],
    limitations: [...commonLimits, "Sequence of returns is ignored."],
    related: ["step-up-sip", "sip-vs-lump-sum", "goal-investment"],
    articles: ["sip-return-projections"],
  },
  {
    slug: "lump-sum",
    title: "Lump-sum compound growth calculator",
    shortTitle: "Lump sum",
    description: "Future value of one investment from an annual return and a holding period.",
    category: "investing",
    phase: 1,
    keywords: ["lump sum", "compound growth", "one time investment"],
    questions: ["what will a lump sum grow to"],
    fields: [
      money("principal", "Amount invested today", 100000),
      percent("rate", "Assumed annual return", 10, { min: -50, max: 40 }),
      integer("years", "Years", 10, { min: 1, max: 60 }),
      select("convention", "How to read the annual return", "effective-annual", RATE_OPTIONS),
      select("compounding", "Compounding, if the rate is nominal", "yearly", COMPOUNDING_OPTIONS, { advanced: true }),
    ],
    calculate: (values) => {
      const convention = asConvention(readString(values, "convention"));
      const compounding = asCompounding(readString(values, "compounding"));
      const principal = readNumber(values, "principal");
      const rate = readNumber(values, "rate");
      const years = readNumber(values, "years");
      const compounds = COMPOUNDING_PERIODS[compounding];
      const value = futureValueLumpSum(principal, rate, years, convention, compounds);
      const points = Array.from({ length: years }, (_, index) => {
        const year = index + 1;
        return { month: year * 12, invested: principal, value: futureValueLumpSum(principal, rate, year, convention, compounds) };
      });
      return {
        headline: `Projected value is ${formatINR(value, 0)}`,
        detail: `Assumed gain: ${formatINR(value - principal, 0)}.`,
        metrics: [
          { label: "Invested", value: formatINR(principal) },
          { label: "Assumed gain", value: formatINR(value - principal) },
          { label: "Projected value", value: formatINR(value) },
        ],
        series: growthChart(points, "Projected value"),
        notes: [ASSUMPTION_RETURN],
        warnings: [],
      };
    },
    formula: "Effective: principal × (1 + annual return) ^ years. Nominal: principal × (1 + rate / frequency) ^ (frequency × years).",
    methodology: ["A lump sum is invested once. Nothing is added later."],
    assumptions: ["The annual return stays constant.", "No tax and no costs, unless you have already reduced the rate for them."],
    limitations: commonLimits,
    related: ["sip", "sip-vs-lump-sum", "cagr"],
    articles: ["compound-interest", "sip-return-projections"],
  },
  {
    slug: "sip-vs-lump-sum",
    title: "SIP versus lump-sum comparison",
    shortTitle: "SIP vs lump sum",
    description: "Compare one lump sum with a monthly SIP under the same assumed return.",
    category: "compare",
    phase: 1,
    comparison: true,
    keywords: ["sip vs lump sum", "compare sip"],
    questions: ["should i invest monthly or at once"],
    fields: [
      money("lump", "Lump sum invested today", 120000),
      money("sip", "Monthly SIP", 10000),
      percent("rate", "Assumed annual return for both", 10, { min: -50, max: 40 }),
      integer("months", "Months", 12, { min: 1, max: 600 }),
      select("timing", "SIP timing", "start", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const rate = readNumber(values, "rate");
      const months = readNumber(values, "months");
      const lump = readNumber(values, "lump");
      const sip = monthlyAnnuity({
        installment: readNumber(values, "sip"),
        annualRate: rate,
        months,
        timing: asTiming(readString(values, "timing")),
        convention: "effective-annual",
      });
      const lumpValue = futureValueLumpSum(lump, rate, months / 12, "effective-annual");
      return {
        headline: `Lump sum projects to ${formatINR(lumpValue, 0)}; the SIP projects to ${formatINR(sip.maturityValue, 0)}`,
        detail: "These are different amounts of money invested at different times. A higher result is not automatically the better choice.",
        metrics: [
          { label: "Lump-sum projected value", value: formatINR(lumpValue) },
          { label: "SIP projected value", value: formatINR(sip.maturityValue) },
          { label: "SIP amount invested", value: formatINR(sip.totalInvested) },
          { label: "Difference (lump sum minus SIP)", value: formatINR(lumpValue - sip.maturityValue) },
        ],
        series: [
          { id: "lump", label: "Lump sum", points: [{ x: "Start", y: lump }, { x: "End", y: lumpValue }] },
          { id: "sip", label: "SIP", points: sip.points.filter((_, index) => index % Math.ceil(sip.points.length / 12) === 0 || index === sip.points.length - 1).map((point) => ({ x: `M${point.month}`, y: point.value })) },
        ],
        notes: [ASSUMPTION_RETURN, "The fairer comparison is often the same total rupees, not an arbitrary SIP beside an arbitrary lump sum."],
        warnings: [],
      };
    },
    formula: "Lump sum uses compound growth. SIP uses the annuity future value. Both use the same effective annual return.",
    methodology: ["Both paths use one constant return. The lump sum is exposed to the whole period. The SIP is exposed only after each instalment."],
    assumptions: ["Same return for both, which is a modelling choice, not a market fact."],
    limitations: commonLimits,
    related: ["sip", "lump-sum", "recurring-vs-lump-sum"],
    articles: ["sip-return-projections"],
  },
  {
    slug: "step-up-sip",
    title: "Step-up SIP calculator",
    shortTitle: "Step-up SIP",
    description: "A monthly SIP that increases once a year by a percentage you choose.",
    category: "investing",
    phase: 1,
    keywords: ["step up sip", "top up sip", "increasing sip"],
    questions: ["what if i increase my sip every year"],
    fields: [
      money("installment", "Starting monthly SIP", 10000),
      percent("step", "Annual step-up", 10, { min: 0, max: 100 }),
      percent("rate", "Assumed annual return", 10, { min: -50, max: 40 }),
      integer("months", "Months", 120, { min: 1, max: 600 }),
      select("convention", "How to read the return", "effective-annual", RATE_OPTIONS),
      select("timing", "SIP timing", "start", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const result = stepUpSip({
        installment: readNumber(values, "installment"),
        annualStepUp: readNumber(values, "step"),
        annualRate: readNumber(values, "rate"),
        months: readNumber(values, "months"),
        timing: asTiming(readString(values, "timing")),
        convention: asConvention(readString(values, "convention")),
      });
      return {
        headline: `Projected value is ${formatINR(result.maturityValue, 0)}`,
        detail: `You invest ${formatINR(result.totalInvested, 0)}, including the later increases.`,
        metrics: [
          { label: "Total invested", value: formatINR(result.totalInvested) },
          { label: "Assumed gain", value: formatINR(result.gain) },
          { label: "Projected value", value: formatINR(result.maturityValue) },
        ],
        series: growthChart(result.points, "Projected value"),
        notes: ["The instalment rises after every 12 contributions. A 24-month plan has one increase."],
        warnings: [ASSUMPTION_RETURN],
      };
    },
    formula: "Month-by-month balance. After each 12 contributions the next instalment is multiplied by (1 + step-up).",
    methodology: ["The step-up changes the contribution. It is not an extra return."],
    assumptions: ["You can afford the higher SIP later.", "Return stays constant."],
    limitations: commonLimits,
    related: ["sip", "goal-investment", "hike-lifestyle"],
    articles: ["step-up-sip", "sip-return-projections"],
  },
  {
    slug: "emi",
    title: "EMI calculator",
    shortTitle: "EMI",
    description: "Reducing-balance EMI from loan amount, nominal annual rate, and months.",
    category: "loans",
    phase: 1,
    keywords: ["emi", "loan emi", "home loan emi", "car loan"],
    questions: ["what is my emi", "equated monthly instalment"],
    fields: [
      money("principal", "Loan amount", 2500000),
      percent("rate", "Nominal annual interest rate", 8.5, { min: 0, max: 36 }),
      integer("months", "Tenure in months", 240, { min: 1, max: 480 }),
    ],
    calculate: (values) => {
      const schedule = amortizationSchedule({
        principal: readNumber(values, "principal"),
        annualNominalRate: readNumber(values, "rate"),
        months: readNumber(values, "months"),
      });
      const yearly = yearlyBalance(schedule.rows);
      return {
        headline: `EMI is ${formatINR(schedule.emi, 0)} a month`,
        detail: `Total interest is ${formatINR(schedule.totalInterest, 0)} over ${schedule.months} months.`,
        metrics: [
          { label: "EMI", value: formatINR(schedule.emi) },
          { label: "Total interest", value: formatINR(schedule.totalInterest) },
          { label: "Total paid", value: formatINR(schedule.totalPaid) },
        ],
        series: [{ id: "balance", label: "Outstanding balance", points: yearly }],
        tables: [{
          caption: "Year-end outstanding balance",
          columns: ["Month", "Balance"],
          rows: yearly.map((point) => [point.x, formatINR(point.y, 0)]),
        }],
        notes: ["The monthly rate is the nominal annual rate divided by 12. Payment is at the end of the month."],
        warnings: ["A lender may add fees, insurance, or a different day-count. The EMI here is interest and principal only."],
      };
    },
    formula: "EMI = P × r × (1 + r) ^ n / ((1 + r) ^ n − 1), where r is the annual nominal rate / 12.",
    methodology: ["This is the standard reducing-balance formula. The last payment is trimmed so the balance ends at zero."],
    assumptions: ["The rate is fixed.", "There is no moratorium and no extra payment."],
    limitations: commonLimits,
    related: ["home-loan-prepayment", "home-loan-affordability", "debt-payoff"],
    articles: ["emi-and-prepayment"],
  },
  {
    slug: "simple-compound-interest",
    title: "Simple and compound interest calculator",
    shortTitle: "Simple and compound",
    description: "See simple interest beside compound interest for the same principal, rate, and time.",
    category: "savings",
    phase: 1,
    keywords: ["simple interest", "compound interest"],
    questions: ["what is the difference between simple and compound interest"],
    fields: [
      money("principal", "Principal", 100000),
      percent("rate", "Nominal annual rate", 8, { min: 0, max: 30 }),
      integer("years", "Years", 5, { min: 1, max: 50 }),
      select("compounding", "Compounding frequency", "yearly", COMPOUNDING_OPTIONS),
    ],
    calculate: (values) => {
      const principal = readNumber(values, "principal");
      const rate = readNumber(values, "rate");
      const years = readNumber(values, "years");
      const compounds = COMPOUNDING_PERIODS[asCompounding(readString(values, "compounding"))];
      const simple = simpleInterest({ principal, annualNominalRate: rate, years });
      const compound = compoundInterest({ principal, annualNominalRate: rate, years, compoundsPerYear: compounds });
      return {
        headline: `Compound interest is ${formatINR(compound, 0)}; simple interest is ${formatINR(simple, 0)}`,
        detail: `The gap is ${formatINR(compound - simple, 0)}.`,
        metrics: [
          { label: "Simple interest", value: formatINR(simple) },
          { label: "Compound interest", value: formatINR(compound) },
          { label: "Compound maturity", value: formatINR(principal + compound) },
          { label: "Extra from compounding", value: formatINR(compound - simple) },
        ],
        notes: ["Simple interest never earns interest on earlier interest. Compound interest does, at the frequency you chose."],
        warnings: [],
      };
    },
    formula: "Simple: P × r × t. Compound: P × (1 + r / n) ^ (n × t) − P.",
    methodology: ["Both use the same nominal annual rate. Only the compound path uses the frequency."],
    assumptions: ["The rate does not change."],
    limitations: commonLimits,
    related: ["fd", "lump-sum", "inflation"],
    articles: ["compound-interest"],
  },
  {
    slug: "inflation",
    title: "Inflation and purchasing-power calculator",
    shortTitle: "Inflation",
    description: "Turn today's rupees into a future cost, and see what today's money could buy later.",
    category: "planning",
    phase: 1,
    keywords: ["inflation", "purchasing power", "real value"],
    questions: ["what will inflation do to my savings"],
    fields: [
      money("amount", "Amount in today's rupees", 100000),
      percent("inflation", "Assumed annual inflation", 5, { min: 0, max: 20, help: "Enter your own inflation assumption. Hisab does not treat a past CPI print as a forecast." }),
      integer("years", "Years", 10, { min: 0, max: 60 }),
      percent("nominal", "Optional nominal annual return", 7, { min: -20, max: 30, help: "Used only for the real-return figure." }),
    ],
    calculate: (values) => {
      const result = inflationImpact({
        presentAmount: readNumber(values, "amount"),
        annualInflation: readNumber(values, "inflation"),
        years: readNumber(values, "years"),
        nominalAnnualReturn: readNumber(values, "nominal"),
      });
      return {
        headline: `In ${readNumber(values, "years")} years, the same purchase costs about ${formatINR(result.futureCost, 0)}`,
        detail: `Today's amount would have the buying power of ${formatINR(result.purchasingPower, 0)} after that inflation.`,
        metrics: [
          { label: "Future cost", value: formatINR(result.futureCost) },
          { label: "Purchasing power of today's amount", value: formatINR(result.purchasingPower) },
          { label: "Real annual return", value: formatPercent(result.realAnnualReturn ?? 0) },
        ],
        notes: ["Future cost is today's amount grown by inflation. Purchasing power is today's amount divided by that same factor."],
        warnings: ["The real return treats the nominal return as an effective annual rate and assumes the gain is not taxed."],
      };
    },
    formula: "Future cost = amount × (1 + inflation) ^ years. Real return = (1 + nominal) / (1 + inflation) − 1.",
    methodology: ["Inflation and the nominal return are both assumptions you can edit."],
    assumptions: ["Inflation is constant each year."],
    limitations: [...commonLimits, "A single inflation number does not describe every household's costs."],
    related: ["real-return", "goal-investment", "salary-vs-inflation"],
    articles: ["inflation-adjusted-returns"],
  },
  {
    slug: "cagr",
    title: "CAGR calculator",
    shortTitle: "CAGR",
    description: "Compound annual growth rate between a starting value and an ending value.",
    category: "investing",
    phase: 1,
    keywords: ["cagr", "compound annual growth rate"],
    questions: ["what is my cagr"],
    fields: [
      money("start", "Starting value", 100000, { min: 1 }),
      money("end", "Ending value", 180000, { min: 1 }),
      integer("years", "Whole years, if you are not using dates", 5, { min: 1, max: 80 }),
      select("useDates", "Measure time with dates instead", "no", [
        { value: "no", label: "Use the year count" },
        { value: "yes", label: "Use start and end dates" },
      ]),
      dateLike("startDate", "Start date", "2021-01-01", true),
      dateLike("endDate", "End date", "2026-01-01", true),
    ],
    calculate: (values) => {
      const start = readNumber(values, "start");
      const end = readNumber(values, "end");
      const dated = readString(values, "useDates") === "yes";
      const rate = dated
        ? cagrBetweenDates(start, end, readString(values, "startDate"), readString(values, "endDate"))
        : cagr(start, end, readNumber(values, "years"));
      return {
        headline: `CAGR is ${formatPercent(rate)}`,
        detail: dated
          ? "The year fraction is actual days divided by 365, the same basis as the XIRR calculator."
          : "This uses the whole-year count you entered.",
        metrics: [
          { label: "CAGR", value: formatPercent(rate, 2) },
          { label: "Absolute change", value: formatINR(end - start) },
          { label: "Absolute return", value: formatPercent(absoluteReturn(start, end)) },
        ],
        notes: ["CAGR is the constant annual rate that links the two values. It hides the path in between."],
        warnings: ["A positive CAGR can still include a large fall in the middle."],
      };
    },
    formula: "CAGR = (ending / starting) ^ (1 / years) − 1.",
    methodology: ["Both values must be positive. A loss that ends at zero has no CAGR."],
    assumptions: ["The dates, if used, are real civil dates."],
    limitations: [...commonLimits, "CAGR is not XIRR. It ignores cash flows added or removed along the way."],
    related: ["xirr", "absolute-return", "total-return"],
    articles: ["cagr-versus-xirr"],
  },
  {
    slug: "absolute-return",
    title: "Absolute return calculator",
    shortTitle: "Absolute return",
    description: "The total percentage change from a starting value to an ending value, with no annualising.",
    category: "investing",
    phase: 1,
    keywords: ["absolute return", "total percentage gain"],
    questions: ["what is my absolute return"],
    fields: [
      money("start", "Starting value", 100000, { min: 1 }),
      money("end", "Ending value", 125000, { min: 0 }),
    ],
    calculate: (values) => {
      const start = readNumber(values, "start");
      const end = readNumber(values, "end");
      const rate = absoluteReturn(start, end);
      return {
        headline: `Absolute return is ${formatPercent(rate)}`,
        detail: `The value changed by ${formatINR(end - start, 0)}.`,
        metrics: [
          { label: "Absolute return", value: formatPercent(rate) },
          { label: "Gain or loss", value: formatINR(end - start) },
        ],
        notes: ["Absolute return does not say how long the change took. Use CAGR or XIRR for an annual figure."],
        warnings: [],
      };
    },
    formula: "(ending − starting) / starting.",
    methodology: ["The starting value must be positive. The ending value can be zero."],
    assumptions: ["No cash was added or removed, or you have already adjusted the values for that."],
    limitations: commonLimits,
    related: ["cagr", "total-return", "xirr"],
    articles: ["cagr-versus-xirr"],
  },
  {
    slug: "goal-investment",
    title: "Goal-based investment calculator",
    shortTitle: "Goal investment",
    description: "Required monthly investment and lump sum for a target, after inflation and existing savings.",
    category: "planning",
    phase: 1,
    keywords: ["goal", "target amount", "how much to invest"],
    questions: ["how much should i invest monthly", "how much money will i need"],
    fields: [
      money("target", "Target in today's rupees", 1000000),
      percent("inflation", "Inflation assumption", 5, { min: 0, max: 15 }),
      integer("months", "Months left", 60, { min: 0, max: 600 }),
      money("existing", "Savings already set aside", 100000),
      percent("rate", "Assumed annual return", 9, { min: -20, max: 30 }),
      select("convention", "How to read the return", "effective-annual", RATE_OPTIONS),
      select("timing", "SIP timing", "end", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const result = goalInvestment({
        targetInTodayRupees: readNumber(values, "target"),
        annualInflation: readNumber(values, "inflation"),
        months: readNumber(values, "months"),
        existingSavings: readNumber(values, "existing"),
        annualReturn: readNumber(values, "rate"),
        timing: asTiming(readString(values, "timing")),
        convention: asConvention(readString(values, "convention")),
      });
      const warnings = result.gap > 0 && readNumber(values, "months") === 0
        ? ["There is no time left for a SIP. The gap has to be funded now."]
        : [];
      return {
        headline: result.gap <= 0
          ? `Existing savings cover the inflated target, with ${formatINR(result.surplus, 0)} to spare`
          : `You need about ${formatINR(result.requiredMonthly, 0)} a month`,
        detail: `The inflated target is ${formatINR(result.futureTarget, 0)}.`,
        metrics: [
          { label: "Target after inflation", value: formatINR(result.futureTarget) },
          { label: "Future value of current savings", value: formatINR(result.futureExisting) },
          { label: "Gap", value: formatINR(Math.max(0, result.gap)) },
          { label: "Required monthly SIP", value: formatINR(result.requiredMonthly) },
          { label: "Or a lump sum today", value: formatINR(result.requiredLumpSumToday) },
        ],
        notes: [ASSUMPTION_RETURN, "The monthly figure and the lump sum are alternatives, not amounts to pay together."],
        warnings,
      };
    },
    formula: "Inflate the target, grow current savings, then solve the annuity payment for the gap.",
    methodology: ["Inflation changes what the goal costs. The return changes how fast savings grow. Both are editable."],
    assumptions: ["One goal, one return, and contributions that actually happen."],
    limitations: [...commonLimits, "A required SIP can be larger than your income. The calculator will still show it and you should treat that as a warning."],
    related: ["education-goal", "wedding-goal", "multi-goal", "sip"],
    articles: ["net-worth-and-goals", "inflation-adjusted-returns"],
  },
];

function dateLike(key: string, label: string, defaultValue: string, advanced: boolean) {
  return {
    type: "scalar" as const,
    kind: "date" as const,
    key,
    label,
    defaultValue,
    advanced,
  };
}

function yearlyBalance(rows: { month: number; balance: number }[]): { x: string; y: number }[] {
  return rows
    .filter((row, index) => row.month % 12 === 0 || index === rows.length - 1)
    .map((row) => ({ x: row.month % 12 === 0 ? `Year ${row.month / 12}` : `Month ${row.month}`, y: row.balance }));
}

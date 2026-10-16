import {
  accruedInterest,
  bondCleanPrice,
  bondYieldToMaturity,
  couponIncome,
  currentYield,
  dividendYield,
  epfCorpus,
  epsPension,
  EPF_EPS_WAGE_CEILING,
  EPF_LAST_NOTIFIED_RATE_FY2025_26,
  fireEstimate,
  fixedDeposit,
  npsProjection,
  ppfMaturity,
  PPF_ANNUAL_DEPOSIT_CEILING,
  realReturnAfterAnnualTax,
  retirementCorpus,
  sustainability,
  systematicWithdrawal,
  totalReturn,
  xirr,
} from "@/lib/finance";
import { annualTaxDrag } from "@/lib/finance/fixed-income";
import { formatINR, formatPercent } from "@/lib/finance/money";
import { booleanField, COMPOUNDING_OPTIONS, integer, money, percent, rows, select, TIMING_OPTIONS } from "./fields";
import { readBoolean, readNumber, readRows, readString } from "./parse";
import { ASSUMPTION_RETURN, NOT_ADVICE, asCompounding, asTiming } from "./present";
import type { Calculator } from "./types";

const limits = [NOT_ADVICE];

const FREQUENCY = [
  { value: "1", label: "Once a year" },
  { value: "2", label: "Twice a year" },
  { value: "4", label: "Quarterly" },
  { value: "12", label: "Monthly" },
];

export const phase2: Calculator[] = [
  {
    slug: "bond-ytm",
    title: "Bond yield-to-maturity calculator",
    shortTitle: "Bond YTM",
    description: "Yield to maturity from a clean price on a coupon date. The coupon rate is not the yield.",
    category: "investing",
    phase: 2,
    keywords: ["ytm", "yield to maturity", "bond yield"],
    questions: ["what is this bond's yield to maturity"],
    fields: bondFields(false),
    calculate: (values) => {
      const input = bondInput(values);
      const solved = bondYieldToMaturity({ ...input, cleanPrice: readNumber(values, "price") });
      if (!solved.converged) {
        return { headline: "The yield did not converge", metrics: [], notes: [], warnings: ["Try a different price or a shorter bond. The solver stopped without a reliable root."] };
      }
      const couponCash = input.faceValue * input.annualCouponRate;
      return {
        headline: `Yield to maturity is ${formatPercent(solved.yield)}`,
        detail: `Current yield, coupon cash divided by clean price, is ${formatPercent(currentYield(couponCash, readNumber(values, "price")))}.`,
        metrics: [
          { label: "Yield to maturity", value: formatPercent(solved.yield, 2) },
          { label: "Coupon rate", value: formatPercent(input.annualCouponRate) },
          { label: "Current yield", value: formatPercent(currentYield(couponCash, readNumber(values, "price"))) },
        ],
        notes: ["YTM assumes every coupon is reinvested at the same yield and that the bond is held to maturity."],
        warnings: ["The coupon rate is the cash the bond pays. It is not the annualised return."],
      };
    },
    formula: "Solve the discounted coupon and redemption cash flows so they equal the clean price.",
    methodology: ["The yield is nominal and compounded once per coupon period.", "The price is a clean price on a coupon date, so accrued interest is zero."],
    assumptions: ["Coupons are equal and the redemption is the face value."],
    limitations: [...limits, "A bond can have a yield the solver cannot find. That failure is shown, not hidden."],
    related: ["bond-price", "bond-coupon", "fd-vs-bond"],
    articles: ["bonds-and-ytm"],
  },
  {
    slug: "bond-price",
    title: "Bond price and yield calculator",
    shortTitle: "Bond price",
    description: "Clean price, accrued interest, and dirty price from coupon, yield, and days since the last coupon.",
    category: "investing",
    phase: 2,
    keywords: ["bond price", "clean price", "dirty price", "accrued interest"],
    questions: ["what is the clean and dirty price of a bond"],
    fields: [
      ...bondFields(true),
      integer("daysSince", "Days since the last coupon", 0, { min: 0, max: 366 }),
      integer("daysPeriod", "Days in the coupon period", 182, { min: 1, max: 366 }),
    ],
    calculate: (values) => {
      const input = bondInput(values);
      const clean = bondCleanPrice({ ...input, annualYield: readNumber(values, "yield") });
      const accrued = accruedInterest({
        faceValue: input.faceValue,
        annualCouponRate: input.annualCouponRate,
        frequency: input.frequency,
        daysSinceCoupon: readNumber(values, "daysSince"),
        daysInCouponPeriod: readNumber(values, "daysPeriod"),
      });
      return {
        headline: `Clean price is ${formatINR(clean, 2)}`,
        detail: `Dirty price, clean plus accrued interest, is ${formatINR(clean + accrued, 2)}.`,
        metrics: [
          { label: "Clean price", value: formatINR(clean) },
          { label: "Accrued interest", value: formatINR(accrued) },
          { label: "Dirty price", value: formatINR(clean + accrued) },
          { label: "Yield used", value: formatPercent(readNumber(values, "yield")) },
        ],
        notes: ["Accrued interest uses actual days in the coupon period you entered."],
        warnings: ["This is not a market quote. Settlement conventions differ between exchanges and instruments."],
      };
    },
    formula: "Clean price discounts coupons and face value. Accrued interest = periodic coupon × days since coupon / days in period.",
    methodology: ["Dirty price is what a buyer pays between coupon dates if the seller is compensated for accrued coupon."],
    assumptions: ["The yield is the nominal annual yield compounded with the coupon frequency."],
    limitations: limits,
    related: ["bond-ytm", "bond-coupon"],
    articles: ["bonds-and-ytm"],
  },
  {
    slug: "bond-coupon",
    title: "Bond coupon income calculator",
    shortTitle: "Bond coupon",
    description: "Cash coupons, and their value if reinvested at a rate you choose. This is not the yield to maturity.",
    category: "investing",
    phase: 2,
    keywords: ["coupon", "bond income", "interest on bond"],
    questions: ["how much coupon will a bond pay"],
    fields: [
      money("face", "Face value", 100000, { min: 1 }),
      percent("coupon", "Annual coupon rate", 7.5, { min: 0, max: 20 }),
      integer("years", "Years held, in whole coupon years", 5, { min: 1, max: 40 }),
      select("frequency", "Coupons per year", "2", FREQUENCY),
      percent("reinvest", "Reinvestment rate assumption", 6, { min: 0, max: 20 }),
    ],
    calculate: (values) => {
      const frequency = Number(readString(values, "frequency")) as 1 | 2 | 4 | 12;
      const result = couponIncome({
        faceValue: readNumber(values, "face"),
        annualCouponRate: readNumber(values, "coupon"),
        years: readNumber(values, "years"),
        reinvestmentAnnualRate: readNumber(values, "reinvest"),
        frequency,
      });
      return {
        headline: `Cash coupons are ${formatINR(result.cashCoupons, 0)}`,
        detail: `If those coupons are reinvested at your assumed rate, they grow to ${formatINR(result.reinvestedValue, 0)}.`,
        metrics: [
          { label: "Cash coupons", value: formatINR(result.cashCoupons) },
          { label: "Reinvested value", value: formatINR(result.reinvestedValue) },
          { label: "Annual coupon cash", value: formatINR(readNumber(values, "face") * readNumber(values, "coupon")) },
        ],
        notes: ["Coupon income ignores price movement. A bond bought above par can have a lower realised return than its coupon."],
        warnings: ["Do not describe the coupon rate as a guaranteed annualised return."],
      };
    },
    formula: "Annual coupon cash = face × coupon rate. Reinvestment compounds each coupon for the periods left.",
    methodology: ["The holding period must contain a whole number of coupon periods."],
    assumptions: ["The bond does not default and the coupon stays fixed."],
    limitations: limits,
    related: ["bond-ytm", "bond-price", "fd"],
    articles: ["bonds-and-ytm"],
  },
  {
    slug: "fd-vs-bond",
    title: "FD versus bond scenario",
    shortTitle: "FD vs bond",
    description: "Put a cumulative fixed deposit beside a bond's yield and coupon. Neither answer is a recommendation.",
    category: "compare",
    phase: 2,
    comparison: true,
    keywords: ["fd vs bond", "fixed deposit or bond"],
    questions: ["should i choose an fd or a bond"],
    fields: [
      money("amount", "Amount", 100000),
      percent("fdRate", "FD nominal annual rate", 7, { min: 0, max: 15 }),
      integer("years", "Years", 5, { min: 1, max: 30 }),
      select("compounding", "FD compounding", "quarterly", COMPOUNDING_OPTIONS),
      percent("coupon", "Bond annual coupon rate", 7.2, { min: 0, max: 15 }),
      percent("ytm", "Bond yield to maturity", 7.1, { min: 0, max: 20 }),
    ],
    calculate: (values) => {
      const years = readNumber(values, "years");
      const fd = fixedDeposit({
        principal: readNumber(values, "amount"),
        annualNominalRate: readNumber(values, "fdRate"),
        months: years * 12,
        compounding: asCompounding(readString(values, "compounding")),
        payout: "cumulative",
      });
      const price = bondCleanPrice({
        faceValue: readNumber(values, "amount"),
        annualCouponRate: readNumber(values, "coupon"),
        annualYield: readNumber(values, "ytm"),
        periods: years,
        frequency: 1,
      });
      return {
        headline: `FD maturity ${formatINR(fd.maturityValue, 0)}; bond clean price ${formatINR(price, 0)} per ${formatINR(readNumber(values, "amount"), 0)} face`,
        detail: "The FD figure is a maturity amount. The bond figure is today's clean price at the yield you entered. They answer different questions.",
        metrics: [
          { label: "FD maturity", value: formatINR(fd.maturityValue) },
          { label: "FD effective annual rate", value: formatPercent(fd.effectiveAnnualRate) },
          { label: "Bond YTM you entered", value: formatPercent(readNumber(values, "ytm")) },
          { label: "Bond clean price", value: formatINR(price) },
          { label: "Bond annual coupon cash", value: formatINR(readNumber(values, "amount") * readNumber(values, "coupon")) },
        ],
        notes: ["A higher coupon is not a higher yield. Compare the FD effective rate with the bond's YTM, then look at tax and credit risk separately."],
        warnings: ["This ignores tax, credit risk, liquidity, and the chance you sell the bond before maturity."],
      };
    },
    formula: "FD uses compound growth. The bond price discounts an annual coupon at the yield you entered.",
    methodology: ["The bond in this comparison pays once a year so the term in years equals the number of coupons."],
    assumptions: ["The FD rate is contractual if the bank pays it. The bond yield is the market yield you typed, not a promise."],
    limitations: limits,
    related: ["fd", "bond-ytm", "tax-adjusted-fixed-income"],
    articles: ["fd-returns-and-tax", "bonds-and-ytm"],
  },
  {
    slug: "tax-adjusted-fixed-income",
    title: "Tax-adjusted fixed-income comparison",
    shortTitle: "Tax-adjusted income",
    description: "Apply one tax rate to yearly interest on a cumulative or payout deposit.",
    category: "compare",
    phase: 2,
    comparison: true,
    keywords: ["post tax fd", "tax on interest", "fixed income tax"],
    questions: ["what is my fd return after tax"],
    fields: [
      money("principal", "Amount", 500000),
      percent("rate", "Annual rate", 7, { min: 0, max: 15 }),
      integer("years", "Years", 5, { min: 1, max: 30 }),
      percent("tax", "Tax rate on interest", 30, { min: 0, max: 42, help: "Enter the rate that applies to this interest, including the effect of cess if you want it in the rate." }),
      select("style", "Interest style", "cumulative", [
        { value: "cumulative", label: "Cumulative, interest taxed each year" },
        { value: "payout", label: "Interest paid out each year" },
      ]),
      booleanField("fromCorpus", "Pay the tax from the deposit", false),
    ],
    calculate: (values) => {
      const result = annualTaxDrag({
        principal: readNumber(values, "principal"),
        annualRate: readNumber(values, "rate"),
        years: readNumber(values, "years"),
        taxRate: readNumber(values, "tax"),
        payTaxFromCorpus: readBoolean(values, "fromCorpus"),
        style: readString(values, "style") === "payout" ? "payout" : "cumulative",
      });
      return {
        headline: `Tax paid on the interest is ${formatINR(result.taxPaid, 0)}`,
        detail: `Net interest after that tax is ${formatINR(result.netInterest, 0)}.`,
        metrics: [
          { label: "Value before tax", value: formatINR(result.preTaxValue) },
          { label: "Tax paid", value: formatINR(result.taxPaid) },
          { label: "Corpus left in the deposit", value: formatINR(result.postTaxCorpus) },
          { label: "Net interest", value: formatINR(result.netInterest) },
        ],
        notes: ["Cumulative interest is taxed on each year's accrual even when it is not paid out. That matches the usual FD treatment, not a special election."],
        warnings: ["TDS, surcharge slabs, and the basic exemption are not recalculated here. Use the income-tax estimator for a salary picture."],
      };
    },
    formula: "Each year's interest × tax rate. Cumulative balances grow by interest, minus tax if you pay it from the deposit.",
    methodology: ["One flat rate is applied every year. It does not look up your slab."],
    assumptions: ["The same rate applies for the whole period."],
    limitations: limits,
    related: ["fd", "income-tax", "real-return"],
    articles: ["fd-returns-and-tax"],
  },
  {
    slug: "ppf",
    title: "PPF maturity calculator",
    shortTitle: "PPF",
    description: "Public Provident Fund projection with annual compounding and the deposit ceiling called out.",
    category: "retirement",
    phase: 2,
    keywords: ["ppf", "public provident fund"],
    questions: ["how much will my ppf mature to"],
    fields: [
      money("deposit", "Deposit each financial year", 150000, { max: 10000000 }),
      percent("rate", "Annual rate", 7.1, { min: 0, max: 12, help: "7.1% is the small-savings rate notified for 1 October 2026 to 31 December 2026. It can change next quarter." }),
      integer("years", "Years", 15, { min: 1, max: 50 }),
      select("timing", "Deposit timing within the year", "start", [
        { value: "start", label: "Start of the year" },
        { value: "end", label: "End of the year" },
      ]),
    ],
    calculate: (values) => {
      const result = ppfMaturity({
        annualDeposit: readNumber(values, "deposit"),
        annualRate: readNumber(values, "rate"),
        years: readNumber(values, "years"),
        timing: readString(values, "timing") === "end" ? "end" : "start",
      });
      return {
        headline: `Projected maturity is ${formatINR(result.maturity, 0)}`,
        detail: `Deposits ${formatINR(result.invested, 0)}. Interest ${formatINR(result.interest, 0)}.`,
        metrics: [
          { label: "Maturity", value: formatINR(result.maturity) },
          { label: "Deposited", value: formatINR(result.invested) },
          { label: "Interest", value: formatINR(result.interest) },
        ],
        series: [{ id: "ppf", label: "Balance", points: result.points.map((point) => ({ x: `Year ${point.year}`, y: point.value })) }],
        notes: ["Interest compounds once a year in this model."],
        warnings: [
          ...(result.aboveCeiling ? [`The current scheme ceiling used here is ${formatINR(PPF_ANNUAL_DEPOSIT_CEILING, 0)} a year. A larger deposit is projected but may not be accepted.`] : []),
          "The scheme credits interest using the lowest balance between the 5th and the last day of the month. One annual deposit does not reproduce that.",
        ],
      };
    },
    formula: "Start-of-year: (balance + deposit) × (1 + rate). End-of-year: balance × (1 + rate) + deposit.",
    methodology: ["The 15-year account can be extended. This tool simply projects the number of years you enter."],
    assumptions: ["One deposit a year and a constant rate. The live rate is quarterly."],
    limitations: limits,
    related: ["epf", "nps", "retirement-corpus"],
    articles: ["epf-and-retirement"],
  },
  {
    slug: "epf",
    title: "EPF corpus calculator",
    shortTitle: "EPF",
    description: "Employees' Provident Fund balance from monthly contributions and annual interest on monthly balances.",
    category: "retirement",
    phase: 2,
    keywords: ["epf", "provident fund", "pf corpus"],
    questions: ["how much epf will i have"],
    fields: [
      money("basic", "Monthly basic pay", 40000, { min: 1 }),
      percent("employee", "Employee contribution rate", 12, { min: 0, max: 100 }),
      percent("employer", "Employer contribution rate", 12, { min: 0, max: 100 }),
      percent("interest", "Annual EPF interest rate", 8.25, { min: 0, max: 12, help: "8.25% is the rate notified for FY 2025-26. The FY 2026-27 rate was not found in sources reviewed on 16 October 2026." }),
      integer("years", "Years", 20, { min: 1, max: 45 }),
      percent("growth", "Annual basic-pay growth", 5, { min: 0, max: 20 }),
      booleanField("ceiling", "Restrict EPF contributions to the wage ceiling", false),
      money("opening", "Opening EPF balance", 0),
    ],
    calculate: (values) => {
      const result = epfCorpus({
        monthlyBasic: readNumber(values, "basic"),
        employeeRate: readNumber(values, "employee"),
        employerRate: readNumber(values, "employer"),
        epsRate: 0.0833,
        wageCeiling: EPF_EPS_WAGE_CEILING,
        restrictToCeiling: readBoolean(values, "ceiling"),
        annualInterestRate: readNumber(values, "interest"),
        years: readNumber(values, "years"),
        annualSalaryGrowth: readNumber(values, "growth"),
        openingBalance: readNumber(values, "opening"),
      });
      return {
        headline: `Projected EPF balance is ${formatINR(result.epfBalance, 0)}`,
        detail: `This month, employee ${formatINR(result.monthlyEmployee, 0)}, employer to EPF ${formatINR(result.monthlyEmployerEpf, 0)}, EPS ${formatINR(result.monthlyEps, 0)}.`,
        metrics: [
          { label: "EPF balance", value: formatINR(result.epfBalance) },
          { label: "Employee contributions", value: formatINR(result.employeeContribution) },
          { label: "Employer EPF contributions", value: formatINR(result.employerEpfContribution) },
          { label: "Interest", value: formatINR(result.interest) },
          { label: "EPS contributions, not in the EPF balance", value: formatINR(result.epsContribution) },
        ],
        series: [{ id: "epf", label: "EPF balance", points: result.points.map((point) => ({ x: `Year ${point.year}`, y: point.value })) }],
        notes: [`Interest uses the monthly running balance. The default rate ${formatPercent(EPF_LAST_NOTIFIED_RATE_FY2025_26)} is the FY 2025-26 notified rate, labelled as such.`],
        warnings: [`EPS is calculated at 8.33% of basic pay, capped at a wage ceiling of ${formatINR(EPF_EPS_WAGE_CEILING, 0)}. Confirm the ceiling before using this for payroll.`],
      };
    },
    formula: "Each month's closing balance earns annual rate / 12. The year's interest is added at the end of the year.",
    methodology: ["Employee contribution goes to EPF. Employer contribution is split between EPS and EPF. EPS is capped even when EPF uses full basic pay."],
    assumptions: ["Contributions happen every month and the interest rate stays at the number you entered."],
    limitations: [...limits, "Withdrawals, transfers, and voluntary provident fund above 12% need their own entries."],
    related: ["eps-pension", "ppf", "nps", "salary-structure"],
    articles: ["epf-and-retirement"],
  },
  {
    slug: "eps-pension",
    title: "EPS pension estimate",
    shortTitle: "EPS pension",
    description: "A pension estimate under the EPS formula: pensionable salary times years of service, divided by 70.",
    category: "retirement",
    phase: 2,
    keywords: ["eps", "pension", "employee pension scheme"],
    questions: ["how much eps pension will i get"],
    fields: [
      money("wage", "Average monthly pensionable wage", 15000, { min: 1, max: 15000, help: "Capped at the ₹15,000 wage ceiling used in this rule set." }),
      integer("years", "Years of pensionable service", 20, { min: 0, max: 45 }),
    ],
    calculate: (values) => {
      const years = readNumber(values, "years");
      const wage = readNumber(values, "wage");
      const pension = epsPension(Array.from({ length: 60 }, () => wage), years);
      return {
        headline: years < 10 ? "Fewer than 10 years may not qualify for a monthly EPS pension" : `Estimated pension is ${formatINR(pension, 0)} a month`,
        detail: "Pensionable salary here is the wage you entered, already capped.",
        metrics: [
          { label: "Monthly pension", value: formatINR(pension) },
          { label: "Annual pension", value: formatINR(pension * 12) },
        ],
        notes: ["The formula used is pensionable salary × pensionable service / 70."],
        warnings: [
          "Service under 10 years is generally eligible for a withdrawal benefit rather than a monthly pension. This estimate still shows the formula.",
          "Higher-wage pension options and the ₹1,000 minimum pension are not modelled.",
        ],
      };
    },
    formula: "Monthly pension = pensionable salary × years of service / 70.",
    methodology: ["Pensionable salary is capped at the wage ceiling. The last 60 months matter in the full scheme; here you enter the average directly."],
    assumptions: ["The wage you enter is already the pensionable average."],
    limitations: limits,
    related: ["epf", "nps", "retirement-corpus"],
    articles: ["epf-and-retirement"],
  },
  {
    slug: "nps",
    title: "NPS accumulation and annuity estimator",
    shortTitle: "NPS",
    description: "Project a National Pension System corpus, then split it between a lump sum and an assumed annuity.",
    category: "retirement",
    phase: 2,
    keywords: ["nps", "national pension system", "annuity"],
    questions: ["how much pension will my nps give"],
    fields: [
      money("employee", "Your monthly contribution", 5000),
      money("employer", "Employer monthly contribution", 5000),
      money("voluntary", "Extra monthly contribution", 0),
      percent("rate", "Assumed annual return before exit", 9, { min: -20, max: 20 }),
      integer("years", "Years until exit", 25, { min: 1, max: 45 }),
      percent("annuityShare", "Share used to buy an annuity", 40, { min: 0, max: 100, help: "40% is the general minimum. Some small-corpus exits differ. Edit this." }),
      percent("annuityRate", "Assumed annuity rate", 6, { min: 0, max: 15, help: "This is not a quote from an annuity provider." }),
      select("timing", "Contribution timing", "start", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const result = npsProjection({
        monthlyEmployee: readNumber(values, "employee"),
        monthlyEmployer: readNumber(values, "employer"),
        monthlyVoluntary: readNumber(values, "voluntary"),
        annualReturn: readNumber(values, "rate"),
        years: readNumber(values, "years"),
        annuityShare: readNumber(values, "annuityShare"),
        annuityRate: readNumber(values, "annuityRate"),
        timing: asTiming(readString(values, "timing")),
      });
      return {
        headline: `Projected corpus is ${formatINR(result.corpus, 0)}`,
        detail: `Assumed annual pension from the annuity is ${formatINR(result.annualPension, 0)}.`,
        metrics: [
          { label: "Corpus", value: formatINR(result.corpus) },
          { label: "Contributed", value: formatINR(result.invested) },
          { label: "Annuity corpus", value: formatINR(result.annuityCorpus) },
          { label: "Lump sum", value: formatINR(result.lumpSum) },
          { label: "Assumed annual pension", value: formatINR(result.annualPension) },
        ],
        series: [{ id: "nps", label: "Corpus", points: result.points.map((point) => ({ x: `Year ${point.year}`, y: point.value })) }],
        notes: [ASSUMPTION_RETURN, "The pension is annuity corpus times the annuity rate you entered. Providers quote rates at retirement, not today."],
        warnings: ["Tax on the lump sum and the annuity depends on the rules at exit. This projection does not compute that tax."],
      };
    },
    formula: "Monthly contributions grow at the monthly rate from the effective annual assumption. Pension = corpus × annuity share × annuity rate.",
    methodology: ["The corpus split is a planning choice. The 40% figure is a labelled general minimum, not a personalised exit ruling."],
    assumptions: ["Contributions and the return stay on the path you entered."],
    limitations: limits,
    related: ["epf", "retirement-corpus", "swp"],
    articles: ["epf-and-retirement", "swp-and-withdrawal-risk"],
  },
  {
    slug: "swp",
    title: "SWP withdrawal calculator",
    shortTitle: "SWP",
    description: "How long a corpus lasts if you withdraw a fixed or inflating amount.",
    category: "retirement",
    phase: 2,
    keywords: ["swp", "systematic withdrawal", "withdrawal plan"],
    questions: ["how long will my corpus last"],
    fields: [
      money("corpus", "Starting corpus", 5000000, { min: 1 }),
      money("withdrawal", "Withdrawal each month", 30000, { min: 1 }),
      percent("rate", "Assumed annual return", 7, { min: -30, max: 20 }),
      percent("inflation", "Annual increase in the withdrawal", 0, { min: 0, max: 15 }),
      integer("months", "Months to test", 240, { min: 1, max: 600 }),
      select("timing", "Withdrawal timing", "start", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const result = systematicWithdrawal({
        corpus: readNumber(values, "corpus"),
        withdrawal: readNumber(values, "withdrawal"),
        annualReturn: readNumber(values, "rate"),
        annualInflation: readNumber(values, "inflation"),
        months: readNumber(values, "months"),
        timing: asTiming(readString(values, "timing")),
      });
      return {
        headline: result.depleted
          ? `The corpus runs out in ${result.monthsLasted} months under this return`
          : `After ${result.monthsLasted} months, ${formatINR(result.endingCorpus, 0)} is still left`,
        detail: `Total withdrawn: ${formatINR(result.totalWithdrawn, 0)}.`,
        metrics: [
          { label: "Months lasted", value: String(result.monthsLasted) },
          { label: "Total withdrawn", value: formatINR(result.totalWithdrawn) },
          { label: "Ending corpus", value: formatINR(result.endingCorpus) },
        ],
        series: [{ id: "swp", label: "Corpus", points: result.points.filter((_, index, all) => index % Math.ceil(all.length / 24) === 0 || index === all.length - 1).map((point) => ({ x: `M${point.month}`, y: point.value })) }],
        notes: ["A constant return hides sequence risk. Bad years early in a withdrawal can exhaust a corpus that survives on the average."],
        warnings: ["This does not promise that a mutual fund or portfolio will earn the return you entered."],
      };
    },
    formula: "Each month the corpus earns the monthly effective return and pays the withdrawal, at the start or end of the month.",
    methodology: ["The withdrawal can rise once a year by the inflation rate you enter. Use 0 for a flat SWP."],
    assumptions: ["No taxes, exit loads, or extra contributions."],
    limitations: limits,
    related: ["safe-withdrawal", "fire", "retirement-sustainability"],
    articles: ["swp-and-withdrawal-risk"],
  },
  {
    slug: "xirr",
    title: "XIRR calculator",
    shortTitle: "XIRR",
    description: "Annualised return for irregular cash flows, using actual days and a 365-day year.",
    category: "investing",
    phase: 2,
    keywords: ["xirr", "irregular cash flow", "mutual fund return"],
    questions: ["what is my xirr"],
    fields: [
      rows(
        "flows",
        "Cash flows",
        [
          { key: "date", label: "Date", kind: "date", defaultValue: "2024-01-01" },
          { key: "amount", label: "Amount (negative when you pay in)", kind: "number", min: -1000000000, max: 1000000000, defaultValue: 0 },
        ],
        [
          { date: "2024-01-01", amount: -100000 },
          { date: "2024-07-01", amount: -50000 },
          { date: "2026-01-01", amount: 180000 },
        ],
        { minRows: 2, maxRows: 40, help: "Use a negative amount for money you invest and a positive amount for money you receive, including the final value." },
      ),
    ],
    calculate: (values) => {
      const flows = readRows(values, "flows").map((row) => ({
        date: String(row.date),
        amount: Number(row.amount),
      }));
      const result = xirr(flows);
      if (result.status === "no-root") {
        return { headline: "No rate sets the present value to zero", metrics: [], notes: ["Try another set of dates and amounts."], warnings: ["Newton-Raphson did not find a root from the starting guesses."] };
      }
      if (result.status === "multiple") {
        return {
          headline: "More than one rate fits these cash flows",
          metrics: result.candidates.map((rate, index) => ({ label: `Possible rate ${index + 1}`, value: formatPercent(rate) })),
          notes: ["When several roots exist, none is reported as the single XIRR."],
          warnings: ["Add or remove a cash flow only if it really happened. Do not edit the data just to force one root."],
        };
      }
      return {
        headline: `XIRR is ${formatPercent(result.rate ?? 0)}`,
        detail: "The rate uses actual days divided by 365.",
        metrics: [{ label: "XIRR", value: formatPercent(result.rate ?? 0, 2) }],
        notes: ["A contribution is negative. A redemption or an ending value is positive."],
        warnings: [],
      };
    },
    formula: "Find r where the sum of cash flow / (1 + r) ^ (days / 365) is zero.",
    methodology: ["The solver starts from several guesses. Distinct roots are all kept."],
    assumptions: ["Dates are correct and the final value is included as a cash flow."],
    limitations: [...limits, "XIRR can fail or have multiple answers. Both outcomes are shown."],
    related: ["cagr", "absolute-return", "total-return"],
    articles: ["cagr-versus-xirr"],
  },
  {
    slug: "dividend-yield",
    title: "Dividend yield calculator",
    shortTitle: "Dividend yield",
    description: "Annual dividend divided by the current price, and by your cost if you enter one.",
    category: "investing",
    phase: 2,
    keywords: ["dividend yield", "yield on cost"],
    questions: ["what is the dividend yield"],
    fields: [
      money("dividend", "Expected annual dividend per share or unit", 20, { min: 0 }),
      money("price", "Current price", 500, { min: 1 }),
      money("cost", "Your cost, optional", 0, { help: "Leave 0 to skip yield on cost." }),
    ],
    calculate: (values) => {
      const dividend = readNumber(values, "dividend");
      const price = readNumber(values, "price");
      const cost = readNumber(values, "cost");
      const yieldNow = dividendYield(dividend, price);
      return {
        headline: `Dividend yield is ${formatPercent(yieldNow)}`,
        detail: cost > 0 ? `Yield on your cost is ${formatPercent(dividendYield(dividend, cost))}.` : "Enter a cost above zero to see yield on cost.",
        metrics: [
          { label: "Yield at the current price", value: formatPercent(yieldNow) },
          ...(cost > 0 ? [{ label: "Yield on cost", value: formatPercent(dividend / cost) }] : []),
        ],
        notes: ["Dividend yield is not total return. Price changes are excluded."],
        warnings: ["A dividend can be cut. The annual amount is whatever you entered."],
      };
    },
    formula: "Yield = annual dividend / price.",
    methodology: ["Use the same unit for the dividend and the price, such as one share or one fund unit."],
    assumptions: ["The annual dividend is the figure you expect, not a company forecast stored by Hisab."],
    limitations: limits,
    related: ["total-return", "real-return"],
    articles: ["risk-and-diversification"],
  },
  {
    slug: "total-return",
    title: "Total investment return calculator",
    shortTitle: "Total return",
    description: "Gain from the ending value plus income received, over the amount you invested.",
    category: "investing",
    phase: 2,
    keywords: ["total return", "holding period return"],
    questions: ["what is my total investment return"],
    fields: [
      money("invested", "Amount invested", 100000, { min: 1 }),
      money("ending", "Ending value", 130000),
      money("income", "Dividends or interest received", 5000),
      integer("years", "Years, for CAGR", 3, { min: 1, max: 60 }),
    ],
    calculate: (values) => {
      const result = totalReturn({
        amountInvested: readNumber(values, "invested"),
        endingValue: readNumber(values, "ending"),
        incomeReceived: readNumber(values, "income"),
        years: readNumber(values, "years"),
      });
      return {
        headline: `Total gain is ${formatINR(result.gain, 0)}, or ${formatPercent(result.absolute)}`,
        detail: `CAGR on the invested amount plus the gain is ${formatPercent(result.cagr ?? 0)}.`,
        metrics: [
          { label: "Gain including income", value: formatINR(result.gain) },
          { label: "Absolute return", value: formatPercent(result.absolute) },
          { label: "CAGR", value: formatPercent(result.cagr ?? 0) },
        ],
        notes: ["Income is treated as part of the ending wealth for the CAGR. The path of that income is not dated."],
        warnings: ["Use XIRR if you added or withdrew money on several dates."],
      };
    },
    formula: "Gain = ending value − invested + income. CAGR uses invested and invested + gain over the years entered.",
    methodology: ["This is a holding-period summary, not a cash-flow solver."],
    assumptions: ["The ending value is what you could realise, before tax and costs unless you already deducted them."],
    limitations: limits,
    related: ["xirr", "cagr", "dividend-yield"],
    articles: ["cagr-versus-xirr"],
  },
  {
    slug: "real-return",
    title: "Real return after inflation and tax",
    shortTitle: "Real return",
    description: "An annual nominal return, reduced by a tax rate on the gain, then by inflation.",
    category: "investing",
    phase: 2,
    keywords: ["real return", "after tax", "after inflation"],
    questions: ["what is my return after inflation and tax"],
    fields: [
      percent("nominal", "Nominal annual return", 8, { min: -50, max: 40 }),
      percent("inflation", "Inflation", 5, { min: 0, max: 20 }),
      percent("tax", "Tax rate on the annual gain", 30, { min: 0, max: 50 }),
    ],
    calculate: (values) => {
      const nominal = readNumber(values, "nominal");
      const tax = readNumber(values, "tax");
      const inflation = readNumber(values, "inflation");
      const afterTax = nominal * (1 - tax);
      const real = realReturnAfterAnnualTax(nominal, inflation, tax);
      return {
        headline: `Real return after tax is ${formatPercent(real)}`,
        detail: `The after-tax nominal return is ${formatPercent(afterTax)}.`,
        metrics: [
          { label: "After-tax nominal return", value: formatPercent(afterTax) },
          { label: "Real return after tax", value: formatPercent(real) },
        ],
        notes: ["Tax is applied to the whole annual gain, as if it were realised and taxed every year. That fits interest better than unsold equity."],
        warnings: ["Do not use this as the tax on a single capital gain. Use the capital-gains estimator for that."],
      };
    },
    formula: "After tax = nominal × (1 − tax). Real = (1 + after tax) / (1 + inflation) − 1.",
    methodology: ["All three inputs are rates you choose. Nothing is looked up."],
    assumptions: ["The gain is taxed each year at one rate."],
    limitations: limits,
    related: ["inflation", "tax-adjusted-fixed-income", "capital-gains"],
    articles: ["inflation-adjusted-returns"],
  },
  {
    slug: "retirement-corpus",
    title: "Retirement corpus calculator",
    shortTitle: "Retirement corpus",
    description: "Corpus for spending that starts at an inflated expense and keeps rising.",
    category: "retirement",
    phase: 2,
    keywords: ["retirement corpus", "retirement planning"],
    questions: ["how much money will i need to retire"],
    fields: [
      money("expense", "Annual spending today", 600000, { min: 1 }),
      integer("wait", "Years until retirement", 20, { min: 0, max: 50 }),
      integer("retire", "Years in retirement", 30, { min: 1, max: 50 }),
      percent("inflation", "Inflation", 5, { min: 0, max: 12 }),
      percent("before", "Assumed return before retirement", 9, { min: -10, max: 20 }),
      percent("after", "Assumed return during retirement", 6, { min: -10, max: 15 }),
      money("current", "Savings already invested for this", 500000),
      select("timing", "Future SIP timing", "end", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const result = retirementCorpus({
        annualExpenseToday: readNumber(values, "expense"),
        yearsToRetirement: readNumber(values, "wait"),
        yearsInRetirement: readNumber(values, "retire"),
        inflation: readNumber(values, "inflation"),
        preRetirementReturn: readNumber(values, "before"),
        postRetirementReturn: readNumber(values, "after"),
        currentCorpus: readNumber(values, "current"),
        timing: asTiming(readString(values, "timing")),
      });
      return {
        headline: result.gap <= 0
          ? "Current savings project above the corpus this scenario needs"
          : `This scenario needs about ${formatINR(result.requiredMonthly, 0)} a month`,
        detail: `Spending at retirement is ${formatINR(result.expenseAtRetirement, 0)} a year. Corpus needed is ${formatINR(result.corpusNeeded, 0)}.`,
        metrics: [
          { label: "Corpus needed", value: formatINR(result.corpusNeeded, 0) },
          { label: "Projected current savings", value: formatINR(result.projectedCurrentCorpus, 0) },
          { label: "Gap", value: formatINR(Math.max(0, result.gap), 0) },
          { label: "Monthly investment for the gap", value: formatINR(result.requiredMonthly, 0) },
        ],
        notes: ["Withdrawals happen at the start of each retirement year and then rise with inflation."],
        warnings: ["One return path is not a survival guarantee. See the sustainability scenarios before treating the corpus as enough."],
      };
    },
    formula: "Binary search for the corpus that pays a growing withdrawal for the retirement years you entered.",
    methodology: ["Pre-retirement savings grow at one rate. Retirement withdrawals face a second rate. Both are assumptions."],
    assumptions: ["Spending really does track the inflation number, and no large one-off costs appear."],
    limitations: limits,
    related: ["fire", "swp", "safe-withdrawal", "nps"],
    articles: ["swp-and-withdrawal-risk", "epf-and-retirement"],
  },
  {
    slug: "fire",
    title: "FIRE number and financial independence",
    shortTitle: "FIRE number",
    description: "Corpus equals annual expenses divided by a withdrawal rate you choose, plus years to reach a moving target.",
    category: "retirement",
    phase: 2,
    keywords: ["fire", "financial independence", "retire early"],
    questions: ["what is my fire number"],
    fields: [
      money("expenses", "Annual expenses today", 900000, { min: 1 }),
      percent("swr", "Withdrawal rate for your scenario", 3.5, { min: 1, max: 10, help: "3%, 3.5%, and 4% are also shown as scenarios. None of them is a recommendation." }),
      money("portfolio", "Current invested portfolio", 2000000),
      money("savings", "Annual savings", 600000),
      percent("rate", "Assumed annual return", 8, { min: -10, max: 20 }),
      percent("inflation", "Inflation of expenses", 5, { min: 0, max: 12 }),
      percent("savingsGrowth", "Growth in annual savings", 0, { min: -10, max: 20 }),
    ],
    calculate: (values) => {
      const result = fireEstimate({
        annualExpenses: readNumber(values, "expenses"),
        safeWithdrawalRate: readNumber(values, "swr"),
        portfolio: readNumber(values, "portfolio"),
        annualSavings: readNumber(values, "savings"),
        annualReturn: readNumber(values, "rate"),
        inflation: readNumber(values, "inflation"),
        savingsGrowth: readNumber(values, "savingsGrowth"),
      });
      return {
        headline: result.reachable
          ? `At your withdrawal rate, the moving target is reached in ${result.years} years`
          : "The target is not reached within 80 years under these assumptions",
        detail: `Today's expenses divided by your rate is ${formatINR(result.fireNumberToday, 0)}. That number rises with inflation in the year count.`,
        metrics: [
          { label: "FIRE number on today's expenses", value: formatINR(result.fireNumberToday, 0) },
          { label: "Progress against today's number", value: formatPercent(result.progress) },
          { label: "Years in this scenario", value: result.years === null ? "Not within 80" : String(result.years) },
        ],
        tables: [{
          caption: "Same expenses at other withdrawal rates",
          columns: ["Withdrawal rate", "Corpus on today's expenses"],
          rows: result.scenarios.map((scenario) => [formatPercent(scenario.withdrawalRate), formatINR(scenario.corpus, 0)]),
        }],
        notes: ["A lower withdrawal rate asks for a larger corpus. It is a scenario, not a rule that makes you safe."],
        warnings: [ASSUMPTION_RETURN],
      };
    },
    formula: "FIRE number = annual expenses / withdrawal rate.",
    methodology: ["The year count inflates expenses and grows the portfolio and savings. The target is expenses that year divided by your rate."],
    assumptions: ["Savings continue and the return is constant."],
    limitations: limits,
    related: ["fi-progress", "safe-withdrawal", "retirement-corpus"],
    articles: ["swp-and-withdrawal-risk"],
  },
  {
    slug: "safe-withdrawal",
    title: "Safe withdrawal rate scenarios",
    shortTitle: "Withdrawal scenarios",
    description: "Test several withdrawal rates and returns against one corpus and one retirement length.",
    category: "retirement",
    phase: 2,
    keywords: ["safe withdrawal rate", "swr", "4 percent"],
    questions: ["will a 4 percent withdrawal last"],
    fields: [
      money("corpus", "Corpus at retirement", 20000000, { min: 1 }),
      money("spending", "First-year spending", 700000, { min: 1 }),
      percent("inflation", "Inflation of spending", 5, { min: 0, max: 12 }),
      integer("years", "Years to test", 30, { min: 1, max: 50 }),
      percent("low", "Low return scenario", 2, { min: -10, max: 15 }),
      percent("mid", "Middle return scenario", 6, { min: -10, max: 15 }),
      percent("high", "High return scenario", 9, { min: -10, max: 15 }),
    ],
    calculate: (values) => {
      const spending = readNumber(values, "spending");
      const corpus = readNumber(values, "corpus");
      const result = sustainability({
        corpus,
        annualSpending: spending,
        inflation: readNumber(values, "inflation"),
        years: readNumber(values, "years"),
        returns: [readNumber(values, "low"), readNumber(values, "mid"), readNumber(values, "high")],
      });
      return {
        headline: `The first-year withdrawal is ${formatPercent(spending / corpus)} of the corpus`,
        detail: "Each row is a constant return. A real sequence of returns can fail even when the average survives.",
        metrics: result.rows.map((row) => ({
          label: `${formatPercent(row.annualReturn)} return`,
          value: row.lasted ? `Lasts, ${formatINR(row.ending, 0)} left` : `Stops after ${row.yearsLasted} years`,
        })),
        notes: ["Spending rises with inflation. The withdrawal happens at the start of the year."],
        warnings: ["Do not read a surviving row as a safe rate for your life. It survived one assumed return."],
      };
    },
    formula: "Each year: corpus minus spending, then growth, then spending rises with inflation.",
    methodology: ["Three returns are shown so the answer is a range of scenarios."],
    assumptions: ["No fees, tax, or new contributions after retirement."],
    limitations: limits,
    related: ["swp", "fire", "retirement-sustainability"],
    articles: ["swp-and-withdrawal-risk"],
  },
];

function bondFields(withYield: boolean) {
  return [
    money("face", "Face value", 1000, { min: 1 }),
    percent("coupon", "Annual coupon rate", 8, { min: 0, max: 20 }),
    withYield
      ? percent("yield", "Nominal annual yield", 8, { min: 0, max: 25 })
      : money("price", "Clean price", 1000, { min: 1 }),
    integer("periods", "Coupon periods remaining", 10, { min: 1, max: 120 }),
    select("frequency", "Coupon frequency", "2", FREQUENCY),
  ];
}

function bondInput(values: Parameters<Calculator["calculate"]>[0]) {
  const frequency = Number(readString(values, "frequency"));
  if (frequency !== 1 && frequency !== 2 && frequency !== 4 && frequency !== 12) {
    throw new Error("Choose a coupon frequency.");
  }
  return {
    faceValue: readNumber(values, "face"),
    annualCouponRate: readNumber(values, "coupon"),
    periods: readNumber(values, "periods"),
    frequency: frequency as 1 | 2 | 4 | 12,
  };
}

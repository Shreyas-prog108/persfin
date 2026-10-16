import {
  allocation,
  benchmarkGap,
  blendedAllocation,
  drawdownScenario,
  expenseRatioImpact,
  fireEstimate,
  futureValueLumpSum,
  monthlyAnnuity,
  opportunityCost,
  prioritizeGoals,
  projectNetWorth,
  rebalanceWithCash,
  salaryPath,
  sustainability,
} from "@/lib/finance";
import { formatINR, formatPercent } from "@/lib/finance/money";
import { integer, money, percent, rows, select, TIMING_OPTIONS } from "./fields";
import { readNumber, readRows, readString } from "./parse";
import { ASSUMPTION_RETURN, NOT_ADVICE, asTiming } from "./present";
import type { Calculator, ParsedValues } from "./types";

const limits = [NOT_ADVICE, "No benchmark, gold price, or fund return is fetched. Every rate on this page is one you enter."];

export const phase4: Calculator[] = [
  {
    slug: "expense-ratio",
    title: "Expense-ratio impact calculator",
    shortTitle: "Expense ratio",
    description: "The same gross return after two expense ratios, for a lump sum and a SIP.",
    category: "investing",
    phase: 4,
    keywords: ["expense ratio", "ter", "mutual fund cost"],
    questions: ["how much does the expense ratio cost"],
    fields: [
      percent("gross", "Assumed return before expenses", 10, { min: -20, max: 30 }),
      percent("low", "Lower expense ratio", 0.5, { min: 0, max: 5 }),
      percent("high", "Higher expense ratio", 1.5, { min: 0, max: 5 }),
      integer("years", "Years", 20, { min: 1, max: 40 }),
      money("lump", "Lump sum", 100000),
      money("sip", "Monthly SIP", 5000),
      select("timing", "SIP timing", "start", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const result = expenseRatioImpact({
        annualGrossReturn: readNumber(values, "gross"),
        expenseRatio: readNumber(values, "low"),
        comparisonExpenseRatio: readNumber(values, "high"),
        years: readNumber(values, "years"),
        lumpSum: readNumber(values, "lump"),
        monthlySip: readNumber(values, "sip"),
        timing: asTiming(readString(values, "timing")),
      });
      return {
        headline: `The higher expense ratio leaves ${formatINR(result.lumpSum - result.comparisonLumpSum, 0)} less on the lump sum`,
        detail: `Net returns are ${formatPercent(result.netReturn)} and ${formatPercent(result.comparisonNetReturn)}.`,
        metrics: [
          { label: "Lump sum at the lower cost", value: formatINR(result.lumpSum, 0) },
          { label: "Lump sum at the higher cost", value: formatINR(result.comparisonLumpSum, 0) },
          { label: "SIP at the lower cost", value: formatINR(result.sip, 0) },
          { label: "SIP at the higher cost", value: formatINR(result.comparisonSip, 0) },
        ],
        notes: ["Net return = (1 + gross return) × (1 − expense ratio) − 1. Actual NAVs charge expenses daily."],
        warnings: ["A lower expense ratio does not make a fund suitable. It only shows the cost of the drag you entered."],
      };
    },
    formula: "Net annual return = (1 + gross) × (1 − expense ratio) − 1.",
    methodology: ["The gross return is an assumption. The expense ratios are the ones you type from a fund document."],
    assumptions: ["The expense ratio stays constant and is charged once a year in this model."],
    limitations: limits,
    related: ["sip", "benchmark-comparison"],
    articles: ["expense-ratios"],
  },
  {
    slug: "benchmark-comparison",
    title: "Investment versus benchmark",
    shortTitle: "Benchmark",
    description: "Your return beside a benchmark return you enter. Hisab does not supply index levels.",
    category: "compare",
    phase: 4,
    comparison: true,
    keywords: ["benchmark", "alpha", "index comparison"],
    questions: ["did i beat the benchmark"],
    fields: [
      money("invested", "Amount invested", 100000, { min: 1 }),
      percent("portfolio", "Your annual return", 11, { min: -50, max: 40 }),
      percent("benchmark", "Benchmark annual return", 12, { min: -50, max: 40 }),
      integer("years", "Years", 5, { min: 1, max: 40 }),
    ],
    calculate: (values) => {
      const result = benchmarkGap({
        invested: readNumber(values, "invested"),
        portfolioReturn: readNumber(values, "portfolio"),
        benchmarkReturn: readNumber(values, "benchmark"),
        years: readNumber(values, "years"),
      });
      return {
        headline: `The gap is ${formatINR(result.gap, 0)}`,
        detail: "A positive gap means your entered return ended higher than the benchmark return you entered.",
        metrics: [
          { label: "Your value", value: formatINR(result.portfolioValue, 0) },
          { label: "Benchmark value", value: formatINR(result.benchmarkValue, 0) },
          { label: "Gap", value: formatINR(result.gap, 0) },
        ],
        notes: ["Enter both returns yourself. A past index return is not stored here."],
        warnings: ["Beating a benchmark is not the same as meeting a financial goal."],
      };
    },
    formula: "Each value = invested × (1 + annual return) ^ years.",
    methodology: ["Both paths compound annually at a constant rate."],
    assumptions: ["The returns are comparable. A fund return after costs should be compared with a benchmark you consider fair."],
    limitations: limits,
    related: ["expense-ratio", "cagr", "total-return"],
    articles: ["expense-ratios", "risk-and-diversification"],
  },
  {
    slug: "portfolio-allocation",
    title: "Portfolio allocation planner",
    shortTitle: "Allocation",
    description: "Current weights against target weights, and the trade that would close the gap.",
    category: "portfolio",
    phase: 4,
    keywords: ["asset allocation", "target weight"],
    questions: ["how should i allocate my portfolio"],
    fields: [holdingRows()],
    calculate: (values) => allocationResult(values),
    formula: "Trade = target weight × total − current value.",
    methodology: ["Weights must add to 100%. A positive trade is a buy. A negative trade is a sell."],
    assumptions: ["You can trade without tax or cost. Those costs are not deducted."],
    limitations: limits,
    related: ["portfolio-rebalance", "asset-allocation"],
    articles: ["risk-and-diversification"],
  },
  {
    slug: "portfolio-rebalance",
    title: "Portfolio rebalancing calculator",
    shortTitle: "Rebalance",
    description: "Use new cash to move holdings toward target weights without calculating a sale first.",
    category: "portfolio",
    phase: 4,
    keywords: ["rebalance", "rebalancing"],
    questions: ["how do i rebalance my portfolio"],
    fields: [holdingRows(), money("cash", "New cash to invest", 50000)],
    calculate: (values) => {
      const holdings = toHoldings(values);
      const plan = rebalanceWithCash(holdings, readNumber(values, "cash"));
      return {
        headline: `New cash is directed at the underweight holdings`,
        detail: `Portfolio including the cash is ${formatINR(plan.total, 0)}.`,
        metrics: plan.buys.map((buy) => ({ label: `Buy ${buy.name}`, value: formatINR(buy.amount, 0) })),
        notes: ["Buys are scaled if the underweight gap is larger than the cash. Nothing is sold."],
        warnings: ["Tax on a sale is avoided here because no sale is proposed. A full rebalance can still be cheaper or more expensive once tax is counted."],
      };
    },
    formula: "Buy the gap to the target weight of the enlarged portfolio, then scale the buys to the cash available.",
    methodology: ["This is the cash-only version of the allocation planner."],
    assumptions: ["Target weights still add to 100%."],
    limitations: limits,
    related: ["portfolio-allocation", "goal-priority"],
    articles: ["risk-and-diversification"],
  },
  {
    slug: "fi-progress",
    title: "Financial independence progress",
    shortTitle: "FI progress",
    description: "Portfolio divided by the FIRE number for the withdrawal rate you choose.",
    category: "retirement",
    phase: 4,
    keywords: ["fi progress", "financial independence progress"],
    questions: ["how close am i to financial independence"],
    fields: [
      money("expenses", "Annual expenses", 900000, { min: 1 }),
      percent("swr", "Withdrawal rate", 3.5, { min: 1, max: 10 }),
      money("portfolio", "Invested portfolio", 4500000),
      money("savings", "Annual savings", 500000),
      percent("rate", "Assumed return", 8, { min: -10, max: 20 }),
      percent("inflation", "Inflation", 5, { min: 0, max: 12 }),
    ],
    calculate: (values) => {
      const result = fireEstimate({
        annualExpenses: readNumber(values, "expenses"),
        safeWithdrawalRate: readNumber(values, "swr"),
        portfolio: readNumber(values, "portfolio"),
        annualSavings: readNumber(values, "savings"),
        annualReturn: readNumber(values, "rate"),
        inflation: readNumber(values, "inflation"),
        savingsGrowth: 0,
      });
      return {
        headline: `Progress against today's number is ${formatPercent(result.progress)}`,
        detail: result.reachable ? `The inflating target is reached in ${result.years} years in this scenario.` : "The inflating target is not reached within 80 years.",
        metrics: [
          { label: "Today's FIRE number", value: formatINR(result.fireNumberToday, 0) },
          { label: "Progress", value: formatPercent(result.progress) },
          { label: "Years", value: result.years === null ? "Not within 80" : String(result.years) },
        ],
        notes: ["Progress uses today's expenses. The year count lets expenses rise."],
        warnings: [ASSUMPTION_RETURN],
      };
    },
    formula: "Progress = portfolio / (annual expenses / withdrawal rate).",
    methodology: ["Same engine as the FIRE calculator, with savings growth set to zero."],
    assumptions: ["The withdrawal rate stays the one you picked."],
    limitations: limits,
    related: ["fire", "retirement-corpus", "multi-goal"],
    articles: ["swp-and-withdrawal-risk", "net-worth-and-goals"],
  },
  {
    slug: "opportunity-cost",
    title: "Investment start-date comparison",
    shortTitle: "Start date",
    description: "The same monthly investment started now, compared with one started later.",
    category: "compare",
    phase: 4,
    comparison: true,
    keywords: ["opportunity cost", "start investing later", "delay investing"],
    questions: ["what if i start investing later"],
    fields: [
      money("monthly", "Monthly amount", 10000, { min: 1 }),
      percent("rate", "Assumed annual return", 9, { min: -10, max: 20 }),
      integer("months", "Months of investing", 120, { min: 1, max: 480 }),
      integer("delay", "Delay before the later start", 12, { min: 1, max: 120 }),
      select("timing", "Timing", "start", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const result = opportunityCost({
        monthly: readNumber(values, "monthly"),
        annualReturn: readNumber(values, "rate"),
        months: readNumber(values, "months"),
        delayMonths: readNumber(values, "delay"),
        timing: asTiming(readString(values, "timing")),
      });
      return {
        headline: `Starting now is ahead by ${formatINR(result.gap, 0)} at the later finish`,
        detail: "The early investor stops contributing and then just compounds during the delay. The later investor contributes the same number of months.",
        metrics: [
          { label: "Start now, value at the later finish", value: formatINR(result.startNow, 0) },
          { label: "Start later", value: formatINR(result.startLater, 0) },
          { label: "Gap", value: formatINR(result.gap, 0) },
        ],
        notes: [ASSUMPTION_RETURN, "The gap is the cost of waiting only if that return actually happens."],
        warnings: ["Waiting can be sensible if the money is needed for a debt or an emergency fund."],
      };
    },
    formula: "Both are annuities of the same length. The early one compounds for the extra delay with no new contribution.",
    methodology: ["The comparison date is the end of the delayed plan."],
    assumptions: ["The same return applies to both, including the years the early investor is no longer contributing."],
    limitations: limits,
    related: ["sip", "step-up-sip", "goal-investment"],
    articles: ["sip-return-projections"],
  },
  {
    slug: "gold-fd-equity",
    title: "Gold, FD, and equity scenario",
    shortTitle: "Gold, FD, equity",
    description: "One amount grown at three assumed rates. You supply every rate.",
    category: "compare",
    phase: 4,
    comparison: true,
    keywords: ["gold vs fd", "equity vs fd", "gold vs equity"],
    questions: ["gold or fd or equity"],
    fields: [
      money("amount", "Amount", 100000, { min: 1 }),
      integer("years", "Years", 10, { min: 1, max: 40 }),
      percent("gold", "Assumed gold return", 7, { min: -20, max: 25 }),
      percent("fd", "FD annual rate", 7, { min: 0, max: 12 }),
      percent("equity", "Assumed equity return", 10, { min: -30, max: 25 }),
    ],
    calculate: (values) => {
      const amount = readNumber(values, "amount");
      const years = readNumber(values, "years");
      const gold = futureValueLumpSum(amount, readNumber(values, "gold"), years);
      const fd = futureValueLumpSum(amount, readNumber(values, "fd"), years);
      const equity = futureValueLumpSum(amount, readNumber(values, "equity"), years);
      return {
        headline: "Three assumed futures, not a ranking of the assets",
        detail: "Gold and equity can fall. An FD rate is contractual only for the deposit you actually book.",
        metrics: [
          { label: "Gold scenario", value: formatINR(gold, 0) },
          { label: "FD scenario", value: formatINR(fd, 0) },
          { label: "Equity scenario", value: formatINR(equity, 0) },
        ],
        notes: ["Tax is not applied. FD interest is usually taxable every year. Equity gains are taxed when realised, under different rules."],
        warnings: ["Do not read the highest bar as the best asset. The rates were typed, not observed."],
      };
    },
    formula: "Each future value = amount × (1 + assumed return) ^ years.",
    methodology: ["The FD path uses the rate as an effective annual rate. A cumulative FD's effective rate can be slightly higher than the nominal quote."],
    assumptions: ["Each asset gets the constant rate you entered."],
    limitations: limits,
    related: ["fd", "lump-sum", "asset-allocation"],
    articles: ["fd-returns-and-tax", "risk-and-diversification"],
  },
  {
    slug: "asset-allocation",
    title: "Long-term asset allocation scenario",
    shortTitle: "Allocation scenario",
    description: "A weighted return from asset weights and assumed returns, then a future value.",
    category: "portfolio",
    phase: 4,
    keywords: ["long term allocation", "blended return"],
    questions: ["what return does this allocation assume"],
    fields: [
      rows(
        "assets",
        "Assets",
        [
          { key: "name", label: "Asset", kind: "text", defaultValue: "Equity" },
          { key: "weight", label: "Weight percent", kind: "percent", min: 0, max: 100, defaultValue: 50 },
          { key: "rate", label: "Assumed return percent", kind: "percent", min: -30, max: 30, defaultValue: 10 },
        ],
        [
          { name: "Equity", weight: 60, rate: 10 },
          { name: "Debt", weight: 30, rate: 7 },
          { name: "Gold", weight: 10, rate: 6 },
        ],
        { minRows: 1, maxRows: 8 },
      ),
      money("amount", "Amount", 1000000),
      integer("years", "Years", 15, { min: 1, max: 40 }),
    ],
    calculate: (values) => {
      const result = blendedAllocation({
        assets: readRows(values, "assets").map((row) => ({
          name: String(row.name),
          weight: Number(row.weight),
          annualReturn: Number(row.rate),
        })),
        lumpSum: readNumber(values, "amount"),
        years: readNumber(values, "years"),
      });
      return {
        headline: `Weighted assumed return is ${formatPercent(result.blendedReturn)}`,
        detail: `On that constant blend, ${formatINR(readNumber(values, "amount"), 0)} becomes ${formatINR(result.futureValue, 0)}.`,
        metrics: [
          { label: "Blended return", value: formatPercent(result.blendedReturn) },
          { label: "Future value", value: formatINR(result.futureValue, 0) },
        ],
        notes: ["The blend is a weighted average. It ignores correlation and the chance that the assets do not earn those returns together."],
        warnings: [ASSUMPTION_RETURN],
      };
    },
    formula: "Blended return = sum of weight × assumed return.",
    methodology: ["Weights must add to 100%. The future value compounds the blend as one effective annual rate."],
    assumptions: ["The mix is rebalanced back to the weights, otherwise the blend drifts."],
    limitations: limits,
    related: ["portfolio-allocation", "gold-fd-equity", "drawdown"],
    articles: ["risk-and-diversification"],
  },
  {
    slug: "recurring-vs-lump-sum",
    title: "Recurring investment versus lump sum",
    shortTitle: "Recurring vs lump sum",
    description: "A monthly investment beside a lump sum of the same total rupees.",
    category: "compare",
    phase: 4,
    comparison: true,
    keywords: ["recurring vs lump sum", "same amount invested"],
    questions: ["what if i invest the same total as a lump sum"],
    fields: [
      money("monthly", "Monthly amount", 10000, { min: 1 }),
      integer("months", "Months", 36, { min: 1, max: 360 }),
      percent("rate", "Assumed annual return", 9, { min: -20, max: 25 }),
      select("timing", "Monthly timing", "start", TIMING_OPTIONS),
    ],
    calculate: (values) => {
      const monthly = readNumber(values, "monthly");
      const months = readNumber(values, "months");
      const rate = readNumber(values, "rate");
      const timing = asTiming(readString(values, "timing"));
      const recurring = monthlyAnnuity({ installment: monthly, annualRate: rate, months, timing, convention: "effective-annual" });
      const lump = futureValueLumpSum(recurring.totalInvested, rate, months / 12);
      return {
        headline: `The same ${formatINR(recurring.totalInvested, 0)} as a lump sum projects to ${formatINR(lump, 0)}`,
        detail: `The monthly path projects to ${formatINR(recurring.maturityValue, 0)}.`,
        metrics: [
          { label: "Total invested", value: formatINR(recurring.totalInvested, 0) },
          { label: "Monthly path", value: formatINR(recurring.maturityValue, 0) },
          { label: "Lump sum today", value: formatINR(lump, 0) },
          { label: "Gap", value: formatINR(lump - recurring.maturityValue, 0) },
        ],
        notes: ["The lump sum has to be available today. The monthly path does not."],
        warnings: [ASSUMPTION_RETURN],
      };
    },
    formula: "Lump sum equals the total of the monthly contributions, invested for the full period.",
    methodology: ["This keeps the rupees equal, unlike a comparison of unrelated SIP and lump-sum amounts."],
    assumptions: ["One constant return."],
    limitations: limits,
    related: ["sip-vs-lump-sum", "sip", "opportunity-cost"],
    articles: ["sip-return-projections"],
  },
  {
    slug: "hike-lifestyle",
    title: "Hike, inflation, and lifestyle growth",
    shortTitle: "Hike and lifestyle",
    description: "Whether a raise survives lifestyle growth, using the salary-path engine.",
    category: "planning",
    phase: 4,
    keywords: ["lifestyle inflation", "salary hike"],
    questions: ["will my hike actually raise my savings"],
    fields: [
      money("salary", "Annual salary", 1500000, { min: 1 }),
      money("expenses", "Annual expenses", 1000000),
      percent("hike", "Annual hike", 10, { min: 0, max: 30 }),
      percent("inflation", "General inflation", 5, { min: 0, max: 15 }),
      percent("lifestyle", "Lifestyle growth", 9, { min: 0, max: 25 }),
      integer("years", "Years", 8, { min: 1, max: 30 }),
    ],
    calculate: (values) => {
      const result = salaryPath({
        salary: readNumber(values, "salary"),
        annualExpenses: readNumber(values, "expenses"),
        annualHike: readNumber(values, "hike"),
        inflation: readNumber(values, "inflation"),
        lifestyleGrowth: readNumber(values, "lifestyle"),
        years: readNumber(values, "years"),
      });
      const first = result.rows[0];
      const last = result.rows[result.rows.length - 1];
      return {
        headline: last && first && last.savingsRate < first.savingsRate
          ? "The savings rate falls in this path"
          : "The savings rate does not fall in this path",
        detail: last ? `Year ${last.year} savings rate is ${formatPercent(last.savingsRate)}.` : "",
        metrics: [
          { label: "First-year savings rate", value: formatPercent(first?.savingsRate ?? 0) },
          { label: "Final savings rate", value: formatPercent(last?.savingsRate ?? 0) },
          { label: "Final savings", value: formatINR(last?.savings ?? 0, 0) },
        ],
        notes: ["Lifestyle growth is applied to expenses. It is separate from the inflation used to deflate salary."],
        warnings: [],
      };
    },
    formula: "Savings rate = (salary − expenses) / salary, after each year's hike and lifestyle growth.",
    methodology: ["The first row is the year after the first hike, not today."],
    assumptions: ["The hike arrives every year and spending really grows at the lifestyle rate."],
    limitations: limits,
    related: ["salary-vs-inflation", "savings-rate", "step-up-sip"],
    articles: ["inflation-adjusted-returns"],
  },
  {
    slug: "goal-priority",
    title: "Goal priority and savings allocation",
    shortTitle: "Goal priority",
    description: "Split a monthly budget across goals, highest priority first.",
    category: "planning",
    phase: 4,
    keywords: ["goal priority", "which goal first", "allocate savings"],
    questions: ["which goal should i fund first"],
    fields: [goalRows(), money("budget", "Monthly amount you can save", 25000)],
    calculate: (values) => priorityResult(values),
    formula: "Each goal's required SIP is funded in priority order until the budget runs out.",
    methodology: ["Priority 1 is funded before priority 2. A flexible goal is labelled, but the allocation still follows the number."],
    assumptions: ["Each goal's return and inflation are the ones on its row."],
    limitations: limits,
    related: ["multi-goal", "goal-investment", "education-goal"],
    articles: ["net-worth-and-goals"],
  },
  {
    slug: "drawdown",
    title: "Portfolio drawdown scenario",
    shortTitle: "Drawdown",
    description: "A constant return interrupted by one decline you specify.",
    category: "portfolio",
    phase: 4,
    keywords: ["drawdown", "market fall", "crash scenario"],
    questions: ["what if my portfolio falls"],
    fields: [
      money("start", "Starting value", 1000000, { min: 1 }),
      percent("rate", "Assumed return in other years", 8, { min: -20, max: 25 }),
      integer("years", "Years", 15, { min: 1, max: 40 }),
      integer("shockYear", "Year of the decline", 5, { min: 1, max: 40 }),
      percent("shock", "Decline that year, before the ordinary return", 30, { min: 0, max: 90 }),
      money("contribution", "Amount added at the end of each year", 0),
    ],
    calculate: (values) => {
      const result = drawdownScenario({
        startingValue: readNumber(values, "start"),
        annualReturn: readNumber(values, "rate"),
        years: readNumber(values, "years"),
        shockYear: readNumber(values, "shockYear"),
        shockDrop: readNumber(values, "shock"),
        annualContribution: readNumber(values, "contribution"),
      });
      return {
        headline: `The deepest decline from a peak in this path is ${formatPercent(result.maxDrawdown)}`,
        detail: `Ending value ${formatINR(result.ending, 0)}.`,
        metrics: [
          { label: "Ending value", value: formatINR(result.ending, 0) },
          { label: "Maximum drawdown", value: formatPercent(result.maxDrawdown) },
        ],
        series: [{ id: "value", label: "Value", points: result.points.map((point) => ({ x: `Year ${point.year}`, y: point.value })) }],
        notes: ["The decline is applied after that year's ordinary return. It is a scenario you designed, not a historical crash."],
        warnings: ["A single shock is milder than several bad years in a row."],
      };
    },
    formula: "Each year the value grows, then the chosen year is multiplied by (1 − decline), then the contribution is added.",
    methodology: ["Drawdown is the fall from the highest value seen so far."],
    assumptions: ["The ordinary return happens even in the shock year, before the decline."],
    limitations: limits,
    related: ["asset-allocation", "retirement-sustainability", "swp"],
    articles: ["risk-and-diversification", "swp-and-withdrawal-risk"],
  },
  {
    slug: "retirement-sustainability",
    title: "Retirement income sustainability",
    shortTitle: "Retirement income",
    description: "Whether one retirement plan survives low, middle, and high return assumptions.",
    category: "retirement",
    phase: 4,
    keywords: ["retirement income", "will my money last"],
    questions: ["will my retirement income last"],
    fields: [
      money("corpus", "Corpus", 15000000, { min: 1 }),
      money("spending", "First-year spending", 600000, { min: 1 }),
      percent("inflation", "Inflation", 5, { min: 0, max: 12 }),
      integer("years", "Years", 30, { min: 1, max: 50 }),
      percent("low", "Low return", 1, { min: -10, max: 15 }),
      percent("mid", "Middle return", 5, { min: -10, max: 15 }),
      percent("high", "High return", 8, { min: -10, max: 15 }),
    ],
    calculate: (values) => {
      const result = sustainability({
        corpus: readNumber(values, "corpus"),
        annualSpending: readNumber(values, "spending"),
        inflation: readNumber(values, "inflation"),
        years: readNumber(values, "years"),
        returns: [readNumber(values, "low"), readNumber(values, "mid"), readNumber(values, "high")],
      });
      const lived = result.rows.filter((row) => row.lasted).length;
      return {
        headline: `${lived} of ${result.rows.length} return scenarios last the full period`,
        detail: "A plan that survives only the high return is not a plan that has been shown to last.",
        metrics: result.rows.map((row) => ({
          label: formatPercent(row.annualReturn),
          value: row.lasted ? `Lasts, ${formatINR(row.ending, 0)} left` : `${row.yearsLasted} years`,
        })),
        notes: ["Spending starts at the beginning of each year and rises with inflation."],
        warnings: ["Sequence risk is not in a constant-return row. Use the drawdown page to add a bad year."],
      };
    },
    formula: "The safe-withdrawal simulator, with the corpus and spending you enter.",
    methodology: ["Three returns are required so the page cannot collapse to one comforting number."],
    assumptions: ["No new savings and no tax during retirement."],
    limitations: limits,
    related: ["safe-withdrawal", "swp", "retirement-corpus"],
    articles: ["swp-and-withdrawal-risk"],
  },
  {
    slug: "multi-goal",
    title: "Multi-goal planning workspace",
    shortTitle: "Multi-goal",
    description: "Several goals, one monthly budget, and the gap each goal still has.",
    category: "planning",
    phase: 4,
    keywords: ["multiple goals", "financial plan"],
    questions: ["how do i plan for more than one goal"],
    fields: [goalRows(), money("budget", "Monthly savings budget", 30000)],
    calculate: (values) => priorityResult(values),
    formula: "Required SIP for each goal, then allocate the budget by priority.",
    methodology: ["The same allocator as the priority tool. The plan page can keep a copy of goals on this device."],
    assumptions: ["Goals do not share the same rupee twice. Existing savings are entered per goal."],
    limitations: limits,
    related: ["goal-priority", "goal-investment", "fi-progress"],
    articles: ["net-worth-and-goals"],
  },
  {
    slug: "net-worth-projection",
    title: "Net worth projection",
    shortTitle: "Net worth projection",
    description: "Assets grow and liabilities are paid down, using returns and payments you enter.",
    category: "planning",
    phase: 4,
    keywords: ["net worth projection", "future net worth"],
    questions: ["what will my net worth be"],
    fields: [
      rows(
        "assets",
        "Assets",
        [
          { key: "name", label: "Name", kind: "text", defaultValue: "Equity funds" },
          { key: "value", label: "Value", kind: "money", min: 0, defaultValue: 500000 },
          { key: "rate", label: "Assumed return percent", kind: "percent", min: -20, max: 25, defaultValue: 9 },
          { key: "contribution", label: "Added each year", kind: "number", min: -100000000, max: 100000000, defaultValue: 120000 },
        ],
        [
          { name: "Equity funds", value: 500000, rate: 9, contribution: 120000 },
          { name: "EPF", value: 300000, rate: 8, contribution: 80000 },
        ],
        { minRows: 1, maxRows: 10 },
      ),
      rows(
        "liabilities",
        "Liabilities",
        [
          { key: "name", label: "Name", kind: "text", defaultValue: "Home loan" },
          { key: "balance", label: "Balance", kind: "money", min: 0, defaultValue: 0 },
          { key: "rate", label: "Interest percent", kind: "percent", min: 0, max: 24, defaultValue: 8 },
          { key: "payment", label: "Paid each year", kind: "money", min: 0, defaultValue: 0 },
        ],
        [{ name: "Home loan", balance: 2000000, rate: 8.5, payment: 240000 }],
        { minRows: 0, maxRows: 8 },
      ),
      integer("years", "Years", 10, { min: 1, max: 40 }),
    ],
    calculate: (values) => {
      const result = projectNetWorth({
        years: readNumber(values, "years"),
        assets: readRows(values, "assets").map((row) => ({
          name: String(row.name),
          value: Number(row.value),
          annualReturn: Number(row.rate),
          annualContribution: Number(row.contribution),
        })),
        liabilities: readRows(values, "liabilities").map((row) => ({
          name: String(row.name),
          balance: Number(row.balance),
          annualRate: Number(row.rate),
          annualPayment: Number(row.payment),
        })),
      });
      const last = result.rows[result.rows.length - 1];
      return {
        headline: `Projected net worth is ${formatINR(last?.net ?? 0, 0)}`,
        detail: "Asset returns are assumptions. The loan payment is applied once a year after that year's interest.",
        metrics: [
          { label: "Assets", value: formatINR(last?.assets ?? 0, 0) },
          { label: "Liabilities", value: formatINR(last?.liabilities ?? 0, 0) },
          { label: "Net worth", value: formatINR(last?.net ?? 0, 0) },
        ],
        series: [
          { id: "net", label: "Net worth", points: result.rows.map((row) => ({ x: `Year ${row.year}`, y: row.net })) },
          { id: "assets", label: "Assets", points: result.rows.map((row) => ({ x: `Year ${row.year}`, y: row.assets })) },
        ],
        notes: ["A liability balance stops at zero. It does not become an asset."],
        warnings: [ASSUMPTION_RETURN],
      };
    },
    formula: "Asset = asset × (1 + return) + annual contribution. Liability = liability × (1 + rate) − annual payment.",
    methodology: ["The loan maths is annual, so it will not match a monthly EMI schedule exactly."],
    assumptions: ["Contributions and payments continue for every year."],
    limitations: limits,
    related: ["net-worth", "retirement-corpus", "asset-allocation"],
    articles: ["net-worth-and-goals"],
  },
];

function holdingRows() {
  return rows(
    "holdings",
    "Holdings",
    [
      { key: "name", label: "Name", kind: "text", defaultValue: "Equity" },
      { key: "value", label: "Current value", kind: "money", min: 0, defaultValue: 0 },
      { key: "weight", label: "Target weight percent", kind: "percent", min: 0, max: 100, defaultValue: 0 },
    ],
    [
      { name: "Equity", value: 600000, weight: 60 },
      { name: "Debt", value: 300000, weight: 30 },
      { name: "Gold", value: 50000, weight: 10 },
    ],
    { minRows: 1, maxRows: 10 },
  );
}

function toHoldings(values: ParsedValues) {
  return readRows(values, "holdings").map((row) => ({
    name: String(row.name),
    value: Number(row.value),
    targetWeight: Number(row.weight),
  }));
}

function allocationResult(values: ParsedValues): ReturnType<Calculator["calculate"]> {
  const result = allocation(toHoldings(values));
  return {
    headline: `Portfolio value is ${formatINR(result.total, 0)}`,
    detail: "A positive trade means buy. A negative trade means sell, before tax and costs.",
    metrics: result.rows.map((row) => ({
      label: row.name,
      value: formatINR(row.trade, 0),
      hint: `Now ${formatPercent(row.currentWeight)}, target ${formatPercent(row.targetWeight)}`,
    })),
    tables: [{
      caption: "Weights and trades",
      columns: ["Holding", "Value", "Now", "Target", "Trade"],
      rows: result.rows.map((row) => [
        row.name,
        formatINR(row.value, 0),
        formatPercent(row.currentWeight),
        formatPercent(row.targetWeight),
        formatINR(row.trade, 0),
      ]),
    }],
    notes: ["Trades assume you rebalance the current total, with no new cash."],
    warnings: [],
  };
}

function goalRows() {
  return rows(
    "goals",
    "Goals",
    [
      { key: "name", label: "Name", kind: "text", defaultValue: "Emergency fund" },
      { key: "target", label: "Target in today's rupees", kind: "money", min: 0, defaultValue: 200000 },
      { key: "months", label: "Months", kind: "integer", min: 1, max: 600, defaultValue: 12 },
      { key: "existing", label: "Already saved", kind: "money", min: 0, defaultValue: 0 },
      { key: "rate", label: "Return percent", kind: "percent", min: -10, max: 20, defaultValue: 6 },
      { key: "inflation", label: "Inflation percent", kind: "percent", min: 0, max: 15, defaultValue: 5 },
      { key: "priority", label: "Priority, 1 is first", kind: "integer", min: 1, max: 20, defaultValue: 1 },
      { key: "flexible", label: "Flexible", kind: "boolean", defaultValue: true },
    ],
    [
      { name: "Emergency fund", target: 240000, months: 12, existing: 40000, rate: 4, inflation: 0, priority: 1, flexible: false },
      { name: "House down payment", target: 1500000, months: 60, existing: 200000, rate: 8, inflation: 5, priority: 2, flexible: true },
    ],
    { minRows: 1, maxRows: 8 },
  );
}

function priorityResult(values: ParsedValues): ReturnType<Calculator["calculate"]> {
  const result = prioritizeGoals(
    readRows(values, "goals").map((row) => ({
      name: String(row.name),
      target: Number(row.target),
      months: Number(row.months),
      existing: Number(row.existing),
      annualReturn: Number(row.rate),
      inflation: Number(row.inflation),
      priority: Number(row.priority),
      flexible: row.flexible === true || row.flexible === "true",
    })),
    readNumber(values, "budget"),
  );
  return {
    headline: result.unallocated > 0
      ? `${formatINR(result.unallocated, 0)} a month is still unallocated`
      : "The monthly budget is fully allocated",
    detail: "A goal marked covered receives its full required SIP. The others receive what is left.",
    metrics: result.rows.map((row) => ({
      label: row.name,
      value: formatINR(row.allocatedMonthly, 0),
      hint: row.covered ? "Covered" : `Needs ${formatINR(row.requiredMonthly, 0)}`,
    })),
    tables: [{
      caption: "Allocation",
      columns: ["Goal", "Future target", "Needs", "Gets", "Status"],
      rows: result.rows.map((row) => [
        row.name,
        formatINR(row.futureTarget, 0),
        formatINR(row.requiredMonthly, 0),
        formatINR(row.allocatedMonthly, 0),
        row.covered ? "Covered" : "Short",
      ]),
    }],
    notes: [ASSUMPTION_RETURN],
    warnings: result.rows.some((row) => !row.covered) ? ["At least one goal is short of its required SIP under the budget you entered."] : [],
  };
}

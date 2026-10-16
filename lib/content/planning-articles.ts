import type { Article } from "./types";

export const planningArticles: Article[] = [
  {
    slug: "inflation-adjusted-returns",
    title: "A higher balance can still buy less",
    description: "How inflation changes a future cost, and how a nominal return becomes a real one.",
    topic: "inflation",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["₹100 growing to ₹121 looks like a gain. If prices also grew 21%, the ₹121 buys what ₹100 buys today. The real return is zero."],
      },
      {
        id: "formula",
        heading: "The formula",
        paragraphs: ["Future cost multiplies today's amount by inflation. Purchasing power divides it. The real return is (1 + nominal) / (1 + inflation) − 1, not nominal minus inflation. The subtraction is a rough shortcut and it drifts when the rates are large."],
        formula: "Real return = (1 + nominal) / (1 + inflation) − 1",
      },
      {
        id: "tax",
        heading: "Tax makes the real return smaller",
        paragraphs: ["If the whole gain is taxed each year, the nominal return is multiplied by one minus the tax rate before the inflation step. That fits interest. It is a poor description of shares you have not sold. The capital-gains page is the one that uses the special rates."],
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: ["₹1,00,000 of today's college fees at 6% inflation for 8 years costs about ₹1,59,385. A savings account that matches inflation only preserves the purchase. It does not create a surplus."],
      },
      {
        id: "limits",
        heading: "Limits",
        paragraphs: ["One inflation number is not your household. School fees, rent, and medical costs do not move with a single index. Hisab does not download a CPI forecast. You type the assumption."],
      },
    ],
    sources: [
      { title: "Reserve Bank of India", publisher: "Reserve Bank of India", url: "https://www.rbi.org.in/", accessed: "2026-10-16" },
    ],
    calculators: ["inflation", "real-return", "goal-investment", "salary-vs-inflation"],
    related: ["sip-return-projections", "net-worth-and-goals"],
  },
  {
    slug: "emi-and-prepayment",
    title: "What an EMI is made of, and what a prepayment changes",
    description: "Reducing-balance interest, why the early months are mostly interest, and how extra principal shortens the loan.",
    topic: "loans",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["An EMI is a fixed payment that covers the month's interest and some principal. The interest is the outstanding balance times the monthly rate. As the balance falls, more of the same EMI becomes principal."],
      },
      {
        id: "rate",
        heading: "The monthly rate",
        paragraphs: ["Hisab divides the nominal annual rate by 12. A 9% loan uses 0.75% a month. That is the usual retail-loan convention. It is not the same as taking the 12th root of an effective annual rate."],
        formula: "EMI = P × r × (1 + r) ^ n / ((1 + r) ^ n − 1)",
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: ["A ₹1,00,000 loan at 12% for 12 months has a monthly rate of 1%. The EMI is about ₹8,885. At a 0% rate the EMI is simply the principal divided by the months: ₹1,20,000 over 12 months is ₹10,000."],
      },
      {
        id: "prepay",
        heading: "Prepayment",
        paragraphs: ["Extra principal does not change the EMI in Hisab's comparison. It cuts the balance, so later interest is smaller and the loan ends sooner. A one-time prepayment in month 12 works the same way. A lender may charge a fee or post the credit on another date. That fee is not subtracted."],
      },
      {
        id: "rent",
        heading: "Renting is a different sum",
        paragraphs: ["The rent-versus-buy page compares home equity with an invested down payment. It leaves out stamp duty, tax savings, and selling costs on purpose. A close result can flip once those are added."],
      },
    ],
    sources: [
      { title: "Reserve Bank of India", publisher: "Reserve Bank of India", url: "https://www.rbi.org.in/", accessed: "2026-10-16" },
    ],
    calculators: ["emi", "home-loan-prepayment", "home-loan-affordability", "rent-vs-buy", "debt-payoff"],
    related: ["tax-regime-comparison"],
  },
  {
    slug: "epf-and-retirement",
    title: "EPF, EPS, and NPS are not one account",
    description: "Where the 12% goes, what the pension formula estimates, and why an annuity rate is still an assumption.",
    topic: "retirement",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    applicable: "EPF interest default is the FY 2025-26 notified rate",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["A salary slip can show provident fund, pension, and NPS as if they were one benefit. They grow under different rules."],
      },
      {
        id: "epf",
        heading: "EPF",
        paragraphs: [
          "The employee contribution goes to the EPF. The employer contribution is split. EPS takes 8.33% of pensionable wages, capped at the wage ceiling used in this tool, ₹15,000. The rest of the employer share goes to the EPF.",
          "Interest in Hisab is the monthly running-balance method: each month's closing balance earns one-twelfth of the annual rate, credited at year end. The default 8.25% is the rate notified for FY 2025-26. A reviewed source for the FY 2026-27 rate was not found on 16 October 2026, so the box stays editable and labelled.",
        ],
      },
      {
        id: "eps",
        heading: "EPS",
        paragraphs: ["The estimate is pensionable salary times years of service, divided by 70. Fewer than 10 years of service generally points to a withdrawal benefit rather than a monthly pension. The page still shows the formula and says so. It does not model a higher pension on higher wages or the minimum pension."],
      },
      {
        id: "nps",
        heading: "NPS",
        paragraphs: ["The corpus uses the return you type. At exit, the share you mark for an annuity is multiplied by an annuity rate you also type. Forty percent is shown as the general minimum, with a note that small-corpus exits can differ. The pension is not a quote from a provider. PFRDA publishes the scheme rules; the rate at retirement is a market price."],
      },
      {
        id: "ppf",
        heading: "PPF, briefly",
        paragraphs: ["PPF compounds once a year in this model. The 7.1% default is the small-savings rate for 1 October 2026 to 31 December 2026, not a promise for the next quarter. Deposits above ₹1,50,000 are flagged because that is the ceiling this release uses. The real scheme also looks at the balance between the 5th and the end of the month, which one annual deposit does not copy."],
      },
    ],
    sources: [
      { title: "EPFO", publisher: "Employees' Provident Fund Organisation", url: "https://www.epfindia.gov.in/", accessed: "2026-10-16" },
      { title: "CBT recommends 8.25% for FY 2025-26", publisher: "Press Information Bureau", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2234502", accessed: "2026-10-16" },
      { title: "PFRDA", publisher: "Pension Fund Regulatory and Development Authority", url: "https://www.pfrda.org.in/", accessed: "2026-10-16" },
    ],
    calculators: ["epf", "eps-pension", "nps", "ppf", "retirement-corpus"],
    related: ["swp-and-withdrawal-risk", "tax-regime-comparison"],
  },
  {
    slug: "swp-and-withdrawal-risk",
    title: "A withdrawal plan can fail even when the average return looks fine",
    description: "What an SWP and a FIRE number assume, and why one surviving scenario is not safety.",
    topic: "retirement",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["A systematic withdrawal takes money out of a corpus on a schedule. The corpus lasts only if the return, the withdrawal, and the order of returns cooperate."],
      },
      {
        id: "mechanics",
        heading: "The model",
        paragraphs: [
          "Hisab earns a monthly rate from the effective annual return you enter, then pays the withdrawal at the start or end of the month. The withdrawal can rise once a year. A 0% return and a flat withdrawal should last for corpus divided by the withdrawal. That is the check.",
          "The retirement corpus search finds the amount that pays a growing annual expense for the years you choose, under one post-retirement return. The FIRE number is simply expenses divided by a withdrawal rate. Both are scenarios.",
        ],
      },
      {
        id: "sequence",
        heading: "Sequence",
        paragraphs: ["A constant 7% can survive while a path that averages 7% and starts with a large fall does not. Early losses are withdrawn as well as suffered, so the recovery has less capital. The drawdown page lets you place one decline. It is still one story, not a market history."],
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: ["₹12,000 withdrawn at ₹1,000 a month with no return and no inflation lasts 12 months and then stops. Stretching the test to 24 months does not create money. It reports that the corpus ran out."],
      },
      {
        id: "limits",
        heading: "Limits",
        paragraphs: ["Tax, exit load, and a spouse's spending are not inside the SWP. A 3%, 3.5%, or 4% row is an illustration. Hisab does not call any of them safe for you."],
      },
    ],
    sources: [
      { title: "SEBI investor education", publisher: "Securities and Exchange Board of India", url: "https://investor.sebi.gov.in/", accessed: "2026-10-16" },
    ],
    calculators: ["swp", "fire", "safe-withdrawal", "retirement-sustainability", "drawdown"],
    related: ["epf-and-retirement", "inflation-adjusted-returns"],
  },
  {
    slug: "expense-ratios",
    title: "What a mutual fund expense ratio removes",
    description: "How a small annual charge compounds, and what the calculator refuses to invent.",
    topic: "portfolio",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["An expense ratio is a fraction of the fund's assets taken each year for running the fund. It is not a bill you pay separately. It reduces the return you receive."],
      },
      {
        id: "formula",
        heading: "The formula used here",
        paragraphs: ["Hisab computes (1 + gross return) × (1 − expense ratio) − 1. A 10% gross return and a 1% expense ratio become 8.9%, not 9%, because the charge applies to the grown value in this model. Real funds accrue expenses through the NAV, often daily. The annual version is an illustration of the drag."],
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: ["₹100 growing one year at 10% before a 1% expense becomes ₹108.90. The same gross return with a 2% expense becomes ₹107.80. The rupee gap widens over long SIP periods because each year's smaller balance has less to compound."],
      },
      {
        id: "limits",
        heading: "What is not in the box",
        paragraphs: ["Hisab does not store scheme expense ratios or index levels. You type both. A lower expense ratio is not a reason to buy a fund. It is one cost, beside risk, tax, and whether the fund matches the job."],
      },
    ],
    sources: [
      { title: "AMFI", publisher: "Association of Mutual Funds in India", url: "https://www.amfiindia.com/", accessed: "2026-10-16" },
      { title: "SEBI", publisher: "Securities and Exchange Board of India", url: "https://www.sebi.gov.in/", accessed: "2026-10-16" },
    ],
    calculators: ["expense-ratio", "benchmark-comparison", "sip"],
    related: ["risk-and-diversification", "sip-return-projections"],
  },
  {
    slug: "risk-and-diversification",
    title: "A mix is not a promise that the pieces will behave",
    description: "What a target weight, a blended return, and a drawdown scenario can honestly say.",
    topic: "portfolio",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["Diversification is owning things that do not all fall for the same reason. A weighted-average return does not prove that they won't."],
      },
      {
        id: "weights",
        heading: "Weights and trades",
        paragraphs: [
          "The allocation page compares today's weight with a target. The trade is target times the total, minus what you already hold. A positive number is a buy. It ignores tax and brokerage.",
          "The rebalance page spends only new cash, starting with the most underweight holdings. It does not sell. That can be the right constraint when a sale would create tax, and the wrong one when the mix has drifted a long way.",
        ],
      },
      {
        id: "blend",
        heading: "The blended return",
        paragraphs: ["Sixty percent at 10% and forty percent at 5% is 8% only as a weighted average. If the 60% falls and the 40% does not, you do not earn 8% that year. The page says the weights are assumed to be restored. If you never rebalance, the blend drifts toward whatever grew."],
      },
      {
        id: "drawdown",
        heading: "A designed fall",
        paragraphs: ["The drawdown tool applies one decline in a year you choose, after that year's ordinary return. It reports the deepest fall from a peak in that path. It is not 2008, 2020, or any other year. Those histories are not loaded."],
      },
    ],
    sources: [
      { title: "SEBI investor education", publisher: "Securities and Exchange Board of India", url: "https://investor.sebi.gov.in/", accessed: "2026-10-16" },
    ],
    calculators: ["portfolio-allocation", "portfolio-rebalance", "asset-allocation", "drawdown", "gold-fd-equity"],
    related: ["expense-ratios", "swp-and-withdrawal-risk"],
  },
  {
    slug: "emergency-funds",
    title: "An emergency fund is a number of months, not a product",
    description: "Why Hisab shows three targets, and how that differs from an insurance estimate.",
    topic: "insurance",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["An emergency fund is cash for a shock: a job gap, a medical bill the insurer does not pay immediately, or a repair that cannot wait. The size is a number of months of essential spending."],
      },
      {
        id: "targets",
        heading: "Three targets",
        paragraphs: ["Hisab shows three, six, and twelve months, minus what you have already parked for this purpose. It does not pick one. A single salary in a stable job and a household with uneven income are different problems. Essentials mean rent, food, utilities, school fees, insurance premiums, and EMIs. A holiday is not an essential in this count."],
      },
      {
        id: "where",
        heading: "Where it sits",
        paragraphs: ["The point of the fund is that you can use it when markets are down. A long-term equity SIP is a poor emergency fund even if the projected value looks larger. The calculator does not choose a bank account for you."],
      },
      {
        id: "insurance",
        heading: "Insurance is the other gap",
        paragraphs: ["The cover estimator adds income replacement, liabilities, and goals, then subtracts assets and existing cover. At a zero discount rate it does not shrink future income. It estimates a need. It does not say a policy is suitable, and it does not price a premium."],
      },
      {
        id: "fraud",
        heading: "A calculator will not ask for your OTP",
        paragraphs: ["Hisab does not take a payment, a PAN, or a bank login. A message that claims your emergency-fund result requires a transfer is not this site. Consumer guidance sits with the regulators linked from the sources page, including RBI and SEBI investor pages."],
      },
    ],
    sources: [
      { title: "RBI", publisher: "Reserve Bank of India", url: "https://www.rbi.org.in/", accessed: "2026-10-16" },
      { title: "SEBI investor education", publisher: "Securities and Exchange Board of India", url: "https://investor.sebi.gov.in/", accessed: "2026-10-16" },
    ],
    calculators: ["emergency-fund", "insurance-needs", "savings-rate"],
    related: ["net-worth-and-goals", "emi-and-prepayment"],
  },
  {
    slug: "net-worth-and-goals",
    title: "A goal is a date, an amount, and a monthly gap",
    description: "How to read a required SIP, and how several goals share one savings budget.",
    topic: "planning",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["Net worth is what you own minus what you owe, in today's rupees. A goal is a future purchase. They meet when the monthly savings have somewhere to go."],
      },
      {
        id: "net",
        heading: "Net worth",
        paragraphs: ["Add assets at amounts you could defend today. Put loans on the liability side rather than as negative assets, so a debt is visible. A house should be a sale value, not the price you paid and not a hoped-for price. The projection page then grows each asset at a return you type and pays liabilities once a year. That annual loan step will not match an EMI schedule exactly."],
      },
      {
        id: "goal",
        heading: "The required SIP",
        paragraphs: [
          "Hisab inflates today's cost, grows the savings already assigned to the goal, and solves for the monthly amount that closes the gap. The lump sum is an alternative, not a second bill.",
          "If the required SIP is larger than your income, the target, the date, or the return assumption has to change. The calculator will still show the number. A huge SIP is the warning.",
        ],
      },
      {
        id: "many",
        heading: "More than one goal",
        paragraphs: ["The priority tool funds goal 1's required SIP before goal 2 sees a rupee. Money already saved must be entered on the goal it belongs to, or it will be counted twice. A flexible goal can move its date. The allocator still follows the priority number. The plan page keeps the list on this device until you clear it."],
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: ["A ₹12,000 target in 12 months, with no return and no inflation, needs ₹1,000 a month if you start from zero and pay at the end of the month. That is the whole formula with the market turned off."],
      },
    ],
    sources: [
      { title: "SEBI investor education", publisher: "Securities and Exchange Board of India", url: "https://investor.sebi.gov.in/", accessed: "2026-10-16" },
    ],
    calculators: ["net-worth", "net-worth-projection", "goal-investment", "goal-priority", "multi-goal", "education-goal", "wedding-goal"],
    related: ["emergency-funds", "inflation-adjusted-returns", "sip-return-projections"],
  },
];

import type { Article } from "./types";

const tax = {
  title: "Salaried individuals for AY 2026-27",
  publisher: "Income Tax Department",
  url: "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1",
  accessed: "2026-10-16",
};
const thresholds = {
  title: "Threshold limits under the Income-tax Act",
  publisher: "Income Tax Department",
  url: "https://www.incometaxindia.gov.in/w/threshold-limits-under-income-tax-act",
  accessed: "2026-10-16",
};
const memo = {
  title: "Finance Bill, 2026 memorandum",
  publisher: "Income Tax Department",
  url: "https://www.incometaxindia.gov.in/documents/81799/11848482/memo-2026.pdf",
  accessed: "2026-10-16",
};

export const fixedIncomeArticles: Article[] = [
  {
    slug: "compound-interest",
    title: "How compound interest actually grows a rupee",
    description: "What compounding changes, how often it is applied, and why two calculators can disagree on the same rate.",
    topic: "fundamentals",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: [
          "Compound interest is interest that starts earning interest. Simple interest never does. If a bank quotes 8% a year, the rupee outcome still depends on how often that 8% is applied.",
        ],
      },
      {
        id: "mechanics",
        heading: "The mechanics",
        paragraphs: [
          "A nominal annual rate is split by the compounding frequency. At 8% compounded quarterly, each quarter uses 2%, not 8%. After four quarters the deposit is larger than 8% of the original principal, because later quarters earn interest on earlier interest.",
          "The effective annual rate is the growth over a full year. For 8% compounded quarterly it is (1.02)⁴ − 1, about 8.24%. That is the fair one-year comparison with a product that compounds once a year.",
        ],
        formula: "Maturity = principal × (1 + nominal rate / frequency) ^ (frequency × years)",
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: [
          "₹1,00,000 at 8% compounded quarterly for two years is ₹1,00,000 × (1.02)⁸. That is about ₹1,17,166. The same money at simple interest is ₹1,16,000. The ₹1,166 gap is the interest on interest.",
          "Nothing in that example is a bank's offer. It is the formula with the rate and frequency stated.",
        ],
      },
      {
        id: "meaning",
        heading: "What the result means",
        paragraphs: [
          "A higher compounding frequency raises the effective rate when the nominal rate is positive. It does not make a deposit safer, and it does not tell you the rate next year.",
        ],
      },
      {
        id: "mistakes",
        heading: "Common mistakes",
        list: [
          "Comparing a quarterly-compounded FD with an annual-pay bond by the coupon alone.",
          "Calling the nominal rate the amount you earn in a year.",
          "Rounding every quarter's interest and then expecting the closed formula to match the passbook.",
        ],
        paragraphs: ["Banks often round. Hisab's compound formula does not round until the result is shown."],
      },
      {
        id: "limits",
        heading: "Limits",
        paragraphs: ["The formula assumes the rate never changes and you do not withdraw early. A penalty or a tax deduction changes the cash you keep."],
      },
    ],
    sources: [tax],
    calculators: ["simple-compound-interest", "fd", "lump-sum"],
    related: ["fd-returns-and-tax", "sip-return-projections"],
  },
  {
    slug: "fd-returns-and-tax",
    title: "What an FD quote does and does not promise",
    description: "Cumulative and payout deposits, the effective rate, and why interest is usually taxed even when it stays in the deposit.",
    topic: "fixed-income",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["A fixed deposit quote is a nominal rate for a tenure. It is not, by itself, the rupees you will have after tax."],
      },
      {
        id: "mechanics",
        heading: "Cumulative and payout",
        paragraphs: [
          "In a cumulative deposit the interest stays in and compounds at the frequency in the terms, often quarterly. In a payout deposit the interest is paid to you and the principal comes back at the end. The payout total is simple interest unless the terms say otherwise.",
          "Hisab uses that split. If you choose payout, the compounding control does not change the total interest.",
        ],
      },
      {
        id: "tax",
        heading: "Tax",
        paragraphs: [
          "Interest on a bank deposit is generally income of the year it accrues, including interest that has not been paid out of a cumulative deposit. The slab depends on your other income and the regime you use.",
          "The tax-adjusted calculator applies one rate you enter. It does not look up your slab, surcharge, or TDS threshold. Use the income-tax estimator when the question is the slab itself.",
        ],
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: [
          "₹5,00,000 at 7% paid out for one year earns ₹35,000 before tax. At a 30% rate on that interest, tax is ₹10,500 and the net interest is ₹24,500. Cess and surcharge are inside the 30% only if you put them there.",
        ],
      },
      {
        id: "limits",
        heading: "Limits",
        paragraphs: [
          "Deposit insurance, premature-withdrawal penalties, and the TDS threshold are not calculated. DICGC publishes the insurance limit; check it before treating a large deposit at one bank as fully protected.",
          "Small-savings rates such as the post-office RD are set for a quarter. A bank FD rate is whatever that bank offers you on that day.",
        ],
      },
    ],
    sources: [
      tax,
      { title: "DICGC", publisher: "Deposit Insurance and Credit Guarantee Corporation", url: "https://www.dicgc.org.in/", accessed: "2026-10-16" },
    ],
    calculators: ["fd", "tax-adjusted-fixed-income", "fd-vs-bond"],
    related: ["rd-mechanics", "compound-interest", "tax-regime-comparison"],
  },
  {
    slug: "rd-mechanics",
    title: "How a recurring deposit counts each instalment",
    description: "Why the last instalment earns less than the first, and which rate convention Hisab uses.",
    topic: "fixed-income",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["A recurring deposit is a series of instalments, not one lump sum. Each instalment is invested for a different length of time."],
      },
      {
        id: "mechanics",
        heading: "The convention in Hisab",
        paragraphs: [
          "The nominal annual rate is turned into a monthly effective rate from the compounding frequency. Quarterly compounding at rate r uses (1 + r/4)^(1/3) − 1 each month.",
          "An end-of-month instalment does not earn a return in the month it is paid. A start-of-month instalment does. The toggle is on the calculator because the two choices are both used in illustrations and they are not the same number.",
        ],
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: ["Twelve instalments of ₹1,000 at a 0% rate mature at ₹12,000. The interest is zero, which is the right check before you trust a positive rate. With a positive rate the first instalment grows for longer than the twelfth."],
      },
      {
        id: "mistakes",
        heading: "Common mistakes",
        list: [
          "Multiplying one instalment's interest by the number of months.",
          "Using a SIP formula that assumes an effective fund return when the product quoted a nominal deposit rate.",
          "Ignoring a missed instalment. The formula assumes every instalment arrives.",
        ],
        paragraphs: ["A passbook that rounds each quarter will not match an unrounded formula to the paisa."],
      },
    ],
    sources: [
      { title: "Reserve Bank of India", publisher: "Reserve Bank of India", url: "https://www.rbi.org.in/", accessed: "2026-10-16" },
    ],
    calculators: ["rd", "fd", "sip"],
    related: ["fd-returns-and-tax", "compound-interest"],
  },
  {
    slug: "sip-return-projections",
    title: "What a SIP projection is allowed to claim",
    description: "Monthly investing under one assumed return, and why that path is not a mutual fund's past result.",
    topic: "investing",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["A SIP projection answers: if this monthly amount earns this constant annual return, what is the future value? It does not answer what a fund will do."],
      },
      {
        id: "mechanics",
        heading: "Two ways to read 12%",
        paragraphs: [
          "If 12% is an effective annual return, the monthly rate is the 12th root of 1.12, minus one. That is the usual reading of a CAGR.",
          "If 12% is a nominal rate divided by 12, the monthly rate is 1%. The two readings diverge over long periods. Hisab asks which one you mean.",
          "Start-of-month contributions earn that month's return. End-of-month contributions do not. The default is the start, and it is labelled.",
        ],
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: ["₹5,000 a month for 12 months at a 0% return is ₹60,000 if nothing is added by the market. Any larger result is entirely the return assumption. Change the assumption and the result must change."],
      },
      {
        id: "limits",
        heading: "Limits",
        paragraphs: [
          "A constant return hides a bad year. Exit load, expense ratio, and tax are excluded unless you reduce the return yourself. The expense-ratio calculator does the cost step separately.",
          "SEBI and AMFI publish investor material and fund facts. Hisab does not download a scheme's past return and drop it into the box.",
        ],
      },
    ],
    sources: [
      { title: "SEBI investor education", publisher: "Securities and Exchange Board of India", url: "https://investor.sebi.gov.in/", accessed: "2026-10-16" },
      { title: "AMFI", publisher: "Association of Mutual Funds in India", url: "https://www.amfiindia.com/", accessed: "2026-10-16" },
    ],
    calculators: ["sip", "sip-vs-lump-sum", "step-up-sip", "opportunity-cost"],
    related: ["step-up-sip", "expense-ratios", "cagr-versus-xirr"],
  },
  {
    slug: "step-up-sip",
    title: "What changes when a SIP steps up",
    description: "An annual increase in the contribution is not an extra return. It is more money from you.",
    topic: "investing",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["A step-up SIP raises the instalment after every 12 contributions. The future value rises because you invest more, and also because those later rupees earn the assumed return for the time they are invested."],
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: ["₹1,000 a month with a 50% step-up and a 0% return invests ₹12,000 in year one and ₹18,000 in year two. The maturity is ₹30,000. Any amount above that, once you add a return, is the assumption at work."],
      },
      {
        id: "meaning",
        heading: "What to watch",
        paragraphs: ["The useful check is whether next year's instalment still fits the salary you expect. A step-up that looks small in year one can be large in year ten. The hike-and-lifestyle page is the place to see whether the raise is already spent."],
      },
    ],
    sources: [
      { title: "SEBI investor education", publisher: "Securities and Exchange Board of India", url: "https://investor.sebi.gov.in/", accessed: "2026-10-16" },
    ],
    calculators: ["step-up-sip", "sip", "hike-lifestyle"],
    related: ["sip-return-projections"],
  },
  {
    slug: "cagr-versus-xirr",
    title: "CAGR and XIRR measure different histories",
    description: "When a start and end value are enough, and when dated cash flows need XIRR.",
    topic: "fundamentals",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["CAGR is the constant annual rate between a starting value and an ending value. XIRR is the annual rate that sets the present value of dated cash flows to zero. They match only in the special case of one investment and one ending value."],
      },
      {
        id: "mechanics",
        heading: "How Hisab counts the year",
        paragraphs: [
          "CAGR from two dates uses actual days divided by 365. So does XIRR. A leap year therefore does not produce a neat 20% just because the value rose 20% from 1 January to the next 1 January.",
          "From 1 January 2021 to 1 January 2022 is 365 days. ₹10,000 becoming ₹12,000 is exactly 20% on that basis.",
        ],
        formula: "CAGR = (ending / starting) ^ (1 / years) − 1",
      },
      {
        id: "xirr",
        heading: "When XIRR refuses to pick a number",
        paragraphs: [
          "Cash flows need both a payment in and a payment out. All-negative flows have no rate that makes them a return.",
          "Some patterns have two rates that both set the present value to zero. Hisab lists both and does not pretend one of them is the answer. A known case is −100, then +230 a year later, then −132 a year after that: both 10% and 20% fit.",
        ],
      },
      {
        id: "mistakes",
        heading: "Common mistakes",
        list: [
          "Using CAGR after you added money halfway through. The ending value includes the new money, so the rate looks better or worse than the investment did.",
          "Forgetting to enter the current value as a positive cash flow on today's date.",
          "Treating a sign error as a market loss. Money you invest is negative in XIRR.",
        ],
        paragraphs: ["Absolute return is the third, simpler number: the total percentage change, with no annualising at all."],
      },
    ],
    sources: [
      { title: "SEBI investor education", publisher: "Securities and Exchange Board of India", url: "https://investor.sebi.gov.in/", accessed: "2026-10-16" },
    ],
    calculators: ["cagr", "xirr", "absolute-return", "total-return"],
    related: ["sip-return-projections"],
  },
  {
    slug: "bonds-and-ytm",
    title: "Coupon, price, and yield are three different numbers",
    description: "Why a bond's coupon is not its return, and what clean price, dirty price, and yield to maturity each mean.",
    topic: "fixed-income",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["A bond can show a coupon of 8% and still yield something else, because you may not buy it at its face value."],
      },
      {
        id: "words",
        heading: "The words",
        paragraphs: [
          "The coupon rate is the cash interest on the face value. Current yield is that annual cash divided by the clean price. Yield to maturity is the discount rate that makes the future coupons and the redemption equal the clean price.",
          "Clean price excludes interest already earned since the last coupon. Dirty price adds it. Between coupon dates the buyer usually pays the dirty price.",
        ],
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: [
          "A bond with a ₹1,000 face, an 8% annual coupon, and an 8% yield, priced on a coupon date, is worth ₹1,000. Coupon and yield match, so the price is par.",
          "The same face with a 10% annual coupon and an 8% yield for two years is worth 100/1.08 + 1,100/1.08², about ₹1,035.67. You pay more than face because the coupon is richer than the yield. The 10% coupon is still not an 10% annualised return.",
        ],
      },
      {
        id: "ytm",
        heading: "What YTM assumes",
        paragraphs: ["YTM assumes you hold the bond to maturity, the issuer pays, and every coupon is reinvested at the same yield. If you spend the coupons, or the reinvestment rate is lower, the realised return is different. Hisab's coupon page separates cash coupons from a reinvestment assumption so that difference stays visible."],
      },
      {
        id: "limits",
        heading: "Limits",
        paragraphs: ["The price formula is for a coupon date unless you add accrued interest yourself. Exchange settlement and day-count conventions can differ. Hisab does not quote a live bond price."],
      },
    ],
    sources: [
      { title: "Reserve Bank of India", publisher: "Reserve Bank of India", url: "https://www.rbi.org.in/", accessed: "2026-10-16" },
      { title: "NSE", publisher: "National Stock Exchange of India", url: "https://www.nseindia.com/", accessed: "2026-10-16" },
    ],
    calculators: ["bond-ytm", "bond-price", "bond-coupon", "fd-vs-bond"],
    related: ["fd-returns-and-tax"],
  },
  {
    slug: "tax-regime-comparison",
    title: "How the old and new tax regimes differ on a salary",
    description: "The slabs, the rebate, and the deductions each regime keeps, for the rule sets reviewed in October 2026.",
    topic: "tax",
    published: "2026-10-16",
    reviewed: "2026-10-16",
    applicable: "FY 2025-26 and FY 2026-27 rule sets in Hisab",
    sections: [
      {
        id: "question",
        heading: "The question this answers",
        paragraphs: ["The new regime is the default for individuals. The old regime remains available, with a wider set of deductions and higher rates. The useful comparison is your income after the deductions you can actually claim."],
      },
      {
        id: "slabs",
        heading: "The slabs used here",
        paragraphs: [
          "For AY 2026-27 the Income Tax Department help page shows a new-regime nil band up to ₹4,00,000, then 5%, 10%, 15%, 20%, 25%, and 30% above ₹24,00,000. The old regime for a person below 60 still starts at ₹2,50,000, then 5%, 20%, and 30% above ₹10,00,000. Senior and super-senior basic exemptions are higher in the old regime only.",
          "The February 2026 Finance Bill memorandum said the enacted rates for AY 2026-27 were unchanged. Hisab therefore uses the same slabs for FY 2026-27 and labels that as a repeated table, not a new discovery.",
        ],
      },
      {
        id: "rebate",
        heading: "Rebate and cess",
        paragraphs: [
          "A resident whose taxable income does not exceed ₹12,00,000 gets a new-regime rebate of up to ₹60,000. The old-regime rebate is up to ₹12,500 when taxable income does not exceed ₹5,00,000. Above the new-regime limit, Hisab also applies marginal relief so the tax before cess does not jump by more than the income above ₹12,00,000.",
          "Health and education cess is 4% of tax plus surcharge. The memorandum says marginal relief does not apply to the cess. Surcharge starts above ₹50 lakh and is capped at 25% in the new regime.",
        ],
      },
      {
        id: "deductions",
        heading: "What each regime keeps",
        paragraphs: [
          "Standard deduction is ₹75,000 in the new regime and ₹50,000 in the old regime for salary, on the threshold page reviewed for this release. Section 80C, 80D, and self-occupied house interest are old-regime items in the estimator. Employer NPS under section 80CCD(2) is entered as an eligible amount and applied in both.",
          "HRA exemption is an old-regime calculation. The new regime result on that page is zero on purpose.",
        ],
      },
      {
        id: "example",
        heading: "A worked example",
        paragraphs: ["Taxable income of ₹15,00,000 in the new regime, with no special-rate income, has slab tax of ₹1,05,000. Cess is ₹4,200. Total tax is ₹1,09,200. At ₹12,10,000 the slab is ₹61,500, marginal relief cuts the tax before cess to ₹10,000, and cess makes the total ₹10,400."],
      },
      {
        id: "limits",
        heading: "Limits",
        paragraphs: ["The estimator does not compute capital gains, business losses, or the full house-property set-off. It also does not round total income to the nearest ₹10. A filing utility can differ by a small amount. Confirm the year before you rely on it."],
      },
    ],
    sources: [tax, thresholds, memo],
    calculators: ["income-tax", "tax-regime", "take-home-salary", "hra", "capital-gains"],
    related: ["fd-returns-and-tax", "epf-and-retirement"],
  },
];

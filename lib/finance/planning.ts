import { FinanceError, assertFinite, assertInteger, assertNonNegative, assertPositive, assertRateAboveMinusOne } from "./errors";
import { futureValueLumpSum, ratePerPeriod } from "./rates";
import { paymentForFutureValue, type ContributionTiming } from "./growth";
import { amortizationSchedule, emi } from "./loans";
import { corpusLasts } from "./retirement";

export interface SalaryStructureInput {
  annualCtc: number;
  monthlyBasic: number;
  monthlyHra: number;
  employeePfRate: number;
  employerPfRate: number;
  annualProfessionalTax: number;
  annualIncomeTax: number;
}

export interface SalaryStructureResult {
  monthlyGross: number;
  monthlyEmployeePf: number;
  monthlyEmployerPf: number;
  monthlyProfessionalTax: number;
  monthlyTax: number;
  monthlyTakeHome: number;
  annualTakeHome: number;
  specialAllowanceMonthly: number;
}

export function salaryStructure(input: SalaryStructureInput): SalaryStructureResult {
  assertPositive("Annual CTC", input.annualCtc);
  assertPositive("Monthly basic", input.monthlyBasic);
  assertNonNegative("Monthly HRA", input.monthlyHra);
  assertNonNegative("Employee PF rate", input.employeePfRate);
  assertNonNegative("Employer PF rate", input.employerPfRate);
  assertNonNegative("Professional tax", input.annualProfessionalTax);
  assertNonNegative("Income tax", input.annualIncomeTax);
  if (input.employeePfRate > 0.5 || input.employerPfRate > 0.5) {
    throw new FinanceError("PF rates above 50% are rejected. Check the entered percentage.");
  }
  const monthlyEmployerPf = input.monthlyBasic * input.employerPfRate;
  const annualEmployerPf = monthlyEmployerPf * 12;
  const annualGross = input.annualCtc - annualEmployerPf;
  if (annualGross <= 0) {
    throw new FinanceError("Employer PF is larger than CTC. Check the basic pay and employer rate.");
  }
  const monthlyGross = annualGross / 12;
  const specialAllowanceMonthly = monthlyGross - input.monthlyBasic - input.monthlyHra;
  if (specialAllowanceMonthly < -0.5) {
    throw new FinanceError("Basic pay plus HRA is larger than monthly gross. Gross is CTC minus employer PF.");
  }
  const monthlyEmployeePf = input.monthlyBasic * input.employeePfRate;
  const monthlyProfessionalTax = input.annualProfessionalTax / 12;
  const monthlyTax = input.annualIncomeTax / 12;
  const monthlyTakeHome = monthlyGross - monthlyEmployeePf - monthlyProfessionalTax - monthlyTax;
  return {
    monthlyGross,
    monthlyEmployeePf,
    monthlyEmployerPf,
    monthlyProfessionalTax,
    monthlyTax,
    monthlyTakeHome,
    annualTakeHome: monthlyTakeHome * 12,
    specialAllowanceMonthly,
  };
}

export interface RentVsBuyInput {
  horizonYears: number;
  propertyPrice: number;
  downPayment: number;
  loanRate: number;
  loanYears: number;
  propertyGrowth: number;
  annualMaintenance: number;
  monthlyRent: number;
  rentGrowth: number;
  investmentReturn: number;
}

export interface RentVsBuyResult {
  buyNetWorth: number;
  rentNetWorth: number;
  loanAmount: number;
  emi: number;
  totalRent: number;
  totalEmi: number;
  remainingLoan: number;
  propertyValue: number;
  investedDownPayment: number;
  notes: string[];
}

/**
 * Buy: property grows, EMI is paid, maintenance is paid, and the horizon value is property minus remaining loan.
 * Rent: the down payment is invested, rent is paid, and any month where EMI plus maintenance exceeds rent
 * is also invested. This ignores taxes, stamp duty, brokerage, and repairs beyond the maintenance figure.
 */
export function rentVersusBuy(input: RentVsBuyInput): RentVsBuyResult {
  assertInteger("Horizon", input.horizonYears, 1, 40);
  assertPositive("Property price", input.propertyPrice);
  assertNonNegative("Down payment", input.downPayment);
  if (input.downPayment > input.propertyPrice) {
    throw new FinanceError("Down payment cannot exceed the property price.");
  }
  assertNonNegative("Loan rate", input.loanRate);
  assertInteger("Loan years", input.loanYears, 1, 40);
  assertRateAboveMinusOne("Property growth", input.propertyGrowth);
  assertNonNegative("Maintenance", input.annualMaintenance);
  assertNonNegative("Rent", input.monthlyRent);
  assertRateAboveMinusOne("Rent growth", input.rentGrowth);
  assertRateAboveMinusOne("Investment return", input.investmentReturn);

  const loanAmount = input.propertyPrice - input.downPayment;
  const monthlyRate = ratePerPeriod(input.investmentReturn, 12, "effective-annual");
  const loanMonths = input.loanYears * 12;
  const horizonMonths = input.horizonYears * 12;
  const schedule = loanAmount > 0 ? amortizationSchedule({
    principal: loanAmount,
    annualNominalRate: input.loanRate,
    months: loanMonths,
  }) : null;
  const monthlyEmi = schedule?.emi ?? 0;
  let rentPortfolio = input.downPayment;
  let rent = input.monthlyRent;
  let totalRent = 0;
  let totalEmi = 0;
  const monthlyMaintenance = input.annualMaintenance / 12;

  for (let month = 1; month <= horizonMonths; month += 1) {
    rentPortfolio *= 1 + monthlyRate;
    totalRent += rent;
    const emiThisMonth = month <= (schedule?.rows.length ?? 0) ? monthlyEmi : 0;
    totalEmi += emiThisMonth;
    const buyCash = emiThisMonth + monthlyMaintenance;
    const surplus = buyCash - rent;
    if (surplus > 0) rentPortfolio += surplus;
    else rentPortfolio = Math.max(0, rentPortfolio + surplus);
    if (month % 12 === 0) rent *= 1 + input.rentGrowth;
  }

  const propertyValue = input.propertyPrice * (1 + input.propertyGrowth) ** input.horizonYears;
  const remainingLoan = schedule?.rows[Math.min(horizonMonths, schedule.rows.length) - 1]?.balance ?? 0;
  const buyMaintenance = input.annualMaintenance * input.horizonYears;
  const buyNetWorth = propertyValue - remainingLoan;
  return {
    buyNetWorth,
    rentNetWorth: rentPortfolio,
    loanAmount,
    emi: monthlyEmi,
    totalRent,
    totalEmi,
    remainingLoan,
    propertyValue,
    investedDownPayment: input.downPayment * (1 + input.investmentReturn) ** input.horizonYears,
    notes: [
      "The rent path invests the down payment and any month in which owning would have cost more cash than renting.",
      "If rent is higher than EMI plus maintenance, the difference is withdrawn from the invested down payment.",
      `Maintenance of ${buyMaintenance.toFixed(2)} rupees is treated as spent, not added to the home's value.`,
      "Stamp duty, tax benefits, repairs, and selling costs are not included.",
    ],
  };
}

export interface RewardCategory {
  name: string;
  monthlySpend: number;
  rewardRate: number;
  excluded: boolean;
}

export interface CardRewardInput {
  categories: RewardCategory[];
  /** Rupees received per reward point. Use 1 for a cashback rate that is already in rupees. */
  rupeesPerPoint: number;
  /** Annual cap on reward value in rupees, before the fee. */
  annualValueCap: number;
  annualFee: number;
}

export function cardRewards(input: CardRewardInput): {
  eligibleSpend: number;
  excludedSpend: number;
  uncappedValue: number;
  cappedValue: number;
  netValue: number;
  notes: string[];
} {
  assertPositive("Rupee value per point", input.rupeesPerPoint);
  assertNonNegative("Annual cap", input.annualValueCap);
  assertNonNegative("Annual fee", input.annualFee);
  if (input.categories.length === 0) throw new FinanceError("Add at least one spend category.");
  let eligibleSpend = 0;
  let excludedSpend = 0;
  let points = 0;
  for (const category of input.categories) {
    assertNonNegative(category.name || "Spend", category.monthlySpend);
    assertNonNegative(`${category.name || "Category"} reward rate`, category.rewardRate);
    const annual = category.monthlySpend * 12;
    if (category.excluded) excludedSpend += annual;
    else {
      eligibleSpend += annual;
      points += annual * category.rewardRate;
    }
  }
  const uncappedValue = points * input.rupeesPerPoint;
  const cappedValue = input.annualValueCap > 0 ? Math.min(uncappedValue, input.annualValueCap) : uncappedValue;
  return {
    eligibleSpend,
    excludedSpend,
    uncappedValue,
    cappedValue,
    netValue: cappedValue - input.annualFee,
    notes: [
      "Enter the reward rate from the card terms you actually have. This tool does not know any card's benefits.",
      "A reward rate of 0.02 with a rupee value of 1 means 2% cashback. If you earn points, enter points per rupee as the rate and the redemption value separately.",
      "Caps, excluded categories, fees, and the redemption value all change the result.",
    ],
  };
}

export function emergencyFund(monthlyEssentials: number, existing: number): {
  scenarios: { months: number; target: number; gap: number }[];
} {
  assertNonNegative("Monthly essentials", monthlyEssentials);
  assertNonNegative("Existing emergency savings", existing);
  return {
    scenarios: [3, 6, 12].map((months) => {
      const target = monthlyEssentials * months;
      return { months, target, gap: Math.max(0, target - existing) };
    }),
  };
}

export interface InsuranceNeedInput {
  annualIncome: number;
  yearsToReplace: number;
  selfConsumptionShare: number;
  liabilities: number;
  goals: number;
  existingAssets: number;
  existingCover: number;
  discountRate: number;
}

export function insuranceNeed(input: InsuranceNeedInput): {
  incomeReplacement: number;
  grossNeed: number;
  netCoverGap: number;
} {
  assertNonNegative("Annual income", input.annualIncome);
  assertInteger("Years to replace", input.yearsToReplace, 0, 50);
  assertFinite("Spending share", input.selfConsumptionShare);
  if (input.selfConsumptionShare < 0 || input.selfConsumptionShare >= 1) {
    throw new FinanceError("The share of income you spend on yourself must be from 0% up to, but not including, 100%.");
  }
  assertNonNegative("Liabilities", input.liabilities);
  assertNonNegative("Goals", input.goals);
  assertNonNegative("Existing assets", input.existingAssets);
  assertNonNegative("Existing cover", input.existingCover);
  assertRateAboveMinusOne("Discount rate", input.discountRate);
  const annualNeed = input.annualIncome * (1 - input.selfConsumptionShare);
  let incomeReplacement = 0;
  if (input.discountRate === 0) incomeReplacement = annualNeed * input.yearsToReplace;
  else {
    const rate = input.discountRate;
    incomeReplacement = annualNeed * (1 - (1 + rate) ** -input.yearsToReplace) / rate;
  }
  const grossNeed = incomeReplacement + input.liabilities + input.goals;
  const netCoverGap = Math.max(0, grossNeed - input.existingAssets - input.existingCover);
  return { incomeReplacement, grossNeed, netCoverGap };
}

export interface SalaryPathInput {
  salary: number;
  annualHike: number;
  inflation: number;
  lifestyleGrowth: number;
  annualExpenses: number;
  years: number;
}

export function salaryPath(input: SalaryPathInput): {
  rows: { year: number; salary: number; realSalary: number; expenses: number; savings: number; savingsRate: number }[];
} {
  assertPositive("Salary", input.salary);
  assertRateAboveMinusOne("Hike", input.annualHike);
  assertRateAboveMinusOne("Inflation", input.inflation);
  assertRateAboveMinusOne("Lifestyle growth", input.lifestyleGrowth);
  assertNonNegative("Expenses", input.annualExpenses);
  assertInteger("Years", input.years, 1, 40);
  if (input.annualExpenses > input.salary) {
    throw new FinanceError("Current expenses are higher than current salary. This path would start in deficit.");
  }
  const rows = [];
  let salary = input.salary;
  let expenses = input.annualExpenses;
  for (let year = 1; year <= input.years; year += 1) {
    salary *= 1 + input.annualHike;
    expenses *= 1 + input.lifestyleGrowth;
    const savings = salary - expenses;
    rows.push({
      year,
      salary,
      realSalary: salary / (1 + input.inflation) ** year,
      expenses,
      savings,
      savingsRate: salary === 0 ? 0 : savings / salary,
    });
  }
  return { rows };
}

export interface NetWorthItem {
  name: string;
  amount: number;
}

export function netWorth(assets: NetWorthItem[], liabilities: NetWorthItem[]): {
  assets: number;
  liabilities: number;
  net: number;
} {
  const assetTotal = sumItems(assets, "Asset");
  const liabilityTotal = sumItems(liabilities, "Liability");
  return { assets: assetTotal, liabilities: liabilityTotal, net: assetTotal - liabilityTotal };
}

function sumItems(items: NetWorthItem[], label: string): number {
  return items.reduce((sum, item, index) => {
    if (!item.name.trim()) throw new FinanceError(`${label} ${index + 1} needs a name.`);
    assertFinite(`${item.name}`, item.amount);
    if (item.amount < 0) throw new FinanceError(`${item.name} cannot be negative. Put loans on the liability side.`);
    return sum + item.amount;
  }, 0);
}

export interface ExpenseRatioInput {
  annualGrossReturn: number;
  expenseRatio: number;
  comparisonExpenseRatio: number;
  years: number;
  lumpSum: number;
  monthlySip: number;
  timing: ContributionTiming;
}

export function expenseRatioImpact(input: ExpenseRatioInput): {
  netReturn: number;
  comparisonNetReturn: number;
  lumpSum: number;
  comparisonLumpSum: number;
  sip: number;
  comparisonSip: number;
} {
  assertRateAboveMinusOne("Gross return", input.annualGrossReturn);
  assertNonNegative("Expense ratio", input.expenseRatio);
  assertNonNegative("Comparison expense ratio", input.comparisonExpenseRatio);
  if (input.expenseRatio >= 1 || input.comparisonExpenseRatio >= 1) {
    throw new FinanceError("An expense ratio has to be below 100%.");
  }
  assertInteger("Years", input.years, 1, 50);
  assertNonNegative("Lump sum", input.lumpSum);
  assertNonNegative("Monthly SIP", input.monthlySip);
  const net = netOfExpense(input.annualGrossReturn, input.expenseRatio);
  const comparison = netOfExpense(input.annualGrossReturn, input.comparisonExpenseRatio);
  return {
    netReturn: net,
    comparisonNetReturn: comparison,
    lumpSum: input.lumpSum * (1 + net) ** input.years,
    comparisonLumpSum: input.lumpSum * (1 + comparison) ** input.years,
    sip: sipValue(input.monthlySip, net, input.years * 12, input.timing),
    comparisonSip: sipValue(input.monthlySip, comparison, input.years * 12, input.timing),
  };
}

function netOfExpense(gross: number, expense: number): number {
  return (1 + gross) * (1 - expense) - 1;
}

function sipValue(monthly: number, annualEffective: number, months: number, timing: ContributionTiming): number {
  if (monthly === 0) return 0;
  const rate = ratePerPeriod(annualEffective, 12, "effective-annual");
  let value = 0;
  for (let month = 0; month < months; month += 1) {
    if (timing === "start") value += monthly;
    value *= 1 + rate;
    if (timing === "end") value += monthly;
  }
  return value;
}

export interface BenchmarkInput {
  invested: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  years: number;
}

export function benchmarkGap(input: BenchmarkInput): {
  portfolioValue: number;
  benchmarkValue: number;
  gap: number;
} {
  assertPositive("Amount invested", input.invested);
  assertRateAboveMinusOne("Portfolio return", input.portfolioReturn);
  assertRateAboveMinusOne("Benchmark return", input.benchmarkReturn);
  assertInteger("Years", input.years, 1, 50);
  const portfolioValue = input.invested * (1 + input.portfolioReturn) ** input.years;
  const benchmarkValue = input.invested * (1 + input.benchmarkReturn) ** input.years;
  return { portfolioValue, benchmarkValue, gap: portfolioValue - benchmarkValue };
}

export interface Holding {
  name: string;
  value: number;
  targetWeight: number;
  annualReturn?: number;
}

export function allocation(holdings: Holding[]): {
  total: number;
  rows: { name: string; value: number; currentWeight: number; targetWeight: number; trade: number }[];
} {
  if (holdings.length === 0) throw new FinanceError("Add at least one holding.");
  const total = holdings.reduce((sum, holding) => {
    assertNonNegative(holding.name || "Holding", holding.value);
    assertNonNegative(`${holding.name || "Holding"} target`, holding.targetWeight);
    return sum + holding.value;
  }, 0);
  const targetSum = holdings.reduce((sum, holding) => sum + holding.targetWeight, 0);
  if (Math.abs(targetSum - 1) > 0.001) {
    throw new FinanceError("Target weights must add up to 100%.");
  }
  if (total === 0) throw new FinanceError("Enter a current value for at least one holding.");
  return {
    total,
    rows: holdings.map((holding) => {
      const currentWeight = holding.value / total;
      return {
        name: holding.name,
        value: holding.value,
        currentWeight,
        targetWeight: holding.targetWeight,
        trade: holding.targetWeight * total - holding.value,
      };
    }),
  };
}

export function rebalanceWithCash(holdings: Holding[], newCash: number): {
  total: number;
  buys: { name: string; amount: number }[];
} {
  assertNonNegative("New cash", newCash);
  const current = allocation(holdings);
  const total = current.total + newCash;
  const buys = holdings.map((holding) => ({
    name: holding.name,
    amount: Math.max(0, holding.targetWeight * total - holding.value),
  }));
  const buySum = buys.reduce((sum, buy) => sum + buy.amount, 0);
  if (buySum === 0) return { total, buys };
  const scale = Math.min(1, newCash / buySum);
  return { total, buys: buys.map((buy) => ({ ...buy, amount: buy.amount * scale })) };
}

export interface DrawdownInput {
  startingValue: number;
  annualReturn: number;
  years: number;
  shockYear: number;
  shockDrop: number;
  annualContribution: number;
}

export function drawdownScenario(input: DrawdownInput): {
  ending: number;
  maxDrawdown: number;
  points: { year: number; value: number; drawdown: number }[];
} {
  assertPositive("Starting value", input.startingValue);
  assertRateAboveMinusOne("Annual return", input.annualReturn);
  assertInteger("Years", input.years, 1, 50);
  assertInteger("Shock year", input.shockYear, 1, input.years);
  assertFinite("Shock", input.shockDrop);
  if (input.shockDrop < 0 || input.shockDrop >= 1) {
    throw new FinanceError("The shock has to be from 0% up to, but not including, 100%.");
  }
  assertFinite("Contribution", input.annualContribution);
  let value = input.startingValue;
  let peak = value;
  let maxDrawdown = 0;
  const points = [];
  for (let year = 1; year <= input.years; year += 1) {
    value *= 1 + input.annualReturn;
    if (year === input.shockYear) value *= 1 - input.shockDrop;
    value += input.annualContribution;
    peak = Math.max(peak, value);
    const drawdown = peak === 0 ? 0 : (peak - value) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    points.push({ year, value, drawdown });
  }
  return { ending: value, maxDrawdown, points };
}

export interface SustainabilityInput {
  corpus: number;
  annualSpending: number;
  inflation: number;
  years: number;
  returns: number[];
}

export function sustainability(input: SustainabilityInput): {
  rows: { annualReturn: number; ending: number; lasted: boolean; yearsLasted: number }[];
} {
  assertPositive("Corpus", input.corpus);
  assertPositive("Annual spending", input.annualSpending);
  assertRateAboveMinusOne("Inflation", input.inflation);
  assertInteger("Years", input.years, 1, 60);
  if (input.returns.length === 0) throw new FinanceError("Add at least one return scenario.");
  return {
    rows: input.returns.map((annualReturn) => {
      assertRateAboveMinusOne("Scenario return", annualReturn);
      let balance = input.corpus;
      let spending = input.annualSpending;
      let yearsLasted = 0;
      for (let year = 1; year <= input.years; year += 1) {
        if (balance < spending) break;
        balance -= spending;
        balance *= 1 + annualReturn;
        spending *= 1 + input.inflation;
        yearsLasted = year;
      }
      return {
        annualReturn,
        ending: Math.max(0, balance),
        lasted: yearsLasted === input.years && balance >= -0.5,
        yearsLasted,
      };
    }),
  };
}

export interface PlannedGoal {
  name: string;
  target: number;
  months: number;
  existing: number;
  annualReturn: number;
  inflation: number;
  priority: number;
  flexible: boolean;
}

export function prioritizeGoals(goals: PlannedGoal[], monthlyBudget: number): {
  rows: {
    name: string;
    requiredMonthly: number;
    allocatedMonthly: number;
    futureTarget: number;
    gap: number;
    covered: boolean;
  }[];
  unallocated: number;
} {
  assertNonNegative("Monthly budget", monthlyBudget);
  if (goals.length === 0) throw new FinanceError("Add at least one goal.");
  const ordered = [...goals].sort((a, b) => a.priority - b.priority);
  let remaining = monthlyBudget;
  const rows = ordered.map((goal) => {
    if (!goal.name.trim()) throw new FinanceError("Every goal needs a name.");
    assertNonNegative(goal.name, goal.target);
    assertInteger(`${goal.name} months`, goal.months, 1, 1200);
    assertNonNegative(`${goal.name} savings`, goal.existing);
    assertRateAboveMinusOne(`${goal.name} return`, goal.annualReturn);
    assertRateAboveMinusOne(`${goal.name} inflation`, goal.inflation);
    const futureTarget = goal.target * (1 + goal.inflation) ** (goal.months / 12);
    const futureExisting = goal.existing * (1 + goal.annualReturn) ** (goal.months / 12);
    const gap = Math.max(0, futureTarget - futureExisting);
    const requiredMonthly =
      gap === 0 ? 0 : paymentForFutureValue(gap, goal.annualReturn, goal.months, "end", "effective-annual");
    const allocatedMonthly = Math.min(requiredMonthly, remaining);
    remaining -= allocatedMonthly;
    return {
      name: goal.name,
      requiredMonthly,
      allocatedMonthly,
      futureTarget,
      gap,
      covered: allocatedMonthly + 0.5 >= requiredMonthly,
    };
  });
  return { rows, unallocated: remaining };
}

export interface ProjectionAsset {
  name: string;
  value: number;
  annualReturn: number;
  annualContribution: number;
}

export interface ProjectionLiability {
  name: string;
  balance: number;
  annualRate: number;
  annualPayment: number;
}

export function projectNetWorth(input: {
  assets: ProjectionAsset[];
  liabilities: ProjectionLiability[];
  years: number;
}): { rows: { year: number; assets: number; liabilities: number; net: number }[] } {
  assertInteger("Years", input.years, 1, 50);
  if (input.assets.length === 0) throw new FinanceError("Add at least one asset.");
  const assets = input.assets.map((asset) => {
    assertNonNegative(asset.name, asset.value);
    assertRateAboveMinusOne(`${asset.name} return`, asset.annualReturn);
    assertFinite(`${asset.name} contribution`, asset.annualContribution);
    return { ...asset };
  });
  const liabilities = input.liabilities.map((liability) => {
    assertNonNegative(liability.name, liability.balance);
    assertNonNegative(`${liability.name} rate`, liability.annualRate);
    assertNonNegative(`${liability.name} payment`, liability.annualPayment);
    return { ...liability };
  });
  const rows = [];
  for (let year = 1; year <= input.years; year += 1) {
    for (const asset of assets) {
      asset.value = asset.value * (1 + asset.annualReturn) + asset.annualContribution;
    }
    for (const liability of liabilities) {
      liability.balance = liability.balance * (1 + liability.annualRate) - liability.annualPayment;
      if (liability.balance < 0) liability.balance = 0;
    }
    const assetTotal = assets.reduce((sum, asset) => sum + asset.value, 0);
    const liabilityTotal = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
    rows.push({ year, assets: assetTotal, liabilities: liabilityTotal, net: assetTotal - liabilityTotal });
  }
  return { rows };
}

export function opportunityCost(input: {
  monthly: number;
  annualReturn: number;
  months: number;
  delayMonths: number;
  timing: ContributionTiming;
}): { startNow: number; startLater: number; gap: number } {
  assertPositive("Monthly amount", input.monthly);
  assertRateAboveMinusOne("Return", input.annualReturn);
  assertInteger("Months", input.months, 1, 600);
  assertInteger("Delay", input.delayMonths, 1, 600);
  const now = sipValue(input.monthly, input.annualReturn, input.months, input.timing);
  const rate = ratePerPeriod(input.annualReturn, 12, "effective-annual");
  const startNowAtEnd = now * (1 + rate) ** input.delayMonths;
  const startLater = sipValue(input.monthly, input.annualReturn, input.months, input.timing);
  return { startNow: startNowAtEnd, startLater, gap: startNowAtEnd - startLater };
}

export function blendedAllocation(input: {
  assets: { name: string; weight: number; annualReturn: number }[];
  lumpSum: number;
  years: number;
}): { blendedReturn: number; futureValue: number } {
  if (input.assets.length === 0) throw new FinanceError("Add at least one asset.");
  const weight = input.assets.reduce((sum, asset) => sum + asset.weight, 0);
  if (Math.abs(weight - 1) > 0.001) throw new FinanceError("Weights must add up to 100%.");
  assertNonNegative("Lump sum", input.lumpSum);
  assertInteger("Years", input.years, 1, 50);
  let blended = 0;
  for (const asset of input.assets) {
    assertRateAboveMinusOne(asset.name, asset.annualReturn);
    blended += asset.weight * asset.annualReturn;
  }
  return {
    blendedReturn: blended,
    futureValue: futureValueLumpSum(input.lumpSum, blended, input.years, "effective-annual"),
  };
}

export { emi, corpusLasts };

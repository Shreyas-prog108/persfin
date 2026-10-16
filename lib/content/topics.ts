export const TOPICS = [
  { id: "fundamentals", label: "Financial fundamentals", description: "Interest, returns, and the words around them." },
  { id: "fixed-income", label: "Savings and fixed income", description: "Deposits and bonds, including what the rate does and does not promise." },
  { id: "investing", label: "Mutual funds and investing", description: "SIPs, costs, and how a projection differs from a result." },
  { id: "tax", label: "Taxes and compliance", description: "Regimes, salary, and capital gains with the year attached." },
  { id: "loans", label: "Loans and credit", description: "EMIs, prepayment, and the cost of borrowing." },
  { id: "retirement", label: "Retirement and pensions", description: "EPF, withdrawals, and why one corpus number is not a promise." },
  { id: "planning", label: "Budgeting and planning", description: "Goals, savings rate, and net worth." },
  { id: "inflation", label: "Inflation and purchasing power", description: "What a rupee buys later." },
  { id: "insurance", label: "Insurance fundamentals", description: "Estimating a need without recommending a policy." },
  { id: "portfolio", label: "Portfolio and risk", description: "Mix, cost, and the chance of a fall." },
  { id: "protection", label: "Fraud and consumer protection", description: "What a calculator will not do for you." },
  { id: "decisions", label: "Comparisons and decisions", description: "How to read a side-by-side number." },
] as const;

export type TopicId = (typeof TOPICS)[number]["id"];

export function getTopic(id: string) {
  return TOPICS.find((topic) => topic.id === id);
}

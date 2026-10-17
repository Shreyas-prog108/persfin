import type { CalculatorResult } from "./result";

export type CategoryId =
  | "savings"
  | "investing"
  | "loans"
  | "tax"
  | "retirement"
  | "planning"
  | "portfolio"
  | "compare";

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: "savings", label: "Savings and deposits", description: "Fixed deposits, recurring deposits, and interest." },
  { id: "investing", label: "Investing", description: "SIP, lump sum, returns, bonds, and costs." },
  { id: "loans", label: "Loans and debt", description: "EMI, prepayment, affordability, and payoff order." },
  { id: "tax", label: "Tax and salary", description: "Regimes, take-home pay, HRA, and capital gains." },
  { id: "retirement", label: "Retirement", description: "EPF, PPF, NPS, FIRE, and withdrawals." },
  { id: "planning", label: "Goals and planning", description: "Goals, emergency money, insurance needs, and net worth." },
  { id: "portfolio", label: "Portfolio", description: "Allocation, rebalancing, and drawdowns." },
  { id: "compare", label: "Compare", description: "Two choices, with the assumptions kept visible." },
];

export interface SelectOption {
  value: string;
  label: string;
}

export interface ScalarField {
  type: "scalar";
  kind: "money" | "percent" | "number" | "integer" | "select" | "date" | "boolean" | "text";
  key: string;
  label: string;
  help?: string;
  defaultValue: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: SelectOption[];
  advanced?: boolean;
  param?: string;
}

export interface RowColumn {
  key: string;
  label: string;
  kind: "money" | "percent" | "number" | "integer" | "text" | "date" | "boolean";
  min?: number;
  max?: number;
  defaultValue: string | number | boolean;
}

export interface RowsField {
  type: "rows";
  key: string;
  label: string;
  help?: string;
  columns: RowColumn[];
  minRows: number;
  maxRows: number;
  defaultRows: Record<string, string | number | boolean>[];
  advanced?: boolean;
  param?: string;
}

export type Field = ScalarField | RowsField;

export type RowRecord = Record<string, number | string | boolean>;
export type ParsedValue = number | string | boolean | RowRecord[];
export type ParsedValues = Record<string, ParsedValue>;

export interface Calculator {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  category: CategoryId;
  phase: 1 | 2 | 3 | 4;
  keywords: string[];
  questions: string[];
  fields: Field[];
  calculate: (values: ParsedValues) => CalculatorResult;
  formula: string;
  methodology: string[];
  assumptions: string[];
  limitations: string[];
  related: string[];
  articles: string[];
  comparison?: boolean;
}

export interface FormSeed {
  scalars: Record<string, string>;
  rows: Record<string, Record<string, string>[]>;
}

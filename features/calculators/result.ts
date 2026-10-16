import type { Figure } from "@/lib/finance/figures";

export interface ResultMetric {
  label: string;
  value: string;
  hint?: string;
}

export interface ResultSeries {
  id: string;
  label: string;
  points: { x: string; y: number }[];
}

export interface ResultTable {
  caption: string;
  columns: string[];
  rows: string[][];
}

export interface CalculatorResult {
  /** Numeric outputs copied from the calculation engine. Display strings are not a substitute. */
  figures: Figure[];
  headline: string;
  detail?: string;
  metrics: ResultMetric[];
  series?: ResultSeries[];
  tables?: ResultTable[];
  notes: string[];
  warnings: string[];
}

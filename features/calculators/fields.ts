import type { RowColumn, RowsField, ScalarField, SelectOption } from "./types";

export function money(key: string, label: string, defaultValue: number, extra?: Partial<ScalarField>): ScalarField {
  return { type: "scalar", kind: "money", key, label, defaultValue, min: 0, step: 1, ...extra };
}

export function percent(key: string, label: string, defaultValue: number, extra?: Partial<ScalarField>): ScalarField {
  return { type: "scalar", kind: "percent", key, label, defaultValue, step: 0.01, ...extra };
}

export function integer(key: string, label: string, defaultValue: number, extra?: Partial<ScalarField>): ScalarField {
  return { type: "scalar", kind: "integer", key, label, defaultValue, step: 1, ...extra };
}

export function numberField(key: string, label: string, defaultValue: number, extra?: Partial<ScalarField>): ScalarField {
  return { type: "scalar", kind: "number", key, label, defaultValue, step: 0.01, ...extra };
}

export function select(key: string, label: string, defaultValue: string, options: SelectOption[], extra?: Partial<ScalarField>): ScalarField {
  return { type: "scalar", kind: "select", key, label, defaultValue, options, ...extra };
}

export function booleanField(key: string, label: string, defaultValue: boolean, extra?: Partial<ScalarField>): ScalarField {
  return { type: "scalar", kind: "boolean", key, label, defaultValue, ...extra };
}

export function dateField(key: string, label: string, defaultValue: string, extra?: Partial<ScalarField>): ScalarField {
  return { type: "scalar", kind: "date", key, label, defaultValue, ...extra };
}

export function textField(key: string, label: string, defaultValue: string, extra?: Partial<ScalarField>): ScalarField {
  return { type: "scalar", kind: "text", key, label, defaultValue, ...extra };
}

export function rows(
  key: string,
  label: string,
  columns: RowColumn[],
  defaultRows: Record<string, string | number | boolean>[],
  extra?: Partial<RowsField>,
): RowsField {
  return {
    type: "rows",
    key,
    label,
    columns,
    defaultRows,
    minRows: 1,
    maxRows: 20,
    ...extra,
  };
}

export const COMPOUNDING_OPTIONS: SelectOption[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half-yearly", label: "Half-yearly" },
  { value: "yearly", label: "Yearly" },
];

export const TIMING_OPTIONS: SelectOption[] = [
  { value: "start", label: "Start of each period" },
  { value: "end", label: "End of each period" },
];

export const RATE_OPTIONS: SelectOption[] = [
  { value: "effective-annual", label: "Effective annual return (CAGR style)" },
  { value: "nominal", label: "Nominal annual rate divided by 12" },
];

export const YES_NO: SelectOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

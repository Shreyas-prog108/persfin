import { FinanceError } from "@/lib/finance/errors";
import { METHODOLOGY_VERSION } from "@/lib/finance/version";
import type { Calculator, FormSeed, ParsedValues, RowColumn, RowRecord, RowsField, ScalarField } from "./types";

export interface ParseSuccess {
  ok: true;
  values: ParsedValues;
}

export interface ParseFailure {
  ok: false;
  errors: Record<string, string>;
}

export function emptySeed(calculator: Calculator): FormSeed {
  const scalars: Record<string, string> = {};
  const rows: FormSeed["rows"] = {};
  for (const field of calculator.fields) {
    if (field.type === "scalar") scalars[field.key] = scalarToString(field.defaultValue);
    else rows[field.key] = field.defaultRows.map((row) => stringifyRow(field, row));
  }
  return { scalars, rows };
}

export function seedFromSearch(
  calculator: Calculator,
  search: Record<string, string | string[] | undefined>,
): { seed: FormSeed; ignored: string[] } {
  const seed = emptySeed(calculator);
  const ignored: string[] = [];
  const version = first(search.v);
  if (version && version !== METHODOLOGY_VERSION) {
    ignored.push(`This link used methodology ${version}. Results now use ${METHODOLOGY_VERSION}.`);
  }
  for (const field of calculator.fields) {
    const raw = first(search[field.param ?? field.key]);
    if (raw === undefined || raw === "") continue;
    if (field.type === "scalar") {
      seed.scalars[field.key] = raw;
    } else {
      const parsed = decodeRows(raw, field);
      if (parsed) seed.rows[field.key] = parsed;
      else ignored.push(`${field.label} in the link could not be read, so the example rows are shown.`);
    }
  }
  return { seed, ignored };
}

export function parseSeed(calculator: Calculator, seed: FormSeed): ParseSuccess | ParseFailure {
  const values: ParsedValues = {};
  const errors: Record<string, string> = {};
  for (const field of calculator.fields) {
    if (field.type === "scalar") {
      const parsed = parseScalar(field, seed.scalars[field.key] ?? "");
      if (typeof parsed === "string" && parsed.startsWith("error:")) errors[field.key] = parsed.slice(6);
      else values[field.key] = parsed as ParsedValues[string];
    } else {
      const table = seed.rows[field.key] ?? [];
      if (table.length < field.minRows) errors[field.key] = `Add at least ${field.minRows} rows.`;
      else if (table.length > field.maxRows) errors[field.key] = `Use at most ${field.maxRows} rows.`;
      else {
        const records: RowRecord[] = [];
        table.forEach((row, index) => {
          const record: RowRecord = {};
          for (const column of field.columns) {
            const parsed = parseColumn(column, row[column.key] ?? "", `${field.label} row ${index + 1}`);
            if (typeof parsed === "string" && parsed.startsWith("error:")) {
              errors[`${field.key}.${index}.${column.key}`] = parsed.slice(6);
            } else {
              record[column.key] = parsed as RowRecord[string];
            }
          }
          records.push(record);
        });
        values[field.key] = records;
      }
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, values };
}

export function shareQuery(calculator: Calculator, seed: FormSeed): string {
  const defaults = emptySeed(calculator);
  const params = new URLSearchParams();
  let changed = false;
  for (const field of calculator.fields) {
    const param = field.param ?? field.key;
    if (field.type === "scalar") {
      const value = seed.scalars[field.key] ?? "";
      if (value !== defaults.scalars[field.key]) {
        params.set(param, value);
        changed = true;
      }
    } else {
      const encoded = encodeRows(seed.rows[field.key] ?? []);
      const defaultEncoded = encodeRows(defaults.rows[field.key] ?? []);
      if (encoded !== defaultEncoded) {
        params.set(param, encoded);
        changed = true;
      }
    }
  }
  if (changed) params.set("v", METHODOLOGY_VERSION);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function summaryText(calculator: Calculator, headline: string, metrics: { label: string; value: string }[]): string {
  const lines = [`${calculator.title}`, headline, ...metrics.map((metric) => `${metric.label}: ${metric.value}`)];
  lines.push("Illustration only. Hisab does not guarantee a return, a tax outcome, or a loan approval.");
  return lines.join("\n");
}

function parseScalar(field: ScalarField, raw: string): ParsedValues[string] | `error:${string}` {
  if (field.kind === "boolean") return raw === "true" || raw === "1" || raw === "on";
  if (field.kind === "select") {
    if (!field.options?.some((option) => option.value === raw)) return `error:Choose a valid ${field.label.toLowerCase()}.`;
    return raw;
  }
  if (field.kind === "text" || field.kind === "date") {
    if (!raw.trim()) return `error:${field.label} is required.`;
    if (field.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "error:Use a YYYY-MM-DD date.";
    return raw;
  }
  return parseNumber(field.label, raw, field.kind, field.min, field.max);
}

function parseColumn(column: RowColumn, raw: string, label: string): RowRecord[string] | `error:${string}` {
  if (column.kind === "boolean") return raw === "true" || raw === "1";
  if (column.kind === "text" || column.kind === "date") {
    if (!raw.trim()) return `error:${label}: ${column.label} is required.`;
    return raw;
  }
  return parseNumber(`${label} ${column.label}`, raw, column.kind, column.min, column.max);
}

function parseNumber(
  label: string,
  raw: string,
  kind: "money" | "percent" | "number" | "integer",
  min?: number,
  max?: number,
): number | `error:${string}` {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return `error:${label} is required.`;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return `error:${label} must be a finite number.`;
  if (kind === "integer" && !Number.isInteger(value)) return `error:${label} must be a whole number.`;
  if (min !== undefined && value < min) return `error:${label} must be at least ${min}.`;
  if (max !== undefined && value > max) return `error:${label} must be at most ${max}.`;
  return kind === "percent" ? value / 100 : value;
}

function scalarToString(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function stringifyRow(field: RowsField, row: Record<string, string | number | boolean>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const column of field.columns) {
    const value = row[column.key] ?? column.defaultValue;
    out[column.key] = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
  }
  return out;
}

function encodeRows(rows: Record<string, string>[]): string {
  return rows
    .map((row) => Object.keys(row).sort().map((key) => `${encodeURIComponent(key)}:${encodeURIComponent(row[key] ?? "")}`).join("~"))
    .join("|");
}

function decodeRows(raw: string, field: RowsField): Record<string, string>[] | null {
  try {
    const decoded = raw.split("|").filter(Boolean).map((part) => {
      const record: Record<string, string> = {};
      for (const column of field.columns) record[column.key] = String(column.defaultValue);
      for (const cell of part.split("~")) {
        const [key, value] = cell.split(":");
        if (!key || value === undefined) return null;
        record[decodeURIComponent(key)] = decodeURIComponent(value);
      }
      return record;
    });
    if (decoded.some((row) => row === null)) return null;
    return decoded as Record<string, string>[];
  } catch {
    return null;
  }
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function readNumber(values: ParsedValues, key: string): number {
  const value = values[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new FinanceError(`${key} is not a valid number.`);
  return value;
}

export function readString(values: ParsedValues, key: string): string {
  const value = values[key];
  if (typeof value !== "string") throw new FinanceError(`${key} is not valid.`);
  return value;
}

export function readBoolean(values: ParsedValues, key: string): boolean {
  const value = values[key];
  if (typeof value !== "boolean") throw new FinanceError(`${key} is not valid.`);
  return value;
}

export function readRows(values: ParsedValues, key: string): RowRecord[] {
  const value = values[key];
  if (!Array.isArray(value)) throw new FinanceError(`${key} is not a table.`);
  return value;
}

"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getCalculator } from "@/features/calculators/registry";
import { parseSeed, seedFromSearch, shareQuery, summaryText } from "@/features/calculators/parse";
import type { Calculator, FormSeed, RowsField, ScalarField } from "@/features/calculators/types";
import { FinanceError } from "@/lib/finance/errors";
import { METHODOLOGY_VERSION } from "@/lib/finance/version";

const seedCache = new Map<string, FormSeed>();

function seedFromLocation(calculator: Calculator, fallback: FormSeed): FormSeed {
  const key = `${calculator.slug}:${window.location.search}`;
  const cached = seedCache.get(key);
  if (cached) return cached;
  if (!window.location.search) {
    seedCache.set(key, fallback);
    return fallback;
  }
  const record: Record<string, string> = {};
  new URLSearchParams(window.location.search).forEach((value, name) => {
    record[name] = value;
  });
  const next = seedFromSearch(calculator, record).seed;
  seedCache.set(key, next);
  return next;
}

const GrowthChart = dynamic(() => import("./growth-chart").then((mod) => mod.GrowthChart), {
  ssr: false,
  loading: () => <div className="h-72 rounded-2xl bg-surface-2" />,
});

export function CalculatorWorkspace({ slug, seed, ignored }: { slug: string; seed: FormSeed; ignored: string[] }) {
  const calculator = getCalculator(slug);
  const locationSeed = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("popstate", onStoreChange);
      return () => window.removeEventListener("popstate", onStoreChange);
    },
    () => (calculator ? seedFromLocation(calculator, seed) : seed),
    () => seed,
  );
  const [edited, setEdited] = useState<FormSeed | null>(null);
  const form = edited ?? locationSeed;
  if (!calculator) return null;

  const parsed = parseSeed(calculator, form);
  let failure = "";
  let result = null as ReturnType<Calculator["calculate"]> | null;
  if (parsed.ok) {
    try {
      result = calculator.calculate(parsed.values);
    } catch (error) {
      failure = error instanceof FinanceError ? error.message : "The calculation could not be completed.";
    }
  }

  const advanced = calculator.fields.filter((field) => field.advanced);
  const primary = calculator.fields.filter((field) => !field.advanced);

  function updateUrl(next: FormSeed) {
    const query = shareQuery(calculator!, next);
    const path = `/calculators/${calculator!.slug}${query}`;
    seedCache.set(`${calculator!.slug}:${query ? `?${query.replace(/^\?/, "")}` : ""}`, next);
    window.history.replaceState(null, "", path);
  }

  function setScalar(key: string, value: string) {
    const next = { ...form, scalars: { ...form.scalars, [key]: value } };
    setEdited(next);
    updateUrl(next);
  }

  function setRow(fieldKey: string, index: number, column: string, value: string) {
    const table = (form.rows[fieldKey] ?? []).map((row, rowIndex) =>
      rowIndex === index ? { ...row, [column]: value } : row,
    );
    const next = { ...form, rows: { ...form.rows, [fieldKey]: table } };
    setEdited(next);
    updateUrl(next);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <form className="rounded-3xl border border-line bg-surface p-4 sm:p-6" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-4">
          {primary.map((field) => (
            <FieldControl key={field.key} field={field} form={form} errors={parsed.ok ? {} : parsed.errors} onScalar={setScalar} onRow={setRow}             onRows={(key, rows) => {
              const next = { ...form, rows: { ...form.rows, [key]: rows } };
              setEdited(next);
              updateUrl(next);
            }} />
          ))}
        </div>
        {advanced.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-accent">More assumptions</summary>
            <div className="mt-4 space-y-4">
              {advanced.map((field) => (
                <FieldControl key={field.key} field={field} form={form} errors={parsed.ok ? {} : parsed.errors} onScalar={setScalar} onRow={setRow} onRows={(key, rows) => {
                  const next = { ...form, rows: { ...form.rows, [key]: rows } };
                  setEdited(next);
                  updateUrl(next);
                }} />
              ))}
            </div>
          </details>
        )}
        <p className="mt-4 text-xs text-muted">Methodology {METHODOLOGY_VERSION}. Changing a number updates the result on this page.</p>
      </form>
      <section aria-live="polite" className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        {ignored.map((note) => (
          <p key={note} className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-warning">{note}</p>
        ))}
        {!parsed.ok && (
          <div>
            <h2 className="text-2xl">Check the inputs</h2>
            <ul className="mt-3 list-disc pl-5 text-sm text-danger">
              {Object.entries(parsed.errors).map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          </div>
        )}
        {failure && <p className="text-danger">{failure}</p>}
        {result && (
          <div className="space-y-5">
            <div>
              <h2 className="text-3xl">{result.headline}</h2>
              {result.detail && <p className="mt-2 text-muted">{result.detail}</p>}
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {result.metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl bg-surface-2 px-3 py-3">
                  <dt className="text-sm text-muted">{metric.label}</dt>
                  <dd className="text-lg font-medium">{metric.value}</dd>
                  {metric.hint && <p className="text-xs text-muted">{metric.hint}</p>}
                </div>
              ))}
            </dl>
            {result.series && result.series.length > 0 && <GrowthChart series={result.series} />}
            {result.tables?.map((table) => (
              <div key={table.caption} className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="mb-2 text-left text-muted">{table.caption}</caption>
                  <thead>
                    <tr>{table.columns.map((column) => <th key={column} className="border-b border-line py-2 pr-3 font-medium">{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, index) => (
                      <tr key={`${table.caption}-${index}`}>
                        {row.map((cell, cellIndex) => <td key={cellIndex} className="border-b border-line py-2 pr-3">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {result.warnings.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-warning">
                {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            )}
            {result.notes.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                {result.notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            )}
            <ShareBar calculator={calculator} headline={result.headline} metrics={result.metrics} />
          </div>
        )}
      </section>
    </div>
  );
}

function FieldControl({
  field,
  form,
  errors,
  onScalar,
  onRow,
  onRows,
}: {
  field: Calculator["fields"][number];
  form: FormSeed;
  errors: Record<string, string>;
  onScalar: (key: string, value: string) => void;
  onRow: (fieldKey: string, index: number, column: string, value: string) => void;
  onRows: (fieldKey: string, rows: Record<string, string>[]) => void;
}) {
  if (field.type === "rows") return <RowsControl field={field} rows={form.rows[field.key] ?? []} error={errors[field.key]} onRow={onRow} onRows={onRows} />;
  return <ScalarControl field={field} value={form.scalars[field.key] ?? ""} error={errors[field.key]} onChange={onScalar} />;
}

function ScalarControl({ field, value, error, onChange }: { field: ScalarField; value: string; error?: string; onChange: (key: string, value: string) => void }) {
  const id = `field-${field.key}`;
  return (
    <div>
      {field.kind !== "boolean" && <label htmlFor={id} className="mb-1 block text-sm font-medium">{field.label}</label>}
      {field.kind === "select" ? (
        <select id={id} className={inputClass} value={value} onChange={(event) => onChange(field.key, event.target.value)}>
          {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : field.kind === "boolean" ? (
        <label htmlFor={id} className="flex items-start gap-2 text-sm">
          <input id={id} type="checkbox" className="mt-1" checked={value === "true"} onChange={(event) => onChange(field.key, event.target.checked ? "true" : "false")} />
          <span>{field.label}</span>
        </label>
      ) : (
        <input
          id={id}
          className={inputClass}
          type={field.kind === "date" ? "date" : field.kind === "text" ? "text" : "number"}
          inputMode={field.kind === "text" || field.kind === "date" ? undefined : "decimal"}
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      )}
      {field.help && <p className="mt-1 text-xs text-muted">{field.help}</p>}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

function RowsControl({
  field,
  rows,
  error,
  onRow,
  onRows,
}: {
  field: RowsField;
  rows: Record<string, string>[];
  error?: string;
  onRow: (fieldKey: string, index: number, column: string, value: string) => void;
  onRows: (fieldKey: string, rows: Record<string, string>[]) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{field.label}</legend>
      {field.help && <p className="text-xs text-muted">{field.help}</p>}
      {rows.map((row, index) => (
        <div key={index} className="rounded-2xl border border-line p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>Row {index + 1}</span>
            {rows.length > field.minRows && (
              <button type="button" className="text-danger" onClick={() => onRows(field.key, rows.filter((_, rowIndex) => rowIndex !== index))}>
                Remove
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {field.columns.map((column) => (
              <label key={column.key} className="text-sm">
                <span className="mb-1 block text-muted">{column.label}</span>
                {column.kind === "boolean" ? (
                  <input type="checkbox" checked={row[column.key] === "true"} onChange={(event) => onRow(field.key, index, column.key, event.target.checked ? "true" : "false")} />
                ) : (
                  <input
                    className={inputClass}
                    type={column.kind === "date" ? "date" : column.kind === "text" ? "text" : "number"}
                    value={row[column.key] ?? ""}
                    min={column.min}
                    max={column.max}
                    onChange={(event) => onRow(field.key, index, column.key, event.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
      {rows.length < field.maxRows && (
        <button
          type="button"
          className="rounded-full border border-line px-3 py-2 text-sm"
          onClick={() => onRows(field.key, [...rows, Object.fromEntries(field.columns.map((column) => [column.key, String(column.defaultValue)]))])}
        >
          Add row
        </button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}

function ShareBar({ calculator, headline, metrics }: { calculator: Calculator; headline: string; metrics: { label: string; value: string }[] }) {
  const summary = useMemo(() => summaryText(calculator, headline, metrics), [calculator, headline, metrics]);
  const [message, setMessage] = useState("");

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setMessage(label);
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: calculator.title, text: headline, url });
      return;
    }
    await copy(url, "Link copied");
  }

  function download() {
    const lines = metrics.slice(0, 4).map((metric, index) => `<text x="48" y="${210 + index * 42}" font-size="22" font-family="Georgia, serif" fill="#1c1915">${escapeXml(metric.label)}: ${escapeXml(metric.value)}</text>`).join("");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f3efe6"/>
  <rect x="36" y="36" width="1128" height="558" rx="28" fill="#fffdf8" stroke="#ddd4c3"/>
  <text x="48" y="100" font-size="28" font-family="Georgia, serif" fill="#0e6b52">Hisab</text>
  <text x="48" y="160" font-size="42" font-family="Georgia, serif" fill="#1c1915">${escapeXml(calculator.shortTitle)}</text>
  <text x="48" y="210" font-size="28" font-family="Georgia, serif" fill="#1c1915">${escapeXml(headline).slice(0, 90)}</text>
  <g transform="translate(0,40)">${lines}</g>
  <text x="48" y="540" font-size="18" font-family="sans-serif" fill="#5f584e">Illustration only. Assumptions are in the link. Not a guaranteed return.</text>
</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${calculator.slug}-hisab.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} onClick={() => copy(window.location.href, "Link copied")}>Copy link</button>
      <button type="button" className={buttonClass} onClick={() => copy(summary, "Summary copied")}>Copy summary</button>
      <button type="button" className={buttonClass} onClick={() => void share()}>Share</button>
      <button type="button" className={buttonClass} onClick={download}>Download card</button>
      {message && <p className="self-center text-sm text-muted">{message}</p>}
    </div>
  );
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const inputClass = "min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-base";
const buttonClass = "min-h-11 rounded-full border border-line px-4 py-2 text-sm";

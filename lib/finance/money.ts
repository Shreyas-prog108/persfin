const inrFormatters = new Map<number, Intl.NumberFormat>();

function formatter(digits: number): Intl.NumberFormat {
  const existing = inrFormatters.get(digits);
  if (existing) return existing;
  const created = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  inrFormatters.set(digits, created);
  return created;
}

/** Display rounding only. Callers must not feed this back into calculations. */
export function formatINR(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return formatter(digits).format(value);
}

export function formatINRWhole(value: number): string {
  return formatINR(value, Math.abs(value) >= 100 ? 0 : 2);
}

export function formatPercent(rate: number, digits = 2): string {
  if (!Number.isFinite(rate)) return "—";
  return `${(rate * 100).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Nearest rupee, half away from zero via Math.round. */
export function roundRupee(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Cannot round a non-finite amount.");
  }
  return Math.round(value);
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export type FigureUnit = "inr" | "rate" | "count" | "months";

/** A calculation output an agent may cite. Amounts are rupees. Rates are decimals, not percents. */
export interface Figure {
  id: string;
  unit: FigureUnit;
  value: number | null;
}

export function inr(id: string, value: number | null): Figure {
  return { id, unit: "inr", value };
}

export function rate(id: string, value: number | null): Figure {
  return { id, unit: "rate", value };
}

export function count(id: string, value: number | null): Figure {
  return { id, unit: "count", value };
}

export function months(id: string, value: number): Figure {
  return { id, unit: "months", value };
}

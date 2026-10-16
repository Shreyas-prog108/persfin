"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ResultSeries } from "@/features/calculators/result";
import { formatINRWhole } from "@/lib/finance/money";

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function GrowthChart({ series }: { series: ResultSeries[] }) {
  const labels = new Set<string>();
  for (const line of series) {
    for (const point of line.points) labels.add(point.x);
  }
  const data = [...labels].map((label) => {
    const row: Record<string, string | number> = { x: label };
    for (const line of series) {
      const point = line.points.find((item) => item.x === label);
      if (point) row[line.id] = Math.round(point.y);
    }
    return row;
  });
  if (data.length < 2) return null;

  return (
    <div className="h-72 w-full" role="img" aria-label="Chart of the calculation. The same numbers are in the table below.">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="x" tick={{ fill: "var(--muted)", fontSize: 12 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} width={72} tickFormatter={(value: number) => formatINRWhole(value)} />
          <Tooltip formatter={(value) => formatINRWhole(Number(value ?? 0))} />
          <Legend />
          {series.map((line, index) => (
            <Line key={line.id} type="monotone" dataKey={line.id} name={line.label} stroke={colors[index % colors.length]} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function QuickGoal() {
  const router = useRouter();
  const [name, setName] = useState("Emergency fund");
  const [target, setTarget] = useState("300000");
  const [years, setYears] = useState("2");

  return (
    <form
      className="grid gap-3 sm:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        const months = Math.max(0, Math.round(Number(years) * 12));
        const params = new URLSearchParams({
          target,
          months: String(months),
        });
        router.push(`/calculators/goal-investment?${params.toString()}`);
      }}
    >
      <label className="text-sm sm:col-span-1">
        Goal
        <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="text-sm">
        Target today (₹)
        <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} />
      </label>
      <label className="text-sm">
        Years
        <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3" inputMode="decimal" value={years} onChange={(event) => setYears(event.target.value)} />
      </label>
      <button className="mt-6 min-h-11 rounded-full bg-accent px-4 text-accent-ink" type="submit">
        Build the plan
      </button>
      <p className="text-xs text-muted sm:col-span-4">The name stays on this page. The link carries only the amount and the months, so you can edit the return and inflation next.</p>
    </form>
  );
}

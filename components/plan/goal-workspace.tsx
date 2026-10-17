"use client";

import { useState, useSyncExternalStore } from "react";
import { prioritizeGoals } from "@/lib/finance";
import { formatINR } from "@/lib/finance/money";
import {
  clearGoals,
  getGoalServerSnapshot,
  getGoalSnapshot,
  saveGoals,
  subscribeGoals,
  type SavedGoal,
} from "./goal-store";

const blank: Omit<SavedGoal, "id"> = {
  name: "",
  target: 0,
  months: 12,
  existing: 0,
  annualReturn: 0.07,
  inflation: 0.05,
  priority: 1,
  flexible: true,
};

export function GoalWorkspace() {
  const store = useSyncExternalStore(subscribeGoals, getGoalSnapshot, getGoalServerSnapshot);
  const [draft, setDraft] = useState(blank);
  const plan = store.goals.length ? prioritizeGoals(store.goals, store.budget) : null;

  function addGoal() {
    if (!draft.name.trim() || draft.target < 0 || draft.months < 1) return;
    saveGoals({
      ...store,
      goals: [...store.goals, { ...draft, id: crypto.randomUUID() }],
    });
    setDraft({ ...blank, priority: store.goals.length + 2 });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-line bg-surface p-4">
        <h2 className="text-2xl">Add a goal</h2>
        <div className="mt-4 grid gap-3">
          <label className="text-sm">Name
            <input className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="text-sm">Target in current rupees
            <input className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" inputMode="decimal" value={draft.target || ""} onChange={(event) => setDraft({ ...draft, target: Number(event.target.value) })} />
          </label>
          <label className="text-sm">Months
            <input className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" inputMode="numeric" value={draft.months} onChange={(event) => setDraft({ ...draft, months: Number(event.target.value) })} />
          </label>
          <label className="text-sm">Already saved
            <input className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" inputMode="decimal" value={draft.existing || ""} onChange={(event) => setDraft({ ...draft, existing: Number(event.target.value) })} />
          </label>
          <label className="text-sm">Assumed annual return (%)
            <input className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" inputMode="decimal" value={draft.annualReturn * 100} onChange={(event) => setDraft({ ...draft, annualReturn: Number(event.target.value) / 100 })} />
          </label>
          <label className="text-sm">Inflation (%)
            <input className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" inputMode="decimal" value={draft.inflation * 100} onChange={(event) => setDraft({ ...draft, inflation: Number(event.target.value) / 100 })} />
          </label>
          <label className="text-sm">Priority, 1 is first
            <input className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" inputMode="numeric" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.flexible} onChange={(event) => setDraft({ ...draft, flexible: event.target.checked })} />
            The date can move
          </label>
          <button type="button" className="min-h-11 rounded-full bg-accent px-4 text-accent-ink" onClick={addGoal}>Save goal on this device</button>
        </div>
      </section>
      <section className="rounded-3xl border border-line bg-surface p-4">
        <label className="text-sm">Monthly savings budget
          <input className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" inputMode="decimal" value={store.budget} onChange={(event) => saveGoals({ ...store, budget: Number(event.target.value) })} />
        </label>
        <ul className="mt-4 space-y-3">
          {store.goals.map((goal) => (
            <li key={goal.id} className="rounded-2xl bg-surface-2 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{goal.name}</p>
                  <p className="text-sm text-muted">Priority {goal.priority}. {goal.flexible ? "Date can move." : "Date is fixed."}</p>
                </div>
                <button type="button" className="text-sm text-danger" onClick={() => saveGoals({ ...store, goals: store.goals.filter((item) => item.id !== goal.id) })}>Remove</button>
              </div>
            </li>
          ))}
          {store.goals.length === 0 && <li className="text-muted">No goals saved yet. A goal is optional and stays in this browser.</li>}
        </ul>
        {plan && (
          <div className="mt-4">
            <h2 className="text-xl">This month</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {plan.rows.map((row) => (
                <li key={row.name}>
                  {row.name}: {formatINR(row.allocatedMonthly, 0)} of {formatINR(row.requiredMonthly, 0)} needed. {row.covered ? "Covered." : "Short."}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">Unallocated: {formatINR(plan.unallocated, 0)}.</p>
          </div>
        )}
        <button type="button" className="mt-4 text-sm text-danger" onClick={() => clearGoals()}>
          Clear saved goals
        </button>
      </section>
    </div>
  );
}

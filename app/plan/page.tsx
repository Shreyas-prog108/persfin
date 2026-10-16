import type { Metadata } from "next";
import Link from "next/link";
import { GoalWorkspace } from "@/components/plan/goal-workspace";

export const metadata: Metadata = {
  title: "Plan",
  description: "A local goal planner for emergency funds, education, a house, and retirement. No account required.",
  alternates: { canonical: "/plan" },
};

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl">Plan</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Add more than one goal and see which monthly SIP the budget can cover. The return is an assumption you type. Goals are stored in this browser, not in an account.
      </p>
      <div className="mt-6">
        <GoalWorkspace />
      </div>
      <p className="mt-6 text-sm">
        Prefer a one-off number? Use the <Link href="/calculators/goal-investment">goal calculator</Link> or the <Link href="/calculators/multi-goal">multi-goal calculator</Link>.
      </p>
    </div>
  );
}

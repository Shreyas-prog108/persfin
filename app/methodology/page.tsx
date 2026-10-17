import type { Metadata } from "next";
import Link from "next/link";
import { METHODOLOGY_VERSION } from "@/lib/finance/version";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How Hisab separates a formula, a tax rule, and an assumption.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-4xl">Methodology</h1>
      <p className="mt-3 text-muted">Version {METHODOLOGY_VERSION}. A shared link stores this version so an old result can be recognised after a formula change.</p>
      <h2 className="mt-8 text-2xl">What is calculated</h2>
      <p className="mt-3">Deposit, loan, return, bond, retirement, and goal maths live in <span className="font-medium">lib/finance</span>. Pages do not keep a second copy of a formula. Display rounding happens after the result exists.</p>
      <h2 className="mt-8 text-2xl">What is a rule</h2>
      <p className="mt-3">Income-tax slabs, rebates, surcharge, and cess are versioned by financial year in <span className="font-medium">lib/finance/tax</span>. Capital-gains rates are a separate rule set dated from 23 July 2024. Changing a slab means adding a year, not editing a shared constant in silence.</p>
      <h2 className="mt-8 text-2xl">What you must type</h2>
      <p className="mt-3">FD rates, fund returns, inflation, annuity rates, and card rewards are inputs. A labelled default, such as PPF at 7.1% for the October 2026 quarter or EPF at 8.25% for FY 2025-26, is marked with its period. It is not described as a permanent rate.</p>
      <h2 className="mt-8 text-2xl">What a model must not do</h2>
      <p className="mt-3">A future assistant can call the tools in <span className="font-medium">lib/agent</span>. It does not get to invent a maturity value, a slab, or another users saved goals. There is no chat box in this release.</p>
      <p className="mt-6"><Link href="/sources">Sources and gaps</Link></p>
    </div>
  );
}

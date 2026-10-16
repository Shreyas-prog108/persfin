import type { Metadata } from "next";
import Link from "next/link";
import { comparisonCalculators } from "@/features/calculators/registry";

export const metadata: Metadata = {
  title: "Compare",
  description: "Side-by-side Indian personal finance scenarios with the assumptions left visible.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  const items = comparisonCalculators();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl">Compare</h1>
      <p className="mt-3 max-w-2xl text-muted">
        A comparison is useful when both sides use rates you can point to. Hisab will not invent a fund return, a house price path, or a card benefit to make one side win.
      </p>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {items.map((calculator) => (
          <li key={calculator.slug}>
            <Link href={`/calculators/${calculator.slug}`} className="block rounded-2xl border border-line bg-surface p-4 no-underline">
              <span className="font-medium">{calculator.title}</span>
              <span className="mt-2 block text-sm text-muted">{calculator.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

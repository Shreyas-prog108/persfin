import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorSearch } from "@/components/search/calculator-search";
import { calculatorsInCategory } from "@/features/calculators/registry";
import { CATEGORIES } from "@/features/calculators/types";

export const metadata: Metadata = {
  title: "Calculators",
  description: "Indian personal finance calculators for deposits, SIPs, loans, tax, retirement, and goals.",
  alternates: { canonical: "/calculators" },
};

export default function CalculatorsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl">Calculators</h1>
      <p className="mt-3 max-w-2xl text-muted">Every tool runs the same calculation engine. The assumptions sit next to the result.</p>
      <div className="mt-6 max-w-2xl">
        <CalculatorSearch />
      </div>
      {CATEGORIES.map((category) => {
        const items = calculatorsInCategory(category.id);
        if (items.length === 0) return null;
        return (
          <section key={category.id} id={category.id} className="mt-10">
            <h2 className="text-2xl">{category.label}</h2>
            <p className="mt-1 text-sm text-muted">{category.description}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((calculator) => (
                <li key={calculator.slug}>
                  <Link href={`/calculators/${calculator.slug}`} className="block h-full rounded-2xl border border-line bg-surface p-4 no-underline">
                    <span className="font-medium">{calculator.shortTitle}</span>
                    <span className="mt-2 block text-sm text-muted">{calculator.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

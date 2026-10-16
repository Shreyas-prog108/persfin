import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorSearch } from "@/components/search/calculator-search";
import { TOPICS } from "@/lib/content/topics";
import { calculators } from "@/features/calculators/registry";

export const metadata: Metadata = {
  title: "Explore",
  description: "Search Hisab's calculators and guides by the money question you actually have.",
  alternates: { canonical: "/explore" },
};

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl">Explore</h1>
      <p className="mt-3 max-w-2xl text-muted">{calculators.length} calculators, plus guides that link back to the same maths.</p>
      <div className="mt-6 max-w-2xl">
        <CalculatorSearch large />
      </div>
      <section className="mt-10">
        <h2 className="text-2xl">Guides by topic</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic) => (
            <li key={topic.id}>
              <Link href={`/learn/topics/${topic.id}`} className="block rounded-2xl border border-line p-4 no-underline">
                <span className="font-medium">{topic.label}</span>
                <span className="mt-2 block text-sm text-muted">{topic.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { searchCalculators } from "@/features/calculators/search";

const prompts = [
  "How much will my FD earn?",
  "How much should I invest monthly?",
  "What will inflation do to my savings?",
  "Should I prepay my loan?",
  "How much money will I need to retire?",
];

export function CalculatorSearch({ large = false }: { large?: boolean }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchCalculators(query, large ? 6 : 5), [query, large]);

  return (
    <div className="relative">
      <label htmlFor="calculator-search" className="mb-2 block text-sm font-medium">
        Search a calculator or ask a money question
      </label>
      <input
        id="calculator-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="How much will my FD earn?"
        className="min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="calculator-search-results"
        autoComplete="off"
      />
      {query.trim() === "" && large && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <li key={prompt}>
              <button type="button" className="rounded-full border border-line px-3 py-1 text-sm" onClick={() => setQuery(prompt)}>
                {prompt}
              </button>
            </li>
          ))}
        </ul>
      )}
      {results.length > 0 && (
        <ul id="calculator-search-results" className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface" role="listbox">
          {results.map((calculator) => (
            <li key={calculator.slug}>
              <Link href={`/calculators/${calculator.slug}`} className="block px-4 py-3 no-underline hover:bg-surface-2">
                <span className="font-medium">{calculator.title}</span>
                <span className="mt-1 block text-sm text-muted">{calculator.description}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={`/search?q=${encodeURIComponent(query)}`} className="block px-4 py-3 text-sm text-accent no-underline">
              See all matches
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { searchCalculators } from "@/features/calculators/search";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Hisab calculators.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export default function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="px-4 py-8">Searching…</p>}>
      <Results searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q : "";
  const matches = q ? searchCalculators(q, 20) : [];
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-4xl">Search</h1>
      <form className="mt-4" action="/search">
        <label htmlFor="q" className="text-sm">Calculator or question</label>
        <input id="q" name="q" defaultValue={q} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3" />
      </form>
      <ul className="mt-6 space-y-3">
        {matches.map((calculator) => (
          <li key={calculator.slug}>
            <Link href={`/calculators/${calculator.slug}`} className="no-underline">
              <span className="font-medium">{calculator.title}</span>
              <span className="mt-1 block text-sm text-muted">{calculator.description}</span>
            </Link>
          </li>
        ))}
        {q && matches.length === 0 && <li>No calculator matched that question. Try FD, SIP, tax, or retirement.</li>}
      </ul>
    </div>
  );
}

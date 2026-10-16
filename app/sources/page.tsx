import type { Metadata } from "next";
import { dataSources } from "@/lib/data-sources/registry";

export const metadata: Metadata = {
  title: "Sources",
  description: "Official sources behind Hisab's tax rules, and the datasets that stay manual.",
  alternates: { canonical: "/sources" },
};

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-4xl">Sources</h1>
      <p className="mt-3 text-muted">
        Hisab does not scrape these sites on each visit. A person reviewed the pages below on the date shown. If a figure is missing or only reported second-hand, the calculator asks you to type it.
      </p>
      <ul className="mt-8 space-y-4">
        {dataSources.map((source) => (
          <li key={source.id} className="rounded-2xl border border-line bg-surface p-4">
            <a href={source.url} className="font-medium">{source.title}</a>
            <p className="text-sm text-muted">{source.publisher} · checked {source.lastChecked} · {source.validation}</p>
            <p className="mt-2 text-sm">{source.notes}</p>
            <p className="mt-1 text-xs text-muted">{source.effectivePeriod}. Retrieval: {source.retrieval}.</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

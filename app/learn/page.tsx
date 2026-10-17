import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/lib/content/articles";
import { TOPICS } from "@/lib/content/topics";

export const metadata: Metadata = {
  title: "Learn",
  description: "Plain-language guides to Indian personal finance, each linked to a calculator and a source.",
  alternates: { canonical: "/learn" },
};

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl">Learn</h1>
      <p className="mt-3 max-w-2xl text-muted">Short guides for the questions the calculators raise. Numbers in the examples are stated assumptions, not market facts.</p>
      <ul className="mt-8 space-y-8">
        {TOPICS.map((topic) => {
          const items = articles.filter((article) => article.topic === topic.id);
          if (items.length === 0) return null;
          return (
            <li key={topic.id}>
              <h2 className="text-2xl"><Link href={`/learn/topics/${topic.id}`}>{topic.label}</Link></h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {items.map((article) => (
                  <li key={article.slug}>
                    <Link href={`/learn/${article.slug}`} className="block rounded-2xl border border-line bg-surface p-4 no-underline">
                      <span className="font-medium">{article.title}</span>
                      <span className="mt-2 block text-sm text-muted">{article.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

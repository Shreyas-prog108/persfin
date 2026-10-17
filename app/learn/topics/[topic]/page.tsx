import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/lib/content/articles";
import { TOPICS, getTopic } from "@/lib/content/topics";

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ topic: topic.id }));
}

export async function generateMetadata(props: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic } = await props.params;
  const found = getTopic(topic);
  if (!found) return { title: "Topic" };
  return {
    title: found.label,
    description: found.description,
    alternates: { canonical: `/learn/topics/${found.id}` },
  };
}

export default async function Page(props: { params: Promise<{ topic: string }> }) {
  const { topic } = await props.params;
  const found = getTopic(topic);
  if (!found) notFound();
  const items = articles.filter((article) => article.topic === found.id);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-sm text-muted"><Link href="/learn">Learn</Link></nav>
      <h1 className="mt-3 text-4xl">{found.label}</h1>
      <p className="mt-3 text-muted">{found.description}</p>
      <ul className="mt-6 space-y-3">
        {items.map((article) => (
          <li key={article.slug}>
            <Link href={`/learn/${article.slug}`}>{article.title}</Link>
            <p className="text-sm text-muted">{article.description}</p>
          </li>
        ))}
        {items.length === 0 && <li>No guide is filed under this topic yet. The calculators in Explore still cover the question.</li>}
      </ul>
    </div>
  );
}

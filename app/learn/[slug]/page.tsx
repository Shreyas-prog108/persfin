import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, getArticle } from "@/lib/content/articles";
import { getTopic } from "@/lib/content/topics";
import { absoluteUrl } from "@/lib/seo/site";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const article = getArticle(slug);
  if (!article) return { title: "Guide" };
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/learn/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url: absoluteUrl(`/learn/${article.slug}`),
    },
  };
}

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const article = getArticle(slug);
  if (!article) notFound();
  const topic = getTopic(article.topic);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.published,
    dateModified: article.reviewed,
    mainEntityOfPage: absoluteUrl(`/learn/${article.slug}`),
    author: { "@type": "Organization", name: "Hisab", url: absoluteUrl("/") },
  };
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/learn">Learn</Link>
        {topic && (
          <>
            <span aria-hidden="true"> / </span>
            <Link href={`/learn/topics/${topic.id}`}>{topic.label}</Link>
          </>
        )}
      </nav>
      <h1 className="mt-3 text-4xl">{article.title}</h1>
      <p className="mt-3 text-lg text-muted">{article.description}</p>
      <p className="mt-2 text-sm text-muted">
        Published {article.published}. Last reviewed {article.reviewed}.
        {article.applicable ? ` Applies to ${article.applicable}.` : ""} Hisab wrote this guide. It is not attributed to an outside expert.
      </p>
      {article.sections.map((section) => (
        <section key={section.id} className="mt-8">
          <h2 className="text-2xl">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3">{paragraph}</p>)}
          {section.formula && <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 font-medium">{section.formula}</p>}
          {section.list && (
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {section.list.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
        </section>
      ))}
      <section className="mt-8">
        <h2 className="text-2xl">Use the calculator</h2>
        <ul className="mt-3 space-y-1">
          {article.calculators.map((slug) => (
            <li key={slug}><Link href={`/calculators/${slug}`}>{slug.replaceAll("-", " ")}</Link></li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-2xl">Sources</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {article.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url}>{source.title}</a>
              <span className="text-muted"> — {source.publisher}, accessed {source.accessed}</span>
            </li>
          ))}
        </ul>
      </section>
      {article.related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-2xl">Further reading</h2>
          <ul className="mt-3 space-y-1">
            {article.related.map((slug) => (
              <li key={slug}><Link href={`/learn/${slug}`}>{slug.replaceAll("-", " ")}</Link></li>
            ))}
          </ul>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </article>
  );
}

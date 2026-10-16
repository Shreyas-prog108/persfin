import type { Metadata } from "next";
import { Suspense } from "react";
import { CalculatorScreen } from "@/components/calculators/calculator-screen";
import { calculators, getCalculator } from "@/features/calculators/registry";
import { absoluteUrl } from "@/lib/seo/site";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return calculators.map((calculator) => ({ slug: calculator.slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const calculator = getCalculator(slug);
  if (!calculator) return { title: "Calculator" };
  return {
    title: calculator.title,
    description: calculator.description,
    alternates: { canonical: `/calculators/${calculator.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: calculator.title,
      description: calculator.description,
      url: absoluteUrl(`/calculators/${calculator.slug}`),
      type: "website",
    },
  };
}

export default async function Page(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await props.params;
  const calculator = getCalculator(slug);
  if (!calculator) notFound();
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Calculators", item: absoluteUrl("/calculators") },
      { "@type": "ListItem", position: 2, name: calculator.title, item: absoluteUrl(`/calculators/${calculator.slug}`) },
    ],
  };
  return (
    <>
      <CalculatorScreen slug={slug} search={{}} />
      <Suspense fallback={null}>
        <SharedAssumptions slug={slug} searchParams={props.searchParams} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}

async function SharedAssumptions({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  if (Object.keys(search).length === 0) return null;
  void slug;
  return <meta name="robots" content="noindex, follow" />;
}

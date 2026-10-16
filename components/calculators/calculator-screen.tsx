import Link from "next/link";
import { CalculatorWorkspace } from "@/components/calculators/calculator-workspace";
import { articlesForCalculator } from "@/lib/content/articles";
import { seedFromSearch } from "@/features/calculators/parse";
import { getCalculator, relatedCalculators } from "@/features/calculators/registry";
import { CATEGORIES } from "@/features/calculators/types";
import { notFound } from "next/navigation";

export function CalculatorScreen({
  slug,
  search,
}: {
  slug: string;
  search: Record<string, string | string[] | undefined>;
}) {
  const calculator = getCalculator(slug);
  if (!calculator) notFound();
  const { seed, ignored } = seedFromSearch(calculator, search);
  const category = CATEGORIES.find((item) => item.id === calculator.category);
  const related = relatedCalculators(calculator);
  const articles = articlesForCalculator(calculator.slug);

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/calculators">Calculators</Link>
        <span aria-hidden="true"> / </span>
        <span>{calculator.shortTitle}</span>
      </nav>
      <header className="mt-3 max-w-3xl">
        <p className="text-sm text-accent">{category?.label}</p>
        <h1 className="mt-1 text-4xl">{calculator.title}</h1>
        <p className="mt-3 text-lg text-muted">{calculator.description}</p>
      </header>
      <div className="mt-6">
        <CalculatorWorkspace slug={calculator.slug} seed={seed} ignored={ignored} />
      </div>
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl">Formula</h2>
          <p className="mt-2">{calculator.formula}</p>
          <h2 className="mt-6 text-2xl">How the number is made</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            {calculator.methodology.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl">Assumptions</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            {calculator.assumptions.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <h2 className="mt-6 text-2xl">Limits</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            {calculator.limitations.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl">Related calculators</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link className="inline-block rounded-full border border-line px-3 py-2 no-underline" href={`/calculators/${item.slug}`}>
                  {item.shortTitle}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {articles.length > 0 && (
        <section className="mt-8">
          <h2 className="text-2xl">Read next</h2>
          <ul className="mt-3 space-y-2">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link href={`/learn/${article.slug}`}>{article.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

import Link from "next/link";
import { QuickGoal } from "@/components/plan/quick-goal";
import { CalculatorSearch } from "@/components/search/calculator-search";
import { CATEGORIES } from "@/features/calculators/types";
import { comparisonCalculators, popularCalculators } from "@/features/calculators/registry";
import { articles } from "@/lib/content/articles";

export default function HomePage() {
  const popular = popularCalculators();
  const comparisons = comparisonCalculators().slice(0, 6);
  const guides = [...articles].sort((a, b) => b.reviewed.localeCompare(a.reviewed)).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <section className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">Indian personal finance</p>
        <h1 className="mt-2 text-4xl sm:text-6xl">Know the number before you trust the story.</h1>
        <p className="mt-4 text-lg text-muted">
          Hisab calculates deposits, loans, tax, and goals with the formula in the open. You can use it without an account. Rates that are not yours to assume are left for you to enter.
        </p>
      </section>

      <section className="mt-8 rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <CalculatorSearch large />
      </section>

      <section className="mt-12">
        <h2 className="text-3xl">Start with a calculator people open often</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((calculator) => (
            <li key={calculator.slug}>
              <Link href={`/calculators/${calculator.slug}`} className="block h-full rounded-2xl border border-line bg-surface p-4 no-underline hover:border-accent">
                <span className="font-medium">{calculator.shortTitle}</span>
                <span className="mt-2 block text-sm text-muted">{calculator.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-3xl">Find a tool by the decision</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <li key={category.id}>
              <Link href={`/calculators#${category.id}`} className="block h-full rounded-2xl bg-surface-2 p-4 no-underline">
                <span className="font-medium">{category.label}</span>
                <span className="mt-2 block text-sm text-muted">{category.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="text-3xl">Turn a goal into a monthly number</h2>
        <p className="mt-2 max-w-2xl text-muted">
          Enter what it costs today and when you need it. The next page asks for the return and inflation instead of hiding them.
        </p>
        <div className="mt-4">
          <QuickGoal />
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl">Compare two choices</h2>
          <Link href="/compare" className="text-sm text-accent">All comparisons</Link>
        </div>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {comparisons.map((calculator) => (
            <li key={calculator.slug}>
              <Link href={`/calculators/${calculator.slug}`} className="block rounded-2xl border border-line p-4 no-underline">
                <span className="font-medium">{calculator.shortTitle}</span>
                <span className="mt-2 block text-sm text-muted">{calculator.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl">Read the idea, then run the number</h2>
          <Link href="/learn" className="text-sm text-accent">All guides</Link>
        </div>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {guides.map((article) => (
            <li key={article.slug}>
              <Link href={`/learn/${article.slug}`} className="block h-full rounded-2xl border border-line bg-surface p-4 no-underline">
                <span className="text-xs text-muted">Reviewed {article.reviewed}</span>
                <span className="mt-2 block font-medium">{article.title}</span>
                <span className="mt-2 block text-sm text-muted">{article.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 grid gap-6 rounded-3xl bg-ink px-5 py-6 text-background md:grid-cols-2">
        <div>
          <h2 className="text-3xl text-background">The result shows its working</h2>
          <p className="mt-3 text-background/80">
            Calculations run in code, not in a chat model. Tax slabs are stored by financial year. A shared link repeats the assumptions and carries a methodology version. If a rate is not current, the page says so.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-background/80">
          <li><Link className="text-background" href="/methodology">How a formula is chosen</Link></li>
          <li><Link className="text-background" href="/sources">Official sources and what is still manual</Link></li>
          <li><Link className="text-background" href="/privacy">What stays on your device</Link></li>
        </ul>
      </section>
    </div>
  );
}

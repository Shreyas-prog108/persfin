import { articles, getArticle } from "@/lib/content/articles";
import { dataSources, getDataSource } from "@/lib/data-sources/registry";
import { FinanceError } from "@/lib/finance/errors";
import { METHODOLOGY_VERSION } from "@/lib/finance/version";
import { emptySeed, parseSeed } from "@/features/calculators/parse";
import { getCalculator, calculators } from "@/features/calculators/registry";
import { searchCalculators } from "@/features/calculators/search";
import type { FormSeed } from "@/features/calculators/types";

export interface ToolCitation {
  title: string;
  url?: string;
  note?: string;
}

export type ToolResponse<T> =
  | { ok: true; data: T; methodologyVersion: string; citations: ToolCitation[] }
  | { ok: false; error: string; methodologyVersion: string };

/**
 * Typed tools a future personal-finance agent may call.
 * The model is not allowed to invent a tool result. These functions are the result.
 * They do not read a user's saved goals. That access would need an explicit grant.
 */
export function discoverCalculators(query: string): ToolResponse<{ slug: string; title: string; description: string }[]> {
  const matches = searchCalculators(query, 8).map((calculator) => ({
    slug: calculator.slug,
    title: calculator.title,
    description: calculator.description,
  }));
  return { ok: true, data: matches, methodologyVersion: METHODOLOGY_VERSION, citations: [] };
}

export function executeCalculator(slug: string, seed?: FormSeed): ToolResponse<ReturnType<NonNullable<ReturnType<typeof getCalculator>>["calculate"]>> {
  const calculator = getCalculator(slug);
  if (!calculator) {
    return { ok: false, error: "Unknown calculator.", methodologyVersion: METHODOLOGY_VERSION };
  }
  const parsed = parseSeed(calculator, seed ?? emptySeed(calculator));
  if (!parsed.ok) {
    return { ok: false, error: Object.values(parsed.errors).join(" "), methodologyVersion: METHODOLOGY_VERSION };
  }
  try {
    const data = calculator.calculate(parsed.values);
    return {
      ok: true,
      data,
      methodologyVersion: METHODOLOGY_VERSION,
      citations: calculator.articles.map((articleSlug) => ({ title: articleSlug, url: `/learn/${articleSlug}` })),
    };
  } catch (error) {
    const message = error instanceof FinanceError ? error.message : "Calculation failed.";
    return { ok: false, error: message, methodologyVersion: METHODOLOGY_VERSION };
  }
}

export function retrieveArticle(slug: string): ToolResponse<{ title: string; reviewed: string; text: string }> {
  const article = getArticle(slug);
  if (!article) return { ok: false, error: "Unknown article.", methodologyVersion: METHODOLOGY_VERSION };
  const text = article.sections.map((section) => `${section.heading}\n${section.paragraphs.join("\n")}`).join("\n\n");
  return {
    ok: true,
    data: { title: article.title, reviewed: article.reviewed, text },
    methodologyVersion: METHODOLOGY_VERSION,
    citations: article.sources.map((source) => ({ title: source.title, url: source.url, note: source.accessed })),
  };
}

export function retrieveSource(id: string): ToolResponse<(typeof dataSources)[number]> {
  const source = getDataSource(id);
  if (!source) return { ok: false, error: "Unknown source.", methodologyVersion: METHODOLOGY_VERSION };
  return { ok: true, data: source, methodologyVersion: METHODOLOGY_VERSION, citations: [{ title: source.title, url: source.url }] };
}

export function listReviewedMaterial(): { calculators: string[]; articles: string[]; sources: string[] } {
  return {
    calculators: calculators.map((calculator) => calculator.slug),
    articles: articles.map((article) => article.slug),
    sources: dataSources.map((source) => source.id),
  };
}

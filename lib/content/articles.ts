import type { Article } from "./types";
import { fixedIncomeArticles } from "./fixed-income-articles";
import { planningArticles } from "./planning-articles";

export const articles: Article[] = [...fixedIncomeArticles, ...planningArticles];

const bySlug = new Map(articles.map((article) => [article.slug, article]));

export function getArticle(slug: string): Article | undefined {
  return bySlug.get(slug);
}

export function articlesForCalculator(slug: string): Article[] {
  return articles.filter((article) => article.calculators.includes(slug));
}

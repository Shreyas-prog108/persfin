import { describe, expect, it } from "vitest";
import { articles, getArticle } from "@/lib/content/articles";
import { calculators, getCalculator } from "@/features/calculators/registry";

describe("content links", () => {
  it("points every article at a real calculator and a real related guide", () => {
    expect(articles.length).toBeGreaterThanOrEqual(16);
    for (const article of articles) {
      expect(article.sections.length).toBeGreaterThan(2);
      expect(article.sources.length).toBeGreaterThan(0);
      for (const slug of article.calculators) {
        expect(getCalculator(slug), `${article.slug} -> ${slug}`).toBeTruthy();
      }
      for (const related of article.related) {
        expect(getArticle(related), `${article.slug} related ${related}`).toBeTruthy();
      }
    }
  });

  it("points every calculator article link at a real guide", () => {
    for (const calculator of calculators) {
      for (const slug of calculator.articles) {
        expect(getArticle(slug), `${calculator.slug} -> ${slug}`).toBeTruthy();
      }
    }
  });
});

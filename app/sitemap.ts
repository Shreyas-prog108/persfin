import type { MetadataRoute } from "next";
import { calculators } from "@/features/calculators/registry";
import { articles } from "@/lib/content/articles";
import { TOPICS } from "@/lib/content/topics";
import { absoluteUrl } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date("2026-10-16");
  const staticPaths = ["/", "/calculators", "/compare", "/plan", "/learn", "/explore", "/methodology", "/sources", "/privacy"];
  return [
    ...staticPaths.map((path) => ({ url: absoluteUrl(path), lastModified: now })),
    ...calculators.map((calculator) => ({ url: absoluteUrl(`/calculators/${calculator.slug}`), lastModified: now })),
    ...articles.map((article) => ({ url: absoluteUrl(`/learn/${article.slug}`), lastModified: new Date(article.reviewed) })),
    ...TOPICS.map((topic) => ({ url: absoluteUrl(`/learn/topics/${topic.id}`), lastModified: now })),
  ];
}

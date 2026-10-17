export const site = {
  name: "Hisab",
  tagline: "Calculate, compare, and understand your money.",
  description:
    "India-first personal finance calculators, comparisons, and plain-language guides. The maths is deterministic, the assumptions are visible, and you can start without an account.",
  url: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000",
  locale: "en_IN",
};

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

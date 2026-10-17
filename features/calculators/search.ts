import { calculators } from "./registry";
import type { Calculator } from "./types";

export function searchCalculators(query: string, limit = 8): Calculator[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const tokens = normalized.split(/\s+/).filter((token) => token.length > 1);
  return calculators
    .map((calculator) => ({ calculator, score: scoreCalculator(calculator, normalized, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.calculator.title.localeCompare(b.calculator.title))
    .slice(0, limit)
    .map((item) => item.calculator);
}

function scoreCalculator(calculator: Calculator, query: string, tokens: string[]): number {
  const title = calculator.title.toLowerCase();
  const shortTitle = calculator.shortTitle.toLowerCase();
  let score = 0;
  if (title === query || shortTitle === query || calculator.slug === query) score += 120;
  if (title.includes(query) || shortTitle.includes(query)) score += 70;
  for (const question of calculator.questions) {
    if (question.includes(query) || query.includes(question)) score += 90;
  }
  for (const keyword of calculator.keywords) {
    if (keyword.includes(query) || query.includes(keyword)) score += 40;
  }
  const haystack = `${title} ${shortTitle} ${calculator.keywords.join(" ")} ${calculator.questions.join(" ")} ${calculator.description.toLowerCase()}`;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 8;
  }
  return score;
}

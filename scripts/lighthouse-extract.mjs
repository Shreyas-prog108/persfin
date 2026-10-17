import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/lighthouse-extract.mjs <report.json>...");
  process.exit(1);
}

const metricIds = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
  "interactive",
];

const reports = files.map((file) => {
  const json = JSON.parse(readFileSync(file, "utf8"));
  const categories = Object.fromEntries(
    Object.entries(json.categories).map(([id, category]) => [
      id,
      { title: category.title, score: category.score },
    ]),
  );
  const metrics = Object.fromEntries(
    metricIds.map((id) => {
      const audit = json.audits[id];
      return [id, audit ? { score: audit.score, numericValue: audit.numericValue, displayValue: audit.displayValue } : null];
    }),
  );
  const notPerfect = Object.entries(json.audits)
    .filter(([, audit]) => typeof audit.score === "number" && audit.score < 1)
    .map(([id, audit]) => ({
      id,
      title: audit.title,
      score: audit.score,
      displayValue: audit.displayValue ?? null,
    }));
  return {
    file,
    lighthouseVersion: json.lighthouseVersion,
    fetchTime: json.fetchTime,
    requestedUrl: json.requestedUrl,
    finalUrl: json.finalUrl,
    categories,
    metrics,
    auditsBelowPerfect: notPerfect,
  };
});

const summaryPath = "docs/audits/lighthouse/SUMMARY.json";
writeFileSync(summaryPath, `${JSON.stringify({ generatedFrom: files, reports }, null, 2)}\n`);
console.log(summaryPath);
for (const report of reports) {
  const scores = Object.fromEntries(
    Object.entries(report.categories).map(([id, category]) => [id, Math.round(category.score * 100)]),
  );
  console.log(report.requestedUrl, report.fetchTime, JSON.stringify(scores));
}

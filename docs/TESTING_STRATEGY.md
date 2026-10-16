# Testing strategy

## Unit tests

`npm test` runs Vitest.

- `tests/finance/core.test.ts` checks closed forms: quarterly FD compounding, zero-rate annuities, EMI, CAGR and XIRR including a two-root case, bond price and yield, EPF monthly interest, EPS, tax slabs, rebate, surcharge marginal relief, and HRA.
- `tests/calculators/registry.test.ts` runs every calculator on its labelled defaults and checks related links.
- `tests/content/links.test.ts` checks that guides and calculators point at each other and that each guide has sources.

Expected values in the finance tests are written from the formula (powers, annuity algebra, slab arithmetic), not copied from another calculator site.

## End to end

`npm run test:e2e` uses Playwright against `next dev` or, if you change the web server command, `next start`. The smoke test searches from the home page, opens an FD, loads a shared amount, opens a guide, and saves a goal.

Install the browser with `npx playwright install chromium` before the first run.

## Other checks

```bash
npm run typecheck
npm run lint
npm run build
```

Lint must pass with zero warnings. The production build must generate the calculator and guide routes.

## Lighthouse

Against a production server:

```bash
npx lighthouse http://127.0.0.1:3000 --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless" --output=json --output-path=/tmp/lh-home.json
npx lighthouse http://127.0.0.1:3000/calculators/fd --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless" --output=json --output-path=/tmp/lh-fd.json
npx lighthouse http://127.0.0.1:3000/learn/compound-interest --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless" --output=json --output-path=/tmp/lh-guide.json
```

Record the scores that actually come back. Do not treat a lab run as a ranking claim, and do not treat three routes as a measurement of the whole site.

The reports committed from the 16 October 2026 lab run are the JSON files in `docs/audits/lighthouse/`. `SUMMARY.json` is extracted from those files by `node scripts/lighthouse-extract.mjs`. Read the `fetchTime`, `lighthouseVersion`, and category `score` fields there. Earlier hand-written tables in this doc were removed because a later run did not match them.

## Review skills that were not installed

Checked again on 16 October 2026 by searching the agent skill directories. These were looked for and not found:

- `thermonuclear-code-review` and `thermo-nuclear-code-quality-review`
- `antivibe` and `antivibe-code-learning`
- `humanizer`

No remote installer was run. The substitute was the unit tests, the production build, and a pass over duplicated formulas, client boundaries, and tax-rule dating. Guide prose was written to the editorial rules in the product brief without a separate humanizer tool.

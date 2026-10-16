# Architecture

Hisab is one Next.js 16 App Router application. There is no second backend.

## Boundaries

| Path | Responsibility |
| --- | --- |
| `app/` | Routes, metadata, sitemap, robots, and `POST /api/calculate`. |
| `components/` | Layout, calculator form, charts, search, and the local plan. |
| `features/calculators/` | Schemas, parsing, search, and the result each calculator returns. |
| `lib/finance/` | Deterministic calculations. UI code calls these functions. |
| `lib/finance/tax/` | Financial-year rule tables and the tax function that reads them. |
| `lib/data-sources/` | The source registry. Nothing here fetches a URL at request time. |
| `lib/content/` | Guides, topics, and citations. |
| `lib/seo/` | Site name and absolute URLs. |
| `lib/security/` | In-memory rate limit for the calculation API. |
| `lib/agent/` | Typed tools a future assistant must call instead of inventing a number. |
| `tests/` | Unit tests and Playwright smoke tests. |

## Request path

A calculator page is prerendered with its explanation. Search parameters are read inside a Suspense boundary so a shared link can fill the form. The client parses the form with the same function the API uses, then calls the calculator. Results update in the browser. `history.replaceState` writes the non-default inputs back to the URL.

Charts load in a client component. The numbers are also in a table.

## Adding a calculator

1. Add or reuse a function in `lib/finance`.
2. Add a unit test with a value computed from the formula, not copied from another website.
3. Add a definition in the phase file under `features/calculators/`.
4. Point `related` and `articles` at slugs that exist. The content test fails if they do not.
5. The page, sitemap, and search index pick the definition up from the registry.

## Adding a guide

Add an `Article` in `lib/content`. Include a worked example whose assumptions are written down, a source with an access date, and the calculator slugs it should link to.

## Updating a source

Edit `lib/data-sources/registry.ts` and, if the figure is a rule, add or replace a versioned table in `lib/finance/tax` or the labelled default in the calculator. Do not change a past financial year in place.

## Why the UI does not own the maths

The same function answers the page, the API, and `lib/agent/tools.ts`. A model that later explains a result has to call `executeCalculator`. It does not receive a database handle, and the tool does not read saved goals.

## Alternatives considered

- A Python service for the formulas. Rejected. The requirement is one Next.js app, and the functions are pure.
- A database for the first release. Rejected. Goals fit in `localStorage` until an account exists.
- Live scraping of rates. Rejected. The sources do not offer a permitted feed that this release could refresh safely, and a stale number must not be labelled current.

# Hisab

Hisab is an India-first personal finance toolkit. It calculates deposits, SIPs, loans, tax, retirement, and goals. The formulas live in `lib/finance`. Pages do not keep a second copy.

You can use the calculators without an account. A shared link repeats the assumptions that differ from the labelled defaults. It does not ask for a name, PAN, or account number.

## Requirements

- Node.js 22
- npm

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm start
npm run test:e2e
```

`npm run dev` serves the app locally. `npm test` runs the financial unit tests. `npm run test:e2e` starts the app and runs Playwright. Install the browser once with `npx playwright install chromium`.

## Environment

Copy `.env.example` to `.env.local` if you want canonical URLs to use a public origin.

| Name | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical URLs, sitemap, and Open Graph. Defaults to `http://localhost:3000`. |
| `DATABASE_URL` | No | Unused. Reserved for a later account store. Do not add a database until a feature needs it. |

No API keys are required for the calculators.

## Deployment

The app is a single Next.js 16 App Router project. Build with `npm run build` and serve with `npm start`, or deploy the same project to a Node host that supports Next.js.

Set `NEXT_PUBLIC_SITE_URL` to the public origin before building so the sitemap and canonical tags match the site. There is no separate API service.

## What is included

- 62 calculators across the four roadmap phases
- A local multi-goal plan
- 16 source-backed guides
- Sitemap, robots, canonical URLs, and noindex on personalised calculator links
- `POST /api/calculate` for the same engine, with a simple in-memory rate limit

## What is not included

- Live market prices, fund NAVs, or card benefit tables
- An account, a database, or a chat assistant
- A promise that a projection will happen

Read `docs/ROADMAP.md` for the deferred work and `docs/FINANCIAL_METHODOLOGY.md` for the formulas.

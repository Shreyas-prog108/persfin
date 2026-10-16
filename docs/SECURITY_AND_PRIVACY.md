# Security and privacy

## Shipped controls

- Calculator inputs are parsed before they are calculated. Non-finite numbers, bad dates, and unknown select values fail with a message.
- `POST /api/calculate` validates the body with Zod and rate-limits by address in process memory. The limit does not span multiple server instances.
- The API does not fetch a user-supplied URL.
- Security headers: `Content-Security-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy`. `X-Powered-By` is disabled.
- The content security policy allows `'unsafe-inline'` for scripts because Next.js and the JSON-LD script tags need inline scripts. A nonce-based policy is the follow-up. Styles also allow inline rules because the chart library sets them.
- Secrets are not required. `.env.example` has placeholders only.
- Saved goals and notes stay in `localStorage` keys `hisab.goals.v1` and `hisab.feedback.v1`. The plan page and the privacy page can clear them.
- Share URLs contain calculator fields and the methodology version.

## Not shipped, on purpose

- Accounts, sessions, and a database.
- Analytics or an AI provider.
- Server logs of the calculation body. The route returns the result and does not write the input to a store.

## Agent boundary

`lib/agent/tools.ts` can discover calculators, run one, and return a reviewed article or source record. It cannot read the goal store. A later assistant must treat article text and fetched pages as data, not as instructions, and must show the source date on a tax or rate answer.

# Roadmap

## Shipped in this release

Phases 1 to 4 of the calculator list, the local goal plan, 16 guides, share links, the source registry, and the agent tool interfaces.

## Deferred

- Account login and a Postgres store for goals. The interfaces can move from `localStorage` to a per-user table later. Do not add the database before that screen exists.
- A permitted, machine-readable rate feed for small savings, with a stale-data cutoff.
- Property indexation versus 12.5% for land bought before 23 July 2024, once a cost-inflation index for the year is sourced.
- NPS exit exceptions for small corpora, and the EPS minimum pension, as explicit rule versions.
- Nonce-based content security policy.
- Field Core Web Vitals and Search Console.
- The assistant itself. `lib/agent/tools.ts` is the boundary. A chat box is not part of the interface until it can only speak from those tools and the reviewed guides.

## How to extend a tax year

Add a new object in `lib/finance/tax/rules.ts` with its own id, source URLs, and review date. Point the default selector at it only after the source is checked. Keep the previous year so an old link can still name it.

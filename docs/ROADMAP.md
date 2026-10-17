# Roadmap

Continue from the first milestone below whose status is not **verified**. Do not mark a milestone verified from a score that is not backed by a command output or a file in this repo.

## Model and skill check — 16 October 2026

Checked by listing skill files and by invoking a subagent. This is an availability record, not a claim that every review in the original brief was completed.

| Requested | What was available | What ran |
| --- | --- | --- |
| Grok 4.7 | The parent agent in this session identifies as Grok 4.7. Subagent model slugs `grok-4.7-high` and `grok-4.7-xhigh` are listed for the Task tool. | No separate Grok subagent was launched. |
| Claude Opus 5.5, high effort | Task tool accepted the slug `claude-opus-5-5-high`. | One subagent ran. It reported that its prompt identifies it as Claude Opus 5.5. It read `lib/finance/tax/income-tax.ts` and `lib/finance/returns.ts` only. It did not run tests. |
| Humanizer, AntiVibe, thermonuclear code review | No skill file with those names exists under the agent skill directories. | Not run. No installer was used. |

Opus findings and what this repo did with them:

- Non-residents were given the senior-citizen basic exemption. **Fixed.** Old-regime non-residents now use the below-60 slabs. Covered by a unit test.
- `totalReturn` called CAGR before rejecting non-positive ending wealth, so the intended error never fired. **Fixed.**
- XIRR treated a tiny absolute NPV as the only success test, which can fail for very large cash flows. **Fixed.** Tolerance is relative to the cash-flow scale. Covered by a ₹1 billion fixture.
- Opus said section 288B requires rounding to the nearest ₹10. That reading was **not applied**. Section 288A is the nearest-₹10 rule for total income, and this estimator still does not apply it. Section 288B rounds tax to the nearest rupee. Component rounding can still move the displayed total by ₹1. That limitation stays documented in `docs/FINANCIAL_METHODOLOGY.md`.
- The self-occupied interest note hardcoded ₹2,00,000. **Fixed** to read the rule-set cap.

Methodology version is now `2026.10.2` because the non-resident slab result changed.

## Milestones

### A — Foundations — verified

Next.js 16.4.2 App Router app, strict TypeScript, docs, and the calculation package layout exist. `npm run build` succeeded on 16 October 2026 after the tax fix.

### B — Phase 1 calculators — verified for default runs and core formulas

Twelve calculators are registered. `tests/calculators/registry.test.ts` runs every calculator on its labelled defaults. Closed-form tests cover FD compounding, zero-rate annuities, EMI, and CAGR. Not every Phase 1 input combination has its own fixture.

### C — Phase 2 — verified for default runs; formula tests are partial

Bond price, par yield, XIRR including two roots and a large cash-flow case, EPF monthly interest, EPS, PPF, SWP depletion, and the FIRE number have direct tests. Date-count and bank-rounding differences are documented, not fully reproduced.

### D — Phase 3 — verified for default runs; tax tests updated this milestone

Income-tax rebate, marginal relief, surcharge relief, HRA, and the non-resident senior-citizen case have direct tests. Salary, rent-versus-buy, and card-reward tools are covered by the default-run test, not by a separate spreadsheet.

### E — Phase 4 — verified for default runs only

Allocation, drawdown, and multi-goal tools run on their labelled defaults. They do not yet have an independent fixture file each.

### F — Guides and lab SEO — partial

Sixteen guides are linked to calculators and sources. Lighthouse 12.8.2 lab reports for three routes are saved:

- `docs/audits/lighthouse/home.json`
- `docs/audits/lighthouse/fd.json`
- `docs/audits/lighthouse/compound-interest.json`
- Extracted scores and failing audits: `docs/audits/lighthouse/SUMMARY.json`

Those three lab scores do not say the other calculator or article routes are fast or ready for search. Field Core Web Vitals and Search Console are not set up.

### G — Engine boundary for a future agent — verified for the contract, not for a shipped assistant

`lib/finance` does not import the UI or the agent. Every calculator now copies its engine numbers into `figures`. `executeCalculator` returns those figures and not the headline. `retrieveUserGoals` refuses. The checks are in `tests/architecture/boundary.test.ts`.

The assistant itself is still not built. The named thermonuclear, AntiVibe, and humanizer skills were not available, so they did not run. Opus reviewed two finance files, not the whole app. A nonce-based content security policy and an account database are still deferred.

## Deferred

- Account login and a Postgres store for goals.
- A permitted rate feed with a stale-data cutoff.
- Property indexation versus 12.5% for land bought before 23 July 2024.
- NPS small-corpus exit exceptions and the EPS minimum pension, as their own rule versions.
- Nonce-based content security policy.
- Field Core Web Vitals and Search Console.
- The assistant. `lib/agent/tools.ts` is only the boundary.

## How to extend a tax year

Add a new object in `lib/finance/tax/rules.ts` with its own id, source URLs, and review date. Point the default selector at it only after the source is checked. Keep the previous year so an old link can still name it.

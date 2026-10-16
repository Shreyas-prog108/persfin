# Data sources

The registry is `lib/data-sources/registry.ts`. The public page is `/sources`.

Nothing in the request path fetches these URLs. A review on 16 October 2026 copied the figures that are now in versioned tables or labelled defaults. If the review could not confirm a current number, the calculator asks the user to type it.

## Used in a calculation

| Figure | Where it lives | Status |
| --- | --- | --- |
| Income-tax slabs, rebate, surcharge, cess for AY 2026-27 | `lib/finance/tax/rules.ts` | Reviewed against the Income Tax Department salaried-individual page |
| Standard deduction ₹50,000 / ₹75,000 | Same rule file | Reviewed against the department threshold page |
| FY 2026-27 slabs | Same numbers, separate rule id | Memorandum said enacted rates were unchanged |
| Equity LTCG 12.5% above ₹1.25 lakh, STCG 20% | `lib/finance/tax/capital-gains.ts` | Section 112A and the CBDT FAQ |
| Other LTCG 12.5% | Same file | Department capital-gains note. Indexation option not implemented |
| EPF 8.25% | Editable default | FY 2025-26. FY 2026-27 not found |
| PPF 7.1% | Editable default | Quarter 1 Oct 2026–31 Dec 2026, from the reported Ministry review. Confirm the notification |
| EPS ceiling ₹15,000 and 8.33% | Code default, wage is editable on the pension page | Confirm with EPFO before payroll use |
| 80C cap ₹1.5 lakh, self-occupied interest cap ₹2 lakh | Tax rules | Department help page |

## Left manual

FD and RD rates other than the labelled post-office RD hint, loan rates, inflation, mutual fund returns, expense ratios, benchmark returns, gold prices, bond market prices, card rewards, annuity quotes, and NPS expected returns.

No NSE, BSE, AMFI, or RBI feed is called. Those homepages are listed so a later adapter has a place to start. A feed should be added only with a permitted machine-readable source, a retrieval time, and a stale-data rule that refuses to label an old rate as current.

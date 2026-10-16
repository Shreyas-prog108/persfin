# Financial methodology

Methodology version: `2026.10.1` in `lib/finance/version.ts`.

Display rounding uses `Intl` and, for tax, the nearest rupee after the full calculation. Intermediate steps stay in floating point. Section 288A rounding of total income to the nearest ₹10 is not applied.

## Rates

- **Nominal.** The annual rate divided by the number of periods. Loans and cumulative FDs use this.
- **Effective annual.** A CAGR-style rate. The monthly rate is the 12th root. SIP defaults use this and say so.
- A nominal rate compounded `m` times a year has effective annual rate `(1 + r/m)^m − 1`.

## Products

| Tool | Method |
| --- | --- |
| Cumulative FD | `principal × (1 + r/m)^(m × years)` |
| Payout FD | Simple interest on the original principal. Frequency changes the payment date, not the total. |
| RD and SIP | Monthly annuity. Nominal deposit rates are converted to a monthly effective rate from the compounding frequency. |
| Step-up SIP | The instalment is multiplied by `(1 + step)` after every 12 contributions. |
| EMI | Reducing balance. Monthly rate is nominal annual / 12. Payment at month end. The last payment clears the balance. |
| CAGR | `(end / start)^(1 / years) − 1`. Dated CAGR and XIRR use actual days / 365. |
| XIRR | Newton-Raphson from several guesses. Zero, one, or many roots are reported. A single rate is returned only when one root is found. |
| Bonds | Clean price discounts coupons and face value on a coupon date. Accrued interest is periodic coupon × days / days in period. YTM solves the price. Coupon cash is not called a yield. |
| PPF | One deposit a year, compounded once a year. This is not the 5th-of-the-month scheme rule. |
| EPF | Monthly running balance. Interest is `sum of monthly balances × annual rate / 12`, added at year end. EPS is 8.33% of wages capped at ₹15,000 in this rule set. |
| EPS pension | Pensionable salary × service / 70. Under 10 years is flagged. |
| NPS | Annuity of contributions at the user's return. Pension is annuity corpus × the annuity rate the user typed. |
| SWP and retirement | Constant return, withdrawal at the start or end of the period, spending can rise with inflation. A binary search finds the retirement corpus. Several return rows are shown for withdrawal scenarios. |
| Income tax | Slab, resident rebate, marginal relief on the new-regime rebate, surcharge with marginal relief, then 4% cess. |
| Capital gains | Post-23 July 2024 rates. Surcharge is not computed. The user classifies the holding period. |
| HRA | Old regime only: the lowest of actual HRA, rent minus 10% of basic plus DA, and 40% or 50% of that salary. |
| Goals | Inflate today's cost, grow existing savings, solve the annuity payment for the gap. |

## Tax years

`FY2025-26` and `FY2026-27` use the AY 2026-27 slabs published by the Income Tax Department. The FY 2026-27 set repeats them because the February 2026 Finance Bill memorandum proposed no change to those enacted rates. The repetition is written in the rule notes.

New regime: nil to ₹4 lakh, then 5, 10, 15, 20, 25, and 30 percent. Rebate up to ₹60,000 if taxable income does not exceed ₹12 lakh, for residents. Marginal relief limits the pre-cess tax to the income above ₹12 lakh.

Old regime basic exemption: ₹2.5 lakh below 60, ₹3 lakh from 60 to 79, ₹5 lakh from 80. Rebate up to ₹12,500 if taxable income does not exceed ₹5 lakh.

Standard deduction: ₹75,000 new regime, ₹50,000 old regime, salary only.

## Known approximations

- Bank RD rounding of each quarter is not reproduced.
- EPF wage ceiling and EPS rate should be confirmed against the latest EPFO circular before payroll use.
- PPF 7.1% is the rate reported for 1 October 2026 to 31 December 2026, not a later quarter.
- EPF 8.25% is the FY 2025-26 notified rate. The FY 2026-27 rate was not found on 16 October 2026.
- Annual tax drag uses one flat rate. It is not the slab estimator.
- Net-worth projection pays liabilities once a year, so it will not match a monthly EMI schedule.
- Property indexation for assets bought before 23 July 2024 is not compared.

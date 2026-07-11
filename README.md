# Marginal Tax Visualiser

A live, interactive visualiser of the UK marginal tax rate — how much of your
**next £1** actually reaches your pocket — for England, Wales & Northern Ireland.
Change your salary, pension and children and the chart reshapes instantly. No
long questionnaire, no "Calculate" button.

The chart plots **marginal tax rate (y)** against **gross income (x)** and shows:

- the classic staircase — 28% → 42% → the **62% Personal Allowance taper band**
  (£100k–£125k) → 47%;
- the **High Income Child Benefit Charge** bump between £60k–£80k, scaled by number
  of children;
- the **£100k childcare cliff** (Tax-Free Childcare + funded hours), drawn as an
  annotated marker with the pay rise needed to recover it;
- **student loan repayments** (Plan 1/2/4/5 + Postgraduate), which add 9%/6% above
  their thresholds;
- how **salary sacrifice / relief at source / net pay** pensions shift the whole
  curve by changing your adjusted net income;
- a **bonus** calculator showing how much of a one-off bonus you actually keep once
  it stacks on top of your salary.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # tax-engine unit tests (Vitest)
npm run build    # production build to dist/
```

## How it works

The tax logic is a set of pure functions in [`src/tax`](src/tax) (no React), so it
can be unit-tested against known figures. The chart derives marginal rates
**numerically** — it computes total deductions across a fine income sweep and takes
the slope — so every interacting taper composes correctly without fragile
piecewise formulas. See [`src/tax/engine.ts`](src/tax/engine.ts) and
[`src/tax/curve.ts`](src/tax/curve.ts).

All rates and thresholds live in a single file,
[`src/tax/config2026.ts`](src/tax/config2026.ts), for easy yearly updates.

## Caveats

Estimates only, **not tax advice**. Assumes a standard tax code and English/Welsh/NI
Income Tax rates (not Scottish Income Tax). Some 2026/27 figures — including student
loan thresholds — are seeded from 2025/26 and flagged in the config; verify against
GOV.UK before relying on them.

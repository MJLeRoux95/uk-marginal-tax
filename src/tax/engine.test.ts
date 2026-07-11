import { describe, expect, it } from 'vitest';
import { bonusResult, computeBreakdown, marginalRate, type EngineInputs } from './engine';
import type { PensionMethod } from './types';

// Baseline: no pension, no other income, no children, no student loan.
const base: EngineInputs = {
  otherIncome: 0,
  pensionAmount: 0,
  pensionMethod: 'salary_sacrifice',
  children: 0,
  studentLoan: { plan: 'none', postgraduate: false },
};

const withPension = (amount: number, method: PensionMethod): EngineInputs => ({
  ...base,
  pensionAmount: amount,
  pensionMethod: method,
});

const near = (a: number, b: number, tol = 0.5) => Math.abs(a - b) <= tol;

describe('income tax + NI (baseline)', () => {
  it('£30,000: tax £3,486, NI £1,394.40, take-home £25,119.60', () => {
    const b = computeBreakdown(30_000, base);
    expect(near(b.incomeTax, 3_486)).toBe(true);
    expect(near(b.employeeNI, 1_394.4)).toBe(true);
    expect(near(b.takeHome, 25_119.6)).toBe(true);
  });

  it('£50,270 (top of basic rate): tax £7,540, NI £3,016', () => {
    const b = computeBreakdown(50_270, base);
    expect(near(b.incomeTax, 7_540)).toBe(true);
    expect(near(b.employeeNI, 3_016)).toBe(true);
  });

  it('£60,000: tax £11,432, NI £3,210.60', () => {
    const b = computeBreakdown(60_000, base);
    expect(near(b.incomeTax, 11_432)).toBe(true);
    expect(near(b.employeeNI, 3_210.6)).toBe(true);
  });

  it('£100,000: PA intact, tax £27,432', () => {
    const b = computeBreakdown(100_000, base);
    expect(b.personalAllowance).toBe(12_570);
    expect(near(b.incomeTax, 27_432)).toBe(true);
  });

  it('£125,140: PA fully tapered to £0, tax £42,516', () => {
    const b = computeBreakdown(125_140, base);
    expect(b.personalAllowance).toBe(0);
    expect(near(b.incomeTax, 42_516)).toBe(true);
  });
});

describe('marginal rates', () => {
  it('28% in the basic-rate band (20% tax + 8% NI)', () => {
    expect(near(marginalRate(30_000, base), 0.28, 0.001)).toBe(true);
  });
  it('42% in the higher-rate band (40% + 2%)', () => {
    expect(near(marginalRate(60_000, base), 0.42, 0.001)).toBe(true);
  });
  it('62% in the £100k–£125k PA-taper band (40% + 20% + 2%)', () => {
    expect(near(marginalRate(110_000, base), 0.62, 0.001)).toBe(true);
  });
  it('47% in the additional-rate band (45% + 2%)', () => {
    expect(near(marginalRate(130_000, base), 0.47, 0.001)).toBe(true);
  });
});

describe('HICBC', () => {
  it('£70k with 1 child: charge is half of annual child benefit', () => {
    const b = computeBreakdown(70_000, { ...base, children: 1 });
    // Child benefit 1 child = 26.05 * 52 = £1,354.60; at £70k ANI, 50% clawed back.
    expect(near(b.hicbc, 677.3)).toBe(true);
  });
  it('adds ~6.8% to the marginal rate across £60k–£80k for 1 child', () => {
    const m = marginalRate(70_000, { ...base, children: 1 });
    expect(near(m, 0.42 + 1_354.6 / 20_000, 0.002)).toBe(true);
  });
  it('fully clawed back at £80k+', () => {
    const b = computeBreakdown(85_000, { ...base, children: 1 });
    expect(near(b.hicbc, 1_354.6)).toBe(true);
  });
});

describe('student loans', () => {
  it('Plan 2 at £40k repays 9% above £28,470', () => {
    const sl: EngineInputs = { ...base, studentLoan: { plan: 'plan2', postgraduate: false } };
    const b = computeBreakdown(40_000, sl);
    expect(near(b.studentLoan, (40_000 - 28_470) * 0.09)).toBe(true); // £1,037.70
    expect(near(marginalRate(40_000, sl), 0.28 + 0.09, 0.001)).toBe(true); // 37%
  });

  it('Postgraduate loan adds 6% above £21k, stacking with an undergrad plan', () => {
    const sl: EngineInputs = { ...base, studentLoan: { plan: 'plan2', postgraduate: true } };
    const b = computeBreakdown(40_000, sl);
    const expected = (40_000 - 28_470) * 0.09 + (40_000 - 21_000) * 0.06;
    expect(near(b.studentLoan, expected)).toBe(true);
    expect(near(marginalRate(40_000, sl), 0.28 + 0.09 + 0.06, 0.001)).toBe(true); // 43%
  });

  it('no repayment below the plan threshold', () => {
    const sl: EngineInputs = { ...base, studentLoan: { plan: 'plan2', postgraduate: false } };
    expect(computeBreakdown(25_000, sl).studentLoan).toBe(0);
  });
});

describe('bonus', () => {
  it('a £2k bonus wholly within the basic-rate band keeps 72%', () => {
    const r = bonusResult(30_000, 2_000, base);
    expect(near(r.kept, 1_440)).toBe(true); // 2,000 × (1 − 0.28)
    expect(near(r.keepRate, 0.72, 0.001)).toBe(true);
  });

  it('a bonus straddling the £50,270 higher-rate edge is taxed piecewise', () => {
    const r = bonusResult(48_000, 5_000, base);
    // 2,270 @ 28% deduction + 2,730 @ 42% deduction → keep £3,217.80
    expect(near(r.kept, 3_217.8)).toBe(true);
    expect(near(r.deducted, 1_782.2)).toBe(true);
  });
});

describe('pension methods', () => {
  it('salary sacrifice at £60k/£10k drops into basic rate and cuts NI', () => {
    const b = computeBreakdown(60_000, withPension(10_000, 'salary_sacrifice'));
    expect(near(b.incomeTax, 7_486)).toBe(true); // 37,430 @ 20%
    expect(near(b.employeeNI, 2_994.4)).toBe(true); // NI on £50k
    expect(b.adjustedNetIncome).toBe(50_000);
  });

  it('relief at source at £60k/£10k gives higher-rate relief but NO NI saving', () => {
    const b = computeBreakdown(60_000, withPension(10_000, 'relief_at_source'));
    expect(near(b.incomeTax, 9_486)).toBe(true); // band extended, all @ 20%
    expect(near(b.employeeNI, 3_210.6)).toBe(true); // NI unchanged vs no pension
    expect(b.adjustedNetIncome).toBe(50_000); // ANI still reduced (helps taper/HICBC)
  });

  it('net pay at £60k/£10k cuts tax but not NI', () => {
    const b = computeBreakdown(60_000, withPension(10_000, 'net_pay'));
    expect(near(b.incomeTax, 7_486)).toBe(true); // taxable £50k
    expect(near(b.employeeNI, 3_210.6)).toBe(true); // NI on full £60k
  });
});

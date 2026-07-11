import { describe, expect, it } from 'vitest';
import {
  buildBonus,
  buildCliffAnnotation,
  cycleToWorkSaving,
  reliefAtSourceHigherRateClaimable,
  salarySacrificeSwitchSaving,
  toEngineInputs,
} from './curve';
import { computeBreakdown } from './engine';
import type { TaxInputs } from './types';

const inputs: TaxInputs = {
  grossSalary: 110_000,
  otherIncome: 0,
  pension: { method: 'salary_sacrifice', inputType: 'percent', value: 0 },
  children: 2,
  childcare: {
    usesTaxFreeChildcare: true,
    usesFundedHours: true,
    taxFreeChildcarePerChild: 2_000,
    fundedHoursPerChild: 4_000,
  },
  studentLoan: { plan: 'none', postgraduate: false },
  bonus: 0,
  cycleToWork: 0,
};

const clean = (over: Partial<TaxInputs>): TaxInputs => ({
  grossSalary: 60_000,
  otherIncome: 0,
  pension: { method: 'salary_sacrifice', inputType: 'amount', value: 0 },
  children: 0,
  childcare: {
    usesTaxFreeChildcare: false,
    usesFundedHours: false,
    taxFreeChildcarePerChild: 2_000,
    fundedHoursPerChild: 4_000,
  },
  studentLoan: { plan: 'none', postgraduate: false },
  bonus: 0,
  cycleToWork: 0,
  ...over,
});

describe('childcare cliff zone', () => {
  it('spans from the £100k cliff to the true recovery income', () => {
    const cliff = buildCliffAnnotation(inputs)!;
    expect(cliff).not.toBeNull();
    expect(cliff.from).toBe(100_000); // ANI = gross here (no pension / other income)
    expect(cliff.valueLost).toBe(12_000); // 2 × (£2,000 + £4,000)

    // Recovery is where take-home has climbed back by the full £12,000 lost.
    const engineInputs = toEngineInputs(inputs);
    const thStart = computeBreakdown(cliff.from!, engineInputs).takeHome;
    const thEnd = computeBreakdown(cliff.to!, engineInputs).takeHome;
    expect(Math.abs(thEnd - thStart - 12_000)).toBeLessThan(2);

    // Sanity: it lands past £125k (recovery partly at 47%, not the full 62% band).
    expect(cliff.to!).toBeGreaterThan(125_140);
    expect(cliff.to!).toBeLessThan(132_000);
  });

  it('has no cliff when neither childcare benefit is used', () => {
    const none = {
      ...inputs,
      childcare: { ...inputs.childcare, usesTaxFreeChildcare: false, usesFundedHours: false },
    };
    expect(buildCliffAnnotation(none)).toBeNull();
  });
});

describe('bonus vs the childcare cliff', () => {
  it('a bonus that tips you over £100k forfeits childcare and can leave you worse off', () => {
    // £95k + £10k bonus → ANI 95k (has childcare) to 105k (lost). 2 kids = £12k lost.
    const b = buildBonus({ ...inputs, grossSalary: 95_000, bonus: 10_000 });
    expect(b.crossesCliff).toBe(true);
    expect(b.childcareLost).toBe(12_000);
    // Tax-only take-home gain: £5k @ 58% keep + £5k @ 38% keep = £4,800.
    expect(Math.abs(b.kept - 4_800)).toBeLessThan(1);
    // Netting off £12k childcare → £7,200 worse off.
    expect(Math.abs(b.netKept - -7_200)).toBeLessThan(1);
  });

  it('a bonus fully below the cliff has no childcare impact', () => {
    const b = buildBonus({ ...inputs, grossSalary: 60_000, bonus: 5_000 });
    expect(b.crossesCliff).toBe(false);
    expect(b.childcareLost).toBe(0);
    expect(b.netKept).toBeCloseTo(b.kept, 5);
  });

  it('no extra loss when you were already over the cliff', () => {
    const b = buildBonus({ ...inputs, grossSalary: 110_000, bonus: 5_000 });
    expect(b.crossesCliff).toBe(false); // childcare already gone before the bonus
    expect(b.childcareLost).toBe(0);
  });
});

describe('tax-reduction savings', () => {
  it('switching net pay to salary sacrifice saves the employee NI on the contribution', () => {
    const netPay = clean({ pension: { method: 'net_pay', inputType: 'amount', value: 10_000 } });
    // £60k: the £50k–£60k band is 8% then 2% NI → £216.20 saved on a £10k sacrifice.
    expect(Math.abs(salarySacrificeSwitchSaving(netPay) - 216.2)).toBeLessThan(0.5);
  });

  it('no switch saving when already on salary sacrifice', () => {
    const ss = clean({ pension: { method: 'salary_sacrifice', inputType: 'amount', value: 10_000 } });
    expect(salarySacrificeSwitchSaving(ss)).toBe(0);
  });

  it('switching relief-at-source to salary sacrifice saves only the NI (relief is equal)', () => {
    const ras = clean({
      grossSalary: 65_000,
      pension: { method: 'relief_at_source', inputType: 'amount', value: 3_250 },
    });
    // £3,250 above the UEL → 2% NI = £65 (the income-tax relief is identical once claimed).
    expect(Math.abs(salarySacrificeSwitchSaving(ras) - 65)).toBeLessThan(0.5);
  });

  it('cycle to work saves marginal tax + NI on the bike cost', () => {
    const bike = clean({ cycleToWork: 1_000 });
    // £60k is higher-rate: 40% tax + 2% NI on the £1,000 sacrificed = £420.
    expect(Math.abs(cycleToWorkSaving(bike) - 420)).toBeLessThan(0.5);
  });

  it('relief-at-source higher-rate claimable = extra 20% on the contribution', () => {
    const ras = clean({
      grossSalary: 65_000,
      pension: { method: 'relief_at_source', inputType: 'amount', value: 3_250 },
    });
    // £65k higher-rate: £3,250 band extension shifts income from 40% to 20% → £650.
    expect(Math.abs(reliefAtSourceHigherRateClaimable(ras) - 650)).toBeLessThan(0.5);
  });

  it('nothing to claim for a basic-rate relief-at-source payer', () => {
    const ras = clean({
      grossSalary: 30_000,
      pension: { method: 'relief_at_source', inputType: 'amount', value: 2_000 },
    });
    expect(reliefAtSourceHigherRateClaimable(ras)).toBe(0);
  });
});

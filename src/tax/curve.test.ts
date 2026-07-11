import { describe, expect, it } from 'vitest';
import { buildBonus, buildCliffAnnotation, toEngineInputs } from './curve';
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
};

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

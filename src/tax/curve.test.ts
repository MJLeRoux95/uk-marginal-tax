import { describe, expect, it } from 'vitest';
import { buildCliffAnnotation, toEngineInputs } from './curve';
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

import { config2026 } from '../tax/config2026';
import type { TaxInputs } from '../tax/types';

/** Sensible starting point: a single earner near the higher-rate band, no pension yet. */
export const defaultInputs: TaxInputs = {
  grossSalary: 65_000,
  otherIncome: 0,
  pension: {
    method: 'salary_sacrifice',
    inputType: 'percent',
    value: 0,
  },
  children: 0,
  childcare: {
    usesTaxFreeChildcare: true,
    usesFundedHours: true,
    taxFreeChildcarePerChild: config2026.taxFreeChildcareMaxPerChild,
    fundedHoursPerChild: config2026.fundedHoursDefaultAnnualPerChild,
  },
  studentLoan: {
    plan: 'none',
    postgraduate: false,
  },
  bonus: 0,
};

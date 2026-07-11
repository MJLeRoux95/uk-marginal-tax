// Core types for the tax engine. The engine is pure (no React) so it can be
// unit-tested and reused by the chart's curve sweep.

export type PensionMethod = 'salary_sacrifice' | 'relief_at_source' | 'net_pay';

export interface PensionInput {
  method: PensionMethod;
  /** How the contribution figure is expressed. */
  inputType: 'percent' | 'amount';
  /** Percent of gross salary (0–100) OR a fixed £/year, per `inputType`. */
  value: number;
}

export interface ChildcareInput {
  /** Whether the household would use Tax-Free Childcare (lost above £100k ANI). */
  usesTaxFreeChildcare: boolean;
  /** Whether the household would use funded hours (lost above £100k ANI). */
  usesFundedHours: boolean;
  /** User-adjustable estimate of Tax-Free Childcare top-up actually claimed per child/year. */
  taxFreeChildcarePerChild: number;
  /** User-adjustable estimate of funded-hours value per eligible child/year. */
  fundedHoursPerChild: number;
}

/** Everything the user controls. `grossSalary` is their stated actual salary. */
export interface TaxInputs {
  grossSalary: number;
  otherIncome: number;
  pension: PensionInput;
  children: number;
  childcare: ChildcareInput;
}

/** Pension resolved to a fixed £/year amount for a given salary. */
export function resolvePensionAmount(pension: PensionInput, salary: number): number {
  const raw = pension.inputType === 'percent' ? (salary * pension.value) / 100 : pension.value;
  return Math.max(0, Math.min(raw, salary)); // can't sacrifice more than you earn
}

/** Full breakdown of what happens to £1 of income at a given gross salary. */
export interface DeductionBreakdown {
  grossSalary: number;
  otherIncome: number;
  pensionContribution: number;
  personalAllowance: number; // after taper
  adjustedNetIncome: number;
  incomeTax: number;
  employeeNI: number;
  hicbc: number;
  totalDeductions: number; // incomeTax + NI + hicbc
  takeHome: number; // cash in pocket (excludes pension, which is saved not spent)
}

/** A point on the marginal-rate curve. */
export interface CurvePoint {
  gross: number;
  marginalRate: number; // 0–1, on the next £1 of gross salary
}

export type AnnotationKind = 'band' | 'cliff' | 'position';

/** Shaded band or a cliff marker for the chart to render. */
export interface Annotation {
  kind: AnnotationKind;
  label: string;
  /** For bands: start/end gross. For cliffs/position: `at` gross. */
  from?: number;
  to?: number;
  at?: number;
  /** Cliff only: estimated £ lost and the pay rise needed to recover it. */
  valueLost?: number;
  payRiseToRecover?: number;
  detail?: string;
}

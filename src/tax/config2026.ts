// UK tax parameters — England, Wales & Northern Ireland.
// Tax year 2026/27 assumptions. THRESHOLDS ARE FROZEN TO 2028, but every value
// here MUST be re-verified against GOV.UK before launch. Values marked (2025/26)
// are seeded from the 2025/26 year and may be uprated for 2026/27.
//
// Single source of truth: change tax rules here only.

export interface TaxConfig {
  region: string;

  // Income Tax (England/Wales/NI)
  personalAllowance: number; // 0% band
  basicRateLimit: number; // width of the 20% band (taxable income above PA)
  additionalRateThreshold: number; // total income at which 45% starts
  basicRate: number;
  higherRate: number;
  additionalRate: number;

  // Personal Allowance taper
  taperThreshold: number; // ANI above which PA is withdrawn
  taperRate: number; // £1 lost per £`taperRate` over threshold (i.e. 2 => £1 per £2)

  // Employee National Insurance (Class 1)
  niPrimaryThreshold: number;
  niUpperEarningsLimit: number;
  niMainRate: number;
  niUpperRate: number;

  // High Income Child Benefit Charge (HICBC)
  childBenefitFirstChildWeekly: number; // (2025/26)
  childBenefitAdditionalChildWeekly: number; // (2025/26)
  hicbcLowerThreshold: number; // ANI where charge starts
  hicbcUpperThreshold: number; // ANI where child benefit fully clawed back

  // £100k childcare cliff (Tax-Free Childcare + funded hours)
  childcareCliffThreshold: number; // ANI at which both are lost entirely
  taxFreeChildcareMaxPerChild: number; // gov top-up cap per child/year
  // Rough default annual value of funded hours per eligible child (term-time).
  // User-adjustable; documented estimate, not a legal figure.
  fundedHoursDefaultAnnualPerChild: number;

  // Student loan repayments (annual thresholds, (2025/26) — verify for 2026/27)
  studentLoanPlans: Record<StudentLoanPlan, StudentLoanPlanConfig>;
  postgraduateLoan: StudentLoanPlanConfig;
}

export type StudentLoanPlan = 'plan1' | 'plan2' | 'plan4' | 'plan5';

export interface StudentLoanPlanConfig {
  label: string;
  threshold: number; // repay `rate` of income above this
  rate: number;
}

export const config2026: TaxConfig = {
  region: 'England, Wales & Northern Ireland',

  personalAllowance: 12_570,
  basicRateLimit: 37_700, // 20% on taxable income up to here (=> £50,270 with full PA)
  additionalRateThreshold: 125_140,
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,

  taperThreshold: 100_000,
  taperRate: 2,

  niPrimaryThreshold: 12_570,
  niUpperEarningsLimit: 50_270,
  niMainRate: 0.08,
  niUpperRate: 0.02,

  childBenefitFirstChildWeekly: 26.05, // (2025/26)
  childBenefitAdditionalChildWeekly: 17.25, // (2025/26)
  hicbcLowerThreshold: 60_000,
  hicbcUpperThreshold: 80_000,

  childcareCliffThreshold: 100_000,
  taxFreeChildcareMaxPerChild: 2_000,
  fundedHoursDefaultAnnualPerChild: 4_000, // rough term-time estimate; user can edit

  studentLoanPlans: {
    plan1: { label: 'Plan 1', threshold: 26_065, rate: 0.09 }, // (2025/26)
    plan2: { label: 'Plan 2', threshold: 28_470, rate: 0.09 }, // (2025/26)
    plan4: { label: 'Plan 4 (Scotland)', threshold: 32_745, rate: 0.09 }, // (2025/26)
    plan5: { label: 'Plan 5', threshold: 25_000, rate: 0.09 }, // repayments from Apr 2026
  },
  postgraduateLoan: { label: 'Postgraduate', threshold: 21_000, rate: 0.06 }, // (2025/26)
};

export function annualChildBenefit(children: number, cfg: TaxConfig): number {
  if (children <= 0) return 0;
  const first = cfg.childBenefitFirstChildWeekly;
  const rest = Math.max(0, children - 1) * cfg.childBenefitAdditionalChildWeekly;
  return (first + rest) * 52;
}

// Pure UK tax engine (England/Wales/NI). No React, no side effects.
//
// The chart derives marginal rates *numerically* by differencing this function,
// so the only job here is to compute deductions correctly at a single income.
//
// Key modelling decision: the pension contribution is passed in as a fixed £/year
// (`pensionAmount`) rather than re-derived from a % at each swept income. This makes
// the marginal-rate curve mean "for £1 more gross, keeping your pension £ fixed, how
// much do you lose" — the intuitive reading of marginal tax. See resolvePensionAmount.

import { annualChildBenefit, config2026, type TaxConfig } from './config2026';
import type { DeductionBreakdown, PensionMethod } from './types';

/** Income Tax on total taxable income, given a (possibly tapered) personal allowance. */
function incomeTaxOnTaxable(
  taxableIncome: number,
  personalAllowance: number,
  cfg: TaxConfig,
  rasExtension: number, // relief-at-source: widens the 20% and 40% ceilings
): number {
  if (taxableIncome <= personalAllowance) return 0;

  // Ceilings expressed in total-income terms.
  const basicTop = personalAllowance + cfg.basicRateLimit + rasExtension; // ~£50,270
  const higherTop = cfg.additionalRateThreshold + rasExtension; // ~£125,140

  let tax = 0;
  tax += (Math.min(taxableIncome, basicTop) - personalAllowance) * cfg.basicRate;
  if (taxableIncome > basicTop) {
    tax += (Math.min(taxableIncome, higherTop) - basicTop) * cfg.higherRate;
  }
  if (taxableIncome > higherTop) {
    tax += (taxableIncome - higherTop) * cfg.additionalRate;
  }
  return tax;
}

/** Employee Class 1 National Insurance. */
function employeeNI(niableIncome: number, cfg: TaxConfig): number {
  if (niableIncome <= cfg.niPrimaryThreshold) return 0;
  let ni = 0;
  ni +=
    (Math.min(niableIncome, cfg.niUpperEarningsLimit) - cfg.niPrimaryThreshold) * cfg.niMainRate;
  if (niableIncome > cfg.niUpperEarningsLimit) {
    ni += (niableIncome - cfg.niUpperEarningsLimit) * cfg.niUpperRate;
  }
  return ni;
}

/** Personal Allowance after the £100k taper (based on adjusted net income). */
export function taperedPersonalAllowance(adjustedNetIncome: number, cfg: TaxConfig): number {
  if (adjustedNetIncome <= cfg.taperThreshold) return cfg.personalAllowance;
  const reduction = (adjustedNetIncome - cfg.taperThreshold) / cfg.taperRate;
  return Math.max(0, cfg.personalAllowance - reduction);
}

/**
 * High Income Child Benefit Charge. Modelled continuously across £60k–£80k ANI
 * (HMRC steps in 1%-per-£200 increments; the continuous form is visually cleaner
 * and differs by pennies). Full clawback at the upper threshold.
 */
export function hicbc(adjustedNetIncome: number, children: number, cfg: TaxConfig): number {
  if (children <= 0 || adjustedNetIncome <= cfg.hicbcLowerThreshold) return 0;
  const cb = annualChildBenefit(children, cfg);
  const span = cfg.hicbcUpperThreshold - cfg.hicbcLowerThreshold;
  const pct = Math.min(1, (adjustedNetIncome - cfg.hicbcLowerThreshold) / span);
  return cb * pct;
}

export interface EngineInputs {
  otherIncome: number;
  pensionAmount: number; // resolved £/year (fixed across a sweep)
  pensionMethod: PensionMethod;
  children: number;
}

/** Compute the full deduction breakdown at a given gross salary. */
export function computeBreakdown(
  grossSalary: number,
  inputs: EngineInputs,
  cfg: TaxConfig = config2026,
): DeductionBreakdown {
  const pension = Math.max(0, Math.min(inputs.pensionAmount, grossSalary));
  const { pensionMethod, otherIncome, children } = inputs;

  // How the pension method changes taxable pay, NIable pay, and RAS band extension.
  const salaryAfterSacrifice =
    pensionMethod === 'salary_sacrifice' ? grossSalary - pension : grossSalary;

  const taxableEmployment =
    pensionMethod === 'relief_at_source' ? grossSalary : grossSalary - pension;
  const niableEmployment = salaryAfterSacrifice; // net_pay & RAS give NO NI relief
  const rasExtension = pensionMethod === 'relief_at_source' ? pension : 0;

  // Adjusted net income drives PA taper, HICBC and the £100k cliff. A gross pension
  // contribution reduces ANI under all three methods.
  const adjustedNetIncome = Math.max(0, grossSalary + otherIncome - pension);

  const personalAllowance = taperedPersonalAllowance(adjustedNetIncome, cfg);
  const taxableIncome = taxableEmployment + otherIncome;

  const incomeTax = incomeTaxOnTaxable(taxableIncome, personalAllowance, cfg, rasExtension);
  const ni = employeeNI(niableEmployment, cfg);
  const charge = hicbc(adjustedNetIncome, children, cfg);

  const totalDeductions = incomeTax + ni + charge;
  const takeHome = grossSalary + otherIncome - pension - totalDeductions;

  return {
    grossSalary,
    otherIncome,
    pensionContribution: pension,
    personalAllowance,
    adjustedNetIncome,
    incomeTax,
    employeeNI: ni,
    hicbc: charge,
    totalDeductions,
    takeHome,
  };
}

/**
 * Numerical marginal tax rate on the next £1 of gross salary at `grossSalary`.
 * Central difference for accuracy away from exact band edges.
 */
export function marginalRate(
  grossSalary: number,
  inputs: EngineInputs,
  cfg: TaxConfig = config2026,
  step = 1,
): number {
  const lo = computeBreakdown(Math.max(0, grossSalary - step), inputs, cfg).totalDeductions;
  const hi = computeBreakdown(grossSalary + step, inputs, cfg).totalDeductions;
  const dGross = grossSalary - step < 0 ? grossSalary + step : 2 * step;
  return (hi - lo) / dGross;
}

/** Effective (average) tax rate: total deductions as a share of total gross. */
export function effectiveRate(breakdown: DeductionBreakdown): number {
  const totalGross = breakdown.grossSalary + breakdown.otherIncome;
  return totalGross > 0 ? breakdown.totalDeductions / totalGross : 0;
}

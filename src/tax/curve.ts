// Builds the data the chart consumes: a fine marginal-rate curve plus annotations
// (the £100k childcare cliff, and the user's current position). Pure — depends only
// on the engine.

import { config2026, type TaxConfig } from './config2026';
import { computeBreakdown, marginalRate, type EngineInputs } from './engine';
import { resolvePensionAmount, type Annotation, type CurvePoint, type TaxInputs } from './types';

export const SWEEP_MIN = 0;
export const SWEEP_MAX = 200_000;
export const SWEEP_STEP = 50;

/** Resolve user inputs into the fixed-£ engine inputs used across a sweep. */
export function toEngineInputs(inputs: TaxInputs): EngineInputs {
  return {
    otherIncome: inputs.otherIncome,
    pensionAmount: resolvePensionAmount(inputs.pension, inputs.grossSalary),
    pensionMethod: inputs.pension.method,
    children: inputs.children,
  };
}

/** Sweep gross salary and return marginal-rate points for the chart line. */
export function buildCurve(
  inputs: TaxInputs,
  cfg: TaxConfig = config2026,
  min = SWEEP_MIN,
  max = SWEEP_MAX,
  step = SWEEP_STEP,
): CurvePoint[] {
  const engineInputs = toEngineInputs(inputs);
  const points: CurvePoint[] = [];
  for (let gross = min; gross <= max; gross += step) {
    points.push({ gross, marginalRate: marginalRate(gross, engineInputs, cfg) });
  }
  return points;
}

/**
 * Total annual childcare value the household would lose above £100k ANI, from the
 * toggles that are switched on. Cliffs are per *eligible child*.
 */
function childcareValueLost(inputs: TaxInputs): number {
  if (inputs.children <= 0) return 0;
  const { childcare, children } = inputs;
  let perChild = 0;
  if (childcare.usesTaxFreeChildcare) perChild += childcare.taxFreeChildcarePerChild;
  if (childcare.usesFundedHours) perChild += childcare.fundedHoursPerChild;
  return perChild * children;
}

/**
 * The £100k childcare cliff, expressed on the gross-income x-axis.
 * ANI = gross + otherIncome − pension, so the cliff sits at the gross that makes
 * ANI equal the threshold. Returns null when there's nothing to lose.
 */
export function buildCliffAnnotation(
  inputs: TaxInputs,
  cfg: TaxConfig = config2026,
): Annotation | null {
  const valueLost = childcareValueLost(inputs);
  if (valueLost <= 0) return null;

  const pension = resolvePensionAmount(inputs.pension, inputs.grossSalary);
  const cliffGross = cfg.childcareCliffThreshold - inputs.otherIncome + pension;
  if (cliffGross < SWEEP_MIN || cliffGross > SWEEP_MAX) return null;

  // Just above the cliff you keep (1 − marginal) of each extra £1. To out-earn the
  // lost benefit you need a raise of valueLost / that retention rate.
  const engineInputs = toEngineInputs(inputs);
  const retention = 1 - marginalRate(cliffGross + 100, engineInputs, cfg);
  const payRiseToRecover = retention > 0 ? valueLost / retention : Infinity;

  return {
    kind: 'cliff',
    label: 'Childcare cliff (£100k)',
    at: cliffGross,
    valueLost,
    payRiseToRecover,
    detail:
      `Above £100k adjusted net income you lose ~£${Math.round(valueLost).toLocaleString()} of ` +
      `childcare support at once. You'd need roughly £${Math.round(payRiseToRecover).toLocaleString()} ` +
      `more gross to be back where you were.`,
  };
}

/** The user's current position marker. */
export function buildPositionAnnotation(inputs: TaxInputs, cfg: TaxConfig = config2026): Annotation {
  const engineInputs = toEngineInputs(inputs);
  const breakdown = computeBreakdown(inputs.grossSalary, engineInputs, cfg);
  return {
    kind: 'position',
    label: 'You',
    at: inputs.grossSalary,
    detail: `Marginal rate ${(marginalRate(inputs.grossSalary, engineInputs, cfg) * 100).toFixed(
      0,
    )}% · take-home £${Math.round(breakdown.takeHome).toLocaleString()}`,
  };
}

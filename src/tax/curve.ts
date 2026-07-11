// Builds the data the chart consumes: a fine marginal-rate curve plus annotations
// (the £100k childcare cliff, and the user's current position). Pure — depends only
// on the engine.

import { config2026, type TaxConfig } from './config2026';
import { bonusResult, computeBreakdown, marginalRate, type EngineInputs } from './engine';
import { formatGBP } from './format';
import {
  resolvePensionAmount,
  type Annotation,
  type BonusResult,
  type CurvePoint,
  type TaxInputs,
} from './types';

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
    studentLoan: inputs.studentLoan,
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

  // The "dead zone": just past the cliff you've lost `valueLost` of childcare, and
  // extra pay only trickles back (you keep well under half of it in the 60% band).
  // The zone ends where take-home has risen by the full `valueLost` — i.e. where a
  // pound of your total finances (take-home + childcare) finally exceeds where you
  // stood at the cliff edge. Solved exactly against the take-home curve.
  const engineInputs = toEngineInputs(inputs);
  const recovery = grossToRecover(cliffGross, valueLost, engineInputs, cfg);
  const payRiseToRecover = recovery.gross - cliffGross;

  const detail = recovery.recovered
    ? `Cross this point and you lose ~${formatGBP(valueLost)} of childcare support in one go. ` +
      `Everything from ${formatGBP(cliffGross)} up to ${formatGBP(recovery.gross)} gross (the shaded ` +
      `zone) leaves you financially no better off than at ${formatGBP(cliffGross)} — you only truly ` +
      `get ahead once you earn about ${formatGBP(recovery.gross)} (${formatGBP(payRiseToRecover)} more).`
    : `Cross this point and you lose ~${formatGBP(valueLost)} of childcare support in one go. ` +
      `You wouldn't earn that back even by ${formatGBP(SWEEP_MAX)} gross — the shaded zone runs off the chart.`;

  return {
    kind: 'cliff',
    label: 'Childcare cliff (£100k)',
    at: cliffGross,
    from: cliffGross,
    to: recovery.gross,
    valueLost,
    payRiseToRecover,
    detail,
  };
}

/**
 * The gross income at which take-home has risen by `valueLost` above its level at
 * `cliffGross` — i.e. where you've fully out-earned the lost childcare benefit.
 * Take-home is monotonic in gross, so we binary-search it. Returns `recovered:false`
 * (clamped to SWEEP_MAX) when recovery lies beyond the charted range.
 */
function grossToRecover(
  cliffGross: number,
  valueLost: number,
  engineInputs: EngineInputs,
  cfg: TaxConfig,
): { gross: number; recovered: boolean } {
  const target = computeBreakdown(cliffGross, engineInputs, cfg).takeHome + valueLost;
  if (computeBreakdown(SWEEP_MAX, engineInputs, cfg).takeHome < target) {
    return { gross: SWEEP_MAX, recovered: false };
  }
  let lo = cliffGross;
  let hi = SWEEP_MAX;
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    if (computeBreakdown(mid, engineInputs, cfg).takeHome < target) lo = mid;
    else hi = mid;
  }
  return { gross: hi, recovered: true };
}

/**
 * The band over which the High Income Child Benefit Charge withdraws Child Benefit
 * (£60k–£80k adjusted net income), expressed on the gross-income x-axis. Only present
 * when there are children. The chart labels this as the raised "jump" in the curve.
 */
export function buildHicbcAnnotation(
  inputs: TaxInputs,
  cfg: TaxConfig = config2026,
): Annotation | null {
  if (inputs.children <= 0) return null;

  const pension = resolvePensionAmount(inputs.pension, inputs.grossSalary);
  const from = cfg.hicbcLowerThreshold - inputs.otherIncome + pension;
  const to = cfg.hicbcUpperThreshold - inputs.otherIncome + pension;
  if (to < SWEEP_MIN || from > SWEEP_MAX) return null;

  return {
    kind: 'band',
    label: 'Child Benefit charge',
    from,
    to,
    detail: `Between ${formatGBP(from)} and ${formatGBP(to)} gross, Child Benefit is clawed back, ` +
      `adding to your marginal rate.`,
  };
}

/**
 * How much of a one-off bonus you truly keep, including the £100k childcare cliff.
 * If the bonus is what tips adjusted net income over £100k, the whole childcare
 * benefit is forfeited — which can make the bonus worth less than nothing.
 */
export function buildBonus(inputs: TaxInputs, cfg: TaxConfig = config2026): BonusResult {
  const engineInputs = toEngineInputs(inputs);
  const core = bonusResult(inputs.grossSalary, inputs.bonus, engineInputs, cfg);

  const valueLost = childcareValueLost(inputs);
  const aniBefore = computeBreakdown(inputs.grossSalary, engineInputs, cfg).adjustedNetIncome;
  const aniAfter = computeBreakdown(
    inputs.grossSalary + inputs.bonus,
    engineInputs,
    cfg,
  ).adjustedNetIncome;
  const crossesCliff =
    valueLost > 0 &&
    aniBefore <= cfg.childcareCliffThreshold &&
    aniAfter > cfg.childcareCliffThreshold;

  const childcareLost = crossesCliff ? valueLost : 0;
  const netKept = core.kept - childcareLost;
  return {
    ...core,
    childcareLost,
    netKept,
    netKeepRate: core.bonus > 0 ? netKept / core.bonus : 0,
    crossesCliff,
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

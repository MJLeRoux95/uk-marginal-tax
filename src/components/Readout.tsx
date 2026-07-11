import type { DeductionBreakdown } from '../tax/types';
import { formatGBP, formatPercent } from '../tax/format';

interface ReadoutProps {
  breakdown: DeductionBreakdown;
  marginalRate: number;
  effectiveRate: number;
}

export function Readout({ breakdown, marginalRate, effectiveRate }: ReadoutProps) {
  const b = breakdown;
  return (
    <div className="readout">
      <div className="stat stat-primary">
        <span className="stat-value">{formatPercent(marginalRate)}</span>
        <span className="stat-label">Marginal rate on your next £1</span>
      </div>
      <div className="stat">
        <span className="stat-value">{formatPercent(effectiveRate, 1)}</span>
        <span className="stat-label">Effective (average) rate</span>
      </div>
      <div className="stat">
        <span className="stat-value">{formatGBP(b.takeHome)}</span>
        <span className="stat-label">Take-home (cash)</span>
      </div>

      <table className="breakdown">
        <tbody>
          <tr>
            <td>Income Tax</td>
            <td>{formatGBP(b.incomeTax)}</td>
          </tr>
          <tr>
            <td>Employee NI</td>
            <td>{formatGBP(b.employeeNI)}</td>
          </tr>
          {b.hicbc > 0 && (
            <tr>
              <td>Child Benefit charge</td>
              <td>{formatGBP(b.hicbc)}</td>
            </tr>
          )}
          {b.studentLoan > 0 && (
            <tr>
              <td>Student loan</td>
              <td>{formatGBP(b.studentLoan)}</td>
            </tr>
          )}
          {b.pensionContribution > 0 && (
            <tr className="muted">
              <td>Pension (saved, not taxed as income)</td>
              <td>{formatGBP(b.pensionContribution)}</td>
            </tr>
          )}
          <tr className="total">
            <td>Total deductions</td>
            <td>{formatGBP(b.totalDeductions)}</td>
          </tr>
          <tr className="muted">
            <td>Adjusted net income</td>
            <td>{formatGBP(b.adjustedNetIncome)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

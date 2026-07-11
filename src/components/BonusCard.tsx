import type { BonusResult } from '../tax/types';
import { formatGBP, formatPercent } from '../tax/format';

interface BonusCardProps {
  result: BonusResult;
}

/** Shows how much of a one-off bonus actually reaches the user's pocket. */
export function BonusCard({ result }: BonusCardProps) {
  const { bonus, kept, deducted, keepRate } = result;
  const keptPct = Math.round(keepRate * 100);

  return (
    <div className="bonus-card">
      <div className="bonus-headline">
        <span className="bonus-amount">{formatGBP(kept)}</span>
        <span className="bonus-sub">
          kept from your {formatGBP(bonus)} bonus ({formatPercent(keepRate)})
        </span>
      </div>

      <div className="bonus-bar" role="img" aria-label={`You keep ${keptPct}% of your bonus`}>
        <div className="bonus-bar-kept" style={{ width: `${keptPct}%` }} />
        <div className="bonus-bar-lost" style={{ width: `${100 - keptPct}%` }} />
      </div>

      <div className="bonus-legend">
        <span>
          <i className="dot dot-kept" /> Keep {formatGBP(kept)}
        </span>
        <span>
          <i className="dot dot-lost" /> Tax, NI &amp; loan {formatGBP(deducted)}
        </span>
      </div>
    </div>
  );
}

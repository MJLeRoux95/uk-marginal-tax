import type { BonusResult } from '../tax/types';
import { formatGBP, formatPercent } from '../tax/format';

interface BonusCardProps {
  result: BonusResult;
}

/** How much of a one-off bonus actually reaches your pocket, incl. the £100k cliff. */
export function BonusCard({ result }: BonusCardProps) {
  const { bonus, kept, deducted, childcareLost, netKept, netKeepRate, crossesCliff } = result;

  // Bonus makes you worse off overall: lost childcare outweighs the take-home gain.
  const worseOff = netKept < 0;

  // Segment widths as a share of the bonus (kept + deducted + childcareLost = bonus).
  const pct = (v: number) => Math.max(0, Math.round((v / bonus) * 100));

  return (
    <div className={`bonus-card${crossesCliff ? ' bonus-cliff' : ''}`}>
      <div className="bonus-headline">
        <span className={`bonus-amount${worseOff ? ' negative' : ''}`}>
          {worseOff ? `−${formatGBP(-netKept)}` : formatGBP(netKept)}
        </span>
        <span className="bonus-sub">
          {worseOff
            ? `worse off after a ${formatGBP(bonus)} bonus`
            : `kept from your ${formatGBP(bonus)} bonus (${formatPercent(netKeepRate)})`}
        </span>
      </div>

      {crossesCliff && (
        <p className="bonus-warning">
          ⚠️ This bonus tips you over the <strong>£100k childcare cliff</strong>, forfeiting{' '}
          {formatGBP(childcareLost)} of childcare. {formatGBP(kept)} survives tax &amp; NI, but after
          the childcare loss you {worseOff ? 'end up' : 'keep just'}{' '}
          <strong>
            {worseOff ? `${formatGBP(-netKept)} down` : `${formatGBP(netKept)}`}
          </strong>
          .
        </p>
      )}

      {!worseOff && (
        <div className="bonus-bar" role="img" aria-label={`You keep ${pct(netKept)}% of your bonus`}>
          <div className="bonus-bar-kept" style={{ width: `${pct(netKept)}%` }} />
          <div className="bonus-bar-lost" style={{ width: `${pct(deducted)}%` }} />
          {childcareLost > 0 && (
            <div className="bonus-bar-childcare" style={{ width: `${pct(childcareLost)}%` }} />
          )}
        </div>
      )}

      <div className="bonus-legend">
        <span>
          <i className="dot dot-kept" /> Keep {formatGBP(Math.max(0, netKept))}
        </span>
        <span>
          <i className="dot dot-lost" /> Tax, NI &amp; loan {formatGBP(deducted)}
        </span>
        {childcareLost > 0 && (
          <span>
            <i className="dot dot-childcare" /> Childcare {formatGBP(childcareLost)}
          </span>
        )}
      </div>
    </div>
  );
}

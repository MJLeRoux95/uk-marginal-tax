import { useRef, type Dispatch, type SetStateAction } from 'react';
import type { TaxInputs } from '../tax/types';
import {
  cycleToWorkSaving,
  reliefAtSourceHigherRateClaimable,
  salarySacrificeSwitchSaving,
} from '../tax/curve';
import { formatGBP } from '../tax/format';
import { PensionFields, pensionMethods } from './PensionFields';

interface Props {
  inputs: TaxInputs;
  setInputs: Dispatch<SetStateAction<TaxInputs>>;
  onBack: () => void;
}

export function AdvicePanel({ inputs, setInputs, onBack }: Props) {
  const patch = (p: Partial<TaxInputs>) => setInputs((s) => ({ ...s, ...p }));

  const onSalarySacrifice = inputs.pension.method === 'salary_sacrifice';
  const currentMethodLabel = pensionMethods.find((m) => m.value === inputs.pension.method)?.label;
  const switchSaving = salarySacrificeSwitchSaving(inputs);
  const bikeSaving = cycleToWorkSaving(inputs);
  // Higher/additional-rate relief to claim back on a relief-at-source pension.
  const raSClaimable = reliefAtSourceHigherRateClaimable(inputs);

  // Once the salary-sacrifice section has appeared, keep it: switching pension method
  // in the section below shouldn't make it flicker in and out. It becomes a
  // confirmation once you're on salary sacrifice.
  const showSacrificeSection = useRef(!onSalarySacrifice);
  if (!onSalarySacrifice) showSacrificeSection.current = true;

  let n = 0;

  return (
    <div className="advice">
      <div className="advice-head">
        <button type="button" className="advice-back" onClick={onBack}>
          ← Back to inputs
        </button>
        <h2>Ways to pay less tax</h2>
        <p className="advice-intro">
          Each option below feeds straight back into the chart and the numbers above.
        </p>
      </div>

      {raSClaimable > 0 && (
        <section className="advice-item">
          <span className="advice-num">{++n}</span>
          <div className="advice-body">
            <h3>Have you claimed your tax back?</h3>
            <p>
              Your relief-at-source pension is automatically topped up by 20% — for a basic-rate
              taxpayer, that's all their tax back. But you pay tax above 20%, so the extra relief
              isn't given automatically: you claim it through Self Assessment or HMRC's online
              service, and the tax you overpaid is refunded to your bank account.
            </p>
            <div className="advice-saving">
              <strong>{formatGBP(raSClaimable)}/yr</strong> of higher-rate relief to claim back
            </div>
            <a
              className="advice-action"
              href="https://www.gov.uk/guidance/claim-tax-relief-on-your-private-pension-payments"
              target="_blank"
              rel="noreferrer"
            >
              Claim it at GOV.UK →
            </a>
          </div>
        </section>
      )}

      {showSacrificeSection.current && (
        <section className="advice-item">
          <span className="advice-num">{++n}</span>
          <div className="advice-body">
            <h3>Use salary sacrifice for your pension</h3>
            {onSalarySacrifice ? (
              <>
                <p>
                  Salary sacrifice is the most tax-efficient way to contribute: every pound avoids
                  both Income Tax and National Insurance.
                </p>
                <div className="advice-saving advice-done">✓ You're on salary sacrifice</div>
              </>
            ) : (
              <>
                <p>
                  You're on <strong>{currentMethodLabel}</strong>. Salary sacrifice gives the same
                  tax relief but also avoids National Insurance on your contributions — for the same
                  money in your pension, more stays out of the taxman's hands.
                </p>
                <div className="advice-saving">
                  {switchSaving > 0 ? (
                    <>
                      <strong>{formatGBP(switchSaving)}/yr</strong> saved at your current
                      contribution
                    </>
                  ) : (
                    <>Add a contribution below to see the saving</>
                  )}
                </div>
                <button
                  type="button"
                  className="advice-action"
                  onClick={() =>
                    setInputs((s) => ({
                      ...s,
                      pension: { ...s.pension, method: 'salary_sacrifice' },
                    }))
                  }
                >
                  Switch to salary sacrifice
                </button>
              </>
            )}
          </div>
        </section>
      )}

      <section className="advice-item">
        <span className="advice-num">{++n}</span>
        <div className="advice-body">
          <h3>Pay more into your pension</h3>
          <p>
            Every pound sacrificed drops your taxable (and, with salary sacrifice, NI-able) income —
            especially powerful in the 60% band above £100k. If your employer doesn't offer salary
            sacrifice, the other methods still cut your Income Tax.
          </p>
          <PensionFields inputs={inputs} setInputs={setInputs} />
        </div>
      </section>

      <section className="advice-item">
        <span className="advice-num">{++n}</span>
        <div className="advice-body">
          <h3>Get a bike (Cycle to Work)</h3>
          <p>
            Buy a bike and kit through your employer's Cycle to Work scheme and it comes out of gross
            pay — so you pay no Income Tax or NI on the cost.
          </p>
          <label className="field">
            <span className="field-label">
              Bike &amp; kit cost <strong>{formatGBP(inputs.cycleToWork)}</strong>
            </span>
            <input
              type="range"
              min={0}
              max={5000}
              step={50}
              value={inputs.cycleToWork}
              onChange={(e) => patch({ cycleToWork: Number(e.target.value) })}
            />
            <input
              type="number"
              min={0}
              step={50}
              value={inputs.cycleToWork}
              onChange={(e) => patch({ cycleToWork: Number(e.target.value) })}
              className="num-input"
            />
          </label>
          <div className="advice-saving">
            {bikeSaving > 0 ? (
              <>
                <strong>{formatGBP(bikeSaving)}</strong> saved in tax &amp; NI — a{' '}
                {formatGBP(inputs.cycleToWork)} bike effectively costs{' '}
                {formatGBP(inputs.cycleToWork - bikeSaving)}
              </>
            ) : (
              <>Enter a bike cost to see the saving</>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

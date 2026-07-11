import type { Dispatch, SetStateAction } from 'react';
import type { PensionMethod, TaxInputs } from '../tax/types';
import { formatGBP } from '../tax/format';

export const pensionMethods: { value: PensionMethod; label: string; hint: string }[] = [
  { value: 'salary_sacrifice', label: 'Salary sacrifice', hint: 'Cuts Income Tax and NI' },
  { value: 'relief_at_source', label: 'Relief at source', hint: 'Tax relief only, no NI saving' },
  { value: 'net_pay', label: 'Net pay', hint: 'Cuts tax before NI, no NI saving' },
];

interface Props {
  inputs: TaxInputs;
  setInputs: Dispatch<SetStateAction<TaxInputs>>;
}

/** Pension method selector + contribution amount — shared by the inputs and advice views. */
export function PensionFields({ inputs, setInputs }: Props) {
  const patchPension = (p: Partial<TaxInputs['pension']>) =>
    setInputs((s) => ({ ...s, pension: { ...s.pension, ...p } }));

  return (
    <>
      <div className="segmented">
        {pensionMethods.map((m) => (
          <button
            key={m.value}
            type="button"
            className={inputs.pension.method === m.value ? 'seg active' : 'seg'}
            onClick={() => patchPension({ method: m.value })}
            title={m.hint}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="hint">{pensionMethods.find((m) => m.value === inputs.pension.method)?.hint}</p>

      <div className="field-row">
        <label className="field grow">
          <span className="field-label">
            Contribution{' '}
            {inputs.pension.inputType === 'percent'
              ? `${inputs.pension.value}%`
              : formatGBP(inputs.pension.value)}
          </span>
          <input
            type="range"
            min={0}
            max={inputs.pension.inputType === 'percent' ? 60 : 60_000}
            step={inputs.pension.inputType === 'percent' ? 1 : 500}
            value={inputs.pension.value}
            onChange={(e) => patchPension({ value: Number(e.target.value) })}
          />
        </label>
        <div className="segmented small">
          <button
            type="button"
            className={inputs.pension.inputType === 'percent' ? 'seg active' : 'seg'}
            onClick={() => patchPension({ inputType: 'percent', value: 5 })}
          >
            %
          </button>
          <button
            type="button"
            className={inputs.pension.inputType === 'amount' ? 'seg active' : 'seg'}
            onClick={() => patchPension({ inputType: 'amount', value: 5_000 })}
          >
            £
          </button>
        </div>
      </div>
    </>
  );
}

import type { Dispatch, SetStateAction } from 'react';
import type { PensionMethod, TaxInputs } from '../tax/types';
import { formatGBP } from '../tax/format';

interface ControlsProps {
  inputs: TaxInputs;
  setInputs: Dispatch<SetStateAction<TaxInputs>>;
}

const pensionMethods: { value: PensionMethod; label: string; hint: string }[] = [
  { value: 'salary_sacrifice', label: 'Salary sacrifice', hint: 'Cuts Income Tax and NI' },
  { value: 'relief_at_source', label: 'Relief at source', hint: 'Tax relief only, no NI saving' },
  { value: 'net_pay', label: 'Net pay', hint: 'Cuts tax before NI, no NI saving' },
];

export function Controls({ inputs, setInputs }: ControlsProps) {
  const patch = (p: Partial<TaxInputs>) => setInputs((s) => ({ ...s, ...p }));
  const patchPension = (p: Partial<TaxInputs['pension']>) =>
    setInputs((s) => ({ ...s, pension: { ...s.pension, ...p } }));
  const patchChildcare = (p: Partial<TaxInputs['childcare']>) =>
    setInputs((s) => ({ ...s, childcare: { ...s.childcare, ...p } }));

  return (
    <div className="controls">
      <section className="control-group">
        <label className="field">
          <span className="field-label">
            Gross salary <strong>{formatGBP(inputs.grossSalary)}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={200_000}
            step={500}
            value={inputs.grossSalary}
            onChange={(e) => patch({ grossSalary: Number(e.target.value) })}
          />
          <input
            type="number"
            min={0}
            step={1000}
            value={inputs.grossSalary}
            onChange={(e) => patch({ grossSalary: Number(e.target.value) })}
            className="num-input"
          />
        </label>

        <label className="field">
          <span className="field-label">Other taxable income</span>
          <input
            type="number"
            min={0}
            step={500}
            value={inputs.otherIncome}
            onChange={(e) => patch({ otherIncome: Number(e.target.value) })}
            className="num-input"
          />
        </label>
      </section>

      <section className="control-group">
        <h3>Pension</h3>
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
      </section>

      <section className="control-group">
        <h3>Children</h3>
        <label className="field">
          <span className="field-label">Number of children (for Child Benefit)</span>
          <div className="stepper">
            <button
              type="button"
              onClick={() => patch({ children: Math.max(0, inputs.children - 1) })}
            >
              −
            </button>
            <span>{inputs.children}</span>
            <button type="button" onClick={() => patch({ children: inputs.children + 1 })}>
              +
            </button>
          </div>
        </label>

        {inputs.children > 0 && (
          <div className="checks">
            <label className="check">
              <input
                type="checkbox"
                checked={inputs.childcare.usesTaxFreeChildcare}
                onChange={(e) => patchChildcare({ usesTaxFreeChildcare: e.target.checked })}
              />
              Uses Tax-Free Childcare
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={inputs.childcare.usesFundedHours}
                onChange={(e) => patchChildcare({ usesFundedHours: e.target.checked })}
              />
              Uses funded childcare hours
            </label>
          </div>
        )}
      </section>
    </div>
  );
}

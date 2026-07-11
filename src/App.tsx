import { useMemo, useState } from 'react';
import { Chart } from './components/Chart';
import { Controls } from './components/Controls';
import { Readout } from './components/Readout';
import { buildCliffAnnotation, buildCurve, toEngineInputs } from './tax/curve';
import { computeBreakdown, effectiveRate, marginalRate } from './tax/engine';
import { formatGBP } from './tax/format';
import { defaultInputs } from './state/defaults';
import type { TaxInputs } from './tax/types';
import './App.css';

export default function App() {
  const [inputs, setInputs] = useState<TaxInputs>(defaultInputs);

  // Everything derived recomputes on every input change — no "Calculate" button.
  const { curve, cliff, breakdown, marginal, effective } = useMemo(() => {
    const engineInputs = toEngineInputs(inputs);
    const b = computeBreakdown(inputs.grossSalary, engineInputs);
    return {
      curve: buildCurve(inputs),
      cliff: buildCliffAnnotation(inputs),
      breakdown: b,
      marginal: marginalRate(inputs.grossSalary, engineInputs),
      effective: effectiveRate(b),
    };
  }, [inputs]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>UK Marginal Tax Explorer</h1>
        <p>
          How much of your next £1 actually reaches your pocket. England, Wales &amp; Northern
          Ireland · illustrative 2026/27 figures.
        </p>
      </header>

      <main className="layout">
        <div className="chart-panel">
          <Chart curve={curve} cliff={cliff} positionGross={inputs.grossSalary} />
          {cliff && (
            <p className="cliff-note">
              ⚠️ Childcare cliff at {formatGBP(cliff.at ?? 0)} gross: {cliff.detail}
            </p>
          )}
        </div>

        <aside className="side-panel">
          <Readout breakdown={breakdown} marginalRate={marginal} effectiveRate={effective} />
          <Controls inputs={inputs} setInputs={setInputs} />
        </aside>
      </main>

      <footer className="app-footer">
        Estimates only, not tax advice. Assumes standard tax code, no Scottish rates, no student
        loan. Verify figures against GOV.UK.
      </footer>
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { area, curveStepAfter, line } from 'd3-shape';
import type { Annotation, CurvePoint } from '../tax/types';
import { formatGBP, formatPercent } from '../tax/format';

const VB_W = 900;
const VB_H = 480;
const M = { top: 24, right: 24, bottom: 48, left: 56 };

const X_MAX = 200_000;
const Y_MAX = 0.72;

interface ChartProps {
  curve: CurvePoint[];
  cliff: Annotation | null;
  positionGross: number;
  bonus: number;
}

/** Nearest marginal rate on the curve for a given gross (curve is finely sampled). */
function rateAt(curve: CurvePoint[], gross: number): number {
  if (curve.length === 0) return 0;
  const step = curve.length > 1 ? curve[1].gross - curve[0].gross : 1;
  const i = Math.max(0, Math.min(curve.length - 1, Math.round(gross / step)));
  return curve[i].marginalRate;
}

export function Chart({ curve, cliff, positionGross, bonus }: ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverGross, setHoverGross] = useState<number | null>(null);

  const x = useMemo(() => scaleLinear().domain([0, X_MAX]).range([M.left, VB_W - M.right]), []);
  const y = useMemo(() => scaleLinear().domain([0, Y_MAX]).range([VB_H - M.bottom, M.top]), []);

  const linePath = useMemo(
    () =>
      line<CurvePoint>()
        .x((d) => x(d.gross))
        .y((d) => y(d.marginalRate))
        .curve(curveStepAfter)(curve) ?? '',
    [curve, x, y],
  );

  const areaPath = useMemo(
    () =>
      area<CurvePoint>()
        .x((d) => x(d.gross))
        .y0(y(0))
        .y1((d) => y(d.marginalRate))
        .curve(curveStepAfter)(curve) ?? '',
    [curve, x, y],
  );

  const yTicks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
  const xTicks = [0, 50_000, 100_000, 150_000, 200_000];

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * VB_W;
    const gross = Math.max(0, Math.min(X_MAX, x.invert(svgX)));
    setHoverGross(gross);
  };

  const posRate = rateAt(curve, positionGross);
  const hoverRate = hoverGross != null ? rateAt(curve, hoverGross) : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="chart"
      role="img"
      aria-label="Marginal tax rate against gross income"
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverGross(null)}
    >
      {/* horizontal gridlines + rate labels */}
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={M.left}
            x2={VB_W - M.right}
            y1={y(t)}
            y2={y(t)}
            className={t === 0 ? 'axis-line' : 'grid-line'}
          />
          <text x={M.left - 10} y={y(t) + 4} className="tick-label" textAnchor="end">
            {formatPercent(t)}
          </text>
        </g>
      ))}

      {/* x ticks */}
      {xTicks.map((t) => (
        <text key={t} x={x(t)} y={VB_H - M.bottom + 22} className="tick-label" textAnchor="middle">
          {t === 0 ? '£0' : `£${t / 1000}k`}
        </text>
      ))}
      <text x={VB_W / 2} y={VB_H - 6} className="axis-title" textAnchor="middle">
        Gross income
      </text>
      <text
        x={-VB_H / 2}
        y={16}
        className="axis-title"
        textAnchor="middle"
        transform="rotate(-90)"
      >
        Marginal tax rate
      </text>

      {/* the curve */}
      <path d={areaPath} className="curve-area" />
      <path d={linePath} className="curve-line" />

      {/* bonus span: from your salary to salary + bonus */}
      {bonus > 0 && (
        <rect
          x={x(positionGross)}
          y={M.top}
          width={Math.max(0, x(Math.min(positionGross + bonus, X_MAX)) - x(positionGross))}
          height={VB_H - M.bottom - M.top}
          className="bonus-span"
        />
      )}

      {/* £100k childcare cliff */}
      {cliff?.at != null && (
        <g>
          <line
            x1={x(cliff.at)}
            x2={x(cliff.at)}
            y1={M.top}
            y2={VB_H - M.bottom}
            className="cliff-line"
          />
          <polygon
            points={`${x(cliff.at)},${M.top} ${x(cliff.at) + 66},${M.top} ${x(cliff.at) + 66},${
              M.top + 16
            } ${x(cliff.at)},${M.top + 16}`}
            className="cliff-flag"
          />
          <text x={x(cliff.at) + 5} y={M.top + 12} className="cliff-flag-text">
            £100k cliff
          </text>
        </g>
      )}

      {/* your position */}
      <line
        x1={x(positionGross)}
        x2={x(positionGross)}
        y1={M.top}
        y2={VB_H - M.bottom}
        className="position-line"
      />
      <circle cx={x(positionGross)} cy={y(posRate)} r={5} className="position-dot" />
      <g transform={`translate(${x(positionGross)}, ${y(posRate) - 12})`}>
        <rect x={-40} y={-20} width={80} height={18} rx={4} className="position-badge" />
        <text x={0} y={-7} className="position-badge-text" textAnchor="middle">
          You · {formatPercent(posRate)}
        </text>
      </g>

      {/* hover guideline + tooltip */}
      {hoverGross != null && (
        <g>
          <line
            x1={x(hoverGross)}
            x2={x(hoverGross)}
            y1={M.top}
            y2={VB_H - M.bottom}
            className="hover-line"
          />
          <g
            transform={`translate(${Math.min(x(hoverGross) + 10, VB_W - M.right - 130)}, ${M.top + 6})`}
          >
            <rect width={128} height={40} rx={6} className="tooltip-box" />
            <text x={8} y={17} className="tooltip-text">
              {formatGBP(hoverGross)}
            </text>
            <text x={8} y={33} className="tooltip-text tooltip-strong">
              {formatPercent(hoverRate)} marginal
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

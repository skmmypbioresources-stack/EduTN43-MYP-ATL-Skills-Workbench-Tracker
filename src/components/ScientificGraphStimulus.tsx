import React, { useState, useMemo } from 'react';
import { ScientificDataset } from '../types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { BarChart2, Table as TableIcon, Globe, Info, Sparkles, TrendingUp, Activity } from 'lucide-react';

interface ScientificGraphStimulusProps {
  dataset?: ScientificDataset;
  globalContext?: string;
  className?: string;
}

const SCIENTIFIC_PALETTE = [
  '#0284c7', // Sky blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#e11d48', // Rose
  '#0d9488', // Teal
  '#ea580c', // Orange
];

interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  equation: string;
  isotonicX?: number | null;
}

function calculateLinearRegression(data: any[], xKey: string, yKey: string): RegressionResult | null {
  const points = data
    .map((d) => ({ x: Number(d[xKey]), y: Number(d[yKey]) }))
    .filter((p) => !isNaN(p.x) && !isNaN(p.y));

  if (points.length < 2) return null;

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Correlation r & R²
  const yDenominator = n * sumY2 - sumY * sumY;
  let r2 = 0;
  if (Math.abs(yDenominator) > 1e-10) {
    const numerator = n * sumXY - sumX * sumY;
    const r = numerator / Math.sqrt(denominator * yDenominator);
    r2 = Math.min(1, Math.max(0, r * r));
  }

  // Equation: y = mx + c
  const sign = intercept >= 0 ? '+' : '-';
  const equation = `y = ${slope.toFixed(2)}x ${sign} ${Math.abs(intercept).toFixed(2)}`;

  // Isotonic point: x when y = 0
  let isotonicX: number | null = null;
  if (Math.abs(slope) > 1e-5) {
    const xZero = -intercept / slope;
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    if (xZero >= minX - 0.2 * (maxX - minX) && xZero <= maxX + 0.2 * (maxX - minX)) {
      isotonicX = Number(xZero.toFixed(2));
    }
  }

  return { slope, intercept, r2, equation, isotonicX };
}

export const ScientificGraphStimulus: React.FC<ScientificGraphStimulusProps> = ({
  dataset,
  globalContext,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [showBestFit, setShowBestFit] = useState(true);
  const [curveMode, setCurveMode] = useState<'monotone' | 'linear'>('monotone');

  if (!dataset || !dataset.data || dataset.data.length === 0) {
    return null;
  }

  const effectiveGlobalContext = dataset.global_context || globalContext;
  const xKey = dataset.x_key || Object.keys(dataset.data[0] || {})[0] || 'x';

  // Determine yKeys
  let yKeys: string[] = [];
  if (dataset.y_keys && dataset.y_keys.length > 0) {
    yKeys = dataset.y_keys;
  } else if (dataset.y_key) {
    yKeys = [dataset.y_key];
  } else {
    // Infer all numeric keys excluding xKey
    yKeys = Object.keys(dataset.data[0] || {}).filter(
      (k) => k !== xKey && typeof dataset.data[0][k] === 'number'
    );
    if (yKeys.length === 0) {
      yKeys = Object.keys(dataset.data[0] || {}).filter((k) => k !== xKey);
    }
  }

  const primaryYKey = yKeys[0];

  // Calculate regression for the primary series
  const regression = useMemo(() => {
    if (!primaryYKey) return null;
    return calculateLinearRegression(dataset.data, xKey, primaryYKey);
  }, [dataset.data, xKey, primaryYKey]);

  // Augment dataset with trendline points if numerical
  const processedData = useMemo(() => {
    if (!regression || !primaryYKey) return dataset.data;
    return dataset.data.map((row) => {
      const xVal = Number(row[xKey]);
      if (isNaN(xVal)) return row;
      const trendY = Number((regression.slope * xVal + regression.intercept).toFixed(2));
      return {
        ...row,
        [`${primaryYKey}_trendline`]: trendY,
      };
    });
  }, [dataset.data, xKey, primaryYKey, regression]);

  // Check if any y-values cross zero (e.g., negative mass change)
  const hasNegativeY = useMemo(() => {
    return dataset.data.some((row) => {
      for (const k of yKeys) {
        if (typeof row[k] === 'number' && row[k] < 0) return true;
      }
      return false;
    });
  }, [dataset.data, yKeys]);

  // Get table column headers
  const tableColumns = Object.keys(dataset.data[0] || {});

  const renderChart = () => {
    const rawGraphType = (dataset.graph_type || 'line').toLowerCase();

    switch (rawGraphType) {
      case 'bar':
      case 'histogram':
        return (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={dataset.data} margin={{ top: 20, right: 30, left: 15, bottom: 28 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey={xKey}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                label={{
                  value: dataset.unit_x ? `${dataset.x_axis_label} (${dataset.unit_x})` : dataset.x_axis_label,
                  position: 'insideBottom',
                  offset: -16,
                  fill: '#475569',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                label={{
                  value: dataset.unit_y ? `${dataset.y_axis_label} (${dataset.unit_y})` : dataset.y_axis_label,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#475569',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
                formatter={(val: any, name: any) => [
                  `${val} ${dataset.unit_y ? dataset.unit_y : ''}`,
                  dataset.series_labels?.[name] || name,
                ]}
                labelFormatter={(label) => `${dataset.x_axis_label}: ${label} ${dataset.unit_x ? dataset.unit_x : ''}`}
              />
              {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />}
              {yKeys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={dataset.series_labels?.[key] || key}
                  fill={SCIENTIFIC_PALETTE[idx % SCIENTIFIC_PALETTE.length]}
                  radius={[6, 6, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={340}>
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Pie
                data={dataset.data}
                dataKey={yKeys[0] || 'value'}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={50}
                paddingAngle={3}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                labelLine={false}
              >
                {dataset.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={SCIENTIFIC_PALETTE[index % SCIENTIFIC_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
                formatter={(val: any) => [`${val} ${dataset.unit_y || ''}`, dataset.y_axis_label || 'Value']}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        );

      // Line and Scatter: Both render plotted experimental data joined by a continuous curve AND optional best-fit line!
      case 'scatter':
      case 'line':
      default:
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={processedData} margin={{ top: 20, right: 35, left: 15, bottom: 28 }}>
              {/* Soft, clean solid grid lines - never confused with dotted plot lines */}
              <CartesianGrid stroke="#f1f5f9" vertical={false} />

              <XAxis
                dataKey={xKey}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                label={{
                  value: dataset.unit_x ? `${dataset.x_axis_label} (${dataset.unit_x})` : dataset.x_axis_label,
                  position: 'insideBottom',
                  offset: -16,
                  fill: '#475569',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                label={{
                  value: dataset.unit_y ? `${dataset.y_axis_label} (${dataset.unit_y})` : dataset.y_axis_label,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#475569',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />

              {/* Zero-line reference when values cross 0 (essential for osmosis equilibrium & mass changes) */}
              {hasNegativeY && (
                <ReferenceLine
                  y={0}
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    value: 'Equilibrium (y = 0)',
                    position: 'insideBottomRight',
                    fill: '#475569',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}

              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
                formatter={(val: any, name: any) => [
                  `${val} ${dataset.unit_y ? dataset.unit_y : ''}`,
                  dataset.series_labels?.[name] || name,
                ]}
                labelFormatter={(label) => `${dataset.x_axis_label}: ${label} ${dataset.unit_x ? dataset.unit_x : ''}`}
              />

              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />

              {/* 1. Plotted Experimental Points Joined by a Smooth Curve */}
              {yKeys.map((key, idx) => {
                const color = SCIENTIFIC_PALETTE[idx % SCIENTIFIC_PALETTE.length];
                return (
                  <Line
                    key={key}
                    type={curveMode}
                    dataKey={key}
                    name={dataset.series_labels?.[key] || key}
                    stroke={color}
                    strokeWidth={2.75}
                    dot={{
                      r: 5.5,
                      strokeWidth: 2,
                      fill: '#ffffff',
                      stroke: color,
                    }}
                    activeDot={{
                      r: 7.5,
                      strokeWidth: 2.5,
                      fill: color,
                      stroke: '#ffffff',
                    }}
                  />
                );
              })}

              {/* 2. Calculated Line / Curve of Best Fit (Fitted Trendline) */}
              {showBestFit && regression && primaryYKey && (
                <Line
                  type="linear"
                  dataKey={`${primaryYKey}_trendline`}
                  name={`Line of Best Fit (${regression.equation}, R²=${regression.r2.toFixed(2)})`}
                  stroke="#dc2626"
                  strokeWidth={2.2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const isContinuous = dataset.graph_type === 'line' || dataset.graph_type === 'scatter' || !dataset.graph_type;

  return (
    <div
      className={`rounded-2xl border border-sky-200/90 bg-gradient-to-b from-sky-50/40 via-white to-white p-5 shadow-xs transition-all ${className}`}
    >
      {/* Header with Global Context & View Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sky-100 pb-3.5">
        <div>
          {effectiveGlobalContext && (
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold tracking-wide">
              <Globe className="h-3 w-3 text-emerald-700" />
              <span>Global Context: {effectiveGlobalContext}</span>
            </div>
          )}
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-sky-600" />
            <span>{dataset.title || 'Scientific Data Stimulus'}</span>
          </h3>
          {dataset.description && (
            <p className="mt-1 text-xs text-slate-600 font-medium leading-relaxed max-w-3xl">
              {dataset.description}
            </p>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setViewMode('graph')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
              viewMode === 'graph'
                ? 'bg-white text-sky-700 shadow-2xs font-extrabold'
                : 'hover:text-slate-900'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Graph View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-sky-700 shadow-2xs font-extrabold'
                : 'hover:text-slate-900'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>Data Table</span>
          </button>
        </div>
      </div>

      {/* Interactive Controls Bar for Line / Best Fit Analysis */}
      {viewMode === 'graph' && isContinuous && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50/60 border border-sky-100 px-3.5 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBestFit(!showBestFit)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                showBestFit
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{showBestFit ? 'Best-Fit Line Active' : 'Show Line of Best Fit'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCurveMode(curveMode === 'monotone' ? 'linear' : 'monotone')}
              className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <Activity className="h-3.5 w-3.5 text-sky-600" />
              <span>Curve: {curveMode === 'monotone' ? 'Smooth Curve' : 'Straight Segments'}</span>
            </button>
          </div>

          {/* Mathematical Regression & Equilibrium Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {regression && (
              <span className="inline-flex items-center gap-1 rounded-md bg-white border border-sky-200 px-2 py-0.5 text-[11px] font-bold text-sky-900 shadow-2xs">
                <Sparkles className="h-3 w-3 text-red-500" />
                <span>Trend: {regression.equation}</span>
                <span className="text-slate-400 font-normal">|</span>
                <span className="text-emerald-700">R² = {regression.r2.toFixed(2)}</span>
              </span>
            )}

            {regression?.isotonicX !== null && regression?.isotonicX !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800 shadow-2xs">
                <span>Isotonic Equilibrium (y=0): ~{regression.isotonicX} {dataset.unit_x || ''}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Stimulus Content */}
      <div className="mt-4">
        {viewMode === 'graph' ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
            {renderChart()}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-700">
                <tr>
                  {tableColumns.map((col, cIdx) => (
                    <th key={cIdx} className="px-4 py-2.5">
                      {col === xKey && dataset.unit_x
                        ? `${dataset.x_axis_label || col} (${dataset.unit_x})`
                        : dataset.series_labels?.[col]
                        ? `${dataset.series_labels[col]} ${dataset.unit_y ? `(${dataset.unit_y})` : ''}`
                        : col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {dataset.data.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    {tableColumns.map((col, cIdx) => (
                      <td key={cIdx} className="px-4 py-2">
                        {row[col] !== undefined ? String(row[col]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer / Scientific Source Label */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-sky-100/80 pt-2.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-sky-600" />
          <span className="font-semibold text-slate-600">Source:</span>
          <span>{dataset.source_label || 'Simulated Scientific Dataset'}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 font-medium italic">
          <span>Inquiry Prompt: Analyse patterns, evaluate limitations, and cite quantitative values from the best-fit model below.</span>
        </div>
      </div>
    </div>
  );
};

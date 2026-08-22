import React, { useState } from 'react';
import { ScientificDataset } from '../types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart2, Table as TableIcon, Globe, Info, Sparkles } from 'lucide-react';

interface ScientificGraphStimulusProps {
  dataset?: ScientificDataset;
  globalContext?: string;
  className?: string;
}

const SCIENTIFIC_PALETTE = [
  '#0284c7', // Sky blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#e11d48', // Rose
  '#7c3aed', // Purple
  '#0d9488', // Teal
  '#ea580c', // Orange
];

export const ScientificGraphStimulus: React.FC<ScientificGraphStimulusProps> = ({
  dataset,
  globalContext,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');

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

  // Get table column headers
  const tableColumns = Object.keys(dataset.data[0] || {});

  const renderChart = () => {
    const graphType = (dataset.graph_type || 'line').toLowerCase();

    switch (graphType) {
      case 'bar':
      case 'histogram':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dataset.data} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey={xKey}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                label={{
                  value: dataset.unit_x ? `${dataset.x_axis_label} (${dataset.unit_x})` : dataset.x_axis_label,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#475569',
                  fontSize: 11,
                  fontWeight: 600,
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
                  fontWeight: 600,
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
              {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
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

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey={xKey}
                name={dataset.x_axis_label}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                label={{
                  value: dataset.unit_x ? `${dataset.x_axis_label} (${dataset.unit_x})` : dataset.x_axis_label,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#475569',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <YAxis
                dataKey={yKeys[0] || 'y'}
                name={dataset.y_axis_label}
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
                  fontWeight: 600,
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              />
              <Scatter
                name={dataset.series_labels?.[yKeys[0]] || dataset.title}
                data={dataset.data}
                fill="#0284c7"
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Pie
                data={dataset.data}
                dataKey={yKeys[0] || 'value'}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={105}
                innerRadius={45}
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

      case 'line':
      default:
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={dataset.data} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey={xKey}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                label={{
                  value: dataset.unit_x ? `${dataset.x_axis_label} (${dataset.unit_x})` : dataset.x_axis_label,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#475569',
                  fontSize: 11,
                  fontWeight: 600,
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
                  fontWeight: 600,
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
              {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
              {yKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={dataset.series_labels?.[key] || key}
                  stroke={SCIENTIFIC_PALETTE[idx % SCIENTIFIC_PALETTE.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div
      className={`rounded-2xl border border-sky-200/80 bg-gradient-to-b from-sky-50/40 to-white p-5 shadow-sm transition-all ${className}`}
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
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
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
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
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
          <span>Inquiry Prompt: Analyse patterns, evaluate limitations, and justify biological conclusions below.</span>
        </div>
      </div>
    </div>
  );
};

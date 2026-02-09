import React, { useMemo, useState } from 'react';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { formatAmountPrivacy } from '../utils/privacy';
import type { Transaction } from '../types';
import type { DateRange } from '../types';

interface ChartDataItem {
  label: string;
  expenses: number;
  income: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  privacyMode?: boolean;
}

const CustomTooltip = ({ active, payload, label, privacyMode = false }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm" style={{ color: p.color }}>
          {p.name === 'expenses' ? 'Expenses' : 'Income'}: {formatAmountPrivacy(Math.abs(p.value), privacyMode)}
        </p>
      ))}
    </div>
  );
};

export interface SpendingChartProps {
  transactions: Transaction[];
  selectedRange: DateRange;
  privacyMode?: boolean;
}

export default function SpendingChart({ transactions, selectedRange, privacyMode = false }: SpendingChartProps) {
  const [view, setView] = useState<'auto' | 'daily' | 'weekly' | 'monthly'>('auto');

  const data = useMemo((): ChartDataItem[] => {
    if (!selectedRange.from || !selectedRange.to || transactions.length === 0) return [];

    const days = differenceInDays(selectedRange.to, selectedRange.from);
    let effectiveView = view;
    if (view === 'auto') {
      if (days <= 31) effectiveView = 'daily';
      else if (days <= 120) effectiveView = 'weekly';
      else effectiveView = 'monthly';
    }

    let intervals: Date[];
    let formatStr: string;
    let keyFormat: string;

    switch (effectiveView) {
      case 'daily':
        intervals = eachDayOfInterval({ start: selectedRange.from, end: selectedRange.to });
        formatStr = 'd. MMM';
        keyFormat = 'yyyy-MM-dd';
        break;
      case 'weekly':
        intervals = eachWeekOfInterval(
          { start: selectedRange.from, end: selectedRange.to },
          { weekStartsOn: 1 }
        );
        formatStr = 'd. MMM';
        keyFormat = 'yyyy-ww';
        break;
      case 'monthly':
        intervals = eachMonthOfInterval({ start: selectedRange.from, end: selectedRange.to });
        formatStr = 'LLLL yyyy';
        keyFormat = 'yyyy-MM';
        break;
      default:
        intervals = eachDayOfInterval({ start: selectedRange.from, end: selectedRange.to });
        formatStr = 'd. MMM';
        keyFormat = 'yyyy-MM-dd';
    }

    const buckets: Record<string, ChartDataItem> = {};
    for (const d of intervals) {
      const key = format(d, keyFormat, { locale: cs });
      buckets[key] = {
        label: format(d, formatStr, { locale: cs }),
        expenses: 0,
        income: 0,
      };
    }

    for (const t of transactions) {
      const key = format(t.date, keyFormat, { locale: cs });
      if (buckets[key]) {
        if (t.amount < 0) {
          buckets[key].expenses += Math.abs(t.amount);
        } else {
          buckets[key].income += t.amount;
        }
      }
    }

    return Object.values(buckets).map((b) => ({
      ...b,
      expenses: Math.round(b.expenses),
      income: Math.round(b.income),
    }));
  }, [transactions, selectedRange, view]);

  const views = [
    { value: 'auto' as const, label: 'Auto' },
    { value: 'daily' as const, label: 'Daily' },
    { value: 'weekly' as const, label: 'Weekly' },
    { value: 'monthly' as const, label: 'Monthly' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Spending Over Time</h3>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {views.map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                view === v.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No data to display</p>
      ) : (
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip privacyMode={privacyMode} />} />
              <Bar
                dataKey="expenses"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                opacity={0.85}
              />
              <Bar
                dataKey="income"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                opacity={0.85}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

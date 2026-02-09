import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getCategoryColor } from '../utils/categories';
import { formatAmountPrivacy } from '../utils/privacy';
import type { Transaction } from '../types';

interface ChartDataItem {
  name: string;
  value: number;
  count: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataItem }>;
  privacyMode?: boolean;
}

const CustomTooltip = ({ active, payload, privacyMode = false }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="custom-tooltip">
      <p className="font-semibold text-gray-800">{data.payload.name}</p>
      <p className="text-sm text-gray-600">{formatAmountPrivacy(data.value, privacyMode)}</p>
      <p className="text-xs text-gray-400">{data.payload.count} transactions</p>
    </div>
  );
};

export interface TopSpendingChartProps {
  transactions: Transaction[];
  privacyMode?: boolean;
}

export default function TopSpendingChart({ transactions, privacyMode = false }: TopSpendingChartProps) {
  const data = useMemo((): ChartDataItem[] => {
    const expenses = transactions.filter((t) => t.amount < 0);
    const byCounterparty: Record<string, { total: number; count: number; category: string }> = {};

    for (const t of expenses) {
      const name = t.counterparty || t.description?.slice(0, 40) || 'Unknown';
      if (!byCounterparty[name]) {
        byCounterparty[name] = { total: 0, count: 0, category: t.category };
      }
      byCounterparty[name].total += Math.abs(t.amount);
      byCounterparty[name].count += 1;
    }

    return Object.entries(byCounterparty)
      .map(([name, { total, count, category }]) => ({
        name: name.length > 25 ? name.slice(0, 25) + '...' : name,
        value: Math.round(total),
        count,
        color: getCategoryColor(category),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Spending</h3>
        <p className="text-gray-400 text-center py-8">No expense data to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Spending</h3>
      <div style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
            <XAxis
              type="number"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={130}
            />
            <Tooltip content={<CustomTooltip privacyMode={privacyMode} />} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

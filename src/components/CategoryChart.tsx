import React, { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getCategoryColor } from '../utils/categories';
import { formatAmountPrivacy } from '../utils/privacy';
import type { Transaction } from '../types';

interface PieDataItem {
  name: string;
  value: number;
  count: number;
  percentage: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: PieDataItem }>;
  privacyMode?: boolean;
}

const CustomTooltip = ({ active, payload, privacyMode = false }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="custom-tooltip">
      <p className="font-semibold text-gray-800">{data.name}</p>
      <p className="text-sm text-gray-600">
        {formatAmountPrivacy(data.value, privacyMode)} ({data.payload.percentage}%)
      </p>
      <p className="text-xs text-gray-400">{data.payload.count} transactions</p>
    </div>
  );
};

export interface CategoryChartProps {
  transactions: Transaction[];
  privacyMode?: boolean;
}

export default function CategoryChart({ transactions, privacyMode = false }: CategoryChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const data = useMemo(() => {
    const expenses = transactions.filter((t) => t.amount < 0);
    const byCategory: Record<string, { total: number; count: number }> = {};

    for (const t of expenses) {
      const cat = t.category || 'Ostatní';
      if (!byCategory[cat]) {
        byCategory[cat] = { total: 0, count: 0 };
      }
      byCategory[cat].total += Math.abs(t.amount);
      byCategory[cat].count += 1;
    }

    const totalExpenses = Object.values(byCategory).reduce(
      (sum, v) => sum + v.total,
      0
    );

    return Object.entries(byCategory)
      .map(([name, { total, count }]): PieDataItem => ({
        name,
        value: Math.round(total),
        count,
        percentage: totalExpenses > 0 ? ((total / totalExpenses) * 100).toFixed(1) : '0',
        color: getCategoryColor(name),
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Expenses by Category</h3>
        <p className="text-gray-400 text-center py-8">No expense data to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Expenses by Category</h3>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="w-full lg:w-1/2" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="value"
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.color}
                    stroke="none"
                    onMouseEnter={() => setActiveIndex(index)}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip privacyMode={privacyMode} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full lg:w-1/2 space-y-2 max-h-80 overflow-y-auto">
          {data.map((item, index) => (
            <div
              key={item.name}
              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                activeIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium text-gray-700 truncate">
                  {item.name}
                </span>
              </div>
              <div className="text-right shrink-0 ml-3">
                <span className="text-sm font-semibold text-gray-900">
                  {formatAmountPrivacy(item.value, privacyMode)}
                </span>
                <span className="text-xs text-gray-400 ml-2">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

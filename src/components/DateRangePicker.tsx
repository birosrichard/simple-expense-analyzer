import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { DateRange } from '../types';

export interface DateRangePickerProps {
  dateRange: DateRange;
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

export default function DateRangePicker({
  dateRange,
  selectedRange,
  onRangeChange,
}: DateRangePickerProps) {
  const formatForInput = (d: Date) => (d ? format(d, 'yyyy-MM-dd') : '');

  const availableMonths = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    const months = eachMonthOfInterval(
      { start: dateRange.from, end: dateRange.to }
    );
    return months.sort((a, b) => b.getTime() - a.getTime());
  }, [dateRange?.from, dateRange?.to]);

  const monthOptions = useMemo(
    () =>
      availableMonths.map((d) => ({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'LLLL yyyy', { locale: cs }),
        date: d,
      })),
    [availableMonths]
  );

  const selectedMonthKey = useMemo(() => {
    if (!selectedRange?.from || !selectedRange?.to) return '';
    const fromStart = startOfMonth(selectedRange.from);
    const toEnd = endOfMonth(selectedRange.to);
    if (
      isSameDay(selectedRange.from, fromStart) &&
      isSameDay(selectedRange.to, toEnd) &&
      isSameMonth(selectedRange.from, selectedRange.to)
    ) {
      return format(selectedRange.from, 'yyyy-MM');
    }
    return '';
  }, [selectedRange]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) return;
    const [y, m] = value.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    onRangeChange({
      from: startOfMonth(monthStart),
      to: endOfMonth(monthStart),
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium shrink-0">Month</label>
          <select
            value={selectedMonthKey}
            onChange={handleMonthChange}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[180px]"
          >
            <option value="">Custom range</option>
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden sm:block w-px h-8 bg-gray-200" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">From</label>
          <input
            type="date"
            value={formatForInput(selectedRange.from)}
            min={formatForInput(dateRange.from)}
            max={formatForInput(selectedRange.to)}
            onChange={(e) => {
              const raw = e.target.value;
              if (!raw) return;
              const [y, m, d] = raw.split('-').map(Number);
              const date = new Date(y, m - 1, d);
              if (!isNaN(date.getTime())) onRangeChange({ ...selectedRange, from: date });
            }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <label className="text-xs text-gray-500 font-medium">To</label>
          <input
            type="date"
            value={formatForInput(selectedRange.to)}
            min={formatForInput(selectedRange.from)}
            max={formatForInput(dateRange.to)}
            onChange={(e) => {
              const raw = e.target.value;
              if (!raw) return;
              const [y, m, d] = raw.split('-').map(Number);
              const date = new Date(y, m - 1, d);
              if (!isNaN(date.getTime())) onRangeChange({ ...selectedRange, to: date });
            }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

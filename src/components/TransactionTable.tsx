import React, { useState, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { getCategoryColor, getAllCategories } from '../utils/categories';
import { formatAmountPrivacy } from '../utils/privacy';
import type { Transaction } from '../types';

interface CategoryDropdownProps {
  value: string;
  onChange: (category: string) => void;
  onClose: () => void;
  customCategories?: string[];
  onAddCustomCategory?: (name: string) => void;
}

function CategoryDropdown({
  value,
  onChange,
  onClose,
  customCategories = [],
  onAddCustomCategory,
}: CategoryDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const builtIn = getAllCategories();
  const customOnly = customCategories.filter((c) => !builtIn.includes(c));
  const categories = [...builtIn, ...customOnly];

  const filtered = categories.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );
  const showCreatePrompt = !showNewCategory && onAddCustomCategory;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCreateCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    onAddCustomCategory?.(trimmed);
    onChange(trimmed);
    setNewCategoryName('');
    setShowNewCategory(false);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute z-50 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
    >
      <div className="p-2 border-b border-gray-100">
        <input
          autoFocus={!showNewCategory}
          type="text"
          value={showNewCategory ? newCategoryName : search}
          onChange={(e) =>
            showNewCategory
              ? setNewCategoryName(e.target.value)
              : setSearch(e.target.value)
          }
          onKeyDown={(e) => {
            if (showNewCategory && e.key === 'Enter') {
              e.preventDefault();
              handleCreateCategory();
            }
          }}
          placeholder={showNewCategory ? 'New category name' : 'Search category...'}
          className="w-full px-3 py-1.5 text-sm bg-gray-50 rounded-lg border-none outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {showNewCategory ? (
          <div className="p-2 space-y-2">
            <p className="text-xs text-gray-500 px-1">Create and select this category</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
                className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create & select
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategoryName('');
                }}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {filtered.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  onChange(cat);
                  onClose();
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors ${
                  cat === value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getCategoryColor(cat) }}
                />
                {cat}
                {customOnly.includes(cat) && (
                  <span className="ml-auto text-xs text-gray-400">Custom</span>
                )}
              </button>
            ))}
            {filtered.length === 0 && !showCreatePrompt && (
              <p className="px-3 py-2 text-sm text-gray-400">No categories found</p>
            )}
            {showCreatePrompt && (
              <button
                type="button"
                onClick={() => setShowNewCategory(true)}
                className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 border-t border-gray-100"
              >
                <span className="text-base">+</span>
                Create new category...
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export interface TransactionTableProps {
  transactions: Transaction[];
  onCategoryChange: (transactionId: number, newCategory: string) => void;
  onInternalToggle?: (transactionId: number) => void;
  customCategories?: string[];
  onAddCustomCategory?: (name: string) => void;
  privacyMode?: boolean;
}

type SortField = 'date' | 'amount' | 'category' | 'description';

export default function TransactionTable({
  transactions,
  onCategoryChange,
  onInternalToggle,
  customCategories = [],
  onAddCustomCategory,
  privacyMode = false,
}: TransactionTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'amount' ? 'asc' : 'desc');
    }
  };

  const filtered = useMemo(() => {
    const q = filterText.toLowerCase();
    let result = [...transactions];
    if (q) {
      result = result.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(q) ||
          (t.counterparty || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q) ||
          (t.note || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = a.date.getTime() - b.date.getTime();
          break;
        case 'amount':
          cmp = a.amount - b.amount;
          break;
        case 'category':
          cmp = (a.category || '').localeCompare(b.category || '');
          break;
        case 'description':
          cmp = (a.description || '').localeCompare(b.description || '');
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [transactions, filterText, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pageData = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-indigo-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-800">
          Transactions
          <span className="text-sm font-normal text-gray-400 ml-2">
            {filtered.length} of {transactions.length}
          </span>
        </h3>
        <div className="relative w-full sm:w-72">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value);
              setPage(0);
            }}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="overflow-x-auto transaction-table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th
                onClick={() => toggleSort('date')}
                className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
              >
                Date <SortIcon field="date" />
              </th>
              <th
                onClick={() => toggleSort('description')}
                className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
              >
                Description <SortIcon field="description" />
              </th>
              <th
                onClick={() => toggleSort('category')}
                className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
              >
                Category <SortIcon field="category" />
              </th>
              <th
                onClick={() => toggleSort('amount')}
                className="text-right px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
              >
                Amount <SortIcon field="amount" />
              </th>
              <th className="px-4 py-3 font-medium text-gray-600 text-center w-24">
                Internal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageData.map((t) => (
              <tr
                key={t.id}
                className={`hover:bg-gray-50 transition-colors ${t.internal ? 'bg-slate-50/80' : ''}`}
              >
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {format(t.date, 'd. M. yyyy')}
                </td>
                <td className="px-4 py-3 text-gray-800 max-w-xs">
                  <div className="truncate" title={t.description}>
                    {t.counterparty && (
                      <span className="font-medium">{t.counterparty} — </span>
                    )}
                    {t.description}
                  </div>
                  {t.note && (
                    <div className="text-xs text-gray-400 truncate">{t.note}</div>
                  )}
                </td>
                <td className="px-4 py-3 relative">
                  <button
                    onClick={() =>
                      setEditingId(editingId === t.id ? null : t.id)
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium hover:ring-2 hover:ring-indigo-200 transition-all"
                    style={{
                      backgroundColor: getCategoryColor(t.category) + '18',
                      color: getCategoryColor(t.category),
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getCategoryColor(t.category) }}
                    />
                    {t.category}
                    <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  {editingId === t.id && (
                    <CategoryDropdown
                      value={t.category}
                      onChange={(newCat) => onCategoryChange(t.id, newCat)}
                      onClose={() => setEditingId(null)}
                      customCategories={customCategories}
                      onAddCustomCategory={onAddCustomCategory}
                    />
                  )}
                </td>
                <td
                  className={`px-4 py-3 text-right whitespace-nowrap font-medium ${
                    t.amount >= 0 ? 'text-emerald-600' : 'text-gray-900'
                  } ${t.internal ? 'opacity-60' : ''}`}
                >
                  {t.amount >= 0 && !privacyMode ? '+' : ''}{formatAmountPrivacy(t.amount, privacyMode)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => onInternalToggle?.(t.id)}
                    title={t.internal ? 'Mark as external (include in totals)' : 'Mark as internal (exclude from totals)'}
                    className={`
                      inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium
                      transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
                      ${t.internal
                        ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                      }
                    `}
                  >
                    <span
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        t.internal ? 'bg-indigo-500' : 'bg-gray-300'
                      }`}
                      aria-hidden
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 translate-y-0.5 transform rounded-full bg-white shadow ring-0 transition ${
                          t.internal ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                    <span className="min-w-[24px]">{t.internal ? 'Yes' : 'No'}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Showing {safePage * pageSize + 1}–
            {Math.min((safePage + 1) * pageSize, filtered.length)} of{' '}
            {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

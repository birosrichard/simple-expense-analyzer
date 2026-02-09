import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { parseCSV } from './utils/csvParser';
import { loadFromStorage, loadCustomCategories, saveCustomCategories, saveToStorage } from './utils/storage';
import { loadPrivacyMode, savePrivacyMode, maskTransactions } from './utils/privacy';
import FileUpload from './components/FileUpload';
import DateRangePicker from './components/DateRangePicker';
import SummaryCards from './components/SummaryCards';
import CategoryChart from './components/CategoryChart';
import SpendingChart from './components/SpendingChart';
import TopSpendingChart from './components/TopSpendingChart';
import TransactionTable from './components/TransactionTable';
import ChatGPTAnalysis from './components/ChatGPTAnalysis';
import type { AppData, DateRange, Transaction } from './types';
import './App.css';

function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    const restored = loadFromStorage();
    if (restored?.data) {
      setData(restored.data);
      setSelectedRange(restored.selectedRange);
    }
    setCustomCategories(loadCustomCategories());
    setPrivacyMode(loadPrivacyMode());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(data, selectedRange);
  }, [data, selectedRange, hydrated]);

  const handleFileLoaded = useCallback((content: string, _fileName: string) => {
    setError(null);
    setLoading(true);
    try {
      const result = parseCSV(content);
      setData({
        bankName: result.bankName,
        transactions: result.transactions,
        dateRange: result.dateRange,
      });
      setSelectedRange({
        from: result.dateRange.from,
        to: result.dateRange.to,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
      setData(null);
      setSelectedRange(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCategoryChange = useCallback((transactionId: number, newCategory: string) => {
    setData((prev: AppData | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        transactions: prev.transactions.map((t: Transaction) =>
          t.id === transactionId ? { ...t, category: newCategory } : t
        ),
      };
    });
  }, []);

  const handleInternalToggle = useCallback((transactionId: number) => {
    setData((prev: AppData | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        transactions: prev.transactions.map((t: Transaction) =>
          t.id === transactionId ? { ...t, internal: !t.internal } : t
        ),
      };
    });
  }, []);

  const handleAddCustomCategory = useCallback((name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setCustomCategories((prev: string[]) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      saveCustomCategories(next);
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    setData(null);
    setSelectedRange(null);
    setError(null);
    saveToStorage(null, null);
  }, []);

  const handlePrivacyToggle = useCallback(() => {
    setPrivacyMode((prev) => {
      const next = !prev;
      savePrivacyMode(next);
      return next;
    });
  }, []);

  const handleRangeChange = useCallback((nextRange: DateRange) => {
    if (!nextRange?.from || !nextRange?.to) return;
    setSelectedRange((prev: DateRange | null) => {
      const fromTime = nextRange.from.getTime();
      const toTime = nextRange.to.getTime();
      if (prev?.from && prev?.to && prev.from.getTime() === fromTime && prev.to.getTime() === toTime) {
        return prev;
      }
      return { from: nextRange.from, to: nextRange.to };
    });
  }, []);

  const fromTime = selectedRange?.from?.getTime();
  const toTime = selectedRange?.to?.getTime();
  // Original filtered transactions (unmasked) - used for ChatGPT
  const filteredTransactionsOriginal = useMemo(() => {
    if (!data?.transactions || fromTime == null || toTime == null) return [];
    return data.transactions.filter((t: Transaction) => {
      const tTime = t.date.getTime();
      return tTime >= fromTime && tTime <= toTime;
    });
  }, [data?.transactions, fromTime, toTime]);

  // Masked transactions for display (if privacy mode is on)
  const filteredTransactions = useMemo(() => {
    if (privacyMode) {
      return maskTransactions(filteredTransactionsOriginal);
    }
    return filteredTransactionsOriginal;
  }, [filteredTransactionsOriginal, privacyMode]);

  const filteredTransactionsNonInternal = useMemo(
    () => filteredTransactions.filter((t: Transaction) => !t.internal),
    [filteredTransactions]
  );

  // Original non-internal transactions for ChatGPT (unmasked)
  const filteredTransactionsNonInternalOriginal = useMemo(
    () => filteredTransactionsOriginal.filter((t: Transaction) => !t.internal),
    [filteredTransactionsOriginal]
  );

  if (!data || !selectedRange) {
    return (
      <div className="min-h-screen">
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-center gap-2">
            {error}
          </div>
        )}
        {!hydrated ? (
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <FileUpload onFileLoaded={handleFileLoaded} isLoading={loading} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Expense Analyzer</h1>
              <p className="text-sm text-gray-500">{data.bankName} • {data.transactions.length} transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrivacyToggle}
              title={privacyMode ? 'Disable privacy mode' : 'Enable privacy mode'}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                privacyMode
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                {privacyMode ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228L21 21m-3.228-3.228l-3.65-3.65m0 0a3.001 3.001 0 01-4.243-4.243m4.242 4.242L9.88 9.88" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
              </svg>
              {privacyMode ? 'Privacy On' : 'Privacy Off'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload new file
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <DateRangePicker
          dateRange={data.dateRange}
          selectedRange={selectedRange}
          onRangeChange={handleRangeChange}
        />

        <SummaryCards transactions={filteredTransactionsNonInternal} privacyMode={privacyMode} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <CategoryChart transactions={filteredTransactionsNonInternal} privacyMode={privacyMode} />
          <TopSpendingChart transactions={filteredTransactionsNonInternal} privacyMode={privacyMode} />
        </div>

        <SpendingChart transactions={filteredTransactionsNonInternal} selectedRange={selectedRange} privacyMode={privacyMode} />

        <ChatGPTAnalysis
          transactions={filteredTransactionsNonInternalOriginal}
          selectedRange={selectedRange}
          privacyMode={privacyMode}
        />

        <TransactionTable
          transactions={filteredTransactions}
          onCategoryChange={handleCategoryChange}
          onInternalToggle={handleInternalToggle}
          customCategories={customCategories}
          onAddCustomCategory={handleAddCustomCategory}
          privacyMode={privacyMode}
        />
      </main>
    </div>
  );
}

export default App;

import React, { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { getSpendingAnalysis } from '../utils/openai';
import type { Transaction } from '../types';
import type { DateRange } from '../types';

const API_KEY_STORAGE = 'expense_analyzer_openai_api_key';

function getStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

function saveApiKey(key: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE, key);
  } catch {
    // ignore
  }
}

function AnalysisContent({ text }: { text: string }) {
  if (!text?.trim()) return null;

  const lines = text.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listOrdered: boolean | null = null;
  let firstParagraph = true;

  const flushList = (ordered: boolean | null) => {
    if (listItems.length === 0) return;
    const ListTag = ordered ? 'ol' : 'ul';
    elements.push(
      <ListTag
        key={elements.length}
        className={ordered ? 'list-decimal list-inside space-y-1 my-2 text-gray-700' : 'list-disc list-inside space-y-1 my-2 text-gray-700'}
      >
        {listItems.map((item, i) => (
          <li key={i} className="pl-1">{item}</li>
        ))}
      </ListTag>
    );
    listItems = [];
    listOrdered = null;
  };

  const renderInline = (str: string) => {
    const parts: React.ReactNode[] = [];
    let remaining = str;
    let key = 0;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch) {
        const before = remaining.slice(0, boldMatch.index);
        if (before) parts.push(<span key={key++}>{before}</span>);
        parts.push(<strong key={key++} className="font-semibold text-gray-900">{boldMatch[1]}</strong>);
        remaining = remaining.slice((boldMatch.index ?? 0) + boldMatch[0].length);
      } else {
        const amountMatch = remaining.match(/([-+]?\d+\.?\d*)\s*CZK/);
        if (amountMatch) {
          const before = remaining.slice(0, amountMatch.index);
          if (before) parts.push(<span key={key++}>{before}</span>);
          const num = parseFloat(amountMatch[1]);
          const isNegative = num < 0;
          parts.push(
            <span key={key++} className={isNegative ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
              {amountMatch[0]}
            </span>
          );
          remaining = remaining.slice((amountMatch.index ?? 0) + amountMatch[0].length);
        } else {
          parts.push(<span key={key++}>{remaining}</span>);
          break;
        }
      }
    }
    return <>{parts}</>;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(listOrdered);
      elements.push(<div key={elements.length} className="h-3" />);
      continue;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (orderedMatch) {
      if (listOrdered === false) flushList(false);
      listOrdered = true;
      listItems.push(renderInline(orderedMatch[2]));
    } else if (bulletMatch) {
      if (listOrdered === true) flushList(true);
      listOrdered = false;
      listItems.push(renderInline(bulletMatch[1]));
    } else {
      flushList(listOrdered);
      const isFirst = firstParagraph;
      if (firstParagraph) firstParagraph = false;
      elements.push(
        <p
          key={elements.length}
          className={isFirst ? 'text-base font-semibold text-gray-900 mt-0 mb-3 leading-relaxed' : 'my-2 text-gray-700 leading-relaxed'}
        >
          {renderInline(trimmed)}
        </p>
      );
    }
  }
  flushList(listOrdered);

  return <div className="analysis-content space-y-0">{elements}</div>;
}

export interface ChatGPTAnalysisProps {
  transactions: Transaction[];
  selectedRange: DateRange;
  privacyMode?: boolean;
}

export default function ChatGPTAnalysis({ transactions, selectedRange, privacyMode = false }: ChatGPTAnalysisProps) {
  const envKey = typeof process.env.REACT_APP_OPENAI_API_KEY === 'string'
    ? process.env.REACT_APP_OPENAI_API_KEY.trim()
    : '';
  const [localKey, setLocalKey] = useState(() => (envKey ? '' : getStoredApiKey()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const apiKey = envKey || localKey;

  const handleAnalyze = useCallback(async () => {
    if (!apiKey?.trim()) {
      setError('Please set your OpenAI API key above.');
      return;
    }
    if (!transactions?.length) {
      setError('No transactions in the selected period.');
      return;
    }
    if (!selectedRange?.from || !selectedRange?.to) {
      setError('No date range selected.');
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);

    const periodLabel = `${format(selectedRange.from, 'd MMM yyyy')} – ${format(selectedRange.to, 'd MMM yyyy')}`;

    try {
      const analysis = await getSpendingAnalysis(apiKey, transactions, periodLabel);
      setResult(analysis);
      if (!envKey && localKey) {
        saveApiKey(localKey);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  }, [apiKey, transactions, selectedRange, envKey, localKey]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalKey(e.target.value);
    setError(null);
  };

  const showKeyInput = !envKey;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI spending analysis</h2>
          <p className="text-sm text-gray-500">
            Uses only amount and your corrected category for the selected period. No CSV or other data is sent.
            {privacyMode && ' (Analysis uses real data even when privacy mode is enabled.)'}
          </p>
        </div>
      </div>

      {showKeyInput && (
        <div className="mb-4">
          <label htmlFor="openai-key" className="block text-sm font-medium text-gray-700 mb-1">
            OpenAI API key
          </label>
          <input
            id="openai-key"
            type="password"
            value={localKey}
            onChange={handleKeyChange}
            placeholder="sk-..."
            className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-gray-400">Stored only in your browser. Or set REACT_APP_OPENAI_API_KEY in .env</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading || !transactions?.length}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-all"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Analyze with ChatGPT
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden bg-gradient-to-b from-gray-50/80 to-white">
          <div className="px-4 py-3 border-b border-gray-200 bg-white/60">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Analysis</p>
          </div>
          <div className="p-5 text-[15px] leading-relaxed max-h-[70vh] overflow-y-auto">
            <AnalysisContent text={result} />
          </div>
        </div>
      )}
    </div>
  );
}

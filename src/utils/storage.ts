import type { AppData, DateRange } from '../types';

const STORAGE_KEY = 'expense-analyzer-data';
const STORAGE_KEY_CUSTOM_CATEGORIES = 'expense-analyzer-custom-categories';

export function loadCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_CATEGORIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string' && c.trim().length > 0) : [];
  } catch {
    return [];
  }
}

export function saveCustomCategories(categories: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.warn('Could not save custom categories', e);
  }
}

export function saveToStorage(data: AppData | null, selectedRange: DateRange | null): void {
  if (!data) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return;
  }
  try {
    const payload = {
      bankName: data.bankName,
      dateRange: {
        from: data.dateRange.from.toISOString(),
        to: data.dateRange.to.toISOString(),
      },
      transactions: data.transactions.map((t) => ({
        ...t,
        date: t.date.toISOString(),
      })),
      selectedRange: selectedRange
        ? {
            from: selectedRange.from.toISOString(),
            to: selectedRange.to.toISOString(),
          }
        : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Could not save to localStorage', e);
  }
}

export interface LoadFromStorageResult {
  data: AppData;
  selectedRange: DateRange;
}

export function loadFromStorage(): LoadFromStorageResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.transactions?.length || !parsed?.dateRange) return null;

    const dateRange: DateRange = {
      from: new Date(parsed.dateRange.from),
      to: new Date(parsed.dateRange.to),
    };
    const transactions = parsed.transactions.map((t: Record<string, unknown> & { date: string; internal?: boolean }) => ({
      ...t,
      date: new Date(t.date),
      internal: !!t.internal,
    }));
    const selectedRange: DateRange =
      parsed.selectedRange?.from && parsed.selectedRange?.to
        ? {
            from: new Date(parsed.selectedRange.from),
            to: new Date(parsed.selectedRange.to),
          }
        : { ...dateRange };

    return {
      data: {
        bankName: (parsed.bankName as string) || 'Saved data',
        transactions,
        dateRange,
      },
      selectedRange,
    };
  } catch {
    return null;
  }
}

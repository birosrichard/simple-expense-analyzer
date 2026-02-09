export interface Transaction {
  id: number;
  date: Date;
  amount: number;
  currency: string;
  counterparty: string;
  description: string;
  category: string;
  variableSymbol: string;
  note: string;
  operationType: string;
  internal: boolean;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ParsedData {
  bankName: string;
  transactions: Transaction[];
  dateRange: DateRange;
}

export interface AppData {
  bankName: string;
  transactions: Transaction[];
  dateRange: DateRange;
}

export interface StoredRestore {
  data: AppData;
  selectedRange: DateRange;
}

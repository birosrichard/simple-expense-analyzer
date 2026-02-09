import Papa from 'papaparse';
import { parse, isValid } from 'date-fns';
import type { ParsedData, Transaction } from '../types';

interface MappedRow {
  date: Date | null;
  amount: number;
  currency: string;
  counterparty: string;
  description: string;
  category: string;
  variableSymbol: string;
  note: string;
  operationType: string;
}

interface BankFormat {
  name: string;
  detect: (firstLines: string[]) => boolean;
  headerRow: (lines: string[]) => number;
  delimiter: string;
  map: (row: Record<string, string | undefined>) => MappedRow;
}

const BANK_FORMATS: Record<string, BankFormat> = {
  csob: {
    name: 'ČSOB',
    detect: (firstLines) =>
      firstLines.some((l) => l.includes('Pohyby na účtu') && l.includes('/0300')),
    headerRow: (lines) => lines.findIndex((l) => l.startsWith('číslo účtu;')),
    delimiter: ';',
    map: (row) => ({
      date: parseDate(row['datum zaúčtování']),
      amount: parseCzechNumber(row['částka']),
      currency: row['měna'] || 'CZK',
      counterparty: row['jméno protistrany'] || '',
      description: row['zpráva'] || row['označení operace'] || '',
      category: row['kategorie'] || 'Ostatní',
      variableSymbol: row['variabilní symbol'] || '',
      note: row['vlastní poznámka'] || '',
      operationType: row['označení operace'] || '',
    }),
  },
  moneta: {
    name: 'Moneta',
    detect: (firstLines) =>
      firstLines.some(
        (l) =>
          l.includes('Moneta') ||
          (l.includes('"Číslo účtu"') && l.includes('"Datum"'))
      ) ||
      firstLines.some(
        (l) =>
          l.includes('Číslo účtu') &&
          l.includes('Částka') &&
          l.includes('Popis transakce')
      ),
    headerRow: (lines) =>
      lines.findIndex(
        (l) =>
          l.includes('Číslo účtu') && l.includes('Částka')
      ),
    delimiter: ';',
    map: (row) => {
      const dateKey = Object.keys(row).find((k) => k.includes('Datum'));
      const amountKey = Object.keys(row).find((k) => k.includes('Částka'));
      const descKey = Object.keys(row).find(
        (k) => k.includes('Popis') || k.includes('zpráva') || k.includes('Zpráva')
      );
      const counterKey = Object.keys(row).find(
        (k) => k.includes('protistrany') || k.includes('Příjemce') || k.includes('Plátce')
      );
      const catKey = Object.keys(row).find((k) => k.includes('Kategorie') || k.includes('kategorie'));
      return {
        date: parseDate(row[dateKey ?? ''] ?? ''),
        amount: parseCzechNumber(row[amountKey ?? ''] ?? '0'),
        currency: row['Měna'] ?? 'CZK',
        counterparty: row[counterKey ?? ''] ?? '',
        description: row[descKey ?? ''] ?? '',
        category: row[catKey ?? ''] ?? guessCategory(row[descKey ?? ''] ?? ''),
        variableSymbol: row['Variabilní symbol'] ?? '',
        note: '',
        operationType: '',
      };
    },
  },
  kb: {
    name: 'Komerční banka',
    detect: (firstLines) =>
      firstLines.some(
        (l) =>
          l.includes('Datum splatnosti') ||
          (l.includes('Datum') && l.includes('Objem') && l.includes('Měna'))
      ),
    headerRow: (lines) =>
      lines.findIndex(
        (l) =>
          (l.includes('Datum') && l.includes('Objem')) ||
          (l.includes('Datum') && l.includes('Částka'))
      ),
    delimiter: ';',
    map: (row) => {
      const dateKey = Object.keys(row).find(
        (k) => k.includes('Datum') && !k.includes('splatnosti')
      ) ?? Object.keys(row).find((k) => k.includes('Datum'));
      const amountKey = Object.keys(row).find(
        (k) => k.includes('Částka') || k.includes('Objem')
      );
      const descKey = Object.keys(row).find(
        (k) => k.includes('Popis') || k.includes('Poznámka') || k.includes('AV pole')
      );
      const counterKey = Object.keys(row).find(
        (k) => k.includes('Název protiúčtu') || k.includes('Protiúčet')
      );
      const catKey = Object.keys(row).find((k) => k.includes('Kategorie') || k.includes('kategorie'));
      return {
        date: parseDate(row[dateKey ?? ''] ?? ''),
        amount: parseCzechNumber(row[amountKey ?? ''] ?? '0'),
        currency: row['Měna'] ?? 'CZK',
        counterparty: row[counterKey ?? ''] ?? '',
        description: row[descKey ?? ''] ?? '',
        category: row[catKey ?? ''] ?? guessCategory(row[descKey ?? ''] ?? ''),
        variableSymbol: row['Variabilní symbol'] ?? row['VS'] ?? '',
        note: '',
        operationType: '',
      };
    },
  },
  generic: {
    name: 'Generic CSV',
    detect: () => true,
    headerRow: (lines) =>
      lines.findIndex(
        (l) =>
          (l.toLowerCase().includes('date') || l.toLowerCase().includes('datum')) &&
          (l.toLowerCase().includes('amount') || l.toLowerCase().includes('částka') || l.toLowerCase().includes('castka'))
      ),
    delimiter: ';',
    map: (row) => {
      const keys = Object.keys(row);
      const dateKey = keys.find((k) => /datum|date/i.test(k)) ?? keys[0];
      const amountKey = keys.find((k) => /částka|castka|amount|suma|objem/i.test(k)) ?? keys[1];
      const descKey = keys.find((k) => /popis|desc|zpráva|message|pozn/i.test(k)) ?? keys[2];
      const catKey = keys.find((k) => /kategorie|category/i.test(k));
      return {
        date: parseDate(row[dateKey ?? ''] ?? ''),
        amount: parseCzechNumber(row[amountKey ?? ''] ?? '0'),
        currency: 'CZK',
        counterparty: '',
        description: row[descKey ?? ''] ?? '',
        category: row[catKey ?? ''] ?? guessCategory(row[descKey ?? ''] ?? ''),
        variableSymbol: '',
        note: '',
        operationType: '',
      };
    },
  },
};

function parseCzechNumber(str: string | undefined): number {
  if (!str || typeof str !== 'string') return 0;
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(str: string | undefined): Date | null {
  if (!str) return null;
  const trimmed = String(str).trim();

  let d = parse(trimmed, 'dd.MM.yyyy', new Date());
  if (isValid(d)) return d;

  d = parse(trimmed, 'd.M.yyyy', new Date());
  if (isValid(d)) return d;

  d = parse(trimmed, 'yyyy-MM-dd', new Date());
  if (isValid(d)) return d;

  d = parse(trimmed, 'dd/MM/yyyy', new Date());
  if (isValid(d)) return d;

  d = new Date(trimmed);
  return isValid(d) ? d : null;
}

function guessCategory(description: string): string {
  const desc = description.toLowerCase();
  const rules: { keywords: string[]; category: string }[] = [
    { keywords: ['rohlik', 'albert', 'billa', 'tesco', 'lidl', 'kaufland', 'penny', 'potraviny', 'coop', 'globus', 'bakehouse', 'pekarna', 'pekárna'], category: 'Potraviny' },
    { keywords: ['restaura', 'mcdonald', 'burger', 'kfc', 'pizza', 'foodora', 'wolt', 'bolt food', 'starbucks', 'costa'], category: 'Restaurace' },
    { keywords: ['benzin', 'orlen', 'mol', 'shell', 'eni', 'čerpací', 'tank', 'fuel'], category: 'Tankování' },
    { keywords: ['čez', 'cez', 'energie', 'eon', 'pražská plynárenská', 'innogy', 'plyn'], category: 'Energie' },
    { keywords: ['t-mobile', 'vodafone', 'o2', 'upc', 'netflix', 'spotify', 'hbo', 'nova', 'internet'], category: 'TV, internet, telefon' },
    { keywords: ['ikea', 'hornbach', 'obi', 'bauhaus', 'baumax', 'jysk'], category: 'Vybavení domácnosti' },
    { keywords: ['nájem', 'najem', 'hypot'], category: 'Provoz domácnosti' },
    { keywords: ['leasing', 'splátk', 'spláce', 'úvěr'], category: 'Splátky' },
    { keywords: ['vlak', 'bus', 'jízden', 'uber', 'liftago', 'easyjet', 'ryanair', 'letušk'], category: 'Doprava' },
    { keywords: ['lékárna', 'lekarna', 'doktor', 'nemocni', 'zdraví', 'clinic'], category: 'Zdraví' },
    { keywords: ['kino', 'cinema', 'divadlo', 'koncert', 'festival', 'vstupné'], category: 'Zábava' },
    { keywords: ['apple.com', 'google', 'amazon', 'alza', 'czc', 'mall.cz', 'notino'], category: 'Nákupy a služby' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => desc.includes(kw))) {
      return rule.category;
    }
  }
  return 'Ostatní';
}

export function parseCSV(fileContent: string): ParsedData {
  const content = fileContent.replace(/^\uFEFF/, '');
  const lines = content.split('\n').map((l) => l.trim());

  const firstLines = lines.slice(0, 10);
  let format: BankFormat | null = null;

  for (const [key, fmt] of Object.entries(BANK_FORMATS)) {
    if (key === 'generic') continue;
    if (fmt.detect(firstLines)) {
      format = fmt;
      break;
    }
  }

  if (!format) {
    format = BANK_FORMATS.generic;
  }

  const headerIdx = format.headerRow(lines);
  if (headerIdx < 0) {
    throw new Error(
      'Could not find the header row in the CSV. Please make sure the file is a valid bank export.'
    );
  }

  const csvContent = lines.slice(headerIdx).join('\n');

  const result = Papa.parse<Record<string, string | undefined>>(csvContent, {
    header: true,
    delimiter: format.delimiter,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (result.errors.length > 0) {
    const criticalErrors = result.errors.filter((e: { type: string }) => e.type !== 'FieldMismatch');
    if (criticalErrors.length > 0 && result.data.length === 0) {
      throw new Error(`CSV parsing error: ${criticalErrors[0].message}`);
    }
  }

  const transactions: Transaction[] = result.data
    .map((row: Record<string, string | undefined>, index: number) => {
      try {
        const mapped = format.map(row);
        if (!mapped.date || mapped.amount === 0) return null;
        return {
          id: index,
          ...mapped,
          date: mapped.date,
          internal: false,
        } as Transaction;
      } catch {
        return null;
      }
    })
    .filter((t: Transaction | null): t is Transaction => t !== null);

  if (transactions.length === 0) {
    throw new Error(
      'No valid transactions found. Please check if the CSV format is supported.'
    );
  }

  transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

  transactions.forEach((t, i) => {
    t.id = i;
  });

  return {
    bankName: format.name,
    transactions,
    dateRange: {
      from: transactions[transactions.length - 1].date,
      to: transactions[0].date,
    },
  };
}

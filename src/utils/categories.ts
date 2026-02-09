// Category definitions with colors for charts
const CATEGORY_CONFIG: Record<string, { color: string; icon: string; en: string }> = {
  'Potraviny':              { color: '#10b981', icon: '🛒', en: 'Groceries' },
  'Restaurace':             { color: '#f59e0b', icon: '🍽️', en: 'Restaurants' },
  'Tankování':              { color: '#6366f1', icon: '⛽', en: 'Fuel' },
  'Doprava':                { color: '#8b5cf6', icon: '🚗', en: 'Transport' },
  'Provoz domácnosti':      { color: '#ec4899', icon: '🏠', en: 'Housing' },
  'Vybavení domácnosti':    { color: '#14b8a6', icon: '🪑', en: 'Home Furnishing' },
  'Energie':                { color: '#f97316', icon: '⚡', en: 'Energy' },
  'TV, internet, telefon':  { color: '#06b6d4', icon: '📱', en: 'Telecom' },
  'Nákupy a služby':        { color: '#a855f7', icon: '🛍️', en: 'Shopping' },
  'Splátky':                { color: '#ef4444', icon: '💳', en: 'Installments' },
  'Vzdělání':               { color: '#3b82f6', icon: '📚', en: 'Education' },
  'Zábava':                 { color: '#d946ef', icon: '🎬', en: 'Entertainment' },
  'Zdraví':                 { color: '#22c55e', icon: '🏥', en: 'Health' },
  'Oblečení':               { color: '#e11d48', icon: '👕', en: 'Clothing' },
  'Příjem':                 { color: '#059669', icon: '💰', en: 'Income' },
  'Převod':                 { color: '#64748b', icon: '🔄', en: 'Transfer' },
  'Ostatní':                { color: '#78716c', icon: '📦', en: 'Other' },
  'Odchozí nezatříděná':    { color: '#94a3b8', icon: '📤', en: 'Uncategorized Outgoing' },
  'Volný čas a zábava':     { color: '#d946ef', icon: '🎮', en: 'Leisure & Entertainment' },
  'Spoření a investice':    { color: '#0ea5e9', icon: '📈', en: 'Savings & Investments' },
};

const FALLBACK_COLORS = [
  '#0ea5e9', '#84cc16', '#eab308', '#f43f5e', '#7c3aed',
  '#0891b2', '#c026d3', '#ea580c', '#16a34a', '#2563eb',
];

export function getCategoryColor(category: string): string {
  if (CATEGORY_CONFIG[category]) {
    return CATEGORY_CONFIG[category].color;
  }
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export function getCategoryIcon(category: string): string {
  return CATEGORY_CONFIG[category]?.icon ?? '📦';
}

export function getAllCategories(): string[] {
  return Object.keys(CATEGORY_CONFIG);
}

export default CATEGORY_CONFIG;

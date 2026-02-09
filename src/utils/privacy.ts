/**
 * Privacy mode utilities for masking sensitive data
 */

import type { Transaction } from '../types';

const STORAGE_KEY_PRIVACY = 'expense-analyzer-privacy-mode';

export function loadPrivacyMode(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PRIVACY);
    return stored === 'true';
  } catch {
    return false;
  }
}

export function savePrivacyMode(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_PRIVACY, String(enabled));
  } catch (e) {
    console.warn('Could not save privacy mode', e);
  }
}

/**
 * Format amount for display - shows "****" in privacy mode, otherwise formats normally
 */
export function formatAmountPrivacy(amount: number, privacyMode: boolean): string {
  if (privacyMode) {
    return '****';
  }
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Mask an amount - keeps original value but will be displayed as "****"
 * We keep the number for calculations but display will show "****"
 */
export function maskAmount(amount: number): number {
  // Keep original amount for calculations, display will be handled by formatAmountPrivacy
  return amount;
}

/**
 * Mask a string (name, description) - shows first 2 chars and asterisks
 */
export function maskString(str: string, minLength = 3): string {
  if (!str || str.length <= minLength) {
    return '***';
  }
  if (str.length <= 5) {
    return str[0] + '***';
  }
  return str.slice(0, 2) + '***' + str.slice(-1);
}

/**
 * Mask counterparty name
 */
export function maskCounterparty(name: string): string {
  if (!name || name.trim().length === 0) return '';
  return maskString(name, 2);
}

/**
 * Mask description - keep first few words visible, mask the rest
 */
export function maskDescription(desc: string): string {
  if (!desc || desc.trim().length === 0) return '';
  const words = desc.split(/\s+/);
  if (words.length <= 2) {
    return maskString(desc, 3);
  }
  return words.slice(0, 2).join(' ') + ' ***';
}

/**
 * Mask a transaction - returns a new transaction with masked sensitive data
 */
export function maskTransaction(t: Transaction): Transaction {
  return {
    ...t,
    amount: maskAmount(t.amount),
    counterparty: maskCounterparty(t.counterparty),
    description: maskDescription(t.description),
    note: t.note ? maskDescription(t.note) : t.note,
  };
}

/**
 * Mask an array of transactions
 */
export function maskTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.map(maskTransaction);
}

export type BookkeepingSetupStatus = 'needsReview' | 'ready';
export type JournalStatus = 'draft' | 'posted';

export interface BookkeepingAccount {
  id?: string;
  code: string;
  name: string;
  type: string;
  nature: 'debit' | 'credit';
  active: boolean;
}

export interface BookkeepingSettings {
  setupStatus: BookkeepingSetupStatus;
  autoPostDian: boolean;
  autoPostTreasury: boolean;
  accountMapping: { [purpose: string]: string };
  confirmedAt?: any;
}

export interface JournalLine {
  accountCode: string;
  accountName?: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  description: string;
  status: JournalStatus;
  sourceType: string;
  documentNumber?: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLine[];
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  nature: 'debit' | 'credit';
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
  entries: number;
}

export interface BookkeepingOverview {
  initialized: boolean;
  settings: BookkeepingSettings | null;
  accounts: number;
  journal: { posted: number; drafts: number };
  trialBalance: TrialBalance | null;
  recentEntries: JournalEntry[];
}

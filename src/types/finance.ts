export type AccountType = 
  | 'bank_checking'     // Cuenta corriente
  | 'bank_savings'      // Cuenta de ahorro
  | 'investment'        // Plataforma de inversión (Fondo Indexado, CETES/Bonos)
  | 'card_debit'        // Tarjeta de débito
  | 'card_credit'       // Tarjeta de crédito
  | 'digital_gateway'   // Pasarela digital (PayPal)
  | 'cash_wallet';      // Billetera / Efectivo

export type ScopeType = 'personal' | 'familiar';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'member';
  joinedAt?: string;
  status?: 'active' | 'invited';
}

export interface FamilyInfo {
  id: string;
  name: string;
  inviteCode: string;
  createdBy?: string;
  createdAt?: string;
}

export interface FinancialAccount {
  id: string;
  name: string;
  institution: string;
  accountType: AccountType;
  accountNumberMasked: string; // e.g. "•••• 4821"
  accountNumberEncrypted?: string; // Simulated AES-256 CLE ciphertext
  balance: number;
  currency: string;
  ownerId: string;
  scope: ScopeType;
  isActive: boolean;
  linkedAccountId?: string; // For debit cards linked to checking accounts
  // Credit card specific fields:
  creditLimit?: number;
  cutoffDay?: number; // e.g. 15th of each month
  paymentDueDay?: number; // e.g. 5th of each month
  // Investment specific fields:
  yieldRateAnnual?: number; // e.g. 9.8%
  assetClass?: string;
  notes?: string;
}

export interface SubCategory {
  id: string;
  parentId: string;
  name: string;
  icon?: string;
  monthlyAverageHistorical: number;
}

export interface ParentCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  subcategories: SubCategory[];
}

export interface Transaction {
  id: string;
  userId: string;
  date: string; // Canonical format: 'YYYY-MM-DD'
  amount: number;
  type: TransactionType;
  accountId: string;
  destinationAccountId?: string; // Required if type === 'transfer'
  categoryId: string;
  subcategoryId: string;
  scope: ScopeType;
  description: string;
  originalRawDescription?: string;
  movement?: string; // Detalle bancario opcional (ej: "Cargo", "Abono", "TPV Tarjeta Débito", "Bizum", "Recibo domiciliado")
  attachmentUrl?: string;
  attachmentName?: string;
  hash: string; // SHA-256 of Date + Amount + Normalized Description + AccountId
  isReconciled: boolean;
  createdAt: string;
}

export interface BudgetEnvelope {
  id: string;
  categoryId: string;
  subcategoryId?: string; // Optional subcategory budget
  budgetedAmount: number;
}

export interface BudgetAccord {
  id: string;
  name: string; // e.g. "Pacto Base Octubre 2026"
  effectiveMonth: string; // "YYYY-MM"
  scope: ScopeType;
  createdByUserId: string;
  createdAt: string;
  notes?: string;
  envelopes: BudgetEnvelope[];
}

export interface ReconciledRawItem {
  id: string;
  rawDate: string;
  rawDescription: string;
  rawAmount: number;
  rawAccount: string;
  rawMovement?: string;
  matchedCategoryId?: string;
  matchedSubcategoryId?: string;
  isDuplicate: boolean;
  duplicateOfId?: string;
  hash: string;
  similarityScore?: number;
  suggestedAction?: 'import' | 'skip_duplicate';
}

export interface TestResultItem {
  id: string;
  suite: string;
  title: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

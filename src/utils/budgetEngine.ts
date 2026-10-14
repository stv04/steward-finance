import { BudgetAccord, BudgetEnvelope, ParentCategory, ScopeType, Transaction } from '../types/finance';

export interface EnvelopeCalculatedStatus {
  envelopeId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  subcategoryId?: string;
  budgetedAmount: number;
  realizedAmount: number;
  availableAmount: number; // budgeted - realized
  percentSpent: number;
  status: 'nominal' | 'warning' | 'exceeded';
  historicalAverage: number;
}

export interface MonthBudgetSummary {
  targetMonth: string; // "YYYY-MM"
  scope: ScopeType;
  activeAccord: BudgetAccord | null;
  isInherited: boolean;
  inheritedFromMonth?: string;
  totalIncomePeriod: number;
  totalBudgetedPeriod: number;
  totalRealizedExpensePeriod: number;
  netCashFlowPeriod: number; // Income - Expense
  zeroBasedUnassigned: number; // Income - Budgeted
  envelopeStatuses: EnvelopeCalculatedStatus[];
}

/**
 * Resolves the effective budget accord for a given month following the Continued Inheritance Rule:
 * An accord created for month M is inherited indefinitely into M+1, M+2... until a newer accord
 * with effectiveMonth <= targetMonth exists.
 */
export function resolveEffectiveBudgetAccord(
  targetMonth: string, // "YYYY-MM"
  accords: BudgetAccord[],
  scope: ScopeType
): { accord: BudgetAccord | null; isInherited: boolean; inheritedFromMonth?: string } {
  // Filter accords matching scope or familiar (familiar applies to all unless strictly personal accord exists)
  const applicableAccords = accords.filter(a => a.scope === scope || a.scope === 'familiar');
  
  // Sort accords descending by effectiveMonth
  const sorted = [...applicableAccords].sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
  
  // Find first accord with effectiveMonth <= targetMonth
  const match = sorted.find(a => a.effectiveMonth <= targetMonth);
  if (!match) {
    return { accord: null, isInherited: false };
  }

  const isInherited = match.effectiveMonth !== targetMonth;
  return {
    accord: match,
    isInherited,
    inheritedFromMonth: isInherited ? match.effectiveMonth : undefined,
  };
}

/**
 * Calculates complete zero-based envelope status and metrics for a target month
 */
export function calculateMonthBudgetSummary(
  targetMonth: string,
  scope: ScopeType,
  accords: BudgetAccord[],
  transactions: Transaction[],
  categories: ParentCategory[]
): MonthBudgetSummary {
  const { accord, isInherited, inheritedFromMonth } = resolveEffectiveBudgetAccord(targetMonth, accords, scope);

  // Filter transactions for targetMonth (date starts with "YYYY-MM")
  const monthTransactions = transactions.filter(tx => {
    const isSameMonth = tx.date.startsWith(targetMonth);
    const matchesScope = scope === 'familiar' ? true : tx.scope === scope;
    return isSameMonth && matchesScope;
  });

  // Calculate total monthly income
  const totalIncomePeriod = monthTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate total monthly expenses
  const totalRealizedExpensePeriod = monthTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netCashFlowPeriod = totalIncomePeriod - totalRealizedExpensePeriod;

  // Build envelope metrics
  const envelopes: BudgetEnvelope[] = accord?.envelopes || [];
  let totalBudgetedPeriod = 0;

  const envelopeStatuses: EnvelopeCalculatedStatus[] = envelopes.map(env => {
    totalBudgetedPeriod += env.budgetedAmount;
    const cat = categories.find(c => c.id === env.categoryId);

    // Sum realized expenses for this category in targetMonth
    const realizedAmount = monthTransactions
      .filter(tx => tx.type === 'expense' && tx.categoryId === env.categoryId)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const availableAmount = env.budgetedAmount - realizedAmount;
    const percentSpent = env.budgetedAmount > 0 ? (realizedAmount / env.budgetedAmount) * 100 : 0;

    let status: 'nominal' | 'warning' | 'exceeded' = 'nominal';
    if (percentSpent > 100) {
      status = 'exceeded';
    } else if (percentSpent >= 80) {
      status = 'warning';
    }

    // Historical average from subcategories
    const historicalAverage = cat?.subcategories.reduce((sum, sub) => sum + sub.monthlyAverageHistorical, 0) || 0;

    return {
      envelopeId: env.id,
      categoryId: env.categoryId,
      categoryName: cat?.name || 'Categoría Desconocida',
      categoryColor: cat?.color || '#64748b',
      categoryIcon: cat?.icon || 'Folder',
      subcategoryId: env.subcategoryId,
      budgetedAmount: env.budgetedAmount,
      realizedAmount,
      availableAmount,
      percentSpent,
      status,
      historicalAverage,
    };
  });

  const zeroBasedUnassigned = totalIncomePeriod - totalBudgetedPeriod;

  return {
    targetMonth,
    scope,
    activeAccord: accord,
    isInherited,
    inheritedFromMonth,
    totalIncomePeriod,
    totalBudgetedPeriod,
    totalRealizedExpensePeriod,
    netCashFlowPeriod,
    zeroBasedUnassigned,
    envelopeStatuses,
  };
}

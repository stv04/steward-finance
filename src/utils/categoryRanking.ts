/**
 * Category Ranking and Intelligent Ordering Utility
 * ==============================================================================
 * Calculates real-time usage statistics (frequency, total spend, transaction counts)
 * and allows ordering categories by:
 * 1. Frequency of usage ('frequency') - Most used categories placed at the top level
 * 2. Manual Custom Priority ('manual') - User-defined order and pinned categories
 * 3. Spending Volume ('expense') - Highest expense volume first
 * 4. Alphabetical ('alphabetical') - A to Z
 * ==============================================================================
 */

import { ParentCategory, Transaction } from '../types/finance';

export type CategorySortMode = 'frequency' | 'manual' | 'expense' | 'alphabetical';

export interface CategoryUsageStats {
  categoryId: string;
  transactionCount: number;
  totalAmount: number;
  lastUsedDate?: string;
  subcategoriesUsage: Record<string, number>;
}

const STORAGE_KEY_CUSTOM_ORDER = 'patrimonio_category_custom_order';
const STORAGE_KEY_SORT_MODE = 'patrimonio_category_sort_mode';

/**
 * Computes frequency and spending statistics for each parent category and subcategory
 */
export function computeCategoryUsageStats(
  categories: ParentCategory[],
  transactions: Transaction[]
): Record<string, CategoryUsageStats> {
  const statsMap: Record<string, CategoryUsageStats> = {};

  categories.forEach(cat => {
    statsMap[cat.id] = {
      categoryId: cat.id,
      transactionCount: 0,
      totalAmount: 0,
      subcategoriesUsage: {},
    };
  });

  transactions.forEach(tx => {
    if (!tx.categoryId) return;

    if (!statsMap[tx.categoryId]) {
      statsMap[tx.categoryId] = {
        categoryId: tx.categoryId,
        transactionCount: 0,
        totalAmount: 0,
        subcategoriesUsage: {},
      };
    }

    const catStat = statsMap[tx.categoryId];
    catStat.transactionCount += 1;
    catStat.totalAmount += Math.abs(tx.amount);

    if (tx.date && (!catStat.lastUsedDate || tx.date > catStat.lastUsedDate)) {
      catStat.lastUsedDate = tx.date;
    }

    if (tx.subcategoryId) {
      catStat.subcategoriesUsage[tx.subcategoryId] = (catStat.subcategoriesUsage[tx.subcategoryId] || 0) + 1;
    }
  });

  return statsMap;
}

/**
 * Retrieves saved custom category ordering from localStorage
 */
export function getSavedCategoryOrder(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_ORDER);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Could not read saved category order:', err);
    return [];
  }
}

/**
 * Saves custom category ordering to localStorage
 */
export function saveCategoryOrder(orderedIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_ORDER, JSON.stringify(orderedIds));
  } catch (err) {
    console.warn('Could not save category order:', err);
  }
}

/**
 * Retrieves saved sort mode from localStorage
 */
export function getSavedCategorySortMode(): CategorySortMode {
  if (typeof window === 'undefined') return 'frequency';
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SORT_MODE);
    if (raw === 'frequency' || raw === 'manual' || raw === 'expense' || raw === 'alphabetical') {
      return raw;
    }
  } catch (err) {
    console.warn('Could not read saved sort mode:', err);
  }
  return 'frequency';
}

/**
 * Saves sort mode preference to localStorage
 */
export function saveCategorySortMode(mode: CategorySortMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SORT_MODE, mode);
  } catch (err) {
    console.warn('Could not save sort mode:', err);
  }
}

/**
 * Sorts parent categories based on the selected mode
 */
export function sortCategories(
  categories: ParentCategory[],
  transactions: Transaction[],
  mode: CategorySortMode = 'frequency',
  customOrderIds: string[] = []
): ParentCategory[] {
  const stats = computeCategoryUsageStats(categories, transactions);
  const copy = [...categories];

  switch (mode) {
    case 'frequency':
      // Most used categories first (by transaction count), then by total volume, then name
      return copy.sort((a, b) => {
        const countA = stats[a.id]?.transactionCount || 0;
        const countB = stats[b.id]?.transactionCount || 0;
        if (countB !== countA) return countB - countA;
        const amtA = stats[a.id]?.totalAmount || 0;
        const amtB = stats[b.id]?.totalAmount || 0;
        if (amtB !== amtA) return amtB - amtA;
        return a.name.localeCompare(b.name);
      });

    case 'manual': {
      // Custom user ordering index
      const effectiveOrder = customOrderIds.length > 0 ? customOrderIds : getSavedCategoryOrder();
      return copy.sort((a, b) => {
        const indexA = effectiveOrder.indexOf(a.id);
        const indexB = effectiveOrder.indexOf(b.id);
        
        // If both are in custom list, sort by custom index
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // If only A is in list, A comes first
        if (indexA !== -1) return -1;
        // If only B is in list, B comes first
        if (indexB !== -1) return 1;
        // Fallback to name
        return a.name.localeCompare(b.name);
      });
    }

    case 'expense':
      // Highest spending first
      return copy.sort((a, b) => {
        const amtA = stats[a.id]?.totalAmount || 0;
        const amtB = stats[b.id]?.totalAmount || 0;
        if (amtB !== amtA) return amtB - amtA;
        return a.name.localeCompare(b.name);
      });

    case 'alphabetical':
    default:
      return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
}

/**
 * Moves a category up or down in the custom priority list
 */
export function moveCategoryInOrder(
  categories: ParentCategory[],
  currentOrder: string[],
  categoryId: string,
  direction: 'up' | 'down'
): string[] {
  // Ensure all categories are in the order array
  let order = [...currentOrder];
  const allIds = categories.map(c => c.id);
  
  // Fill in any missing ids
  allIds.forEach(id => {
    if (!order.includes(id)) {
      order.push(id);
    }
  });

  const index = order.indexOf(categoryId);
  if (index === -1) return order;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= order.length) return order;

  const newOrder = [...order];
  const temp = newOrder[index];
  newOrder[index] = newOrder[targetIndex];
  newOrder[targetIndex] = temp;

  saveCategoryOrder(newOrder);
  return newOrder;
}

/**
 * Pins a category to the very top (#1 priority)
 */
export function pinCategoryToTop(
  categories: ParentCategory[],
  currentOrder: string[],
  categoryId: string
): string[] {
  let order = [...currentOrder];
  const allIds = categories.map(c => c.id);
  allIds.forEach(id => {
    if (!order.includes(id)) {
      order.push(id);
    }
  });

  const filtered = order.filter(id => id !== categoryId);
  const newOrder = [categoryId, ...filtered];
  saveCategoryOrder(newOrder);
  return newOrder;
}

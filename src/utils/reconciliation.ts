import { Transaction, ParentCategory } from '../types/finance';
import { normalizeDescription, computeSyncTransactionHash } from './crypto';

export interface RawCsvRow {
  date: string;
  description: string;
  amount: number;
  account: string;
}

export interface ReconciliationResultItem {
  id: string;
  row: RawCsvRow;
  hash: string;
  isDuplicate: boolean;
  duplicateTxId?: string;
  suggestedCategoryId?: string;
  suggestedSubcategoryId?: string;
  confidenceScore: number;
  matchedRuleOrTx?: string;
}

/**
 * Calculates token similarity between two normalized strings (Jaccard token similarity)
 */
export function calculateTokenSimilarity(a: string, b: string): number {
  const normA = normalizeDescription(a);
  const normB = normalizeDescription(b);
  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0;

  const tokensA = new Set(normA.split(' ').filter(t => t.length > 2));
  const tokensB = new Set(normB.split(' ').filter(t => t.length > 2));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  return intersection.size / union.size;
}

/**
 * Parses raw CSV content with fallback heuristic detection for delimiter and column names
 */
export function parseRawBankCsv(csvText: string): RawCsvRow[] {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Determine column indices
  let dateIdx = headers.findIndex(h => h.includes('fecha') || h.includes('date'));
  let descIdx = headers.findIndex(h => h.includes('desc') || h.includes('concepto') || h.includes('detalle') || h.includes('memo'));
  let amountIdx = headers.findIndex(h => h.includes('monto') || h.includes('importe') || h.includes('amount') || h.includes('valor'));
  let accountIdx = headers.findIndex(h => h.includes('cuenta') || h.includes('account') || h.includes('tarjeta'));

  // Sensible defaults if not found
  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1;
  if (amountIdx === -1) amountIdx = 2;
  if (accountIdx === -1) accountIdx = 3;

  const results: RawCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (row.length <= 1) continue;

    const rawDate = row[dateIdx] || new Date().toISOString().split('T')[0];
    const rawDesc = row[descIdx] || 'Transacción Bancaria';
    const amountStr = (row[amountIdx] || '0').replace(/[$€]/g, '').replace(',', '.');
    const rawAmount = parseFloat(amountStr) || 0;
    const rawAccount = row[accountIdx] || 'Cuenta Predeterminada';

    results.push({
      date: rawDate,
      description: rawDesc,
      amount: Math.abs(rawAmount),
      account: rawAccount,
    });
  }

  return results;
}

/**
 * Conciliates a batch of raw CSV rows against the active ledger:
 * 1. Checks duplicate hash collision against existing transactions and current batch
 * 2. Learns from past categorizations to suggest category + subcategory
 */
export function reconcileStatementBatch(
  rawRows: RawCsvRow[],
  existingLedger: Transaction[],
  categories: ParentCategory[],
  defaultAccountId: string
): ReconciliationResultItem[] {
  // Build lookup hash set of existing ledger
  const existingLedgerHashes = new Map<string, string>(); // hash -> txId
  for (const tx of existingLedger) {
    const hash = tx.hash || computeSyncTransactionHash(tx.date, tx.amount, tx.originalRawDescription || tx.description, tx.accountId);
    existingLedgerHashes.set(hash, tx.id);
  }

  // Build pattern map from historical transactions
  const descriptionCategoryMap: Array<{ normalized: string; categoryId: string; subcategoryId: string }> = [];
  for (const tx of existingLedger) {
    if (tx.categoryId && tx.description) {
      descriptionCategoryMap.push({
        normalized: normalizeDescription(tx.originalRawDescription || tx.description),
        categoryId: tx.categoryId,
        subcategoryId: tx.subcategoryId,
      });
    }
  }

  const batchHashes = new Set<string>();
  const results: ReconciliationResultItem[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const hash = computeSyncTransactionHash(row.date, row.amount, row.description, defaultAccountId);
    
    // Check duplication
    let isDuplicate = false;
    let duplicateTxId: string | undefined = undefined;

    if (existingLedgerHashes.has(hash)) {
      isDuplicate = true;
      duplicateTxId = existingLedgerHashes.get(hash);
    } else if (batchHashes.has(hash)) {
      isDuplicate = true;
      duplicateTxId = `batch_dup_${i}`;
    }

    batchHashes.add(hash);

    // Predict category
    let bestMatchCategoryId: string | undefined = undefined;
    let bestMatchSubcategoryId: string | undefined = undefined;
    let highestConfidence = 0;
    let matchedRule = '';

    const normTarget = normalizeDescription(row.description);

    for (const pattern of descriptionCategoryMap) {
      const score = calculateTokenSimilarity(normTarget, pattern.normalized);
      if (score > highestConfidence && score >= 0.35) {
        highestConfidence = score;
        bestMatchCategoryId = pattern.categoryId;
        bestMatchSubcategoryId = pattern.subcategoryId;
        matchedRule = `Similaridad con "${pattern.normalized.slice(0, 25)}" (${Math.round(score * 100)}%)`;
      }
    }

    // Heuristic fallbacks for well-known merchant patterns
    if (!bestMatchCategoryId) {
      if (normTarget.includes('supermercado') || normTarget.includes('walmart') || normTarget.includes('dia') || normTarget.includes('carrefour') || normTarget.includes('mercado')) {
        bestMatchCategoryId = 'cat_alimentacion';
        bestMatchSubcategoryId = 'sub_supermercado';
        highestConfidence = 0.90;
        matchedRule = 'Regla heurística: Supermercado';
      } else if (normTarget.includes('repsol') || normTarget.includes('shell') || normTarget.includes('combustible') || normTarget.includes('gasolina') || normTarget.includes('gasolinera')) {
        bestMatchCategoryId = 'cat_transporte';
        bestMatchSubcategoryId = 'sub_combustible';
        highestConfidence = 0.90;
        matchedRule = 'Regla heurística: Combustible';
      } else if (normTarget.includes('netflix') || normTarget.includes('spotify') || normTarget.includes('streaming') || normTarget.includes('hbo')) {
        bestMatchCategoryId = 'cat_entretenimiento';
        bestMatchSubcategoryId = 'sub_streaming';
        highestConfidence = 0.95;
        matchedRule = 'Regla heurística: Streaming';
      } else if (normTarget.includes('farmacia') || normTarget.includes('salud') || normTarget.includes('medic')) {
        bestMatchCategoryId = 'cat_salud';
        bestMatchSubcategoryId = 'sub_farmacia';
        highestConfidence = 0.88;
        matchedRule = 'Regla heurística: Farmacia';
      } else if (normTarget.includes('nomina') || normTarget.includes('sueldo') || normTarget.includes('salary') || normTarget.includes('consultoria')) {
        bestMatchCategoryId = 'cat_ingresos';
        bestMatchSubcategoryId = 'sub_nomina_carlos';
        highestConfidence = 0.85;
        matchedRule = 'Regla heurística: Ingreso salarial/honorario';
      }
    }

    results.push({
      id: `rec_item_${i}_${Date.now()}`,
      row,
      hash,
      isDuplicate,
      duplicateTxId,
      suggestedCategoryId: bestMatchCategoryId,
      suggestedSubcategoryId: bestMatchSubcategoryId,
      confidenceScore: highestConfidence,
      matchedRuleOrTx: matchedRule,
    });
  }

  return results;
}

/**
 * Finds similar transactions in the ledger for bulk category application
 * As requested: "Si el usuario edita o asigna la categoría/subcategoría de una transacción importada,
 * el sistema debe buscar transacciones similares y lanzar un modal preguntando:
 * 'Se encontraron X transacciones similares. ¿Deseas aplicar la categoría [Categoría]...?'"
 */
export function findSimilarTransactionsForBulkCategorization(
  targetDescription: string,
  targetTxId: string,
  ledger: Transaction[],
  threshold = 0.4
): Transaction[] {
  const normTarget = normalizeDescription(targetDescription);
  if (!normTarget || normTarget.length < 3) return [];

  return ledger.filter(tx => {
    if (tx.id === targetTxId) return false;
    const normOther = normalizeDescription(tx.originalRawDescription || tx.description);
    const similarity = calculateTokenSimilarity(normTarget, normOther);
    return similarity >= threshold;
  });
}

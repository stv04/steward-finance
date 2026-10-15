import { Transaction, ParentCategory } from '../types/finance';
import { normalizeDescription, computeSyncTransactionHash } from './crypto';
import { normalizeAndValidateDate } from './dateUtils';

export interface RawCsvRow {
  date: string; // Canonical YYYY-MM-DD
  description: string;
  movement?: string; // e.g. "Cargo", "Abono", "Pago con Tarjeta Débito", etc.
  amount: number;
  isIncome: boolean;
  account?: string;
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
 * Parses raw bank CSV or tab-separated text (pasted from Excel).
 * Column 'Cuenta' is completely optional because the user selects the destination account in the UI.
 * Standard bank format: Fecha, Concepto, Movimiento, Importe.
 */
export function parseRawBankCsv(csvText: string): RawCsvRow[] {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  // Detect delimiter: tab (Excel copy/paste), semicolon (European CSV), or comma
  let delimiter = ',';
  if (headerLine.includes('\t')) {
    delimiter = '\t';
  } else if (headerLine.includes(';')) {
    delimiter = ';';
  }

  const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Determine column indices
  let dateIdx = headers.findIndex(h => h.includes('fecha') || h.includes('date'));
  let descIdx = headers.findIndex(h => h.includes('concepto') || h.includes('desc') || h.includes('detalle') || h.includes('memo') || h.includes('operacion') || h.includes('operación'));
  let movIdx = headers.findIndex(h => h.includes('movimiento') || h.includes('mov') || h.includes('tipo') || h.includes('signo') || h.includes('naturaleza'));
  let amountIdx = headers.findIndex(h => h.includes('importe') || h.includes('monto') || h.includes('amount') || h.includes('valor') || h.includes('cantidad'));
  let accountIdx = headers.findIndex(h => h.includes('cuenta') || h.includes('account') || h.includes('tarjeta'));

  // Sensible defaults if not explicitly found
  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1;
  if (amountIdx === -1) {
    amountIdx = headers.length > 3 ? 3 : 2;
  }

  const results: RawCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (row.length <= 1) continue;

    const rawDateUnparsed = row[dateIdx] || new Date().toISOString().split('T')[0];
    const canonicalDate = normalizeAndValidateDate(rawDateUnparsed);
    const rawDesc = row[descIdx] || 'Transacción Bancaria';
    const rawMov = movIdx !== -1 && row[movIdx] ? row[movIdx] : '';

    const rawAmountStr = (row[amountIdx] || '0').replace(/[$€]/g, '').trim();
    // Handle European numbers (1.200,50 -> 1200.50)
    let sanitizedAmount = rawAmountStr;
    if (sanitizedAmount.includes(',') && sanitizedAmount.includes('.')) {
      if (sanitizedAmount.indexOf('.') < sanitizedAmount.indexOf(',')) {
        sanitizedAmount = sanitizedAmount.replace(/\./g, '').replace(',', '.');
      } else {
        sanitizedAmount = sanitizedAmount.replace(/,/g, '');
      }
    } else if (sanitizedAmount.includes(',')) {
      sanitizedAmount = sanitizedAmount.replace(',', '.');
    }

    const numericAmount = parseFloat(sanitizedAmount) || 0;

    // Movement direction detection:
    // 1. Check raw movement column: Cargo, Gasto, Débito vs Abono, Ingreso, Crédito
    // 2. Check sign of amount (- vs +)
    // 3. Fallback to concept cues
    const movLower = rawMov.toLowerCase();
    let isIncome = false;

    if (movLower.includes('abono') || movLower.includes('ingreso') || movLower.includes('crédito') || movLower.includes('credito') || movLower.includes('haber')) {
      isIncome = true;
    } else if (movLower.includes('cargo') || movLower.includes('gasto') || movLower.includes('débito') || movLower.includes('debito') || movLower.includes('debe')) {
      isIncome = false;
    } else {
      // Check sign
      if (rawAmountStr.startsWith('+') || (numericAmount > 0 && !rawAmountStr.startsWith('-'))) {
        const descLower = rawDesc.toLowerCase();
        if (descLower.includes('nomina') || descLower.includes('sueldo') || descLower.includes('abono') || descLower.includes('recibida') || descLower.includes('freelance')) {
          isIncome = true;
        } else if (rawAmountStr.startsWith('-')) {
          isIncome = false;
        } else {
          isIncome = false;
        }
      }
    }

    const rawAccount = accountIdx !== -1 && row[accountIdx] ? row[accountIdx] : undefined;

    results.push({
      date: canonicalDate,
      description: rawDesc,
      movement: rawMov || (isIncome ? 'Abono / Ingreso' : 'Cargo / Gasto'),
      amount: Math.abs(numericAmount),
      isIncome,
      account: rawAccount,
    });
  }

  return results;
}

/**
 * Conciliates a batch of raw CSV rows against the active ledger:
 * 1. Checks duplicate hash collision against existing transactions and current batch
 * 2. Learns from past categorizations to suggest category + subcategory
 * 3. Transactions without confident match remain uncategorized (suggestedCategoryId: '')
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

  // Build pattern map from historical transactions with non-empty categories
  const descriptionCategoryMap: Array<{ normalized: string; categoryId: string; subcategoryId: string }> = [];
  for (const tx of existingLedger) {
    if (tx.categoryId && tx.categoryId !== 'cat_uncategorized' && tx.description) {
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
      if (normTarget.includes('supermercado') || normTarget.includes('walmart') || normTarget.includes('dia') || normTarget.includes('carrefour') || normTarget.includes('mercado') || normTarget.includes('frutas')) {
        bestMatchCategoryId = 'cat_alimentacion';
        bestMatchSubcategoryId = 'sub_supermercado';
        highestConfidence = 0.90;
        matchedRule = 'Regla heurística: Alimentación';
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
      } else if (row.isIncome || normTarget.includes('nomina') || normTarget.includes('sueldo') || normTarget.includes('salary') || normTarget.includes('consultoria')) {
        bestMatchCategoryId = 'cat_ingresos';
        bestMatchSubcategoryId = 'sub_nomina_carlos';
        highestConfidence = 0.85;
        matchedRule = 'Regla heurística: Ingreso salarial/honorario';
      }
    }

    // If still no confident match, leave it uncategorized
    if (!bestMatchCategoryId) {
      bestMatchCategoryId = '';
      bestMatchSubcategoryId = '';
      highestConfidence = 0;
      matchedRule = 'Pendiente de categorizar';
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
 * Finds similar transactions in the ledger for bulk category application.
 * Compares token similarity of descriptions.
 */
export function findSimilarTransactionsForBulkCategorization(
  targetDescription: string,
  targetTxId: string,
  ledger: Transaction[],
  threshold = 0.35
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

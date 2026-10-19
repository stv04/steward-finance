import stringSimilarity from 'string-similarity';
import { Transaction, ParentCategory } from '../types/finance';
import { normalizeDescription, computeSyncTransactionHash } from './crypto';
import { normalizeAndValidateDate } from './dateUtils';

export interface RawCsvRow {
  date: string; // Canonical YYYY-MM-DD
  description: string;
  movement?: string; // e.g. "Cargo", "Abono", "Pago con Tarjeta Débito", etc.
  amount: number;
  net_amount: number;
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
 * Calculates string similarity using the 'string-similarity' library (Dice Coefficient)
 * with robust token overlap and avoiding false-positive substring matching.
 */
export function calculateStringSimilarity(a: string, b: string): number {
  const normA = normalizeDescription(a);
  const normB = normalizeDescription(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const dice = stringSimilarity.compareTwoStrings(normA, normB);

  // Token-level check: ignore common short words to focus on meaningful merchant keywords
  const stopWords = new Set(['de', 'la', 'el', 'en', 'los', 'las', 'un', 'una', 'por', 'con', 'para', 'del', 'al', 'sa', 'sl', 's', 'a', 'y', 'o']);
  const tokensA = normA.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));
  const tokensB = normB.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));

  if (tokensA.length > 0 && tokensB.length > 0) {
    // Check meaningful keyword overlap
    const sharedTokens = tokensA.filter(tA => 
      tokensB.some(tB => tB === tA || (tA.length >= 5 && tB.startsWith(tA)) || (tB.length >= 5 && tA.startsWith(tB)))
    );

    if (sharedTokens.length > 0) {
      const tokenCoverage = (sharedTokens.length * 2) / (tokensA.length + tokensB.length);
      // Give a balanced boost if significant merchant tokens match, but do not override non-similar strings
      return Math.max(dice, tokenCoverage * 0.85);
    }
  }

  return dice;
}

/**
 * Calculates token similarity between two normalized strings (legacy Jaccard token similarity)
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
 * Compares two transactions evaluating BOTH Concept (description) AND Movement (tipo/movimiento)
 * using the 'string-similarity' closeness algorithm.
 */
export function calculateTransactionSimilarity(
  target: { description: string; movement?: string; type?: string; isIncome?: boolean },
  candidate: { description: string; originalRawDescription?: string; movement?: string; type?: string; isIncome?: boolean }
): number {
  // If transaction types or income/expense directions are explicitly contrasting, disqualify them!
  const targetIsIncome = target.isIncome !== undefined 
    ? target.isIncome 
    : (target.type === 'income');
  const candIsIncome = candidate.isIncome !== undefined 
    ? candidate.isIncome 
    : (candidate.type === 'income');

  if (target.type && candidate.type && target.type !== candidate.type) {
    return 0; // Incompatible transaction types (e.g. expense vs income vs transfer)
  }
  if (target.isIncome !== undefined && candidate.isIncome !== undefined && targetIsIncome !== candIsIncome) {
    return 0; // Incompatible directions
  }

  const targetConcept = target.description;
  const candidateConcept = candidate.originalRawDescription || candidate.description;

  const conceptScore = calculateStringSimilarity(targetConcept, candidateConcept);

  // Evaluate movement compatibility and closeness if movement is available
  if (target.movement && candidate.movement) {
    const normTargetMov = normalizeDescription(target.movement);
    const normCandMov = normalizeDescription(candidate.movement);

    if (normTargetMov && normCandMov) {
      // Check for opposing movement types (e.g. Cargo vs Abono)
      const isTargetDebit = normTargetMov.includes('cargo') || normTargetMov.includes('gasto') || normTargetMov.includes('debito') || normTargetMov.includes('pago');
      const isCandDebit = normCandMov.includes('cargo') || normCandMov.includes('gasto') || normCandMov.includes('debito') || normCandMov.includes('pago');
      const isTargetCredit = normTargetMov.includes('abono') || normTargetMov.includes('ingreso') || normTargetMov.includes('nomina');
      const isCandCredit = normCandMov.includes('abono') || normCandMov.includes('ingreso') || normCandMov.includes('nomina');

      if ((isTargetDebit && isCandCredit) || (isTargetCredit && isCandDebit)) {
        return 0; // Distinct movement directions
      }

      const movScore = (normTargetMov === normCandMov)
        ? 1.0
        : stringSimilarity.compareTwoStrings(normTargetMov, normCandMov);

      // Both concept and movement must align
      if (conceptScore >= 0.35) {
        return (conceptScore * 0.70) + (movScore * 0.30);
      } else {
        return conceptScore * 0.5;
      }
    }
  }

  return conceptScore;
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
    let isIncome = false;
    if (rawAmountStr.startsWith('+') || (numericAmount > 0 && !rawAmountStr.startsWith('-'))) {
      isIncome = true;
    }

    const rawAccount = accountIdx !== -1 && row[accountIdx] ? row[accountIdx] : undefined;

    results.push({
      date: canonicalDate,
      description: rawDesc,
      movement: rawMov || (isIncome ? 'Abono / Ingreso' : 'Cargo / Gasto'),
      amount: Math.abs(numericAmount),
      net_amount: numericAmount,
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
  const descriptionCategoryMap: Array<{ 
    concept: string; 
    movement?: string; 
    categoryId: string; 
    subcategoryId: string; 
  }> = [];

  for (const tx of existingLedger) {
    if (tx.categoryId && tx.categoryId !== 'cat_uncategorized' && tx.description) {
      descriptionCategoryMap.push({
        concept: tx.originalRawDescription || tx.description,
        movement: tx.movement,
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

    // Predict category using string-similarity comparing concept & movement
    let bestMatchCategoryId: string | undefined = undefined;
    let bestMatchSubcategoryId: string | undefined = undefined;
    let highestConfidence = 0;
    let matchedRule = '';

    const normTarget = normalizeDescription(row.description);

    for (const pattern of descriptionCategoryMap) {
      const score = calculateTransactionSimilarity(
        { description: row.description, movement: row.movement },
        { description: pattern.concept, movement: pattern.movement }
      );
      if (score > highestConfidence && score >= 0.35) {
        highestConfidence = score;
        bestMatchCategoryId = pattern.categoryId;
        bestMatchSubcategoryId = pattern.subcategoryId;
        matchedRule = `Similaridad con "${pattern.concept.slice(0, 25)}" (${Math.round(score * 100)}%)`;
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
 * Evaluates BOTH Concept and Movement using the 'string-similarity' library.
 * Supports both object payload ({ id, description, movement }) and legacy parameter signature.
 */
export function findSimilarTransactionsForBulkCategorization(
  target: string | { id?: string; description: string; movement?: string; type?: string; isIncome?: boolean },
  arg2?: string | Transaction[],
  arg3?: Transaction[] | number,
  arg4?: number
): Array<Transaction & { similarityScore: number }> {
  let targetDesc = '';
  let targetMov: string | undefined = undefined;
  let targetTxId: string | undefined = undefined;
  let targetType: string | undefined = undefined;
  let targetIsIncome: boolean | undefined = undefined;
  let ledger: Transaction[] = [];
  let threshold = 0.45; // Meaningful closeness threshold for real similarity

  if (typeof target === 'string') {
    targetDesc = target;
    if (typeof arg2 === 'string') targetTxId = arg2;
    if (Array.isArray(arg3)) ledger = arg3;
    if (typeof arg4 === 'number') threshold = arg4;
  } else if (target && typeof target === 'object') {
    targetDesc = target.description;
    targetMov = target.movement;
    targetTxId = target.id;
    targetType = target.type;
    targetIsIncome = target.isIncome;
    if (Array.isArray(arg2)) ledger = arg2;
    if (typeof arg3 === 'number') threshold = arg3;
  }

  if (!targetDesc || targetDesc.trim().length < 2 || !Array.isArray(ledger)) {
    return [];
  }

  const results: Array<Transaction & { similarityScore: number }> = [];

  for (const tx of ledger) {
    if (targetTxId && tx.id === targetTxId) continue;

    const score = calculateTransactionSimilarity(
      { description: targetDesc, movement: targetMov, type: targetType, isIncome: targetIsIncome },
      { description: tx.description, originalRawDescription: tx.originalRawDescription, movement: tx.movement, type: tx.type }
    );

    if (score >= threshold) {
      results.push({
        ...tx,
        similarityScore: Math.round(score * 100),
      });
    }
  }

  return results.sort((a, b) => b.similarityScore - a.similarityScore);
}

/**
 * Finds similar items within an imported raw CSV reconciliation batch for mass category assignment.
 * Evaluates BOTH Concept and Movement using string-similarity.
 */
export function findSimilarReconciledBatchItems(
  targetItem: { id: string; description: string; movement?: string; isIncome?: boolean },
  batch: ReconciliationResultItem[],
  threshold = 0.80
): Array<{ item: ReconciliationResultItem; similarityScore: number }> {
  if (!targetItem.description || targetItem.description.trim().length < 2) return [];

  const matches: Array<{ item: ReconciliationResultItem; similarityScore: number }> = [];

  for (const candidate of batch) {
    if (candidate.id === targetItem.id) continue;

    const score = calculateTransactionSimilarity(
      { 
        description: targetItem.description, 
        movement: targetItem.movement, 
        isIncome: targetItem.isIncome 
      },
      { 
        description: candidate.row.description, 
        movement: candidate.row.movement, 
        isIncome: candidate.row.isIncome 
      }
    );

    if (score >= threshold) {
      matches.push({
        item: candidate,
        similarityScore: Math.round(score * 100),
      });
    }
  }

  return matches.sort((a, b) => b.similarityScore - a.similarityScore);
}

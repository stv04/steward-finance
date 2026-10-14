import { TestResultItem, BudgetAccord, Transaction, ParentCategory } from '../types/finance';
import { computeSyncTransactionHash, normalizeDescription } from './crypto';
import { calculateTokenSimilarity, parseRawBankCsv, reconcileStatementBatch, findSimilarTransactionsForBulkCategorization, RawCsvRow } from './reconciliation';
import { resolveEffectiveBudgetAccord, calculateMonthBudgetSummary } from './budgetEngine';

/**
 * Executes the complete unit test suite for the reconciliation engine and continuous budgeting engine
 */
export function runUnitTests(
  categories: ParentCategory[],
  sampleTransactions: Transaction[],
  sampleAccords: BudgetAccord[]
): TestResultItem[] {
  const results: TestResultItem[] = [];

  function assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(`Fallo de aserción: ${message}`);
    }
  }

  // --- SUITE 1: MOTOR DE CONCILIACIÓN Y DETECCIÓN DE DUPLICADOS ---
  
  // Test 1.1: Hash Determinista y Detección de Duplicados
  try {
    const t0 = performance.now();
    const hash1 = computeSyncTransactionHash('2026-10-04', 182.40, 'SUPERMERCADO CENTRAL CORTE 4402 TPV', 'acc_credit_mastercard');
    const hash2 = computeSyncTransactionHash('2026-10-04', 182.40, 'supermercado central corte 4402 tpv', 'acc_credit_mastercard');
    const hashDifferentAmount = computeSyncTransactionHash('2026-10-04', 182.50, 'SUPERMERCADO CENTRAL CORTE 4402 TPV', 'acc_credit_mastercard');

    assert(hash1 === hash2, 'Dos descripciones idénticas con mayúsculas/minúsculas deben generar el mismo hash');
    assert(hash1 !== hashDifferentAmount, 'Montos diferentes deben generar hashes distintos');

    const duration = performance.now() - t0;
    results.push({
      id: 'test_hash_deduplication',
      suite: 'Motor de Conciliación Bancaria',
      title: 'Detección de Duplicados por Hash Compuesto (Fecha + Monto + Concepto + Cuenta)',
      passed: true,
      durationMs: Number(duration.toFixed(2)),
      details: `Hash generado: ${hash1}. Se verificó invariancia a mayúsculas y discriminación de montos.`,
    });
  } catch (err: any) {
    results.push({
      id: 'test_hash_deduplication',
      suite: 'Motor de Conciliación Bancaria',
      title: 'Detección de Duplicados por Hash Compuesto',
      passed: false,
      durationMs: 0,
      error: err.message,
    });
  }

  // Test 1.2: Normalización de texto y remoción de acentos/caracteres especiales
  try {
    const t0 = performance.now();
    const raw = 'Cafetería El Éxito & Cía. - 100% Calidad!';
    const normalized = normalizeDescription(raw);
    assert(normalized === 'cafeteria el exito cia 100 calidad', `La normalización esperada falló: ${normalized}`);

    const duration = performance.now() - t0;
    results.push({
      id: 'test_normalization',
      suite: 'Motor de Conciliación Bancaria',
      title: 'Normalización de Descripciones y Eliminación de Diacríticos',
      passed: true,
      durationMs: Number(duration.toFixed(2)),
      details: `Entrada: "${raw}" -> Normalizado: "${normalized}"`,
    });
  } catch (err: any) {
    results.push({
      id: 'test_normalization',
      suite: 'Motor de Conciliación Bancaria',
      title: 'Normalización de Descripciones y Eliminación de Diacríticos',
      passed: false,
      durationMs: 0,
      error: err.message,
    });
  }

  // Test 1.3: Similitud de Tokens (Jaccard Similarity)
  try {
    const t0 = performance.now();
    const strA = 'SUPERMERCADO CENTRAL CORTE 4402 TPV';
    const strB = 'SUPERMERCADO CENTRAL COMPRA SUCURSAL 4402';
    const strC = 'FARMACIA SAN RAFAEL MEDICAMENTOS';

    const simAB = calculateTokenSimilarity(strA, strB);
    const simAC = calculateTokenSimilarity(strA, strC);

    assert(simAB > 0.4, `Similitud esperada > 0.4 para transacciones del mismo comercio (obtenido: ${simAB})`);
    assert(simAC === 0, `Similitud esperada 0 para comercios no relacionados (obtenido: ${simAC})`);

    const duration = performance.now() - t0;
    results.push({
      id: 'test_token_similarity',
      suite: 'Motor de Conciliación Bancaria',
      title: 'Cálculo de Similitud de Tokens para Conciliación Inteligente',
      passed: true,
      durationMs: Number(duration.toFixed(2)),
      details: `Similitud intra-comercio: ${(simAB * 100).toFixed(1)}%, Similitud inter-categoría: ${(simAC * 100).toFixed(1)}%`,
    });
  } catch (err: any) {
    results.push({
      id: 'test_token_similarity',
      suite: 'Motor de Conciliación Bancaria',
      title: 'Cálculo de Similitud de Tokens',
      passed: false,
      durationMs: 0,
      error: err.message,
    });
  }

  // Test 1.4: Parser de CSV Bancario con Mapeo Dinámico
  try {
    const t0 = performance.now();
    const sampleCsv = `Fecha,Descripcion_Original,Monto,Cuenta\n2026-10-14,SUPERMERCADO DIA FRUTAS,-38.50,Santander\n2026-10-14,NETFLIX MENSUAL,-19.99,PayPal`;
    const parsed = parseRawBankCsv(sampleCsv);

    assert(parsed.length === 2, `Se esperaban 2 filas parseadas, obtenidas: ${parsed.length}`);
    assert(parsed[0].amount === 38.50, `El monto debe ser valor absoluto numérico positivo (esperado 38.50, obtenido ${parsed[0].amount})`);
    assert(parsed[1].description === 'NETFLIX MENSUAL', `Descripción de fila 2 incorrecta: ${parsed[1].description}`);

    const duration = performance.now() - t0;
    results.push({
      id: 'test_csv_parser',
      suite: 'Motor de Conciliación Bancaria',
      title: 'Parser CSV de Extractos Bancarios en Bruto y Mapeo Dinámico',
      passed: true,
      durationMs: Number(duration.toFixed(2)),
      details: `Se procesaron ${parsed.length} transacciones convirtiendo montos a flotantes absolutos.`,
    });
  } catch (err: any) {
    results.push({
      id: 'test_csv_parser',
      suite: 'Motor de Conciliación Bancaria',
      title: 'Parser CSV de Extractos Bancarios en Bruto',
      passed: false,
      durationMs: 0,
      error: err.message,
    });
  }

  // Test 1.5: Búsqueda de transacciones similares para modal de asignación masiva
  try {
    const t0 = performance.now();
    const targetDesc = 'SUPERMERCADO CENTRAL CORTE 4402 TPV';
    const mockLedger: Transaction[] = [
      ...sampleTransactions,
      {
        id: 'tx_test_similar_1',
        userId: 'usr_carlos',
        date: '2026-10-11',
        amount: 95.0,
        type: 'expense',
        accountId: 'acc_credit_mastercard',
        categoryId: 'cat_alimentacion',
        subcategoryId: 'sub_supermercado',
        scope: 'familiar',
        description: 'SUPERMERCADO CENTRAL SUCURSAL NORTE',
        hash: 'h_similar_1',
        isReconciled: true,
        createdAt: '2026-10-11T12:00:00Z',
      },
    ];

    const similar = findSimilarTransactionsForBulkCategorization(targetDesc, 'tx_004', mockLedger, 0.3);
    assert(similar.length >= 1, `Se esperaba encontrar al menos 1 transacción similar, encontradas: ${similar.length}`);

    const duration = performance.now() - t0;
    results.push({
      id: 'test_similar_tx_search',
      suite: 'Motor de Conciliación Bancaria',
      title: 'Sugerencia Automatizada y Búsqueda de Transacciones Similares',
      passed: true,
      durationMs: Number(duration.toFixed(2)),
      details: `Encontradas ${similar.length} transacciones coincidentes listas para asignación masiva en modal.`,
    });
  } catch (err: any) {
    results.push({
      id: 'test_similar_tx_search',
      suite: 'Motor de Conciliación Bancaria',
      title: 'Sugerencia Automatizada y Búsqueda de Transacciones Similares',
      passed: false,
      durationMs: 0,
      error: err.message,
    });
  }

  // --- SUITE 2: MOTOR DE PRESUPUESTACIÓN CONTINUA Y HERENCIA RECURSIVA ---

  // Test 2.1: Regla de Herencia Continuada a través de meses futuros
  try {
    const t0 = performance.now();
    const baseAccord: BudgetAccord = {
      id: 'accord_test_aug',
      name: 'Pacto Base Agosto 2026',
      effectiveMonth: '2026-08',
      scope: 'familiar',
      createdByUserId: 'usr_carlos',
      createdAt: '2026-08-01T00:00:00Z',
      envelopes: [
        { id: 'env_t1', categoryId: 'cat_vivienda', budgetedAmount: 1500 },
        { id: 'env_t2', categoryId: 'cat_alimentacion', budgetedAmount: 900 },
      ],
    };

    // Evaluamos meses posteriores: Septiembre 2026, Octubre 2026, Diciembre 2026
    const resSep = resolveEffectiveBudgetAccord('2026-09', [baseAccord], 'familiar');
    const resOct = resolveEffectiveBudgetAccord('2026-10', [baseAccord], 'familiar');
    const resDec = resolveEffectiveBudgetAccord('2026-12', [baseAccord], 'familiar');

    assert(resSep.accord?.id === baseAccord.id && resSep.isInherited === true, 'Septiembre 2026 debe heredar el pacto de Agosto');
    assert(resOct.accord?.id === baseAccord.id && resOct.isInherited === true, 'Octubre 2026 debe heredar el pacto de Agosto');
    assert(resDec.inheritedFromMonth === '2026-08', 'Diciembre 2026 debe indicar que heredó desde 2026-08');

    const duration = performance.now() - t0;
    results.push({
      id: 'test_continuous_inheritance',
      suite: 'Presupuestación Continua (Zero-Based)',
      title: 'Regla de Herencia Continuada Recursiva a Través de Meses Posteriores',
      passed: true,
      durationMs: Number(duration.toFixed(2)),
      details: 'El pacto de 2026-08 se hereda de forma automática y recursiva a 2026-09, 2026-10 y 2026-12.',
    });
  } catch (err: any) {
    results.push({
      id: 'test_continuous_inheritance',
      suite: 'Presupuestación Continua (Zero-Based)',
      title: 'Regla de Herencia Continuada Recursiva',
      passed: false,
      durationMs: 0,
      error: err.message,
    });
  }

  // Test 2.2: Sustitución de Pacto cuando se crea un "Nuevo Pacto Presupuestario"
  try {
    const t0 = performance.now();
    const accord1: BudgetAccord = {
      id: 'accord_1',
      name: 'Pacto Inicial 2026-08',
      effectiveMonth: '2026-08',
      scope: 'familiar',
      createdByUserId: 'usr_carlos',
      createdAt: '2026-08-01T00:00:00Z',
      envelopes: [{ id: 'e1', categoryId: 'cat_vivienda', budgetedAmount: 1500 }],
    };
    const accord2: BudgetAccord = {
      id: 'accord_2',
      name: 'Nuevo Pacto Revisado 2026-11',
      effectiveMonth: '2026-11',
      scope: 'familiar',
      createdByUserId: 'usr_sofia',
      createdAt: '2026-11-01T00:00:00Z',
      envelopes: [{ id: 'e2', categoryId: 'cat_vivienda', budgetedAmount: 1750 }],
    };

    const accords = [accord1, accord2];
    const resOct = resolveEffectiveBudgetAccord('2026-10', accords, 'familiar');
    const resNov = resolveEffectiveBudgetAccord('2026-11', accords, 'familiar');
    const resDec = resolveEffectiveBudgetAccord('2026-12', accords, 'familiar');

    assert(resOct.accord?.id === 'accord_1', 'Octubre debe usar el pacto anterior (accord_1)');
    assert(resNov.accord?.id === 'accord_2' && resNov.isInherited === false, 'Noviembre debe usar el nuevo pacto propio');
    assert(resDec.accord?.id === 'accord_2' && resDec.isInherited === true, 'Diciembre debe heredar el nuevo pacto (accord_2)');

    const duration = performance.now() - t0;
    results.push({
      id: 'test_accord_superseding',
      suite: 'Presupuestación Continua (Zero-Based)',
      title: 'Corte y Sustitución de Herencia al Promulgar un Nuevo Pacto Presupuestario',
      passed: true,
      durationMs: Number(duration.toFixed(2)),
      details: 'Octubre mantiene pacto previo (1500 USD), Noviembre activa el nuevo pacto (1750 USD) y Diciembre lo hereda.',
    });
  } catch (err: any) {
    results.push({
      id: 'test_accord_superseding',
      suite: 'Presupuestación Continua (Zero-Based)',
      title: 'Corte y Sustitución de Herencia al Promulgar un Nuevo Pacto',
      passed: false,
      durationMs: 0,
      error: err.message,
    });
  }

  // Test 2.3: Alertas de Desviación de Sobres Presupuestarios (Nominal, Alerta, Excedido)
  try {
    const t0 = performance.now();
    const mockAccord: BudgetAccord = {
      id: 'accord_deviation',
      name: 'Pacto Desviación',
      effectiveMonth: '2026-10',
      scope: 'familiar',
      createdByUserId: 'usr_carlos',
      createdAt: '2026-10-01T00:00:00Z',
      envelopes: [
        { id: 'env_d1', categoryId: 'cat_vivienda', budgetedAmount: 1000 },
        { id: 'env_d2', categoryId: 'cat_alimentacion', budgetedAmount: 500 },
        { id: 'env_d3', categoryId: 'cat_transporte', budgetedAmount: 200 },
      ],
    };

    const mockTx: Transaction[] = [
      { id: 't1', userId: 'usr_carlos', date: '2026-10-05', amount: 500, type: 'expense', accountId: 'a1', categoryId: 'cat_vivienda', subcategoryId: 's1', scope: 'familiar', description: 'Gasto normal 50%', hash: 'h1', isReconciled: true, createdAt: '' },
      { id: 't2', userId: 'usr_carlos', date: '2026-10-06', amount: 450, type: 'expense', accountId: 'a1', categoryId: 'cat_alimentacion', subcategoryId: 's2', scope: 'familiar', description: 'Gasto alerta 90%', hash: 'h2', isReconciled: true, createdAt: '' },
      { id: 't3', userId: 'usr_carlos', date: '2026-10-07', amount: 250, type: 'expense', accountId: 'a1', categoryId: 'cat_transporte', subcategoryId: 's3', scope: 'familiar', description: 'Gasto excedido 125%', hash: 'h3', isReconciled: true, createdAt: '' },
    ];

    const summary = calculateMonthBudgetSummary('2026-10', 'familiar', [mockAccord], mockTx, categories);
    const envVivienda = summary.envelopeStatuses.find(e => e.categoryId === 'cat_vivienda')!;
    const envAlim = summary.envelopeStatuses.find(e => e.categoryId === 'cat_alimentacion')!;
    const envTrans = summary.envelopeStatuses.find(e => e.categoryId === 'cat_transporte')!;

    assert(envVivienda.status === 'nominal', `Vivienda al 50% debe tener estado 'nominal' (obtenido ${envVivienda.status})`);
    assert(envAlim.status === 'warning', `Alimentación al 90% debe tener estado 'warning' (obtenido ${envAlim.status})`);
    assert(envTrans.status === 'exceeded', `Transporte al 125% debe tener estado 'exceeded' (obtenido ${envTrans.status})`);
    assert(envTrans.availableAmount === -50, `Disponible debe ser -50 USD (obtenido ${envTrans.availableAmount})`);

    const duration = performance.now() - t0;
    results.push({
      id: 'test_envelope_deviation_alerts',
      suite: 'Presupuestación Continua (Zero-Based)',
      title: 'Alertas de Desviación por Sobre en Tiempo Real (Monto Presupuestado vs Gasto Realizado)',
      passed: true,
      durationMs: Number(duration.toFixed(2)),
      details: 'Se validaron correctamente los umbrales: 50% (Nominal), 90% (Advertencia), 125% (Excedido con déficit negativo).',
    });
  } catch (err: any) {
    results.push({
      id: 'test_envelope_deviation_alerts',
      suite: 'Presupuestación Continua (Zero-Based)',
      title: 'Alertas de Desviación por Sobre en Tiempo Real',
      passed: false,
      durationMs: 0,
      error: err.message,
    });
  }

  return results;
}

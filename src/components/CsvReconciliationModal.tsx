import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  FileSpreadsheet, 
  HelpCircle,
  Hash,
  AlertCircle,
  Check
} from 'lucide-react';
import { FinancialAccount, ParentCategory, Transaction, UserProfile } from '../types/finance';
import { SAMPLE_RAW_CSV_STATEMENTS } from '../data/mockData';
import { parseRawBankCsv, reconcileStatementBatch, ReconciliationResultItem, findSimilarReconciledBatchItems } from '../utils/reconciliation';
import { formatEuro } from '../utils/formatters';
import { BulkUpdateModal } from './bulkUpdateModal';

interface CsvReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportReconciledTransactions: (transactions: Transaction[]) => void;
  existingTransactions: Transaction[];
  categories: ParentCategory[];
  accounts: FinancialAccount[];
  activeUserId: string;
}

export const CsvReconciliationModal: React.FC<CsvReconciliationModalProps> = ({
  isOpen,
  onClose,
  onImportReconciledTransactions,
  existingTransactions,
  categories,
  accounts,
  activeUserId,
}) => {
  const [csvText, setCsvText] = useState<string>(SAMPLE_RAW_CSV_STATEMENTS);
  const [targetAccountId, setTargetAccountId] = useState<string>(accounts[0]?.id || '');
  const [reconciledItems, setReconciledItems] = useState<ReconciliationResultItem[]>([]);
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);

  // Bulk categorization suggestion prompt state with string-similarity & checkboxes
  const [selectedBatchItemIds, setSelectedBatchItemIds] = useState<string[]>([]);
  const [bulkPromptModal, setBulkPromptModal] = useState<{
    isOpen: boolean;
    primaryItemId: string;
    targetDescription: string;
    targetMovement?: string;
    newCategoryId: string;
    newSubcategoryId: string;
    categoryLabel: string;
    similarItems: Array<{
      id: string;
      date: string;
      description: string;
      movement?: string;
      amount: number;
      similarityScore: number;
    }>;
  } | null>(null);

  if (!isOpen) return null;

  const handleProcessCsv = () => {
    const parsedRows = parseRawBankCsv(csvText);
    const results = reconcileStatementBatch(parsedRows, existingTransactions, categories, targetAccountId);
    setReconciledItems(results);
    setHasProcessed(true);
  };

  const handleCategoryChangeOnItem = (itemId: string, newCatId: string) => {
    const item = reconciledItems.find(i => i.id === itemId);
    if (!item) return;

    const cat = categories.find(c => c.id === newCatId);
    const defaultSubId = cat?.subcategories[0]?.id || '';
    const catLabel = `${cat?.name || 'Categoría'}${cat?.subcategories[0]?.name ? ` / ${cat.subcategories[0].name}` : ''}`;

    // Update the single item first
    setReconciledItems(prev => prev.map(it => {
      if (it.id === itemId) {
        return {
          ...it,
          suggestedCategoryId: newCatId,
          suggestedSubcategoryId: defaultSubId,
          confidenceScore: newCatId ? 1.0 : 0,
          matchedRuleOrTx: newCatId ? 'Asignado manualmente por usuario' : 'Pendiente de categorizar',
        };
      }
      return it;
    }));

    if (!newCatId) return;

    // Search for other items in current batch using string-similarity on BOTH Concept and Movement
    const similarInBatch = findSimilarReconciledBatchItems(
      {
        id: itemId,
        description: item.row.description,
        movement: item.row.movement,
        isIncome: item.row.isIncome,
      },
      reconciledItems,
      0.85
    );

    if (similarInBatch.length > 0) {
      const matchIds = similarInBatch.filter(s => s.similarityScore >= 0.85).map(s => s.item.id);
      setSelectedBatchItemIds(matchIds);
      setBulkPromptModal({
        isOpen: true,
        primaryItemId: itemId,
        targetDescription: item.row.description,
        targetMovement: item.row.movement,
        newCategoryId: newCatId,
        newSubcategoryId: defaultSubId,
        categoryLabel: catLabel,
        similarItems: similarInBatch.map(s => ({
          id: s.item.id,
          date: s.item.row.date,
          description: s.item.row.description,
          movement: s.item.row.movement,
          amount: s.item.row.amount,
          similarityScore: s.similarityScore,
        })),
      });
    }
  };

  const handleToggleSelectBatchItem = (id: string) => {
    setSelectedBatchItemIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllBatchItems = () => {
    if (!bulkPromptModal?.similarItems) return;
    setSelectedBatchItemIds(bulkPromptModal.similarItems.map(s => s.id));
  };

  const handleDeselectAllBatchItems = () => {
    setSelectedBatchItemIds([]);
  };

  const handleApplyBulkCategorization = () => {
    if (!bulkPromptModal) return;

    setReconciledItems(prev => prev.map(it => {
      if (selectedBatchItemIds.includes(it.id)) {
        return {
          ...it,
          suggestedCategoryId: bulkPromptModal.newCategoryId,
          suggestedSubcategoryId: bulkPromptModal.newSubcategoryId,
          confidenceScore: 1.0,
          matchedRuleOrTx: `Propagado por regla de similitud ("${bulkPromptModal.targetDescription.slice(0, 20)}...")`,
        };
      }
      return it;
    }));

    setBulkPromptModal(null);
  };

  const handleConfirmImport = () => {
    const toImport: Transaction[] = reconciledItems
      .filter(item => !item.isDuplicate)
      .map(item => {
        const isIncome = item.row.isIncome;

        return {
          id: `tx_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: activeUserId,
          date: item.row.date,
          amount: item.row.amount,
          type: isIncome ? 'income' : 'expense',
          accountId: targetAccountId,
          categoryId: item.suggestedCategoryId || '',
          subcategoryId: item.suggestedSubcategoryId || '',
          scope: 'familiar',
          description: item.row.description,
          originalRawDescription: item.row.description,
          movement: item.row.movement || (isIncome ? 'Abono / Ingreso' : 'Cargo / Gasto'),
          hash: item.hash,
          isReconciled: true,
          createdAt: new Date().toISOString(),
        };
      });

    onImportReconciledTransactions(toImport);
    onClose();
  };

  const duplicateCount = reconciledItems.filter(i => i.isDuplicate).length;
  const readyCount = reconciledItems.length - duplicateCount;
  const uncategorizedCount = reconciledItems.filter(i => !i.isDuplicate && !i.suggestedCategoryId).length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-xl border border-slate-200 my-6 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Carga &amp; Conciliación de Extractos Bancarios
              </h2>
              <p className="text-xs text-slate-500">
                Compatible con extractos de tu banco (Fecha, Concepto, Movimiento, Importe) y copiado directo de Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1">
          
          {/* Input step */}
          {!hasProcessed ? (
            <div className="space-y-4">
              
              {/* Account Selection and Explanation */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-blue-900">1. Selecciona la cuenta bancaria destino</span>
                  </div>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Al descargar el extracto de tu banco ya pertenece a una cuenta específica. Por ello, no requieres una columna 'Cuenta' en el archivo; todas las filas se conciliarán directamente en la cuenta que elijas aquí.
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <select
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    className="bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold shadow-xs"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountNumberMasked})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  2. Pega el extracto bancario (CSV delimitado por comas, punto y coma o tabulaciones de Excel)
                </label>
                <textarea
                  rows={9}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Fecha,Concepto,Movimiento,Importe&#10;2026-10-14,SUPERMERCADO CENTRAL,Cargo,85.20..."
                  className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Formato estándar: <strong>Fecha</strong>, <strong>Concepto</strong>, <strong>Movimiento</strong> (Cargo / Abono o Débito / Crédito) e <strong>Importe</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCsvText(SAMPLE_RAW_CSV_STATEMENTS)}
                  className="text-blue-700 font-semibold hover:underline cursor-pointer shrink-0"
                >
                  Restaurar Ejemplo Real
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleProcessCsv}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Ejecutar Conciliación &amp; Deduplicación</span>
                </button>
              </div>
            </div>
          ) : (
            /* Results Step */
            <div className="space-y-4">
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Total en Extracto</span>
                  <span className="text-lg font-bold font-mono text-slate-900">{reconciledItems.length}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block">Listas para Importar</span>
                  <span className="text-lg font-bold font-mono text-emerald-800">{readyCount}</span>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <span className="text-amber-700 block">Sin Categorizar</span>
                  <span className="text-lg font-bold font-mono text-amber-800">{uncategorizedCount}</span>
                </div>
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                  <span className="text-rose-700 block">Duplicados Omitidos</span>
                  <span className="text-lg font-bold font-mono text-rose-800">{duplicateCount}</span>
                </div>
              </div>

              {uncategorizedCount > 0 && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Atención: {uncategorizedCount} movimientos no tienen categoría asignada.</span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Puedes asignarles su categoría en la tabla de abajo, o importarlos así: el sistema los registrará como <strong>"Sin Categorizar"</strong> y los visualizarás claramente en las gráficas para clasificarlos cuando desees.
                    </p>
                  </div>
                </div>
              )}

              {/* Table of Reconciled Items */}
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100/90 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3">Fecha &amp; Concepto</th>
                        <th className="py-2.5 px-3">Movimiento</th>
                        <th className="py-2.5 px-3 text-right">Importe</th>
                        <th className="py-2.5 px-3">Categoría Asignada</th>
                        <th className="py-2.5 px-3">Confianza</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reconciledItems.map(item => {
                        const hasCategory = Boolean(item.suggestedCategoryId);

                        return (
                          <tr key={item.id} className={item.isDuplicate ? 'bg-rose-50/40 text-slate-400' : 'hover:bg-slate-50'}>
                            {/* Estado / Duplicado */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {item.isDuplicate ? (
                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Duplicado</span>
                                </div>
                              ) : hasCategory ? (
                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Categorizado</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Pendiente</span>
                                </div>
                              )}
                            </td>

                            {/* Fecha y Concepto */}
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-slate-500 block text-[11px]">{item.row.date}</span>
                              <span className="font-medium text-slate-900 block truncate max-w-xs">{item.row.description}</span>
                            </td>

                            {/* Movimiento (Cargo / Abono) */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                item.row.isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {item.row.movement}
                              </span>
                            </td>

                            {/* Monto */}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              <span className={item.row.isIncome ? 'text-emerald-700' : 'text-slate-900'}>
                                {formatEuro(item.row.isIncome ? item.row.amount : -item.row.amount, { showSign: true })}
                              </span>
                            </td>

                            {/* Categoría Asignada / Dropdown interactivo */}
                            <td className="py-2.5 px-3">
                              {!item.isDuplicate ? (
                                <select
                                  value={item.suggestedCategoryId || ''}
                                  onChange={(e) => handleCategoryChangeOnItem(item.id, e.target.value)}
                                  className={`border rounded px-2 py-1 text-xs font-medium cursor-pointer ${
                                    hasCategory 
                                      ? 'bg-white border-slate-300 text-slate-800' 
                                      : 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                                  }`}
                                >
                                  <option value="">⚠️ Sin categorizar (Pendiente)</option>
                                  {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-slate-400 text-xs">Omitido</span>
                              )}
                            </td>

                            {/* Confianza / Regla */}
                            <td className="py-2.5 px-3 text-[11px] text-slate-500">
                              <div className="flex items-center gap-1">
                                <span className={`font-mono font-bold ${item.confidenceScore > 0 ? 'text-slate-700' : 'text-amber-700'}`}>
                                  {Math.round(item.confidenceScore * 100)}%
                                </span>
                                <span className="text-slate-400 truncate max-w-[130px]" title={item.matchedRuleOrTx}>
                                  · {item.matchedRuleOrTx || 'Emparejado'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setHasProcessed(false)}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
                >
                  Volver a editar extracto
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={readyCount === 0}
                    className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    Importar {readyCount} Transacciones
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Modal: Sugerencia Automatizada de Categorización Similar (string-similarity + Checkboxes) */}
      {bulkPromptModal && (
        <BulkUpdateModal
          isOpen={true}
          onClose={() => setBulkPromptModal(null)}
          onSelectAll={handleSelectAllBatchItems}
          onDeselectAll={handleDeselectAllBatchItems}
          onToggleSelect={handleToggleSelectBatchItem}
          onApplySingleSelect={() => {
            // No additional action needed; primary item already updated
            setBulkPromptModal(null);
          }}
          onAppySimilarSelect={handleApplyBulkCategorization}
          bulkPrompt={{
            targetDescription: bulkPromptModal.targetDescription,
            targetMovement: bulkPromptModal.targetMovement,
            categoryLabel: bulkPromptModal.categoryLabel,
            subCategoryLabel: '',
            similarItems: bulkPromptModal.similarItems.map(item => ({
              id: item.id,
              date: item.date,
              description: item.description,
              movement: item.movement,
              amount: item.amount,
              similarityScore: item.similarityScore,
            })),
          }}
          selectedSimilarTxIds={selectedBatchItemIds}
        />
      )}

    </div>
  );
};

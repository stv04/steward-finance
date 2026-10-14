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
  Hash
} from 'lucide-react';
import { FinancialAccount, ParentCategory, Transaction, UserProfile } from '../types/finance';
import { SAMPLE_RAW_CSV_STATEMENTS } from '../data/mockData';
import { parseRawBankCsv, reconcileStatementBatch, ReconciliationResultItem, findSimilarTransactionsForBulkCategorization } from '../utils/reconciliation';

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

  // Bulk categorization suggestion prompt state
  const [bulkPromptModal, setBulkPromptModal] = useState<{
    isOpen: boolean;
    targetDescription: string;
    newCategoryId: string;
    newSubcategoryId: string;
    similarCount: number;
    matchingItemIds: string[];
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

    // Search for other items in current batch that have similar descriptions
    const similarInBatch = reconciledItems.filter(other => {
      if (other.id === itemId) return false;
      const targetWords = item.row.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const otherWords = other.row.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      return targetWords.some(tw => otherWords.includes(tw));
    });

    if (similarInBatch.length > 0) {
      setBulkPromptModal({
        isOpen: true,
        targetDescription: item.row.description,
        newCategoryId: newCatId,
        newSubcategoryId: defaultSubId,
        similarCount: similarInBatch.length,
        matchingItemIds: similarInBatch.map(s => s.id),
      });
    }

    // Update the single item first
    setReconciledItems(prev => prev.map(it => {
      if (it.id === itemId) {
        return {
          ...it,
          suggestedCategoryId: newCatId,
          suggestedSubcategoryId: defaultSubId,
          confidenceScore: 1.0,
          matchedRuleOrTx: 'Asignado manualmente por usuario',
        };
      }
      return it;
    }));
  };

  const handleApplyBulkCategorization = () => {
    if (!bulkPromptModal) return;

    setReconciledItems(prev => prev.map(it => {
      if (bulkPromptModal.matchingItemIds.includes(it.id)) {
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
    // Only import non-duplicate items
    const toImport: Transaction[] = reconciledItems
      .filter(item => !item.isDuplicate)
      .map(item => {
        const cat = categories.find(c => c.id === item.suggestedCategoryId) || categories[0];
        const isIncome = item.suggestedCategoryId === 'cat_ingresos' || item.row.amount > 3000;

        return {
          id: `tx_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: activeUserId,
          date: item.row.date,
          amount: item.row.amount,
          type: isIncome ? 'income' : 'expense',
          accountId: targetAccountId,
          categoryId: item.suggestedCategoryId || categories[1].id,
          subcategoryId: item.suggestedSubcategoryId || categories[1].subcategories[0]?.id || '',
          scope: 'familiar',
          description: item.row.description,
          originalRawDescription: item.row.description,
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
                Motor de Conciliación Bancaria &amp; Parser CSV
              </h2>
              <p className="text-xs text-slate-500">
                Mapeo dinámico, detección de duplicados por hash SHA y sugerencias automáticas de categorización
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700">
                  Pegar Extracto Bancario en formato CSV / Texto delimitado
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Cuenta de destino:</span>
                  <select
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 font-medium"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Fecha,Descripcion_Original,Monto,Cuenta..."
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:border-slate-500"
              />

              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Detección automática de encabezados: <strong>Fecha, Descripción, Monto, Cuenta</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setCsvText(SAMPLE_RAW_CSV_STATEMENTS)}
                  className="text-blue-700 font-semibold hover:underline cursor-pointer"
                >
                  Restaurar Datos de Muestra
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
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Total en Extracto</span>
                  <span className="text-lg font-bold font-mono text-slate-900">{reconciledItems.length}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block">Listas para Importar</span>
                  <span className="text-lg font-bold font-mono text-emerald-800">{readyCount}</span>
                </div>
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                  <span className="text-rose-700 block">Duplicados Omitidos (Hash)</span>
                  <span className="text-lg font-bold font-mono text-rose-800">{duplicateCount}</span>
                </div>
              </div>

              {/* Table of Reconciled Items */}
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100/90 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3">Fecha &amp; Concepto</th>
                        <th className="py-2.5 px-3 text-right">Monto</th>
                        <th className="py-2.5 px-3">Categoría Asignada / Sugerida</th>
                        <th className="py-2.5 px-3">Confianza &amp; Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reconciledItems.map(item => {
                        const currentCat = categories.find(c => c.id === item.suggestedCategoryId);

                        return (
                          <tr key={item.id} className={item.isDuplicate ? 'bg-rose-50/40 text-slate-400' : 'hover:bg-slate-50'}>
                            {/* Estado / Duplicado */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {item.isDuplicate ? (
                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Duplicado (Omitido)</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Válido</span>
                                </div>
                              )}
                            </td>

                            {/* Fecha y Concepto */}
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-slate-500 block text-[11px]">{item.row.date}</span>
                              <span className="font-medium text-slate-900 block truncate max-w-xs">{item.row.description}</span>
                            </td>

                            {/* Monto */}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              ${item.row.amount.toFixed(2)}
                            </td>

                            {/* Categoría Asignada / Dropdown interactivo */}
                            <td className="py-2.5 px-3">
                              {!item.isDuplicate ? (
                                <select
                                  value={item.suggestedCategoryId || ''}
                                  onChange={(e) => handleCategoryChangeOnItem(item.id, e.target.value)}
                                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-medium cursor-pointer"
                                >
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
                                <span className="font-mono font-bold text-slate-700">
                                  {Math.round(item.confidenceScore * 100)}%
                                </span>
                                <span className="text-slate-400 truncate max-w-[140px]" title={item.matchedRuleOrTx}>
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
                  Volver a editar CSV
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

      {/* Modal Específico Solicitado: Sugerencia Automatizada de Categorización Similar */}
      {bulkPromptModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Patrón Recurrente Detectado
                </h3>
                <p className="text-xs text-slate-500">Motor de aprendizaje por similitud de conceptos</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="font-medium text-slate-900">
                Se encontraron <strong>{bulkPromptModal.similarCount}</strong> transacciones similares a:
              </p>
              <div className="font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 text-[11px]">
                "{bulkPromptModal.targetDescription}"
              </div>
              <p className="text-slate-600 mt-2">
                ¿Deseas aplicar la categoría <strong>"{categories.find(c => c.id === bulkPromptModal.newCategoryId)?.name}"</strong> a todas las transacciones pasadas/pendientes coincidentes?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkPromptModal(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Solo esta transacción
              </button>
              <button
                type="button"
                onClick={handleApplyBulkCategorization}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Sí, aplicar a todas ({bulkPromptModal.similarCount})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

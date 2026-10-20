import React, { useState, useEffect } from 'react';
import { X, Paperclip, ArrowRight, Check, Sparkles, AlertCircle } from 'lucide-react';
import { FinancialAccount, ParentCategory, ScopeType, Transaction, TransactionType, UserProfile } from '../types/finance';
import { computeSyncTransactionHash } from '../utils/crypto';
import { findSimilarTransactionsForBulkCategorization } from '../utils/reconciliation';
import { normalizeAndValidateDate } from '../utils/dateUtils';
import { formatEuro } from '../utils/formatters';
import { BulkUpdateModal } from './bulkUpdateModal';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction, similarTxIdsToUpdateCategory?: string[]) => void;
  accounts: FinancialAccount[];
  categories: ParentCategory[];
  users: UserProfile[];
  existingTransactions?: Transaction[];
  editingTransaction?: Transaction | null;
  initialType?: TransactionType;
  initialOriginAccountId?: string;
  activeUserId: string;
  activeScope: ScopeType;
}

let outScopedDate: string | null = null;

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  categories,
  users,
  existingTransactions = [],
  editingTransaction = null,
  initialType = 'expense',
  initialOriginAccountId,
  activeUserId,
  activeScope,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [date, setDate] = useState<string>(outScopedDate ?? new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(initialOriginAccountId || accounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState<string>(accounts[1]?.id || '');
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || '');
  const [subcategoryId, setSubcategoryId] = useState<string>(categories[0]?.subcategories[0]?.id || '');
  const [scope, setScope] = useState<ScopeType>(activeScope);
  const [userId, setUserId] = useState<string>(activeUserId);
  const [description, setDescription] = useState<string>('');
  const [movement, setMovement] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const existentDescriptions = Array.from(new Set(existingTransactions.map(t => t.description).filter(Boolean)));
  const existentMovements = Array.from(new Set(existingTransactions.map(t => t.movement).filter(Boolean)));

  // Prompt state for bulk updating similar transactions when category changes
  const [selectedSimilarTxIds, setSelectedSimilarTxIds] = useState<string[]>([]);
  const [bulkPrompt, setBulkPrompt] = useState<{
    pendingTx: Transaction;
    similarTxIds: string[];
    similarCount: number;
    targetDescription: string;
    targetMovement?: string;
    similarItems?: Array<{
      id: string;
      date: string;
      description: string;
      movement?: string;
      amount: number;
      similarityScore: number;
    }>;
  } | null>(null);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setAmount(editingTransaction.amount.toString());
      setAccountId(editingTransaction.accountId);
      setDestinationAccountId(editingTransaction.destinationAccountId || accounts[1]?.id || '');
      setCategoryId(editingTransaction.categoryId || '');
      setSubcategoryId(editingTransaction.subcategoryId || '');
      setScope(editingTransaction.scope);
      setUserId(editingTransaction.userId);
      setDescription(editingTransaction.description);
      setMovement(editingTransaction.movement || '');
      setAttachmentUrl(editingTransaction.attachmentUrl || '');
      setAttachmentName(editingTransaction.attachmentName || '');
      setErrorMsg('');
      setBulkPrompt(null);
    } else {
      setType(initialType);
      setDate(outScopedDate ?? new Date().toISOString().split('T')[0]);
      setAmount('');
      setAccountId(initialOriginAccountId || accounts[0]?.id || '');
      setDestinationAccountId(accounts[1]?.id || '');
      setCategoryId(categories[0]?.id || '');
      setSubcategoryId(categories[0]?.subcategories[0]?.id || '');
      setScope(activeScope);
      setUserId(activeUserId);
      setDescription('');
      setMovement('');
      setAttachmentUrl('');
      setAttachmentName('');
      setErrorMsg('');
      setBulkPrompt(null);
    }
  }, [editingTransaction, isOpen, initialType, initialOriginAccountId, activeUserId, activeScope, accounts, categories]);

  if (!isOpen) return null;

  const currentCategory = categories.find(c => c.id === categoryId);

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const cat = categories.find(c => c.id === newCatId);
    if (cat && cat.subcategories.length > 0) {
      setSubcategoryId(cat.subcategories[0].id);
    } else {
      setSubcategoryId('');
    }
  };

  const handleSimulateAttachment = () => {
    const sampleReceipts = [
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400&auto=format&fit=crop&q=80',
    ];
    setAttachmentUrl(sampleReceipts[Math.floor(Math.random() * sampleReceipts.length)]);
    setAttachmentName(`recibo_ticket_${Date.now().toString().slice(-4)}.jpg`);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Por favor introduce un monto válido mayor a cero.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Por favor introduce una descripción del movimiento.');
      return;
    }
    if (type === 'transfer' && accountId === destinationAccountId) {
      setErrorMsg('La cuenta origen y destino deben ser diferentes.');
      return;
    }

    const canonicalDate = normalizeAndValidateDate(date);
    const hash = computeSyncTransactionHash(canonicalDate, numAmount, description.trim(), accountId);

    const updatedTx: Transaction = {
      id: editingTransaction ? editingTransaction.id : `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      date: canonicalDate,
      amount: numAmount,
      type,
      accountId,
      destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
      categoryId,
      subcategoryId,
      scope,
      description: description.trim(),
      originalRawDescription: editingTransaction?.originalRawDescription || description.trim(),
      movement: movement.trim() || undefined,
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
      hash,
      isReconciled: true,
      createdAt: editingTransaction?.createdAt || new Date().toISOString(),
    };

    // If editing existing transaction, check if category or subcategory changed
    if (editingTransaction) {
      const categoryChanged = 
        (categoryId !== (editingTransaction.categoryId || '')) ||
        (subcategoryId !== (editingTransaction.subcategoryId || ''));

      if (categoryChanged && existingTransactions.length > 0) {
        const similar = findSimilarTransactionsForBulkCategorization(
          {
            id: editingTransaction.id,
            description: description.trim(),
            movement: movement.trim() || undefined,
            type,
          },
          existingTransactions,
          0.80
        );

        if (similar.length > 0) {
          const allIds = similar.map(s => s.id);
          setSelectedSimilarTxIds(allIds);
          setBulkPrompt({
            pendingTx: updatedTx,
            similarTxIds: allIds,
            similarCount: similar.length,
            targetDescription: description.trim(),
            targetMovement: movement.trim() || undefined,
            similarItems: similar.map(s => ({
              id: s.id,
              date: s.date,
              description: s.description,
              movement: s.movement,
              amount: s.amount,
              similarityScore: s.similarityScore,
            })),
          });
          return;
        }
      }
    }

    // Direct save without prompt
    onSave(updatedTx, []);
    onClose();
  };

  const handleToggleSelectSimilar = (id: string) => {
    setSelectedSimilarTxIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllSimilar = () => {
    if (!bulkPrompt?.similarItems) return;
    setSelectedSimilarTxIds(bulkPrompt.similarItems.map(s => s.id));
  };

  const handleDeselectAllSimilar = () => {
    setSelectedSimilarTxIds([]);
  };

  const handleApplySingleOnly = () => {
    if (!bulkPrompt) return;
    onSave(bulkPrompt.pendingTx, []);
    setBulkPrompt(null);
    onClose();
  };

  const handleApplySelectedSimilar = () => {
    if (!bulkPrompt) return;
    onSave(bulkPrompt.pendingTx, selectedSimilarTxIds);
    setBulkPrompt(null);
    onClose();
  };

  const handleChangeDate = (date: string) => {
    setDate(date);
    outScopedDate = date;
  }

  const selectedCategoryObj = categories.find(c => c.id === categoryId);
  const selectedSubcategoryObj = selectedCategoryObj?.subcategories.find(s => s.id === subcategoryId);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-8">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingTransaction ? 'Editar Movimiento' : 'Registrar Nuevo Movimiento'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingTransaction 
                  ? 'Modifica los valores del movimiento y actualiza categorías en transacciones similares' 
                  : 'Carga individual con asignación de ámbito, cuentas y categoría'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="mt-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            
            {/* Tipo de movimiento */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Operación</label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                    type === 'expense' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                    type === 'income' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => setType('transfer')}
                  className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                    type === 'transfer' ? 'bg-white text-blue-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Transferencia
                </button>
              </div>
            </div>

            {/* Monto & Fecha */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monto (€ EUR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => handleChangeDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Concepto</label>
              <input
                type="text"
                list='descriptions-datalist'
                required
                placeholder="Ej. Compra semanal Mercadona, Nómina de Carlos, Alquiler vivienda..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
              />
              <datalist id='descriptions-datalist'>
                {existentDescriptions.map(d => (<option value={d}></option>))}
              </datalist>
            </div>

            {/* Movimiento / Detalle Bancario (Opcional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Movimiento / Detalle Bancario <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                list='movements-datalist'
                placeholder="Ej. Pago con Tarjeta Débito BBVA, Cargo domiciliado, Bizum, Abono nómina..."
                value={movement}
                onChange={(e) => setMovement(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
              />
              <datalist id='movements-datalist'>
                {existentMovements.map(d => (<option value={d}></option>))}
              </datalist>
            </div>

            {/* Cuentas Origen / Destino */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {type === 'transfer' ? 'Cuenta Origen (Sale)' : 'Cuenta Afectada'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-slate-500"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountNumberMasked})
                    </option>
                  ))}
                </select>
              </div>

              {type === 'transfer' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cuenta Destino (Ingresa)
                  </label>
                  <select
                    value={destinationAccountId}
                    onChange={(e) => setDestinationAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-slate-500"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountNumberMasked})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Categoría & Subcategoría */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría Padre</label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-slate-500"
                >
                  <option value="">⚠️ Sin categorizar (Pendiente)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subcategoría</label>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-slate-500"
                  disabled={!categoryId}
                >
                  <option value="">{categoryId ? 'General / Sin subcategoría' : 'Selecciona categoría...'}</option>
                  {currentCategory?.subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ámbito & Usuario */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ámbito</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as ScopeType)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-slate-500"
                >
                  <option value="familiar">Familiar (Compartido)</option>
                  <option value="personal">Personal (Individual)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Usuario Responsable</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-slate-500"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div> 

            {/* Adjunto comprobante */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Comprobante / Ticket Digital</label>
              {attachmentUrl ? (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="font-mono text-slate-700 truncate">{attachmentName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentUrl('');
                      setAttachmentName('');
                    }}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSimulateAttachment}
                  className="w-full py-2 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Paperclip className="w-4 h-4 text-slate-400" />
                  <span>Simular carga de comprobante/factura</span>
                </button>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                {editingTransaction ? 'Guardar Cambios' : 'Registrar Movimiento'}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Confirmation Modal: Bulk Update Similar Transactions */}
      {bulkPrompt && 
        <BulkUpdateModal 
          isOpen={true} 
          onClose={() => setBulkPrompt(null)} 
          onSelectAll={handleSelectAllSimilar} 
          onDeselectAll={handleDeselectAllSimilar} 
          onToggleSelect={handleToggleSelectSimilar} 
          onApplySingleSelect={handleApplySingleOnly} 
          onAppySimilarSelect={handleApplySelectedSimilar} 
          bulkPrompt={{...bulkPrompt, categoryLabel: selectedCategoryObj?.name || 'Sin Categorizar', subCategoryLabel: selectedSubcategoryObj?.name}} 
          selectedSimilarTxIds={selectedSimilarTxIds} 
          />
      }
    </>
  );
};

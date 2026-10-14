import React, { useState } from 'react';
import { X, Paperclip, ArrowRight, Check } from 'lucide-react';
import { FinancialAccount, ParentCategory, ScopeType, Transaction, TransactionType, UserProfile } from '../types/finance';
import { computeSyncTransactionHash } from '../utils/crypto';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  accounts: FinancialAccount[];
  categories: ParentCategory[];
  users: UserProfile[];
  initialType?: TransactionType;
  initialOriginAccountId?: string;
  activeUserId: string;
  activeScope: ScopeType;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  categories,
  users,
  initialType = 'expense',
  initialOriginAccountId,
  activeUserId,
  activeScope,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(initialOriginAccountId || accounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState<string>(accounts[1]?.id || '');
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || '');
  const [subcategoryId, setSubcategoryId] = useState<string>(categories[0]?.subcategories[0]?.id || '');
  const [scope, setScope] = useState<ScopeType>(activeScope);
  const [userId, setUserId] = useState<string>(activeUserId);
  const [description, setDescription] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

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
    // Simulated receipt image attachment
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

    const hash = computeSyncTransactionHash(date, numAmount, description, accountId);

    const newTx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      date,
      amount: numAmount,
      type,
      accountId,
      destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
      categoryId,
      subcategoryId,
      scope,
      description: description.trim(),
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
      hash,
      isReconciled: true,
      createdAt: new Date().toISOString(),
    };

    onSave(newTx);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registrar Nuevo Movimiento</h2>
            <p className="text-xs text-slate-500">Carga individual con asignación de ámbito, cuentas y categoría</p>
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
          
          {/* Tipo de movimiento (Segmented control) */}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monto ($ USD)</label>
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
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
              />
            </div>
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

          {/* Categoría & Subcategoría (si no es transferencia o para clasificar la inversión) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría Padre</label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-slate-500"
              >
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
              >
                {currentCategory?.subcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ámbito (Personal vs Familiar) & Usuario (Ownership) */}
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

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Concepto</label>
            <input
              type="text"
              required
              placeholder="Ej. Supermercado semanal, Pago de nómina, Combustible..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
            />
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
              Guardar Movimiento
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

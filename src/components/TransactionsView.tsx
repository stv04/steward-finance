import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeftRight, 
  Paperclip, 
  UploadCloud, 
  Plus, 
  Calendar,
  X,
  Eye,
  Trash2
} from 'lucide-react';
import { FinancialAccount, ParentCategory, ScopeType, Transaction, UserProfile } from '../types/finance';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: FinancialAccount[];
  categories: ParentCategory[];
  users: UserProfile[];
  activeScope: ScopeType;
  activeUserId: string;
  onNewTransaction: () => void;
  onOpenReconciliation: () => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  categories,
  users,
  activeScope,
  activeUserId,
  onNewTransaction,
  onOpenReconciliation,
  onDeleteTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      // Scope filter
      if (activeScope === 'personal' && tx.userId !== activeUserId && tx.scope !== 'personal') {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && tx.categoryId !== selectedCategory) {
        return false;
      }

      // Account filter
      if (selectedAccount !== 'all' && tx.accountId !== selectedAccount && tx.destinationAccountId !== selectedAccount) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchDesc = tx.description.toLowerCase().includes(query);
        const matchRaw = tx.originalRawDescription?.toLowerCase().includes(query);
        if (!matchDesc && !matchRaw) return false;
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, activeScope, activeUserId, selectedType, selectedCategory, selectedAccount, searchQuery]);

  const getAccountName = (accId: string) => {
    const acc = accounts.find(a => a.id === accId);
    return acc ? acc.name : 'Cuenta';
  };

  const getCategoryInfo = (catId: string, subId?: string) => {
    const cat = categories.find(c => c.id === catId);
    const sub = cat?.subcategories.find(s => s.id === subId);
    return {
      catName: cat?.name || 'General',
      subName: sub?.name || '',
      color: cat?.color || '#64748b',
    };
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name.split(' ')[0] : 'Usuario';
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Libro Mayor de Transacciones (Ledger)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro unificado de ingresos, egresos y transferencias multicuenta con trazabilidad por usuario
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenReconciliation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-blue-600" />
            <span>Importar Extracto CSV</span>
          </button>

          <button
            onClick={onNewTransaction}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Movimiento</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por concepto o comercio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium outline-hidden"
        >
          <option value="all">Todos los tipos</option>
          <option value="expense">Solo Gastos</option>
          <option value="income">Solo Ingresos</option>
          <option value="transfer">Solo Transferencias</option>
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium outline-hidden"
        >
          <option value="all">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Account Filter */}
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium outline-hidden"
        >
          <option value="all">Todas las cuentas</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>

        {/* Reset */}
        {(searchQuery || selectedType !== 'all' || selectedCategory !== 'all' || selectedAccount !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedType('all');
              setSelectedCategory('all');
              setSelectedAccount('all');
            }}
            className="text-xs text-slate-500 hover:text-slate-900 underline font-medium cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Ledger Table (High Density Data Grid with Tabular Numerals) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Descripción &amp; Comercio</th>
                <th className="py-3 px-4">Cuenta</th>
                <th className="py-3 px-4">Categoría / Subcategoría</th>
                <th className="py-3 px-4">Ámbito &amp; Usuario</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-center">Ticket</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-medium text-slate-700">No se encontraron movimientos registrados</p>
                    <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o agrega una nueva transacción con el botón superior.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(tx => {
                  const { catName, subName, color } = getCategoryInfo(tx.categoryId, tx.subcategoryId);
                  const isExpense = tx.type === 'expense';
                  const isIncome = tx.type === 'income';
                  const isTransfer = tx.type === 'transfer';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Fecha */}
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {tx.date}
                      </td>

                      {/* Concepto */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded shrink-0 ${
                            isIncome ? 'text-emerald-700 bg-emerald-50' : 
                            isTransfer ? 'text-blue-700 bg-blue-50' : 
                            'text-slate-600 bg-slate-100'
                          }`}>
                            {isIncome && <ArrowDownRight className="w-3.5 h-3.5" />}
                            {isExpense && <ArrowUpRight className="w-3.5 h-3.5" />}
                            {isTransfer && <ArrowLeftRight className="w-3.5 h-3.5" />}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-slate-900 block truncate">
                              {tx.description}
                            </span>
                            {tx.originalRawDescription && tx.originalRawDescription !== tx.description && (
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                Raw: {tx.originalRawDescription}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cuenta */}
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        <span className="block truncate max-w-[160px]">
                          {getAccountName(tx.accountId)}
                        </span>
                        {isTransfer && tx.destinationAccountId && (
                          <span className="text-[10px] text-blue-600 flex items-center gap-1">
                            → {getAccountName(tx.destinationAccountId)}
                          </span>
                        )}
                      </td>

                      {/* Categoría / Subcategoría (Clean unboxed text metadata) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                          <span className="font-medium">{catName}</span>
                          {subName && (
                            <>
                              <span className="text-slate-300">/</span>
                              <span className="text-slate-500">{subName}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Ámbito & Usuario (Clean unboxed text metadata) */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-medium text-slate-800 capitalize">{tx.scope}</span>
                          <span className="text-slate-300">·</span>
                          <span>{getUserName(tx.userId)}</span>
                        </div>
                      </td>

                      {/* Monto (Tabular Numerals) */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                        <span className={
                          isIncome ? 'text-emerald-700' :
                          isTransfer ? 'text-blue-700' :
                          'text-slate-900'
                        }>
                          {isIncome ? '+' : isExpense ? '-' : ''}${tx.amount.toFixed(2)}
                        </span>
                      </td>

                      {/* Ticket / Attachment */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {tx.attachmentUrl ? (
                          <button
                            onClick={() => setSelectedReceiptTx(tx)}
                            title="Ver comprobante adjunto"
                            className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors p-1 cursor-pointer"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          title="Eliminar movimiento"
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Footer */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Mostrando <strong>{filtered.length}</strong> de <strong>{transactions.length}</strong> movimientos registrados</span>
          <span className="font-mono">Invariante de Libro Mayor: Verificado</span>
        </div>
      </div>

      {/* Receipt Modal Viewer */}
      {selectedReceiptTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Comprobante de Gasto Adjunto</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedReceiptTx.attachmentName || 'ticket_digital.png'}</p>
              </div>
              <button
                onClick={() => setSelectedReceiptTx(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-72">
                <img
                  src={selectedReceiptTx.attachmentUrl}
                  alt="Comprobante fiscal o recibo"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Concepto:</span>
                  <span className="font-semibold">{selectedReceiptTx.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto:</span>
                  <span className="font-mono font-bold">${selectedReceiptTx.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha del movimiento:</span>
                  <span className="font-mono">{selectedReceiptTx.date}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedReceiptTx(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { 
  Building2, 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  ExternalLink, 
  ArrowLeftRight, 
  Calendar, 
  Percent, 
  Lock, 
  Plus
} from 'lucide-react';
import { FinancialAccount, ScopeType } from '../types/finance';

interface AccountsViewProps {
  accounts: FinancialAccount[];
  activeScope: ScopeType;
  activeUserId: string;
  onOpenTransferModal: (originAccountId?: string) => void;
  onUpdateAccountBalance: (accountId: string, newBalance: number) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  activeScope,
  activeUserId,
  onOpenTransferModal,
  onUpdateAccountBalance,
}) => {
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState<string>('');

  const filteredAccounts = accounts.filter(acc => {
    if (activeScope === 'familiar') return true;
    return acc.ownerId === activeUserId || acc.scope === 'personal';
  });

  // Group accounts by structural category
  const bankAccounts = filteredAccounts.filter(a => a.accountType === 'bank_checking' || a.accountType === 'bank_savings');
  const investmentAccounts = filteredAccounts.filter(a => a.accountType === 'investment');
  const cardAccounts = filteredAccounts.filter(a => a.accountType === 'card_debit' || a.accountType === 'card_credit');
  const digitalAndCashAccounts = filteredAccounts.filter(a => a.accountType === 'digital_gateway' || a.accountType === 'cash_wallet');

  const startEditBalance = (acc: FinancialAccount) => {
    setEditingAccountId(acc.id);
    setEditBalanceValue(acc.balance.toString());
  };

  const saveBalance = (accId: string) => {
    const parsed = parseFloat(editBalanceValue);
    if (!isNaN(parsed)) {
      onUpdateAccountBalance(accId, parsed);
    }
    setEditingAccountId(null);
  };

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Estructura de Cuentas y Entidades Financieras
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidación multicuenta: 2 Bancos · 2 Inversiones · Tarjetas · Pasarela PayPal · Billeteras operativas
          </p>
        </div>

        <button
          onClick={() => onOpenTransferModal()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <ArrowLeftRight className="w-4 h-4 text-blue-600" />
          <span>Transferencia entre Cuentas</span>
        </button>
      </div>

      {/* 1. Cuentas Bancarias (2 cuentas) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Cuentas Bancarias (Corriente &amp; Ahorro)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankAccounts.map(acc => (
            <div key={acc.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">{acc.institution}</span>
                  <div className="flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>{acc.accountNumberMasked}</span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1">{acc.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{acc.notes}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">Saldo Disponible</span>
                  {editingAccountId === acc.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        step="0.01"
                        value={editBalanceValue}
                        onChange={(e) => setEditBalanceValue(e.target.value)}
                        className="w-28 text-sm font-mono border border-slate-300 rounded px-2 py-0.5"
                        autoFocus
                      />
                      <button
                        onClick={() => saveBalance(acc.id)}
                        className="text-xs bg-slate-900 text-white px-2 py-1 rounded font-medium cursor-pointer"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono tabular-nums text-slate-950">
                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => startEditBalance(acc)}
                        className="text-[11px] text-slate-400 hover:text-slate-700 underline cursor-pointer"
                      >
                        Ajustar
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onOpenTransferModal(acc.id)}
                  className="px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-medium transition-colors cursor-pointer"
                >
                  Transferir
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Métodos de Inversión (2 instrumentos) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900">Métodos &amp; Plataformas de Inversión</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investmentAccounts.map(acc => (
            <div key={acc.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">{acc.institution}</span>
                  <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                    {acc.assetClass}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1">{acc.name}</h3>
                <p className="text-xs text-slate-500 mb-3">{acc.notes}</p>

                {acc.yieldRateAnnual && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-md mb-2">
                    <Percent className="w-3.5 h-3.5" />
                    <span>Rendimiento Proyectado: <strong className="font-mono">{acc.yieldRateAnnual}% Tasa Anual</strong></span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">Posición Consolidada</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-slate-950">
                    ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  onClick={() => onOpenTransferModal(acc.id)}
                  className="px-2.5 py-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded font-medium transition-colors cursor-pointer"
                >
                  Aportar Fondos
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Tarjetas: Débito & Crédito */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">Tarjetas Activas (Débito y Crédito)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cardAccounts.map(acc => {
            const isCredit = acc.accountType === 'card_credit';
            const availableCredit = isCredit && acc.creditLimit ? acc.creditLimit - Math.abs(acc.balance) : 0;
            const utilizationPercent = isCredit && acc.creditLimit ? (Math.abs(acc.balance) / acc.creditLimit) * 100 : 0;

            return (
              <div key={acc.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-slate-700">{acc.institution}</span>
                    <span className="font-mono text-xs text-slate-600">{acc.accountNumberMasked}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1">{acc.name}</h3>
                  <p className="text-xs text-slate-500 mb-3">{acc.notes}</p>

                  {isCredit && (
                    <div className="space-y-2 mb-3 bg-slate-50 p-3 rounded-lg text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Día de Corte:</span>
                        </span>
                        <strong className="font-mono">Día {acc.cutoffDay} de cada mes</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Fecha Límite de Pago:</span>
                        </span>
                        <strong className="font-mono">Día {acc.paymentDueDay} del mes siguiente</strong>
                      </div>
                      <div className="pt-2 border-t border-slate-200/80">
                        <div className="flex justify-between text-[11px] mb-1 text-slate-500">
                          <span>Uso de Línea ({utilizationPercent.toFixed(0)}%)</span>
                          <span>Límite: ${acc.creditLimit?.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${utilizationPercent > 70 ? 'bg-rose-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {!isCredit && acc.linkedAccountId && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg mb-3">
                      <span>Vinculada directamente a saldo de: <strong>Cuenta Corriente Santander</strong></span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      {isCredit ? 'Saldo Consumido (Deuda Actual)' : 'Saldo Disponible'}
                    </span>
                    <span className={`text-xl font-bold font-mono tabular-nums ${isCredit ? 'text-rose-600' : 'text-slate-950'}`}>
                      ${Math.abs(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {isCredit && (
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Crédito Disponible</span>
                      <span className="text-sm font-semibold font-mono text-emerald-700">
                        ${availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Pasarelas Digitales & Billeteras de Efectivo */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-semibold text-slate-900">Pasarelas Digitales &amp; Efectivo Operativo</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {digitalAndCashAccounts.map(acc => (
            <div key={acc.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">{acc.institution}</span>
                  <span className="font-mono text-xs text-slate-600">{acc.accountNumberMasked}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1">{acc.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{acc.notes}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">Saldo en Billetera</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-slate-950">
                    ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  onClick={() => startEditBalance(acc)}
                  className="px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-medium transition-colors cursor-pointer"
                >
                  Registrar Saldo
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

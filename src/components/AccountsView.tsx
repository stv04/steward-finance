import React, { useState } from 'react';
import { 
  Building2, 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  ArrowLeftRight, 
  Plus
} from 'lucide-react';
import { AccountType, FinancialAccount, ScopeType } from '../types/finance';
import { useLanguage } from '../context/LanguageContext';
import { 
  BankAccountCard, 
  InvestmentAccountCard, 
  CardAccountCard, 
  DigitalCashAccountCard 
} from './accountCards';

interface AccountsViewProps {
  accounts: FinancialAccount[];
  activeScope: ScopeType;
  activeUserId: string;
  onOpenTransferModal: (originAccountId?: string) => void;
  onUpdateAccountBalance: (accountId: string, newBalance: number) => void;
  onOpenNewAccountModal: (defaultType?: AccountType) => void;
  onDeleteAccount: (accountId: string) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  activeScope,
  activeUserId,
  onOpenTransferModal,
  onUpdateAccountBalance,
  onOpenNewAccountModal,
  onDeleteAccount,
}) => {
  const { t, language } = useLanguage();
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState<string>('');

  const filteredAccounts = accounts.filter(acc => {
    if (activeScope === 'familiar') return true;
    return acc.ownerId === activeUserId;
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
      {/* View Header with Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.accounts.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidación multicuenta personalizada: Bancos · Inversiones · Tarjetas · Pasarelas · Billeteras operativas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenTransferModal()}
            disabled={filteredAccounts.length < 2}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.accounts.transfer}</span>
          </button>

          <button
            onClick={() => onOpenNewAccountModal('bank_checking')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.accounts.newAccount}</span>
          </button>
        </div>
      </div>

      {/* Global Empty State if user has zero accounts yet */}
      {filteredAccounts.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center max-w-2xl mx-auto shadow-xs">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            No tienes cuentas registradas aún
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
            Para mantener el control exacto de tus finanzas personales y familiares, agrega tus cuentas reales. El sistema calculará automáticamente tus saldos consolidados y patrimoniales.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <button
              onClick={() => onOpenNewAccountModal('bank_checking')}
              className="p-3.5 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 group-hover:text-blue-600">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>+ Cuenta Bancaria</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Cuenta corriente o de ahorro para nóminas y gastos.
              </p>
            </button>

            <button
              onClick={() => onOpenNewAccountModal('investment')}
              className="p-3.5 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 group-hover:text-emerald-600">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>+ Método de Inversión</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Fondos indexados, CETES, bonos o acciones.
              </p>
            </button>

            <button
              onClick={() => onOpenNewAccountModal('card_credit')}
              className="p-3.5 border border-slate-200 rounded-lg hover:border-amber-500 hover:bg-amber-50/30 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 group-hover:text-amber-600">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>+ Tarjeta Débito / Crédito</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tarjeta asociada a cuenta o con corte y fecha de pago.
              </p>
            </button>

            <button
              onClick={() => onOpenNewAccountModal('digital_gateway')}
              className="p-3.5 border border-slate-200 rounded-lg hover:border-purple-500 hover:bg-purple-50/30 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 group-hover:text-purple-600">
                <Wallet className="w-4 h-4 text-purple-600" />
                <span>+ PayPal o Efectivo</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Pasarela digital o caja chica operativa.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* 1. Cuentas Bancarias */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">Cuentas Bancarias (Corriente &amp; Ahorro)</h2>
            <span className="text-xs font-mono text-slate-400">({bankAccounts.length})</span>
          </div>
          <button
            onClick={() => onOpenNewAccountModal('bank_checking')}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Banco</span>
          </button>
        </div>

        {bankAccounts.length === 0 && filteredAccounts.length > 0 ? (
          <div className="border border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-500">
            No tienes cuentas bancarias registradas en este ámbito.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map(acc => (
              <BankAccountCard
                key={acc.id}
                acc={acc}
                editingAccountId={editingAccountId}
                editBalanceValue={editBalanceValue}
                onStartEditBalance={startEditBalance}
                onSaveBalance={saveBalance}
                onChangeEditBalanceValue={setEditBalanceValue}
                onOpenTransferModal={onOpenTransferModal}
                onDeleteAccount={onDeleteAccount}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. Métodos de Inversión */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-semibold text-slate-900">Métodos e Instrumentos de Inversión</h2>
            <span className="text-xs font-mono text-slate-400">({investmentAccounts.length})</span>
          </div>
          <button
            onClick={() => onOpenNewAccountModal('investment')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Inversión</span>
          </button>
        </div>

        {investmentAccounts.length === 0 && filteredAccounts.length > 0 ? (
          <div className="border border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-500">
            No tienes plataformas de inversión registradas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {investmentAccounts.map(acc => (
              <InvestmentAccountCard
                key={acc.id}
                acc={acc}
                editingAccountId={editingAccountId}
                editBalanceValue={editBalanceValue}
                onStartEditBalance={startEditBalance}
                onSaveBalance={saveBalance}
                onChangeEditBalanceValue={setEditBalanceValue}
                onOpenTransferModal={onOpenTransferModal}
                onDeleteAccount={onDeleteAccount}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. Tarjetas: Débito & Crédito */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">Tarjetas de Débito y Crédito</h2>
            <span className="text-xs font-mono text-slate-400">({cardAccounts.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenNewAccountModal('card_debit')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Débito</span>
            </button>
            <span className="text-slate-300">·</span>
            <button
              onClick={() => onOpenNewAccountModal('card_credit')}
              className="text-xs text-amber-700 hover:text-amber-800 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Crédito</span>
            </button>
          </div>
        </div>

        {cardAccounts.length === 0 && filteredAccounts.length > 0 ? (
          <div className="border border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-500">
            No tienes tarjetas de débito o crédito registradas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cardAccounts.map(acc => (
              <CardAccountCard
                key={acc.id}
                acc={acc}
                accounts={accounts}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Pasarelas Digitales & Billeteras */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-700" />
            <h2 className="text-sm font-semibold text-slate-900">Pasarelas Digitales y Efectivo Operativo</h2>
            <span className="text-xs font-mono text-slate-400">({digitalAndCashAccounts.length})</span>
          </div>
          <button
            onClick={() => onOpenNewAccountModal('digital_gateway')}
            className="text-xs text-purple-700 hover:text-purple-800 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Pasarela/Efectivo</span>
          </button>
        </div>

        {digitalAndCashAccounts.length === 0 && filteredAccounts.length > 0 ? (
          <div className="border border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-500">
            No tienes cuentas digitales o billeteras de efectivo registradas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {digitalAndCashAccounts.map(acc => (
              <DigitalCashAccountCard
                key={acc.id}
                acc={acc}
                editingAccountId={editingAccountId}
                editBalanceValue={editBalanceValue}
                onStartEditBalance={startEditBalance}
                onSaveBalance={saveBalance}
                onChangeEditBalanceValue={setEditBalanceValue}
                onOpenTransferModal={onOpenTransferModal}
                onDeleteAccount={onDeleteAccount}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

import React from 'react';
import { Percent, Trash2 } from 'lucide-react';
import { FinancialAccount } from '../../types/finance';

interface InvestmentAccountCardProps {
  acc: FinancialAccount;
  editingAccountId: string | null;
  editBalanceValue: string;
  onStartEditBalance: (acc: FinancialAccount) => void;
  onSaveBalance: (accId: string) => void;
  onChangeEditBalanceValue: (val: string) => void;
  onOpenTransferModal: (accId?: string) => void;
  onDeleteAccount: (accountId: string) => void;
}

export const InvestmentAccountCard: React.FC<InvestmentAccountCardProps> = ({
  acc,
  editingAccountId,
  editBalanceValue,
  onStartEditBalance,
  onSaveBalance,
  onChangeEditBalanceValue,
  onOpenTransferModal,
  onDeleteAccount,
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-semibold text-slate-700">{acc.institution}</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
              {acc.assetClass || 'Inversión'}
            </span>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar la inversión "${acc.name}"?`)) {
                  onDeleteAccount(acc.id);
                }
              }}
              className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer"
              title="Eliminar cuenta"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-900 mb-1">{acc.name}</h3>
        <p className="text-xs text-slate-500 mb-3">{acc.notes || 'Portafolio de inversión.'}</p>

        {acc.yieldRateAnnual !== undefined && (
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50/60 px-2.5 py-1 rounded-md mb-3 border border-emerald-100">
            <Percent className="w-3.5 h-3.5" />
            <span>Rendimiento Estimado: <strong>{acc.yieldRateAnnual}% Anual</strong></span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-slate-500 block">Posición Consolidada</span>
          {editingAccountId === acc.id ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                step="0.01"
                value={editBalanceValue}
                onChange={(e) => onChangeEditBalanceValue(e.target.value)}
                className="w-28 text-sm font-mono border border-slate-300 rounded px-2 py-0.5"
                autoFocus
              />
              <button
                onClick={() => onSaveBalance(acc.id)}
                className="text-xs bg-slate-900 text-white px-2 py-1 rounded font-medium cursor-pointer"
              >
                OK
              </button>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-950">
                ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button
                onClick={() => onStartEditBalance(acc)}
                className="text-[11px] text-slate-400 hover:text-slate-700 underline cursor-pointer"
              >
                Ajustar
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => onOpenTransferModal(acc.id)}
          className="px-2.5 py-1 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded font-medium transition-colors cursor-pointer"
        >
          Aportar Fondos
        </button>
      </div>
    </div>
  );
};

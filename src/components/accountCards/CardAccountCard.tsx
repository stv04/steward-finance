import React from 'react';
import { Calendar } from 'lucide-react';
import { FinancialAccount } from '../../types/finance';
import { formatEuro } from '../../utils/formatters';

interface CardAccountCardProps {
  acc: FinancialAccount;
  accounts?: FinancialAccount[];
}

export const CardAccountCard: React.FC<CardAccountCardProps> = ({
  acc,
  accounts = [],
}) => {
  const isCredit = acc.accountType === 'card_credit';
  const availableCredit = isCredit && acc.creditLimit ? acc.creditLimit - Math.abs(acc.balance) : 0;
  const utilizationPercent = isCredit && acc.creditLimit ? (Math.abs(acc.balance) / acc.creditLimit) * 100 : 0;

  const linked = accounts.find(a => a.id === acc.linkedAccountId);
  const linkedName = linked ? linked.name : 'Cuenta Corriente';

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
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
                <span>Límite: {formatEuro(acc.creditLimit, { maximumFractionDigits: 0 })}</span>
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
            <span>Vinculada directamente a saldo de: <strong>{linkedName}</strong></span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-slate-500 block">
            {isCredit ? 'Saldo Consumido (Deuda Actual)' : 'Saldo Disponible'}
          </span>
          <span className={`text-xl font-bold font-mono tabular-nums ${isCredit ? 'text-rose-600' : 'text-slate-950'}`}>
            {formatEuro(acc.balance)}
          </span>
        </div>

        {isCredit && (
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Crédito Disponible</span>
            <span className="text-sm font-semibold font-mono text-emerald-700">
              {formatEuro(availableCredit)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
